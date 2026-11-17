import {AVATAR_W, AVATAR_H, AVATAR_RAINBOW, drawAvatar, drawWardrobeItem, itemById, restoreOutfit, wardrobe} from './avatar-art.js';
import {createAvatarPainting} from './avatar-paint.js';
import {drawActor, enterDuration, insidePose, patrolPose, patrolTrack, sceneById, stageToPicture} from './avatar-stage.js';
import {createToolbarInteractions} from './avatar-toolbar.js';
import {ORIGINAL_PAPER} from './paper.js';
import {transformSticker} from './reward-motion.js';
import {RAINBOW_COLORS} from './fills.js';
import {TOOLS, STAMPS} from './engine.js';

const KEY = 'little-color-garden-avatar-v1';
const IDLE_DELAY = 3000;
const DEFAULT_BACKGROUND = '#fff8eb';
const people = ['boy', 'girl'];
const colors = [['莓果紅','#ef7790'], ['芒果黃','#edb247'], ['薄荷綠','#4faf85'], ['海水藍','#4b9dc6'], ['芋頭紫','#9873cf'], ['奶油白',DEFAULT_BACKGROUND]];
const brushColors = [...colors, ['彩虹色', AVATAR_RAINBOW]];
const rainbowPreview = `linear-gradient(135deg,${RAINBOW_COLORS.join(',')})`;
const colorSwatch = tone => tone === AVATAR_RAINBOW ? rainbowPreview : tone;
const limit = (n, min, max) => Math.max(min, Math.min(n, max));
const mix = (a, b, u) => a + (b - a) * u;
const lerpRange = (n, start, end, a, b) => mix(a, b, limit((n - start) / (end - start), 0, 1));

export function restoreAvatar(saved) {
  const person = people.includes(saved?.person) ? saved.person : null;
  const profiles = Object.fromEntries(people.map(id => {
    const profile = saved?.profiles?.[id];
    const equipped = restoreOutfit(profile?.equipped);
    const legacyOutfit = {...equipped};
    const strokes = Array.isArray(profile?.strokes) ? profile.strokes.slice(-120).filter(stroke =>
      brushColors.some(([, color]) => color === stroke?.color) &&
      (stroke.tool === undefined || TOOLS.includes(stroke.tool)) &&
      (stroke.stamp === undefined || STAMPS.includes(stroke.stamp)) &&
      (stroke.seed === undefined || Number.isInteger(stroke.seed) && stroke.seed >= 0 && stroke.seed <= 4294967295) &&
      Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= 640 &&
      stroke.points.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
        p.x >= 0 && p.x <= AVATAR_W && p.y >= 0 && p.y <= AVATAR_H)
    ).map(stroke => ({
      ...stroke,
      outfit: stroke.outfit ? restoreOutfit(stroke.outfit) : legacyOutfit
    })) : [];
    const background = typeof profile?.background === 'string' && /^#[0-9a-f]{6}$/i.test(profile.background)
      ? profile.background : DEFAULT_BACKGROUND;
    return [id, {equipped, strokes, background}];
  }));
  return {person, profiles, editorOpen: Boolean(person && saved?.editorOpen !== false)};
}

export function outsidePosition(pose, {width, height}) {
  const size = (pose.size ?? .326) * limit(Math.min(width, height) / 930, .31, .53);
  const side = Math.min(width / 2, size * 125 + 6);
  const top = Math.min(height / 2, size * 284 + 6);
  const x = lerpRange(pose.x, patrolTrack.left, patrolTrack.right, side, width - side);
  const y = lerpRange(pose.y, patrolTrack.top, patrolTrack.bottom, top, height - 6);
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

export function createGameAvatar({board, canInteract, onEditorChange}) {
  const $ = selector => document.querySelector(selector);
  let stored;
  try { stored = JSON.parse(localStorage.getItem(KEY)); } catch { /* Start with a fresh character. */ }
  const state = restoreAvatar(stored);
  const track = $('#avatar-track');
  const ctx = track.getContext('2d');
  const patternButton = $('#pattern-open');
  const tile = $('#avatar-pattern');
  const icon = tile.querySelector('canvas').getContext('2d');
  const open = $('#avatar-open');
  const closet = $('#avatar-closet');
  const chooser = $('#avatar-choose');
  const chooserClose = $('#avatar-choose-close');
  const palette = $('#avatar-color-picker');
  const portrait = $('#avatar-portrait');
  const portraitContext = portrait.getContext('2d');
  const undo = $('#avatar-undo');
  const tabs = $('#avatar-slots');
  const itemGrid = $('#avatar-items');
  const fitting = $('#avatar-fitting');
  const fittingContext = fitting.getContext('2d');
  const equip = $('#avatar-equip');
  const unequip = $('#avatar-unequip');
  const fittingStatus = $('#avatar-fitting-status');
  const status = $('#reward-status');
  const paintAvatar = createAvatarPainting();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let collection = new Set();
  let testOutfits;
  let fittingOutfit = {};
  let category = wardrobe[0];
  let color = colors[0][1];
  let tool = 'marker';
  let stamp = 'star';
  let ink;
  let colorTarget = 'brush';
  let pending;
  let pointer;
  let area = ORIGINAL_PAPER;
  let rect;
  let ratio;
  let frameId = 0;
  let last;
  let elapsed = 0;
  let entry;
  let playing = false;
  let editing = false;
  let gear = {};
  let idleTimer;
  let idleStart;

  const toolbarInteractions = createToolbarInteractions({
    toolbar: $('.drawing-toolbar'),
    layer: $('#avatar-toolbar-motion'),
    rewardTray: $('#reward-tray'),
    drawPlayer: (target, pose, time) => drawActor(target, state.person, gear, ink, pose, time)
  });
  const profile = () => state.profiles[state.person];
  const outfit = () => testOutfits?.[state.person] ?? profile().equipped;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { status.textContent = '主角暫存空間不足，這次造型會先保留在畫面上。'; }
  }

  function clearArtwork() {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function drawOnArtwork(pose, time) {
    if (!state.person || !rect) return;
    clearArtwork();
    drawActor(ctx, state.person, gear, ink, pose, time);
  }

  function outsideFrame(now) {
    frameId = 0;
    if (editing || playing || document.hidden || chooser.open || !rect) return;
    const delta = last === undefined || reduced.matches ? 0 : Math.min(.06, (now - last) / 1000);
    last = now;
    const wasInteracting = toolbarInteractions.active;
    if (!wasInteracting) elapsed += delta;
    const pose = outsidePosition(patrolPose(elapsed, gear), rect);
    if (toolbarInteractions.frame(pose, delta, !reduced.matches && canInteract())) {
      if (!wasInteracting) clearArtwork();
    } else drawOnArtwork(pose, elapsed);
    if (!reduced.matches) schedulePatrol();
  }

  function schedulePatrol() {
    if (!frameId && state.person && !editing && !playing && !document.hidden) frameId = requestAnimationFrame(outsideFrame);
  }

  function portraitLayout() {
    const scale = .82 * Math.min(rect.width / AVATAR_W, rect.height / AVATAR_H);
    return {scale, x:(rect.width - AVATAR_W * scale) / 2, y:(rect.height - AVATAR_H * scale) / 2};
  }

  function paintPortrait(target, t, marks = ink) {
    if (!rect || !state.person) return;
    const {x, y, scale} = portraitLayout();
    target.setTransform(ratio, 0, 0, ratio, 0, 0);
    target.fillStyle = profile().background;
    target.fillRect(0, 0, rect.width + 1, rect.height + 1);
    if (t === undefined) {
      target.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * x, ratio * y);
      drawAvatar(target, state.person, gear, marks);
      return;
    }
    const wave = Math.sin(t * Math.PI * 2 / 4);
    const wing = gear.bag === 'wingpack';
    const rabbit = gear.hat === 'rabbit-ears';
    const lift = Math.max(0, wave);
    const ground = y + 280 * scale;
    const bounce = (wing ? 44 : rabbit ? 27 : 10) * lift;
    drawActor(target, state.person, gear, marks, {
      x:x + 122 * scale + 24 * scale * wave,
      y:ground - bounce * scale,
      size:scale,
      shadowY:ground,
      wave:Math.max(0, -wave),
      stride:.48 * wave,
      airborne:wing ? lift : 0,
      gait:wing ? 'flight' : 'hop'
    }, t);
  }

  const readyToAnimate = () => editing && !pending && !document.hidden && !document.querySelector('dialog[open]');
  function idleFrame(now) {
    frameId = 0;
    if (!readyToAnimate() || reduced.matches) {
      cancelIdle();
      return;
    }
    idleStart ??= now;
    paintPortrait(portraitContext, (now - idleStart) / 1000);
    frameId = requestAnimationFrame(idleFrame);
  }

  function cancelIdle() {
    clearTimeout(idleTimer);
    if (!editing) return;
    cancelAnimationFrame(frameId);
    frameId = 0;
    idleStart = undefined;
    portrait.setAttribute('aria-label', '主角畫布，用手指畫在主角身上');
    paintPortrait(portraitContext);
  }

  function resetIdle() {
    cancelIdle();
    if (!readyToAnimate() || reduced.matches) return;
    idleTimer = setTimeout(() => {
      if (!readyToAnimate()) return;
      portrait.setAttribute('aria-label', '主角正在動，碰一下畫布繼續作畫');
      frameId = requestAnimationFrame(idleFrame);
    }, IDLE_DELAY);
  }

  function updatePortrait() {
    if (!state.person) return;
    gear = Object.fromEntries(Object.entries(outfit()).filter(([, id]) => collection.has(id)));
    ink = paintAvatar(state.person, profile().strokes, pending);
    undo.disabled = profile().strokes.length === 0;
    icon.setTransform(1, 0, 0, 1, 0, 0);
    icon.clearRect(0, 0, 76, 76);
    icon.setTransform(.52, 0, 0, .52, -25, 4);
    drawAvatar(icon, state.person, gear, ink);
    if (editing) paintPortrait(portraitContext);
    else schedulePatrol();
  }

  function updateFitting() {
    const shown = {...gear, ...fittingOutfit};
    fittingContext.clearRect(0, 0, fitting.width, fitting.height);
    drawAvatar(fittingContext, state.person, shown, ink);
    const equipped = gear[category.slot];
    const selected = shown[category.slot];
    for (const button of itemGrid.children) {
      button.setAttribute('aria-pressed', String(button.dataset.item === selected));
      button.toggleAttribute('data-equipped', button.dataset.item === equipped);
    }
    equip.disabled = !collection.has(selected) || selected === equipped;
    unequip.disabled = !equipped;
    const locked = Boolean(selected && !collection.has(selected));
    fittingStatus.hidden = !locked;
    fittingStatus.textContent = locked ? '這件可以試穿，從寶箱取得後就能裝備。' : '';
  }

  function renderCloset() {
    if (!state.person) return;
    for (const tab of tabs.children) {
      const group = wardrobe.find(entry => entry.slot === tab.dataset.slot);
      tab.setAttribute('aria-pressed', String(group === category));
      tab.toggleAttribute('data-owned', group.items.some(({id}) => collection.has(id)));
    }
    itemGrid.replaceChildren(...category.items.map(piece => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.item = piece.id;
      const locked = !collection.has(piece.id);
      button.toggleAttribute('data-locked', locked);
      button.setAttribute('aria-label', locked ? `${piece.name}，未解鎖，可試穿` : piece.name);
      button.append(itemIcon(itemById.get(piece.id)), piece.name);
      button.onclick = () => {
        fittingOutfit[category.slot] = piece.id;
        updateFitting();
      };
      return button;
    }));
    updateFitting();
  }

  function applyOutfit(id) {
    const slot = category.slot;
    if (id && (!collection.has(id) || itemById.get(id)?.slot !== slot)) return;
    if (id) outfit()[slot] = id;
    else delete outfit()[slot];
    delete fittingOutfit[slot];
    updatePortrait();
    updateFitting();
    if (!testOutfits) save();
  }
  equip.onclick = () => {
    const selected = fittingOutfit[category.slot];
    if (selected) applyOutfit(selected);
  };
  unequip.onclick = () => applyOutfit();

  for (const group of wardrobe) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.slot = group.slot;
    button.setAttribute('aria-label', group.name);
    button.textContent = group.icon;
    button.onclick = () => { category = group; renderCloset(); };
    tabs.append(button);
  }

  const colorTargets = [...$('#avatar-color-targets').children];
  function renderPalette() {
    const selected = colorTarget === 'background' ? profile().background : color;
    for (const button of colorTargets) {
      button.setAttribute('aria-pressed', String(button.dataset.target === colorTarget));
    }
    for (const button of $('#avatar-colors').children) {
      button.hidden = colorTarget === 'background' && button.dataset.color === AVATAR_RAINBOW;
      button.setAttribute('aria-pressed', String(button.dataset.color === selected));
    }
  }
  for (const button of colorTargets) {
    button.onclick = () => { colorTarget = button.dataset.target; renderPalette(); };
  }
  for (const [name, tone] of brushColors) {
    const button = document.createElement('button');
    const swatch = document.createElement('span');
    button.type = 'button';
    button.dataset.color = tone;
    button.setAttribute('aria-label', name);
    swatch.style.setProperty('--avatar-color', colorSwatch(tone));
    button.append(swatch);
    button.onclick = () => {
      if (colorTarget === 'background') {
        if (tone === AVATAR_RAINBOW) return;
        profile().background = tone;
        save();
        paintPortrait(portraitContext);
      } else {
        color = tone;
        $('#avatar-current-color').style.background = colorSwatch(tone);
      }
      palette.close();
    };
    $('#avatar-colors').append(button);
  }
  $('#avatar-current-color').style.background = color;
  $('#avatar-color-open').onclick = () => { cancelIdle(); renderPalette(); palette.showModal(); };
  $('#avatar-color-close').onclick = () => palette.close();

  function portraitPoint(event) {
    const bounds = portrait.getBoundingClientRect();
    const {x, y, scale} = portraitLayout();
    return {x: (event.clientX - bounds.left - x) / scale, y: (event.clientY - bounds.top - y) / scale};
  }
  function appendPoint(point) {
    if (point.x < 0 || point.x > AVATAR_W || point.y < 0 || point.y > AVATAR_H) return;
    const lastPoint = pending.points.at(-1);
    if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >= 1) pending.points.push(point);
  }
  portrait.onpointerdown = event => {
    if (!editing || !rect || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || pending) return;
    event.preventDefault();
    cancelIdle();
    pointer = event.pointerId;
    portrait.setPointerCapture(pointer);
    pending = {color, tool, stamp, seed:crypto.getRandomValues(new Uint32Array(1))[0], outfit:{...gear}, points:[]};
    appendPoint(portraitPoint(event));
    updatePortrait();
  };
  portrait.onpointermove = event => {
    if (!pending || event.pointerId !== pointer || pending.points.length >= 640) return;
    appendPoint(portraitPoint(event));
    updatePortrait();
  };
  function finishStroke(commit) {
    if (!pending) return;
    if (commit && pending.points.length) {
      profile().strokes.push(pending);
      if (profile().strokes.length > 120) profile().strokes.shift();
      save();
    }
    pending = undefined;
    pointer = undefined;
    updatePortrait();
    resetIdle();
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    portrait.addEventListener(event, e => {
      if (e.pointerId === pointer) finishStroke(event === 'pointerup');
    });
  }
  undo.onclick = () => { profile().strokes.pop(); updatePortrait(); save(); resetIdle(); };

  function setEditing(value) {
    if (editing === value) return;
    toolbarInteractions.cancel();
    if (!value) finishStroke(true);
    cancelIdle();
    cancelAnimationFrame(frameId);
    frameId = 0;
    editing = value;
    state.editorOpen = value;
    last = undefined;
    track.hidden = value;
    portrait.hidden = !value;
    tile.setAttribute('aria-pressed', String(value));
    onEditorChange(value);
    save();
    if (value) resetIdle();
    else schedulePatrol();
  }

  function showChooser() {
    cancelIdle();
    chooserClose.hidden = !state.person;
    chooser.showModal();
  }
  for (const button of chooser.querySelectorAll('[data-avatar-person]')) {
    const person = button.dataset.avatarPerson;
    drawAvatar(button.querySelector('canvas').getContext('2d'), person, {}, null);
    button.onclick = () => {
      state.person = person;
      updatePortrait();
      chooser.close();
      setEditing(true);
      save();
      resetIdle();
    };
  }
  tile.onclick = () => {
    $('#pattern-dialog').close();
    if (state.person) setEditing(true);
    else showChooser();
  };
  open.onclick = () => {
    cancelIdle();
    fittingOutfit = {};
    delete open.dataset.new;
    delete tile.dataset.new;
    delete patternButton.dataset.newAvatar;
    renderCloset();
    closet.showModal();
  };
  $('#avatar-close').onclick = () => closet.close();
  $('#avatar-change').onclick = () => { closet.close(); showChooser(); };
  chooserClose.onclick = () => chooser.close();
  chooser.addEventListener('cancel', event => { if (!state.person) event.preventDefault(); });
  document.addEventListener('close', resetIdle, true);
  for (const event of ['pointerdown', 'click']) {
    document.addEventListener(event, toolbarInteractions.cancel, true);
  }
  document.addEventListener('visibilitychange', () => {
    last = undefined;
    if (document.hidden) {
      finishStroke(true);
      toolbarInteractions.cancel();
    }
    resetIdle();
    schedulePatrol();
  });
  reduced.addEventListener('change', () => { last = undefined; resetIdle(); schedulePatrol(); });

  return {
    button: patternButton,
    get editing() { return editing; },
    get tool() { return tool; },
    get stamp() { return stamp; },
    setTool(value) { tool = value; },
    setStamp(value) { stamp = value; },
    start() {
      tile.hidden = false;
      track.hidden = false;
      updatePortrait();
      if (!state.person) showChooser();
      else if (state.editorOpen) setEditing(true);
    },
    showDrawing() { setEditing(false); },
    pauseEditor() { if (editing) { finishStroke(true); cancelIdle(); } },
    exportCanvas(blank = false) {
      const copy = document.createElement('canvas');
      copy.width = portrait.width;
      copy.height = portrait.height;
      paintPortrait(copy.getContext('2d'), undefined, blank ? null : ink);
      return copy;
    },
    clearMarks() {
      profile().strokes = [];
      updatePortrait();
      save();
      resetIdle();
    },
    createIcon: id => itemIcon(itemById.get(id)),
    markReward(id) {
      category = wardrobe.find(group => group.slot === itemById.get(id).slot);
      tile.dataset.new = '';
      patternButton.dataset.newAvatar = '';
      open.dataset.new = '';
    },
    updateCollection(ids, testUnlocked = false) {
      if (testUnlocked) testOutfits ??= Object.fromEntries(people.map(id => [id, {...state.profiles[id].equipped}]));
      else testOutfits = undefined;
      collection = new Set(ids.filter(id => itemById.has(id)));
      updatePortrait();
      if (closet.open) renderCloset();
    },
    resize(nextArea) {
      area = nextArea;
      const bounds = board.getBoundingClientRect();
      toolbarInteractions.resize(bounds);
      rect = {x:0, y:0, width:Math.max(1,bounds.width), height:Math.max(1,bounds.height)};
      ratio = Math.min(1.8, window.devicePixelRatio || 1);
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      for (const layer of [portrait, track]) {
        if (layer.width !== width || layer.height !== height) {
          layer.width = width;
          layer.height = height;
        }
      }
      if (editing) {
        finishStroke(true);
        paintPortrait(portraitContext);
      } else schedulePatrol();
    },
    begin() {
      toolbarInteractions.cancel();
      entry = patrolPose(elapsed, gear);
      playing = true;
      last = undefined;
    },
    stop() {
      playing = false;
      last = undefined;
      schedulePatrol();
    },
    playFrame(pattern, part, time) {
      if (!rect || !state.person || editing) return;
      const pose = insidePosition(pattern, part, time, gear, rect, area);
      if (time < enterDuration) {
        const start = outsidePosition(entry, rect);
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
      drawOnArtwork(pose, time);
    }
  };
}
