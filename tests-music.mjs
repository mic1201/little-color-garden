import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createMusic} from './dist/music.js';

const flush = () => new Promise(resolve=>setImmediate(resolve));
const events = new Map();
let plays = 0;
let pauses = 0;
let blocked = false;
const audio = {
  paused: true,
  get src() {return this.file;},
  set src(file) {this.file=file;this.paused=true;},
  addEventListener(event,handler) {events.set(event,handler);},
  async play() {
    plays++;
    if(blocked) throw new Error('Autoplay blocked');
    this.paused=false;
  },
  pause() {pauses++;this.paused=true;}
};
const music = createMusic({audio});
assert.equal(plays,1);
await flush();
const tracks = [audio.src];
for(let i=0;i<3;i++){
  events.get('ended')();
  await flush();
  tracks.push(audio.src);
}
assert.equal(new Set(tracks.slice(0,3)).size,3);
assert.equal(tracks[0],tracks[3]);
assert(tracks.every(track=>existsSync(`dist/${track}`)));
music.setVisible(false);
assert.equal(pauses,1);
music.setVisible(true);
assert.equal(plays,5);
await flush();
blocked=true;
const restricted = createMusic({audio});
assert.equal(plays,6);
await flush();
blocked=false;
restricted.start();
assert.equal(plays,7);
console.log('PASS startup playback, three-track rotation, foreground pause/resume and browser gesture retry.');
