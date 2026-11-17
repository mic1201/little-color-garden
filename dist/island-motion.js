const cycle = (phase, beats = 1) => Math.sin(phase * Math.PI * 2 * beats);
const clamp = value => Math.max(0, Math.min(1, value));
const rise = value => Math.sin(Math.PI * clamp(value)) ** 2;
const pulse = (phase, start, end) => rise((phase - start) / (end - start));
const beat = (phase, beats) => Math.max(0, cycle(phase, beats)) ** 2;
const clipDurations = [3.2, 2.6, 4.2, 3.6];
export const islandLoopDuration = clipDurations.reduce((sum, duration) => sum + duration, 0);
export const ghostScareTime = clipDurations[0] + .53 * (clipDurations[1] - .23);

function puffs(ctx, phase, [x, y], color) {
  for (const start of [.14, .38, .58]) {
    const age = (phase - start) / .39;
    if (age <= 0 || age >= 1) continue;
    ctx.globalAlpha = rise(age) * .8;
    ctx.fillStyle = color;
    const cx = x - 48 * age;
    const cy = y - 61 * age;
    for (const [dx, dy, radius] of [[-10,3,13],[0,-5,17],[12,2,12]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, radius * (.75 + age * .5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function bubbles(ctx, phase, [x, y]) {
  for (const [start, radius] of [[.07,16],[.24,23],[.43,12]]) {
    const age = (phase - start) / .51;
    if (age <= 0 || age >= 1) continue;
    ctx.globalAlpha = rise(age) * .92;
    ctx.beginPath();
    ctx.arc(x - 38 * age, y - 115 * age, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#c6edf4';
    ctx.strokeStyle = '#75afc8';
    ctx.lineWidth = 3.5;
    ctx.fill();
    ctx.stroke();
  }
}

function angryBrows(ctx, eyes, phase) {
  ctx.globalAlpha = pulse(phase, .09, .91);
  ctx.strokeStyle = '#37424c';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [x, y, slant] of eyes) {
    ctx.moveTo(x - 20, y - 34 - slant);
    ctx.lineTo(x + 20, y - 34 + slant);
  }
  ctx.stroke();
}

// Every move starts and ends at rest so the paint and outline can move together.
function scene({rect, pivot, mouth, eyes, poses, axis, deform, signature, angryClip = 1}) {
  let lastTime;
  let clip, phase, amount;
  function at(time) {
    if (time === lastTime) return;
    lastTime = time;
    let elapsed = time % islandLoopDuration;
    clip = 0;
    while (clip < clipDurations.length - 1 && elapsed >= clipDurations[clip]) {
      elapsed -= clipDurations[clip++];
    }
    phase = clamp(elapsed / (clipDurations[clip] - .23));
    amount = rise(phase);
  }
  return [{
    rect, axis,
    pose(time) {
      at(time);
      if (phase === 0 || phase === 1) return {pivot};
      return {...poses[clip](phase, amount), pivot};
    },
    offset: axis && ((position, time) => {
      at(time);
      if (phase === 0 || phase === 1) return {};
      return deform(clip, position, phase, amount);
    }),
    detail(ctx, time) {
      at(time);
      ctx.save();
      if (clip === angryClip) {
        angryBrows(ctx, eyes, phase);
        puffs(ctx, phase, mouth, '#ffbca5cc');
      }
      if (clip === 3) signature?.(ctx, phase, mouth);
      ctx.restore();
    }
  }];
}

export const islandMotion = {
  'island-dino-clean': scene({
    rect:[185,185,800,755], pivot:[535,731], mouth:[272,445], eyes:[[525,313,-9]],
    poses:[
      (p,a) => ({angle:5 * a, scaleY:1 + .035 * a}),
      (p,a) => ({dx:-22 * a, dy:-18 * beat(p, 3) * a, angle:-6 * a, scaleY:1 - .055 * a}),
      (p,a) => ({dx:72 * cycle(p) * a, dy:-102 * beat(p, 3) * a, angle:15 * cycle(p, 2) * a}),
      (p,a) => ({angle:9 * a, dx:-16 * a, scaleX:1 + .07 * pulse(p, .2, .52)})
    ],
    signature: bubbles
  }),
  'island-turtle-clean': scene({
    rect:[223,178,778,792], pivot:[482,755], mouth:[222,463], eyes:[[407,352,-9]],
    axis:'x',
    poses:[
      (p,a) => ({angle:3 * cycle(p) * a, scaleY:1 + .045 * a}),
      p => {
        const stamp = pulse(p, .12, .35) + pulse(p, .43, .69);
        const land = pulse(p, .32, .47) + pulse(p, .66, .8);
        return {dx:-24 * stamp, dy:-52 * stamp, scaleX:1 + .10 * land, scaleY:1 - .15 * land};
      },
      (p,a) => ({dx:81 * cycle(p) * a, dy:-55 * beat(p, 3) * a, angle:18 * cycle(p, 2) * a}),
      p => ({scaleX:1 + .10 * pulse(p, .08, .91), scaleY:1 - .13 * pulse(p, .08, .91)})
    ],
    deform: (clip, x, p) => {
      if (clip !== 3) return {};
      const tuck = pulse(p, .08, .91) * clamp((513 - x) / 290) ** 2;
      return {x:90 * tuck, y:37 * tuck};
    }
  }),
  'island-dragon-clean': scene({
    rect:[178,164,838,769], pivot:[532,620], mouth:[193,489], eyes:[[355,387,-9]],
    axis:'y',
    poses:[
      (p,a) => ({dy:-27 * a, angle:4 * cycle(p) * a}),
      (p,a) => ({dx:-18 * a, dy:-35 * beat(p, 2) * a, angle:-8 * a}),
      (p,a) => ({dx:80 * cycle(p) * a, dy:-52 * a + 24 * cycle(p, 2) * a, angle:12 * cycle(p, 2) * a}),
      (p,a) => ({dx:84 * cycle(p) * a, dy:-94 * a, angle:10 * cycle(p) * a, scaleX:1 - .06 * a})
    ],
    deform: (clip, y, p, a) => {
      const flap = cycle(p, clip === 3 ? 4 : 2) * a * clamp((365 - y) / 195) ** 2;
      return {x:20 * flap, y:(clip === 3 ? 53 : 26) * flap};
    },
    signature: (ctx, p, mouth) => puffs(ctx, p, mouth, '#c4ddf4cc')
  }),
  'island-ghost-clean': scene({
    rect:[246,222,765,711], pivot:[510,527], mouth:[452,480],
    eyes:[[444,416,8],[560,416,-8]], axis:'y', angryClip:3,
    poses:[
      (p,a) => ({dy:-53 * a, angle:6 * cycle(p) * a}),
      p => {
        const squish = pulse(p, .06, .43);
        const surprise = pulse(p, .30, .76);
        return {dx:120 * surprise, dy:60 * squish - 111 * surprise, scaleX:1 + .16 * squish - .10 * surprise,
          scaleY:1 - .22 * squish + .12 * surprise};
      },
      (p,a) => ({dx:87 * cycle(p) * a, dy:-73 * a + 48 * cycle(p, 2) * a, angle:17 * cycle(p, 2) * a}),
      (p,a) => ({dx:21 * cycle(p, 3) * a, dy:-37 * a, scaleX:1 + .075 * a})
    ],
    deform: (clip, y, p, a) => ({
      x:(clip === 2 ? 38 : 18) * cycle(p, 2) * a * clamp((y - 489) / 177) ** 2
    })
  })
};
