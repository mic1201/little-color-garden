import {AVATAR_W, AVATAR_H, drawAvatar, drawWardrobeItem, itemById, makeAvatarInk, restoreOutfit, wardrobe} from './avatar-art.js';
import {drawActor, enterDuration, frame, insidePose, patrolPose, sceneById, stageToPicture} from './avatar-stage.js';
import {ORIGINAL_PAPER} from './paper.js';
import {transformSticker} from './reward-motion.js';

const KEY = 'little-color-garden-avatar-v1';
const people = ['boy', 'girl'];
const colors = [['莓果紅','#ef7790'], ['芒果黃','#edb247'], ['薄荷綠','#4faf85'], ['海水藍','#4b9dc6'], ['芋頭紫','#9873cf']];
const limit = (n, min, max) => Math.max(min, Math.min(n, max));
const mix = (a, b, u) => a + (b - a) * u;
const lerpRange = (n, start, end, a, b) => mix(a, b, limit((n - start) / (end - start), 0, 1));

export function restoreAvatar(saved) {
  const person = people.includes(saved?.person) ? saved.person : null;
  const profiles = Object.fromEntries(people.map(id => {
    const profile = saved?.profiles?.[id];
    const strokes = Array.isArray(profile?.strokes) ? profile.strokes.slice(-120).filter(stroke =>
      colors.some(([, color]) => color === stroke?.color) &&
      Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= 640 &&
      stroke.points.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
        p.x >= 0 && p.x <= AVATAR_W && p.y >= 0 && p.y <= AVATAR_H)
    ) : [];
    return [id, {equipped: restoreOutfit(profile?.equipped), strokes}];
  }));
  return {person, profiles};
}

function outsidePosition(pose, rect, extent) {
  const right = rect.x + rect.width;
  const edge = frame.x + frame.width;
  let x = lerpRange(pose.x, frame.x, edge, rect.x, right);
  if (pose.x < frame.x) x = lerpRange(pose.x, 79, frame.x, rect.x / 2, rect.x);
  if (pose.x > edge) x = lerpRange(pose.x, edge, 881, right, (right + extent.width) / 2);
  const bottom = rect.y + rect.height;
  const y = pose.y <= frame.y ? rect.y - 3
    : lerpRange(pose.y, frame.y, frame.y + frame.height, rect.y, bottom) +
      lerpRange(pose.y, frame.y + frame.height, 603, 0, extent.height - bottom - 4);
  const size = (pose.size ?? .326) * Math.min(rect.x, rect.y) / 94;
  return {...pose, x, y, size};
}

function genericPose(part, t, gear) {
  const [left, , right, bottom] = part.rect;
  const cycle = 2 * Math.PI * t / 5.5;
  const wing = gear.bag === 'wingpack';
  const rise = Math.max(0, (1 - Math.cos(cycle)) / 2);
  const mark = transformSticker(part, {x: (left + right) / 2, y: bottom}, t);
  return {
    x: mark.x + (wing ? 258 : 135) * Math.sin(cycle),
    y: mark.y + 55 - (wing ? 305 * rise : 64 * Math.abs(Math.sin(2 * cycle))),
    shadowY: mark.y + 55,
    size: .35,
    face: Math.cos(cycle) >= 0 ? 1 : -1,
    airborne: wing ? rise : 0,
    gait: wing ? 'flight' : 'hop',
    stride: .64 * Math.sin(4 * cycle),
    wave: rise
  };
}

function insidePosition(pattern, part, t, gear, rect, area) {
  const scene = sceneById.get(pattern);
  const demo = scene && insidePose(Math.max(t, enterDuration), {x:347, y:467}, scene, part, gear);
  const pose = demo ? {...demo, ...stageToPicture(demo.x, demo.y, pattern),
    shadowY: demo.shadowY === undefined ? undefined : stageToPicture(demo.x, demo.shadowY, pattern).y} : genericPose(part, t, gear);
  const size = pose.size * limit(Math.min(rect.width, rect.height) / 550, .40, 1);
  const x = limit(rect.x + (pose.x - area.x) * rect.width / area.width, rect.x + size * 127, rect.x + rect.width - size * 127);
  const minY = rect.y + size * 272;
  const maxY = rect.y + rect.height - 5;
  const y = limit(rect.y + (pose.y - area.y) * rect.height / area.height, minY, maxY);
  const shadowY = pose.shadowY === undefined ? undefined
    : limit(rect.y + (pose.shadowY - area.y) * rect.height / area.height, minY, maxY);
  return {...pose, x, y, size, shadowY};
}

function itemIcon(piece, size = 72) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.setAttribute('aria-hidden', 'true');
  drawWardrobeItem(canvas.getContext('2d'), piece);
  return canvas;
}

export function createGameAvatar({board, refit}) {
  const $ = selector => document.querySelector(selector);
  let stored;
  try { stored = JSON.parse(localStorage.getItem(KEY)); } catch { /* Start with a fresh character. */ }
  const state = restoreAvatar(stored);
  const track = $('#avatar-track');
  const ctx = track.getContext('2d');
  const sheet = track.parentElement;
  const open = $('#avatar-open');
  const icon = open.querySelector('canvas');
  const iconContext = icon.getContext('2d');
  const closet = $('#avatar-closet');
  const chooser = $('#avatar-choose');
  const chooserClose = $('#avatar-choose-close');
  const portrait = $('#avatar-portrait');
  const portraitContext = portrait.getContext('2d');
  const undo = $('#avatar-undo');
  const itemGrid = $('#avatar-items');
  const empty = $('#avatar-empty');
  const status = $('#reward-status');
  const ink = document.createElement('canvas');
  ink.width = AVATAR_W;
  ink.height = AVATAR_H;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let collection = new Set();
  let category = wardrobe[0];
  let color = colors[0][1];
  let pending;
  let pointer;
  let area = ORIGINAL_PAPER;
  let rect;
  let extent;
  let ratio;
  let frameId = 0;
  let last;
  let elapsed = 0;
  let entry;
  let playing = false;
  let gear = {};
  let returnToCloset = false;

  const profile = () => state.profiles[state.person];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { status.textContent = '主角暫存空間不足，這次造型會先保留在畫面上。'; }
  }

  function draw(pose, time, outside) {
    if (!state.person || !rect) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, extent.width, extent.height);
    ctx.save();
    if (outside) {
      ctx.beginPath();
      ctx.rect(0, 0, extent.width, extent.height);
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip('evenodd');
    }
    drawActor(ctx, state.person, gear, ink, pose, time);
    ctx.restore();
  }

  function outsideFrame(now) {
    frameId = 0;
    if (playing || document.hidden || closet.open || chooser.open || !rect) return;
    if (last !== undefined && !reduced.matches) elapsed += Math.min(.06, (now - last) / 1000);
    last = now;
    draw(outsidePosition(patrolPose(elapsed, gear), rect, extent), elapsed, true);
    if (!reduced.matches) schedule();
  }

  function schedule() {
    if (!frameId && state.person && !playing && !document.hidden) frameId = requestAnimationFrame(outsideFrame);
  }

  function updatePortrait() {
    if (!state.person) return;
    gear = Object.fromEntries(Object.entries(profile().equipped).filter(([, id]) => collection.has(id)));
    makeAvatarInk(ink, profile().strokes, pending);
    portraitContext.setTransform(2, 0, 0, 2, 0, 0);
    portraitContext.clearRect(0, 0, AVATAR_W, AVATAR_H);
    drawAvatar(portraitContext, state.person, gear, ink);
    undo.disabled = profile().strokes.length === 0;
    iconContext.setTransform(.40, 0, 0, .40, -20, -3);
    iconContext.clearRect(50, 7.5, 140, 140);
    drawAvatar(iconContext, state.person, gear, ink);
    schedule();
  }

  function renderCloset() {
    if (!state.person) return;
    const ids = category.items.filter(({id}) => collection.has(id));
    for (const tab of $('#avatar-slots').children) {
      const group = wardrobe.find(entry => entry.slot === tab.dataset.slot);
      tab.setAttribute('aria-pressed', String(group === category));
      tab.toggleAttribute('data-owned', group.items.some(({id}) => collection.has(id)));
    }
    empty.hidden = ids.length > 0;
    itemGrid.replaceChildren(...ids.map(piece => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(gear[category.slot] === piece.id));
      button.append(itemIcon(itemById.get(piece.id)), piece.name);
      button.onclick = () => {
        const slot = category.slot;
        const removing = profile().equipped[slot] === piece.id;
        if (removing) delete profile().equipped[slot];
        else profile().equipped[slot] = piece.id;
        for (const option of itemGrid.children) option.setAttribute('aria-pressed', String(!removing && option === button));
        updatePortrait();
        save();
        status.textContent = removing ? `已取下${piece.name}。` : `已穿戴${piece.name}。`;
      };
      return button;
    }));
  }

  for (const group of wardrobe) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.slot = group.slot;
    button.setAttribute('aria-label', group.name);
    button.textContent = group.icon;
    button.onclick = () => { category = group; renderCloset(); };
    $('#avatar-slots').append(button);
  }

  const swatches = colors.map(([name, tone]) => {
    const button = document.createElement('button');
    const swatch = document.createElement('span');
    button.type = 'button';
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', String(color === tone));
    swatch.style.setProperty('--avatar-color', tone);
    button.append(swatch);
    button.onclick = () => {
      color = tone;
      swatches.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    };
    undo.before(button);
    return button;
  });

  function portraitPoint(event) {
    const bounds = portrait.getBoundingClientRect();
    return {x: limit((event.clientX - bounds.left) * AVATAR_W / bounds.width, 0, AVATAR_W),
      y: limit((event.clientY - bounds.top) * AVATAR_H / bounds.height, 0, AVATAR_H)};
  }
  portrait.onpointerdown = event => {
    if (!event.isPrimary || event.button !== 0 || pending) return;
    event.preventDefault();
    pointer = event.pointerId;
    portrait.setPointerCapture(pointer);
    pending = {color, points: [portraitPoint(event)]};
    updatePortrait();
  };
  portrait.onpointermove = event => {
    if (!pending || event.pointerId !== pointer || pending.points.length >= 640) return;
    const point = portraitPoint(event);
    const lastPoint = pending.points.at(-1);
    if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 1) return;
    pending.points.push(point);
    updatePortrait();
  };
  function finishStroke(event) {
    if (!pending || event.pointerId !== pointer) return;
    if (event.type === 'pointerup') {
      profile().strokes.push(pending);
      if (profile().strokes.length > 120) profile().strokes.shift();
      save();
    }
    pending = undefined;
    pointer = undefined;
    updatePortrait();
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) portrait.addEventListener(event, finishStroke);
  undo.onclick = () => { profile().strokes.pop(); updatePortrait(); save(); };

  function showCloset() {
    delete open.dataset.new;
    renderCloset();
    closet.showModal();
  }
  function showChooser() {
    chooserClose.hidden = !state.person;
    chooser.showModal();
  }
  for (const button of chooser.querySelectorAll('[data-avatar-person]')) {
    const person = button.dataset.avatarPerson;
    drawAvatar(button.querySelector('canvas').getContext('2d'), person, {}, null);
    button.onclick = () => {
      state.person = person;
      updatePortrait();
      save();
      chooser.close();
    };
  }
  open.onclick = showCloset;
  $('#avatar-close').onclick = () => closet.close();
  $('#avatar-change').onclick = () => {
    returnToCloset = true;
    closet.close();
    showChooser();
  };
  chooserClose.onclick = () => chooser.close();
  chooser.addEventListener('cancel', event => { if (!state.person) event.preventDefault(); });
  chooser.addEventListener('close', () => {
    if (returnToCloset) {
      returnToCloset = false;
      showCloset();
    }
    last = undefined;
    schedule();
  });
  closet.addEventListener('close', () => {
    pending = undefined;
    pointer = undefined;
    updatePortrait();
    last = undefined;
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    last = undefined;
    schedule();
  });
  reduced.addEventListener('change', () => { last = undefined; schedule(); });

  sheet.classList.add('has-avatar');
  track.hidden = false;
  open.hidden = false;
  updatePortrait();
  requestAnimationFrame(refit);
  if (!state.person) showChooser();

  return {
    button: open,
    createIcon: id => itemIcon(itemById.get(id)),
    markReward(id) {
      category = wardrobe.find(group => group.slot === itemById.get(id).slot);
      if (closet.open) renderCloset();
      else open.dataset.new = '';
    },
    updateCollection(ids) {
      collection = new Set(ids.filter(id => itemById.has(id)));
      updatePortrait();
      if (closet.open) renderCloset();
    },
    resize(nextArea) {
      area = nextArea;
      const bounds = sheet.getBoundingClientRect();
      const paper = board.getBoundingClientRect();
      extent = {width: bounds.width, height: bounds.height};
      rect = {x: paper.left - bounds.left, y: paper.top - bounds.top, width: paper.width, height: paper.height};
      ratio = Math.min(1.8, window.devicePixelRatio || 1);
      const width = Math.round(extent.width * ratio);
      const height = Math.round(extent.height * ratio);
      if (track.width !== width || track.height !== height) {
        track.width = width;
        track.height = height;
      }
      schedule();
    },
    begin() {
      entry = patrolPose(elapsed, gear);
      playing = true;
      last = undefined;
    },
    stop() {
      playing = false;
      last = undefined;
      schedule();
    },
    playFrame(pattern, part, time) {
      if (!rect || !state.person) return;
      const pose = insidePosition(pattern, part, time, gear, rect, area);
      if (time < enterDuration) {
        const start = outsidePosition(entry, rect, extent);
        const u = time / enterDuration;
        const travel = u * u * (3 - 2 * u);
        const wing = gear.bag === 'wingpack';
        const rise = 4 * u * (1 - u);
        pose.face = start.x < pose.x ? 1 : -1;
        pose.x = mix(start.x, pose.x, travel);
        pose.y = mix(start.y, pose.y, travel) - (wing ? 25 : 9) * rise;
        pose.size = mix(start.size, pose.size, travel);
        pose.gait = wing ? 'flight' : 'run';
        pose.airborne = wing ? rise : 0;
        pose.stride = .75 * Math.sin(time * 19);
      }
      draw(pose, time, false);
    }
  };
}
