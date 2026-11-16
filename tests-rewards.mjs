import assert from 'node:assert/strict';
import {H, W} from './dist/engine.js';
import {PAPER_REGION} from './dist/fills.js';
import {availablePatterns} from './dist/patterns.js';
import {countPaintedArea, createPaintProgress, REWARD_THRESHOLD} from './dist/reward-progress.js';
import {inkMotionOwners, motionFor, motionGeometry, motionPartAt, transformSticker} from './dist/reward-motion.js';
import {chooseReward, rewardCollection, rewardExportMarkup} from './dist/rewards.js';
import {stickers} from './dist/reward-stickers.js';

const regions = [{id: 'large', spans: [[10, 10, 204]]}, {id: 'small', spans: [[11, 10, 16]]}];
const ink = new Uint8ClampedArray(W * 12 * 4);
const setAlpha = (x, y, value) => { ink[(y * W + x) * 4 + 3] = value; };
const fills = [{region: PAPER_REGION}];
assert.deepEqual(countPaintedArea(regions, fills), {painted: 0, total: 200});
for (let x = 0; x < W; x++) setAlpha(x, 9, 255);
assert.deepEqual(countPaintedArea(regions, fills, ink), {painted: 0, total: 200});
for (let x = 10; x < 203; x++) setAlpha(x, 10, 64);
assert.equal(countPaintedArea(regions, fills, ink).painted, 193);
assert.ok(193 * 100 / 200 < REWARD_THRESHOLD);
setAlpha(203, 10, 255);
assert.equal(countPaintedArea(regions, fills, ink).painted, 194);
assert.equal(194 * 100 / 200, REWARD_THRESHOLD);
setAlpha(203, 10, 0);
assert.equal(countPaintedArea(regions, fills, ink).painted, 193);
fills.push({region: 'large'});
assert.deepEqual(countPaintedArea(regions, fills, ink), {painted: 194, total: 200});
assert.equal(createPaintProgress()({pattern:'blank', strokes:[]}), null);

const visible = availablePatterns();
assert.equal(visible.filter(({id}) => id !== 'blank').length, 24);
for (const {id} of visible) {
  if (id === 'blank') {
    assert.deepEqual(motionFor(id), []);
    continue;
  }
  const parts = motionFor(id);
  assert(parts.length, id);
  const owners = new Set(motionGeometry(id, parts));
  parts.forEach((_, index) => assert(owners.has(index + 1), id));
  for (const part of parts) {
    const [left, top, right, bottom] = part.rect;
    const sticker = {x:(left + right)/2, y:(top + bottom)/2};
    const position = transformSticker(part, sticker, .8);
    assert(Number.isFinite(position.x) && Number.isFinite(position.y), id);
    assert(position.x !== sticker.x || position.y !== sticker.y || position.angle !== 0, id);
  }
}
const neck = motionFor('longneck-clean');
assert.equal(motionPartAt('longneck-clean', neck, {x:642,y:174}), 0);
assert.equal(motionPartAt('longneck-clean', neck, {x:252,y:735}), -1);
assert.equal(motionPartAt('longneck-clean', neck, {x:30,y:32}), -1);
const head = transformSticker(neck[0], {x:642,y:174}, .875);
const foot = transformSticker(neck[0], {x:377,y:733}, .875);
assert(head.x - 642 > 40);
assert(foot.x - 377 < 15);
const halloween = motionFor('halloween-photo-v4-clean');
assert.equal(motionPartAt('halloween-photo-v4-clean', halloween, {x:710,y:710}), -1);
assert.equal(motionPartAt('halloween-photo-v4-clean', halloween, {x:699,y:592}), 1);
const whale = motionFor('whale-clean');
const whaleOwners = motionGeometry('whale-clean', whale);
assert.equal(motionPartAt('whale-clean', whale, {x:510,y:291}), 0, 'the back cannot split at the old clip');
assert.equal(motionPartAt('whale-clean', whale, {x:175,y:329}), 1, 'the left bubble moves independently');
assert.equal(motionPartAt('whale-clean', whale, {x:211,y:435}), -1);

const brushInk = new Uint8ClampedArray(W * H * 4);
for (let x = 200; x <= 380; x++) brushInk[(450 * W + x) * 4 + 3] = 128;
for (let x = 300; x <= 350; x++) brushInk[(460 * W + x) * 4 + 3] = 128;
const movingInk = inkMotionOwners(brushInk, whaleOwners);
assert.equal(whaleOwners[450 * W + 350], 1);
assert.equal(movingInk[450 * W + 350], 0, 'an ink line crossing the foreground stays entirely still');
assert.equal(movingInk[460 * W + 350], 1, 'ink wholly on the whale moves with it');

assert.equal(stickers.length, 30);
assert.equal(new Set(stickers.map(([id]) => id)).size, 30);
const saved = {earned: true, opened: true, stickers: [{id:'crown',x:120,y:130}, {id:'missing',x:100,y:150}]};
const markup = rewardExportMarkup({reward:saved});
assert.match(markup, /translate\(76 86\)/);
assert(!markup.includes('missing'));
assert.equal(rewardExportMarkup({reward:{...saved,opened:false}}), '');
assert.match(rewardExportMarkup({reward:{completed:false,stickers:saved.stickers}}), /translate\(76 86\)/);
assert.deepEqual(rewardCollection({reward:saved,rewardCollection:['paw','paw','missing']}), ['paw','crown']);
const picked = [];
for (let i = 0; i < 30; i++) picked.push(chooseReward(picked, () => .79));
assert.equal(new Set(picked).size, 30);
assert.equal(chooseReward(picked), null);
console.log(`PASS rewards: ${REWARD_THRESHOLD}% area, whole outlines and crossing ink, 24 moving scenes, and 30 unique collectible stickers`);
