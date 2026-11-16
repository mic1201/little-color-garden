"""Render the garden's original melodies using sine oscillators. No samples or MIDI imports."""

from pathlib import Path
import subprocess

import numpy as np

RATE = 32000
OUT = Path(__file__).resolve().parent.parent / 'dist/music'

# Each entry contains the bass note, its chord, and one bar of melody.
# A melody event is a MIDI pitch and its length in beats; None is a rest.
MEADOW = [
    (48, (60, 64, 67), [(76,.5),(79,.5),(81,1),(79,1),(76,1)]),
    (45, (57, 60, 64), [(74,.5),(76,.5),(72,1),(76,1),(69,1)]),
    (41, (57, 60, 65), [(72,.5),(74,.5),(76,1),(77,1),(76,1)]),
    (43, (59, 62, 67), [(74,1),(71,.5),(74,.5),(67,1),(None,1)]),
    (48, (60, 64, 67), [(76,.5),(79,.5),(84,1),(83,1),(79,1)]),
    (50, (57, 62, 65), [(81,1),(77,.5),(76,.5),(74,1),(77,1)]),
    (43, (59, 62, 67), [(79,.5),(81,.5),(79,1),(74,1),(71,1)]),
    (48, (60, 64, 67), [(72,2),(76,.5),(74,.5),(72,1)]),
]
CLOUD = [
    (50, (62, 66, 69), [(73,.5),(74,.5),(78,1),(81,1)]),
    (47, (59, 62, 66), [(83,1.5),(81,.5),(78,1)]),
    (43, (59, 62, 67), [(79,.5),(78,.5),(74,1),(71,1)]),
    (45, (61, 64, 69), [(76,1),(73,1),(69,1)]),
    (50, (62, 66, 69), [(74,.5),(76,.5),(78,1),(81,1)]),
    (43, (59, 62, 67), [(79,1),(83,1),(86,1)]),
    (45, (61, 64, 69), [(85,.5),(81,.5),(79,1),(76,1)]),
    (50, (62, 66, 69), [(78,.5),(76,.5),(74,2)]),
]
SEEDS = [
    (53, (60, 65, 69), [(81,1),(77,.5),(79,.5),(81,1),(84,1)]),
    (50, (62, 65, 69), [(77,1),(74,.5),(77,.5),(81,1),(None,1)]),
    (46, (58, 62, 65), [(82,1),(81,.5),(79,.5),(77,1),(74,1)]),
    (48, (60, 64, 67), [(76,1),(79,.5),(81,.5),(79,1),(72,1)]),
    (53, (60, 65, 69), [(77,.5),(81,.5),(84,1),(86,.5),(84,.5),(81,1)]),
    (45, (57, 60, 64), [(79,1),(76,1),(72,.5),(76,.5),(81,1)]),
    (46, (58, 62, 65), [(82,.5),(81,.5),(77,1),(76,.5),(74,.5),(72,1)]),
    (53, (60, 65, 69), [(77,2),(81,.5),(79,.5),(77,1)]),
]


def note(pitch, duration, voice):
    t = np.arange(int(duration * RATE)) / RATE
    phase = 2 * np.pi * 440 * 2 ** ((pitch - 69) / 12) * t
    if voice == 'bell':
        tone = np.sin(phase) * np.exp(-2.1*t) + .12 * np.sin(phase*2.01) * np.exp(-8*t)
        attack = .021
    elif voice == 'flute':
        tone = np.sin(phase + .05*np.sin(t*32)) + .12*np.sin(phase*2)
        attack = .066
    elif voice == 'marimba':
        tone = np.sin(phase)*np.exp(-4.3*t) + .32*np.sin(4*phase)*np.exp(-15*t)
        attack = .012
    else:
        tone = (np.sin(phase) + .22*np.sin(2*phase) + .07*np.sin(3*phase))*np.exp(-3.2*t)
        attack = .025
    envelope = np.minimum(1, t / attack) * np.minimum(1, (duration-t) / .10)
    return tone * envelope


def render(name, bpm, beats_per_bar, bars, lead, backing):
    beat = 60 / bpm
    duration = len(bars) * 3 * beats_per_bar * beat + .25
    mix = np.zeros((int(duration * RATE), 2))

    def add(pitch, position, length, instrument, volume, pan=0):
        if pitch is None:
            return
        start = int(position * RATE)
        sound = note(pitch, length, instrument)[:len(mix)-start] * volume
        mix[start:start+len(sound)] += sound[:,None] * np.array([1-pan, 1+pan])[None,:]

    for repeat in range(3):
        for index, (bass, chord, melody) in enumerate(bars):
            start = (repeat * len(bars) + index) * beats_per_bar * beat
            add(bass, start, beat * 1.55, 'pluck', .14)
            if beats_per_bar == 4:
                add(bass + 12, start + 2*beat, beat * 1.1, 'pluck', .08)
            for step, pitch in enumerate(chord + ((chord[1],) if beats_per_bar == 4 else ())):
                pan = (-.22, .24, -.12, .12)[step]
                add(pitch, start + (step+.42)*beat, beat*.62, backing, .075, pan)
            position = start
            for step, (pitch, length) in enumerate(melody):
                if repeat == 1 and step == len(melody)-1 and pitch is not None and index < 6:
                    add(pitch-12, position, length*beat*.85, backing, .045, .20)
                add(pitch, position, length*beat*.88, lead, .18 if step == 0 else .145, -.12)
                position += length * beat

    # A short stereo reflection softens the synthetic transients.
    delay = int(.108 * RATE)
    mix[delay:] += mix[:-delay, ::-1].copy() * .090
    fade = int(.26 * RATE)
    tail = int(.9 * RATE)
    mix[:fade] *= np.linspace(0,1,fade)[:,None]
    mix[-tail:] *= np.linspace(1,0,tail)[:,None]
    peak = np.max(np.abs(mix))
    encoded = (mix / peak * .65 * 32767).astype('<i2').tobytes()
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 's16le', '-ar', str(RATE), '-ac', '2', '-i', '-',
        '-af', 'loudnorm=I=-20:TP=-3:LRA=8', '-ar', str(RATE),
        '-codec:a', 'libmp3lame', '-b:a', '80k', str(OUT / (name + '.mp3'))
    ], input=encoded, check=True)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    render('morning-path', 110, 4, MEADOW, 'marimba', 'pluck')
    render('cloud-waltz', 117, 3, CLOUD, 'flute', 'pluck')
    render('seed-parade', 105, 4, SEEDS, 'bell', 'marimba')
