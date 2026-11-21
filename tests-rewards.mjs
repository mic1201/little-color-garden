import assert from 'node:assert/strict';
import {H, W} from './dist/engine.js';
import {PAPER_REGION} from './dist/fills.js';
import {getFillRegions} from './dist/fill-regions.js';
import {paperMasks} from './dist/paper-masks.js';
import {availablePatterns} from './dist/patterns.js';
import {countPaintedArea, createPaintProgress, REWARD_THRESHOLD} from './dist/reward-progress.js';
import {busDepartureTime, fruitBiteCycle, fruitBites, fruitBiteTimes, inkMotionOwners, motionFor, motionGeometry, motionPartAt, transformSticker} from './dist/reward-motion.js';
import {changeRewardCollection, chooseReward, rewardCollection, rewardExportMarkup} from './dist/rewards.js';
import {stickers} from './dist/reward-stickers.js';
import {enterDuration, pictureInteractionPose} from './dist/avatar-stage.js';
import {ghostScareTime, islandLoopDuration} from './dist/island-motion.js';
import {pictureInteraction, pictureInteractions} from './dist/picture-interactions.js';

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
assert.equal(visible.filter(({id}) => id !== 'blank').length, 28);
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
    const poses = [.4, .8, 1.16, 1.52, 2.05, 2.44, 2.55, 3.8, 5.2].map(time => transformSticker(part, sticker, time));
    assert(poses.every(({x,y}) => Number.isFinite(x) && Number.isFinite(y)), id);
    assert(poses.some(({x,y,angle,scaleX,scaleY}) => x !== sticker.x || y !== sticker.y || angle !== 0 || scaleX !== 1 || scaleY !== 1), id);
  }
}
for (const {id} of visible.filter(({category}) => category === 'island')) {
  const regions = getFillRegions(id);
  const measure = createPaintProgress();
  assert.ok(regions.length >= 5, id);
  assert.equal(measure({pattern:id, strokes:[], fills:[{region:PAPER_REGION}]}), 0);
  assert.equal(measure({pattern:id, strokes:[], fills:regions.map(region => ({region:region.id}))}), 100);
  const [part] = motionFor(id);
  const [x, y] = regions[0].seeds[0];
  const rest = transformSticker(part, {x, y}, 0);
  if (id !== 'island-turtle-clean') {
    const keyframes = [1.25, 4.42, 7.31, 11.42].map(time => transformSticker(part, {x, y}, time));
    assert.equal(new Set(keyframes.map(frame => JSON.stringify(frame))).size, 4, id);
    assert.ok(keyframes.every(frame => Math.hypot(frame.x - rest.x, frame.y - rest.y) > 1), id);
    for (const time of [3.2, 5.8, 10, 13.6]) {
      const frame = transformSticker(part, {x,y}, time);
      assert.ok(['x','y','angle','scaleX','scaleY'].every(key => Math.abs(frame[key] - rest[key]) < 1e-9), id);
    }
  }
  const [top, rows] = paperMasks[id];
  for (let time = 0; time < 13.6; time += .1) {
    for (let i = 0; i < rows.length; i += 5) {
      for (const edge of rows[i]) {
        const frame = transformSticker(part, {x:edge,y:top + i}, time);
        assert.ok(frame.x > 8 && frame.x < W - 8 && frame.y > 8 && frame.y < H - 8, `${id} at ${time}`);
      }
    }
  }
}

assert.equal(Object.keys(pictureInteractions).length,19);
const parrot = motionFor('parrot-cute-clean');
assert.equal(motionPartAt('parrot-cute-clean',parrot,{x:500,y:600}),0);
assert.equal(motionPartAt('parrot-cute-clean',parrot,{x:500,y:750}),-1);
for (const id of Object.keys(pictureInteractions)) {
  const parts = motionFor(id);
  const frames = [0,1.6,2.7,3.8,4.9,6.0,7.1].map(time => pictureInteraction(id,time,parts,transformSticker));
  assert.deepEqual(frames[0].props,[]);
  assert.ok(frames.some(frame => frame.props.length), id);
  assert.ok(new Set(frames.map(({pose}) => JSON.stringify(pose))).size >= 3,id);
  for(const {pose,props} of frames) {
    assert.ok([pose.x,pose.y,pose.size,pose.stride].every(Number.isFinite),id);
    assert.ok(props.every(prop => Number.isFinite(prop.x) && Number.isFinite(prop.y)),id);
  }
}

const neck = motionFor('longneck-clean');
const dragonId = 'island-dragon-clean';
const dragon = motionFor(dragonId)[0];
const approach = pictureInteractionPose(dragonId, dragon, enterDuration, {});
assert.equal(approach.mounted, 0);
assert.equal(approach.gait, 'run');
for (const sample of [3, 4.4, 8.1, 11.7, 14.2]) {
  const rider = pictureInteractionPose(dragonId, dragon, sample, {bag:'wingpack'});
  const seat = transformSticker(dragon, {x:470,y:473}, sample);
  assert.equal(rider.gait, 'ride');
  assert.equal(rider.anchorY, 212);
  assert.deepEqual({x:rider.x,y:rider.y}, {x:seat.x,y:seat.y});
}
const ghostId = 'island-ghost-clean';
const ghost = motionFor(ghostId)[0];
const waiting = pictureInteractionPose(ghostId, ghost, ghostScareTime - .7, {});
const startled = pictureInteractionPose(ghostId, ghost, ghostScareTime + .14, {});
const fleeing = pictureInteractionPose(ghostId, ghost, ghostScareTime + .81, {});
assert.equal(waiting.scared, 0);
assert.equal(startled.scared, 1);
assert.ok(startled.y < waiting.y - 45);
assert.equal(fleeing.gait, 'run');
assert.ok(fleeing.x > waiting.x + 100 && fleeing.face === 1);
assert.equal(pictureInteractionPose(ghostId, ghost, ghostScareTime + islandLoopDuration + .81, {}).scared, 1);

const oceanId = 'ocean-friends-clean';
const ocean = motionFor(oceanId)[0];
const swimRight = pictureInteractionPose(oceanId, ocean, enterDuration + .65, {});
const swimLeft = pictureInteractionPose(oceanId, ocean, enterDuration + 3.5, {bag:'wingpack'});
assert.equal(swimRight.gait, 'swim');
assert.equal(swimLeft.gait, 'swim');
assert.ok(swimRight.lean > 1 && swimLeft.lean < -1);
assert.equal(swimRight.face, 1);
assert.equal(swimLeft.face, -1);
assert.notEqual(swimRight.swimStroke, swimLeft.swimStroke);

const busId = 'bus-clean';
const [bus] = motionFor(busId);
assert.equal(pictureInteractionPose(busId, bus, 1.8, {}).headOnly, undefined);
assert.ok(pictureInteractionPose(busId, bus, 2.64, {}).opacity < .5);
assert.deepEqual(bus.pose(0), bus.pose(busDepartureTime));
for (const time of [busDepartureTime, 4.0, 5.3, 6.8]) {
  const passenger = pictureInteractionPose(busId, bus, time, {hat:'rabbit-ears'});
  assert.equal(passenger.headOnly, true);
  assert.equal(passenger.window.length, 4);
  assert.deepEqual(passenger.window[0], transformSticker(bus, {x:540,y:339}, time));
  assert.deepEqual(passenger.window[2], transformSticker(bus, {x:661,y:461}, time));
}

assert.equal(motionPartAt('longneck-clean', neck, {x:642,y:174}), 0);
assert.equal(motionPartAt('longneck-clean', neck, {x:252,y:735}), -1);
assert.equal(motionPartAt('longneck-clean', neck, {x:30,y:32}), -1);
const head = transformSticker(neck[0], {x:642,y:174}, .875);
const foot = transformSticker(neck[0], {x:377,y:733}, .875);
assert(head.x - 642 > 25);
assert(head.y < 174);
assert(foot.x - 377 < 15);
const rabbit = motionFor('rabbit-clean')[0];
const takeoff = rabbit.pose(1.02);
const airborne = rabbit.pose(1.42);
const landing = rabbit.pose(1.82);
assert(airborne.dy < -100 && airborne.dx > takeoff.dx);
assert(landing.scaleY > takeoff.scaleY && landing.dx > airborne.dx);
for (const [id, bites] of Object.entries(fruitBites)) {
  const [fruit] = motionFor(id);
  const reset = fruitBiteCycle - .1;
  assert.deepEqual([0,...fruitBiteTimes,reset].map(time => fruit.cut(time).length), [0,1,2,3,0]);
  for (const [index, [x, y]] of bites.entries()) {
    const time = fruitBiteTimes[index];
    const target = transformSticker(fruit, {x, y}, time);
    const actor = pictureInteractionPose(id, fruit, time, {});
    assert.deepEqual({x:actor.x,y:actor.y}, {x:target.x,y:target.y});
    assert.equal(actor.anchorY, 113);
    assert.equal(actor.chew, 1);
    assert.equal(target.hidden, true);
    assert.equal(transformSticker(fruit, {x,y}, reset).hidden, false);
  }
}

const [watermelonFlesh, watermelonRind] = getFillRegions('watermelon');
for (const [x, y, radius] of fruitBites.watermelon) {
  const distanceToSpan = ([row, start, end]) =>
    Math.hypot(x - Math.max(start, Math.min(end - 1, x)), y - row);
  assert.ok(watermelonFlesh.spans.some(span => distanceToSpan(span) < radius));
  assert.ok(watermelonRind.spans.every(span => distanceToSpan(span) > radius + 7));
}
const halloween = motionFor('halloween-photo-v4-clean');
assert.equal(motionPartAt('halloween-photo-v4-clean', halloween, {x:710,y:710}), -1);
assert.equal(motionPartAt('halloween-photo-v4-clean', halloween, {x:699,y:592}), 1);
const whale = motionFor('whale-clean');
const whaleOwners = motionGeometry('whale-clean', whale);
assert.equal(motionPartAt('whale-clean', whale, {x:510,y:291}), 0, 'the back cannot split at the old clip');
assert.equal(motionPartAt('whale-clean', whale, {x:175,y:329}), 1, 'the left bubble moves independently');
assert.equal(motionPartAt('whale-clean', whale, {x:211,y:435}), -1);

const brushInk = new Uint8ClampedArray(W * H * 4);
for (let x = 100; x <= 380; x++) brushInk[(450 * W + x) * 4 + 3] = 128;
for (let x = 300; x <= 350; x++) brushInk[(460 * W + x) * 4 + 3] = 128;
brushInk[(460 * W + 100) * 4 + 3] = 128;
const movingInk = inkMotionOwners(brushInk, whaleOwners);
assert.equal(whaleOwners[450 * W + 350], 1);
assert.equal(movingInk[450 * W + 350], 1, 'the part of a wide stroke inside the whale still moves');
assert.equal(movingInk[450 * W + 100], 1, 'the overshoot moves too, leaving no cutout in the wide stroke');
assert.equal(movingInk[460 * W + 100], 0, 'an isolated background mark stays still');
assert.equal(movingInk[460 * W + 350], 1, 'ink wholly on the whale moves with it');

const turtle = motionFor('sea-turtle-clean');
const turtleOwners = motionGeometry('sea-turtle-clean', turtle);
const turtleInk = new Uint8ClampedArray(W * H * 4);
for (let x = 320; x <= 760; x++) turtleInk[(337 * W + x) * 4 + 3] = 255;
for (let x = 900; x <= 960; x++) turtleInk[(510 * W + x) * 4 + 3] = 255;
const turtleMotion = inkMotionOwners(turtleInk, turtleOwners);
assert.equal(turtleOwners[337 * W + 760], 0);
assert(turtleMotion.slice(337 * W + 320, 337 * W + 761).every(owner => owner === 1), 'the entire stroke moves, including the overhang');
assert(turtleMotion.slice(510 * W + 900, 510 * W + 961).every(owner => owner === 0), 'a background stroke stays put');

const connectedInk = new Uint8ClampedArray(10 * 4);
for (let i = 3; i < connectedInk.length; i += 4) connectedInk[i] = 255;
const sharedGeometry = Uint8Array.of(1,1,1,1,1,1,2,2,0,0);
assert.deepEqual([...inkMotionOwners(connectedInk, sharedGeometry, 10)], [1,1,1,1,1,1,2,2,1,1]);
assert.deepEqual([...inkMotionOwners(connectedInk, Uint8Array.of(1,1,1,1,1,1,1,2,0,0), 10)], [1,1,1,1,1,1,1,2,1,1]);
assert.deepEqual([...inkMotionOwners(connectedInk, Uint8Array.of(1,1,1,1,1,1,1,2,255,0), 10)],
  [1,1,1,1,1,1,1,2,0,1], 'ink on stationary line art stays attached to that art');

const boatRegions = getFillRegions('sailboat');
const boatInk = new Uint8ClampedArray(W * H * 4);
for (let i = 3; i < boatInk.length; i += 4) boatInk[i] = 128;
const boatCoverage = countPaintedArea(boatRegions, [], boatInk);
assert.equal(boatCoverage.painted, boatCoverage.total);
assert(boatCoverage.total < W * H * .6);
const boatMotion = inkMotionOwners(boatInk, motionGeometry('sailboat', motionFor('sailboat')));
for (const {spans} of boatRegions) {
  for (const [y, left, right] of spans) {
    assert(boatMotion.subarray(y * W + left, y * W + right).every(owner => owner === 1),
      'every painted pixel counted toward completion follows the boat');
  }
}
assert.equal(boatMotion[10 * W + 10], 1, 'attached brush marks retain their shape beyond the boat');

const boatParts = motionFor('sailboat');
const sun = {x:780,y:180};
const sunRays = [{x:780,y:60},{x:780,y:300},{x:660,y:180},{x:900,y:180}];
const sunOutline = {x:835,y:180};
for (const point of [sun, sunOutline, ...sunRays]) {
  assert.equal(motionPartAt('sailboat', boatParts, point), 0, 'the sun and all its rays move together');
}
assert.equal(motionPartAt('sailboat', boatParts, {x:500,y:810}), -1);
for (let time = 0; time < 9; time += .05) {
  const center = transformSticker(boatParts[0], sun, time);
  for (const point of sunRays) {
    const next = transformSticker(boatParts[0], point, time);
    assert(Math.abs(Math.hypot(next.x - center.x, next.y - center.y) - 120) < 1e-6);
    assert(next.x > 6 && next.x < W - 6 && next.y > 6 && next.y < H - 6, 'the full ray stays on the paper');
  }
}

const gardenCastle = motionFor('castle-garden-clean');
for (const [x,y] of [[820,145],[820,80],[820,210],[755,145],[885,145],[774,99],[866,99],[774,191],[866,191]]) {
  assert.equal(motionPartAt('castle-garden-clean', gardenCastle, {x,y}), 0, 'the garden sun moves with the flag it crosses');
}
assert.equal(motionPartAt('castle-garden-clean', gardenCastle, {x:770,y:205}), 0, 'the castle flag moves with its tower');
assert.equal(motionPartAt('castle-garden-clean', gardenCastle, {x:500,y:769}), -1, 'the garden path stays in the background');

for (const id of ['rabbit-clean', 'rocket-clean', 'princess-castle-clean']) {
  const [part] = motionFor(id);
  const [top, rows] = paperMasks[id];
  const upperOutline = rows.slice(0, 16).flatMap((row, i) => row.map(x => ({x, y:top + i})));
  for (let time = 0; time < 15; time += .05) {
    assert(upperOutline.every(point => transformSticker(part, point, time).y > 4),
      `${id}: upper outline stays visible throughout the animation`);
  }
}

assert.equal(stickers.length, 30);
assert.equal(new Set(stickers.map(([id]) => id)).size, 30);
const saved = {earned: true, opened: true, stickers: [{id:'crown',x:120,y:130}, {id:'missing',x:100,y:150}]};
const markup = rewardExportMarkup({reward:saved});
assert.match(markup, /translate\(76 86\)/);
assert(!markup.includes('missing'));
assert.equal(rewardExportMarkup({reward:{...saved,opened:false}}), '');
assert.match(rewardExportMarkup({reward:{completed:false,stickers:saved.stickers}}), /translate\(76 86\)/);
assert.deepEqual(rewardCollection({reward:saved,rewardCollection:['paw','paw','missing']}), ['paw','crown']);
const resetPicture = {reward:{completed:true,stickers:saved.stickers}, rewardCollection:['paw','crown']};
const artworkBeforeReset = rewardExportMarkup(resetPicture);
assert.deepEqual(changeRewardCollection(resetPicture, false), []);
assert.deepEqual(rewardCollection(JSON.parse(JSON.stringify(resetPicture))), []);
assert.equal(rewardExportMarkup(resetPicture), artworkBeforeReset);
assert.equal(resetPicture.reward.completed, true);
resetPicture.rewardCollection.push('moon');
assert.deepEqual(changeRewardCollection(resetPicture, true), ['paw','crown','moon']);
assert.equal(resetPicture.rewardCollectionBackup, undefined);
const picked = [];
for (let i = 0; i < 30; i++) picked.push(chooseReward(picked, () => .79));
assert.equal(new Set(picked).size, 30);
assert.equal(chooseReward(picked), null);
console.log(`PASS rewards: ${REWARD_THRESHOLD}% area, whole outlines and crossing ink, 28 moving scenes, and 30 unique collectible stickers`);
