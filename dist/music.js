const TRACKS = [
  'music/morning-path.mp3',
  'music/cloud-waltz.mp3',
  'music/seed-parade.mp3'
];

export function createMusic({audio, visible=true}) {
  let track = 0;
  let pending;
  audio.src = TRACKS[track];

  function start() {
    if (!visible || audio.paused===false || pending) return;
    const request = audio.play();
    pending = request;
    void request.catch(() => {
      // A browser that restricts autoplay can retry on the next user gesture.
    }).finally(() => {
      if (pending===request) pending = undefined;
    });
  }

  audio.addEventListener('ended', () => {
    track = (track+1) % TRACKS.length;
    audio.src = TRACKS[track];
    start();
  });

  start();
  return {
    start,
    setVisible(next) {
      if (next===visible) return;
      visible = next;
      if (visible) {
        start();
      } else {
        pending = undefined;
        audio.pause();
      }
    }
  };
}
