import {beginPaper, includePoint, ORIGINAL_PAPER, paperPoint, rasterSize} from './paper.js';
import {createPaintProgress, REWARD_THRESHOLD} from './reward-progress.js';
import {createMotionScene, drawMotionScene, motionFor, motionPartAt, transformSticker} from './reward-motion.js';
import {createPlacedSticker, placedStickerArt, stickerById, stickerIcon, stickers, STICKER_SIZE, SVG_NS} from './reward-stickers.js';
import {itemById} from './avatar-art.js';

const MAX_PLACED = 100;
const RESUME_DELAY = 3000;
const radius = STICKER_SIZE / 2;
const arrowDelta = {ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1]};
const clamp = (n, low, high) => Math.max(low, Math.min(n, high));
const wearableKey = id => `wear:${id}`;
const outfitPiece = key => typeof key === 'string' && key.startsWith('wear:') ? itemById.get(key.slice(5)) : undefined;

function isSticker(sticker) {
  return sticker && stickerById.has(sticker.id) &&
    Number.isFinite(sticker.x) && Math.abs(sticker.x) <= 1001000 &&
    Number.isFinite(sticker.y) && Math.abs(sticker.y) <= 1001000;
}

function readReward(state) {
  const saved = state.reward;
  const completed = saved?.completed === true;
  const canReadPlacements = typeof saved?.completed === 'boolean' || saved?.earned === true && saved?.opened === true;
  return {
    completed,
    stickers: canReadPlacements && Array.isArray(saved.stickers)
      ? saved.stickers.filter(isSticker).slice(0, MAX_PLACED).map(({id, x, y}) => ({id, x, y}))
      : []
  };
}

function collectionIds(ids) {
  return Array.isArray(ids) ? ids.filter(id => stickerById.has(id) || outfitPiece(id)) : [];
}

export function rewardCollection(state) {
  const saved = collectionIds(state.rewardCollection);
  // Before a reset, older works can supply sticker IDs missing from the saved collection.
  const placed = Array.isArray(state.rewardCollectionBackup) ? [] : readReward(state).stickers.map(sticker => sticker.id);
  return [...new Set([...saved, ...placed])];
}

export function changeRewardCollection(state, restore) {
  const backup = [...new Set([...collectionIds(state.rewardCollectionBackup), ...rewardCollection(state)])];
  if (restore) {
    state.rewardCollection = backup;
    delete state.rewardCollectionBackup;
  } else {
    state.rewardCollectionBackup = backup;
    state.rewardCollection = [];
  }
  return state.rewardCollection;
}

export function chooseReward(collected, random = Math.random, wardrobe = false) {
  const ids = stickers.map(([id]) => id);
  if (wardrobe) ids.push(...[...itemById.keys()].map(wearableKey));
  const available = ids.filter(id => !collected.includes(id));
  return available[Math.floor(random() * available.length)] ?? null;
}

export function rewardExportMarkup(state) {
  const pieces = readReward(state).stickers;
  return pieces.length ? `<svg xmlns="${SVG_NS}" viewBox="0 0 1000 900">${pieces.map(placedStickerArt).join('')}</svg>` : '';
}

function createChestAudio() {
  let context;
  let pending = false;
  function playWhenReady() {
    if (!pending || context?.state !== 'running') return;
    pending = false;
    const start = context.currentTime + .025;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const at = start + i * .068;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(.001, at);
      volume.gain.exponentialRampToValueAtTime(.17 - i * .02, at + .016);
      volume.gain.exponentialRampToValueAtTime(.001, at + .32);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + .34);
      oscillator.onended = () => volume.disconnect();
    });
  }
  function warm() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ??= new Audio();
      if (context.state !== 'running') context.resume().then(playWhenReady).catch(() => {});
    } catch {
      // The on-screen celebration is still available.
    }
  }
  return {
    warm,
    play() {
      pending = true;
      playWhenReady();
    },
    clear() { pending = false; }
  };
}

function stickerGhost(id, icon) {
  const ghost = document.createElement('div');
  ghost.className = 'reward-floating-sticker';
  ghost.setAttribute('aria-hidden', 'true');
  if (icon) ghost.append(icon);
  else ghost.innerHTML = stickerIcon(id);
  document.body.append(ghost);
  return ghost;
}

function centerOf(element) {
  const {left, top, width, height} = element.getBoundingClientRect();
  return {x: left + width / 2, y: top + height / 2};
}

function ghostAt({x, y}, scale = 1) {
  return `translate(${x - 28}px,${y - 28}px) scale(${scale})`;
}

export function createRewards({board, ink, getState, motionArtwork, canCelebrate, save, avatar, testTools = false}) {
  const hud = board.querySelector('#reward-hud');
  const progress = board.querySelector('#reward-progress');
  const playback = board.querySelector('#reward-playback');
  const celebration = board.querySelector('#reward-celebration');
  const chest = board.querySelector('#reward-chest');
  const stickerLayer = board.querySelector('#reward-stickers');
  const motionLayer = board.querySelector('#reward-motion');
  const context = motionLayer.getContext('2d');
  const tray = document.querySelector('#reward-tray');
  const trayButton = document.querySelector('#reward-open');
  const inventory = document.querySelector('#reward-inventory');
  const collectionSettings = document.querySelector('#reward-collection-settings');
  const collectionCount = document.querySelector('#reward-collection-count');
  const resetCollection = document.querySelector('#reward-collection-reset');
  const restoreCollection = document.querySelector('#reward-collection-restore');
  const status = document.querySelector('#reward-status');
  const testUnlock = testTools ? document.querySelector('#test-unlock') : null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure = createPaintProgress();
  const audio = createChestAudio();
  stickerLayer.hidden = false;
  stickerLayer.removeAttribute('hidden');
  trayButton.hidden = false;
  collectionSettings.hidden = false;

  let state;
  let reward;
  let collected = [];
  let parts = [];
  let area = ORIGINAL_PAPER;
  let timer = 0;
  let resumeTimer;
  let resumePending = false;
  let drawingPointer;
  let frame = 0;
  let motionTime = 0;
  let generation = 0;
  let flyingReward;
  let drag;
  let suppressedClick;
  let stickerNodes = [];
  let testUnlocked = false;
  let testStickers = [];

  const availableStickers = () => testUnlocked ? stickers.map(([id]) => id) : collected.filter(id => stickerById.has(id));
  const canPlay = () => parts.length > 0 && reward?.completed === true;

  function persist() {
    state.reward = reward;
    state.rewardCollection = collected;
    save();
  }

  function setTrayOpen(open) {
    const changing = tray.hidden === open;
    tray.hidden = !open;
    trayButton.setAttribute('aria-expanded', String(open));
    if (open) delete trayButton.dataset.new;
    if (changing && avatar?.editing) {
      if (open) avatar.pauseEditor();
      else avatar.resumeEditor();
    }
    if (changing) scheduleResume();
  }

  function updateCollectionDisplay() {
    const stickerCount = collected.filter(id => stickerById.has(id)).length;
    collectionCount.textContent = avatar
      ? `已收集 ${stickerCount} 件裝飾品、${collected.length - stickerCount} 件穿搭`
      : `已收集 ${stickerCount} 件裝飾品`;
    resetCollection.disabled = collected.length === 0;
    restoreCollection.hidden = collectionIds(state.rewardCollectionBackup).length === 0;
    const outfits = testUnlocked ? [...itemById.keys()] : collected.map(id => outfitPiece(id)?.id).filter(Boolean);
    avatar?.updateCollection(outfits, testUnlocked);
  }

  function renderInventory() {
    const unlocked = new Set(availableStickers());
    const locked = stickers.filter(([id]) => !unlocked.has(id));
    inventory.replaceChildren(
      ...Array.from(unlocked, id => makeInventoryItem(id)),
      ...locked.map(([id]) => makeInventoryItem(id, true))
    );
    updateCollectionDisplay();
  }

  function updatePlayback(playing) {
    playback.hidden = !canPlay();
    playback.toggleAttribute('data-playing', playing);
    const label = playing ? '暫停動畫，繼續作畫' : '播放動畫';
    playback.setAttribute('aria-label', label);
    playback.title = label;
  }

  function poseSticker(element, {x, y, angle = 0, scaleX = 1, scaleY = 1, hidden = false}) {
    const ratio = STICKER_SIZE / 64;
    element.style.visibility = hidden ? 'hidden' : '';
    element.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${scaleX * ratio} ${scaleY * ratio}) translate(-32 -32)`);
  }

  function finishFlight() {
    if (!flyingReward) return;
    const flight = flyingReward;
    flyingReward = null;
    clearTimeout(flight.sound);
    clearTimeout(flight.launch);
    audio.clear();
    flight.animation?.cancel();
    flight.ghost?.remove();
    celebration.hidden = true;
    if (flight.piece) {
      avatar.markReward(flight.piece.id);
      status.textContent = `收集到${flight.piece.name}，可以到主角衣櫃穿上。`;
    } else {
      delete flight.item.dataset.arriving;
      flight.item.tabIndex = 0;
      if (tray.hidden) trayButton.dataset.new = '';
      status.textContent = `收集到${stickerById.get(flight.id).name}，可以打開裝飾品拖到畫布。`;
    }
  }

  function cancelResume() {
    clearTimeout(resumeTimer);
    resumePending = false;
  }

  function readyToResume() {
    return resumePending && drawingPointer === undefined && !drag && tray.hidden
      && canPlay() && canCelebrate() && !document.hidden && !reducedMotion.matches
      && !document.querySelector('dialog[open]');
  }

  function scheduleResume() {
    clearTimeout(resumeTimer);
    if (!readyToResume()) return;
    resumeTimer = setTimeout(() => {
      if (readyToResume()) void play();
    }, RESUME_DELAY);
  }

  function drawingStarted(pointerId) {
    drawingPointer = pointerId;
    clearTimeout(resumeTimer);
    if (board.hasAttribute('data-celebrating')) {
      resumePending = true;
      stop();
    }
  }

  function drawingEnded({pointerId}) {
    if (drawingPointer === undefined || pointerId !== drawingPointer) return;
    drawingPointer = undefined;
    sync();
    scheduleResume();
  }

  function stop(closeTray = false) {
    generation++;
    cancelAnimationFrame(frame);
    if (closeTray) {
      cancelResume();
      cancelDrag();
      setTrayOpen(false);
    }
    board.removeAttribute('data-celebrating');
    updatePlayback(false);
    motionLayer.hidden = true;
    avatar?.stop();
    stickerNodes.forEach(({element, sticker}) => poseSticker(element, sticker));
    finishFlight();
  }

  async function play(manual = false) {
    if (drawingPointer !== undefined) return;
    if (!canPlay() || (reducedMotion.matches && !manual)) {
      updatePlayback(false);
      return;
    }
    cancelResume();
    board.dataset.celebrating = '';
    updatePlayback(true);
    const ticket = generation;
    try {
      const snapshot = {...state, strokes: state.strokes.slice(), fills: state.fills?.slice()};
      const art = await motionArtwork(snapshot);
      if (ticket !== generation) return;
      const scene = createMotionScene(snapshot, art, parts);
      const anchors = stickerNodes.map(({sticker}) => parts[motionPartAt(state.pattern, parts, sticker)]);
      const started = performance.now();
      motionLayer.hidden = false;
      avatar?.begin();
      function next(now) {
        motionTime = (now - started) / 1000;
        beginPaper(context, motionLayer, area);
        drawMotionScene(context, scene, motionTime);
        avatar?.playFrame(snapshot.pattern, parts, motionTime);
        stickerNodes.forEach(({element, sticker}, i) => {
          if (anchors[i]) poseSticker(element, transformSticker(anchors[i], sticker, motionTime));
        });
        frame = requestAnimationFrame(next);
      }
      next(started);
    } catch {
      if (ticket !== generation) return;
      stop();
      status.textContent = '動畫暫時無法播放，可以繼續作畫。';
    }
  }

  function showChest(id, item, piece) {
    if (item) {
      item.dataset.arriving = '';
      item.tabIndex = -1;
    }
    const flight = {id, item, piece};
    flyingReward = flight;
    celebration.hidden = false;
    flight.sound = setTimeout(audio.play, 605);
    flight.launch = setTimeout(() => {
      if (reducedMotion.matches) {
        finishFlight();
        return;
      }
      const center = centerOf(chest);
      const start = {x: center.x, y: center.y - chest.getBoundingClientRect().height * .12};
      if (item && !tray.hidden) item.scrollIntoView({block: 'nearest'});
      const end = centerOf(piece ? avatar.button : tray.hidden ? trayButton : item);
      flight.ghost = stickerGhost(id, piece && avatar.createIcon(piece.id));
      if (!flight.ghost.animate) {
        finishFlight();
        return;
      }
      flight.animation = flight.ghost.animate([
        {transform: ghostAt(start, .52), opacity: 0, filter: 'drop-shadow(0 0 5px #fff5ab)'},
        {transform: ghostAt({x: start.x, y: start.y - 66}, 1.24), opacity: 1, filter: 'drop-shadow(0 0 16px #ffed8e)', offset: .35},
        {transform: ghostAt(end, .57), opacity: 1, filter: 'drop-shadow(0 0 2px #fff5ab)'}
      ], {duration: 1380, easing: 'ease-in-out', fill: 'both'});
      flight.animation.finished.then(() => {
        if (flyingReward === flight) finishFlight();
      }).catch(() => {});
    }, reducedMotion.matches ? 945 : 1230);
  }

  function award() {
    reward.completed = true;
    const id = chooseReward(collected, Math.random, Boolean(avatar));
    if (id) collected.push(id);
    persist();
    if (id) {
      const piece = outfitPiece(id);
      const item = piece ? null : makeInventoryItem(id);
      if (item) {
        inventory.querySelector(`[data-sticker="${id}"]`)?.remove();
        inventory.insertBefore(item, inventory.querySelector('[data-locked]'));
      }
      updateCollectionDisplay();
      showChest(id, item, piece);
    }
    void play();
  }

  function sync() {
    clearTimeout(timer);
    const next = getState();
    if (next !== state) {
      cancelResume();
      cancelDrag();
      stop();
      state = next;
      reward = readReward(state);
      testStickers = [];
      collected = rewardCollection(state);
      if (collected.length) state.rewardCollection = collected;
      parts = motionFor(state.pattern);
      renderStickers();
      renderInventory();
      setTrayOpen(false);
      updatePlayback(false);
      hud.hidden = true;
    }
    timer = setTimeout(() => {
      if (state !== getState() || drawingPointer !== undefined || !canCelebrate()) return;
      const percent = measure(state);
      hud.hidden = percent === null;
      if (percent === null) return;
      progress.textContent = `${percent}%`;
      progress.setAttribute('aria-label', `圖案塗色進度 ${percent}%`);
      if (percent >= REWARD_THRESHOLD && !reward.completed) award();
    }, 65);
  }

  function resize(view) {
    area = view;
    const size = rasterSize(area, 1200);
    if (motionLayer.width !== size.width || motionLayer.height !== size.height) {
      motionLayer.width = size.width;
      motionLayer.height = size.height;
    }
    stickerLayer.setAttribute('viewBox', `${area.x} ${area.y} ${area.width} ${area.height}`);
  }

  function position({x, y}) {
    return {
      x: clamp(x, area.x + radius, area.x + area.width - radius),
      y: clamp(y, area.y + radius, area.y + area.height - radius)
    };
  }

  function savePlacement(sticker, point) {
    Object.assign(sticker, point);
    if (testStickers.includes(sticker)) return;
    state.paper = includePoint(state.paper, sticker, radius);
    persist();
  }

  function addSticker(id, point) {
    if (reward.stickers.length + testStickers.length >= MAX_PLACED) {
      status.textContent = '這張畫的裝飾品滿了，移除一個就能再加。';
      return;
    }
    const sticker = {id};
    const placements = testUnlocked ? testStickers : reward.stickers;
    placements.push(sticker);
    savePlacement(sticker, point);
    status.textContent = `${stickerById.get(id).name}已放到畫布上。`;
    return renderSticker(sticker);
  }

  function removeSticker(sticker) {
    const testing = testStickers.includes(sticker);
    const placements = testing ? testStickers : reward.stickers;
    placements.splice(placements.indexOf(sticker), 1);
    renderStickers();
    if (!testing) persist();
    status.textContent = `${stickerById.get(sticker.id).name}${collected.includes(sticker.id) ? '已收回裝飾品欄' : '已從畫布移除'}。`;
  }

  function startDrag(event, id, node, sticker) {
    if (drag || event.isPrimary === false || event.pointerType === 'mouse' && event.button !== 0) return;
    suppressedClick = null;
    const {clientX: x, clientY: y, pointerId} = event;
    const editor = avatar?.editing ? avatar.decorations : null;
    let offset = {x:0, y:0};
    if (editor) {
      if (sticker) {
        const center = centerOf(node);
        offset = {x:center.x - x, y:center.y - y};
      }
      avatar.pauseEditor();
    } else if (sticker) {
      const point = paperPoint(x, y, board.getBoundingClientRect(), area);
      const anchor = !motionLayer.hidden && parts[motionPartAt(state.pattern, parts, sticker)];
      const displayed = anchor ? transformSticker(anchor, sticker, motionTime) : sticker;
      offset = {x:displayed.x - point.x, y:displayed.y - point.y};
    }
    drag = {pointerId, id, node, sticker, x, y, moved:false, offset, editor};
    if (sticker) event.preventDefault();
    try { node.setPointerCapture(pointerId); } catch { /* Window listeners also track the pointer. */ }
  }

  function positionFromEvent(event, rect, offset) {
    const point = paperPoint(event.clientX, event.clientY, rect, area);
    return position({x: point.x + offset.x, y: point.y + offset.y});
  }

  function moveDrag(event) {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
      drag.moved = true;
      if (!drag.editor) stop();
      if (!drag.sticker) {
        tray.dataset.dragging = '';
        drag.ghost = stickerGhost(drag.id);
      }
    }
    event.preventDefault();
    if (drag.sticker) {
      if (drag.editor) drag.editor.preview(drag.node, event.clientX + drag.offset.x, event.clientY + drag.offset.y);
      else poseSticker(drag.node, positionFromEvent(event, board.getBoundingClientRect(), drag.offset));
    } else {
      drag.ghost.style.transform = ghostAt({x: event.clientX, y: event.clientY});
    }
  }

  function inRect(x, y, {left, top, right, bottom}) {
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  function cancelDrag() {
    if (!drag) return;
    if (drag.editor) avatar.resumeEditor();
    else if (drag.sticker) poseSticker(drag.node, drag.sticker);
    drag.ghost?.remove();
    delete tray.dataset.dragging;
    drag = null;
    scheduleResume();
  }

  function endDrag(event) {
    if (drag?.pointerId !== event.pointerId) return;
    const {id, sticker, node, moved, offset, editor} = drag;
    try {
      if (!moved || event.type !== 'pointerup') return;
      event.preventDefault();
      if (!sticker) {
        suppressedClick = node;
        setTimeout(() => { if (suppressedClick === node) suppressedClick = null; }, 350);
      }
      const rect = editor ? editor.bounds() : board.getBoundingClientRect();
      const {clientX: x, clientY: y} = event;
      if (sticker && (inRect(x, y, trayButton.getBoundingClientRect()) ||
          (!tray.hidden && inRect(x, y, tray.getBoundingClientRect())))) {
        if (editor) editor.remove(sticker);
        else removeSticker(sticker);
      } else if (inRect(x, y, rect)) {
        if (editor) {
          if (sticker) editor.move(sticker, x + offset.x, y + offset.y);
          else if (addAvatarSticker(id, x, y)) setTrayOpen(false);
        } else {
          const point = positionFromEvent(event, rect, offset);
          if (sticker) savePlacement(sticker, point);
          else if (addSticker(id, point)) setTrayOpen(false);
        }
      }
    } finally {
      cancelDrag();
    }
  }

  function addAvatarSticker(id, x, y) {
    const placed = avatar.decorations.add(id, x, y);
    status.textContent = placed ? `${stickerById.get(id).name}已放到主角畫布上。`
      : '主角畫布的裝飾品滿了，移除一個就能再加。';
    return placed;
  }

  function makeInventoryItem(id, locked = false) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'reward-item';
    item.dataset.sticker = id;
    const name = stickerById.get(id).name;
    item.setAttribute('aria-label', `${name}，${locked ? '未解鎖' : '拖放到畫布'}`);
    item.innerHTML = stickerIcon(id);
    item.toggleAttribute('data-locked', locked);
    item.disabled = locked;
    if (locked) return item;
    item.addEventListener('pointerdown', event => startDrag(event, id, item));
    item.onclick = event => {
      if (event.detail && suppressedClick === item) return;
      let placed;
      if (avatar?.editing) {
        const {x, y} = centerOf(avatar.decorations.layer);
        placed = addAvatarSticker(id, x, y);
      } else {
        stop();
        placed = addSticker(id, position({x: area.x + area.width / 2, y: area.y + area.height / 2}));
      }
      if (placed) {
        setTrayOpen(false);
        placed.focus();
      }
    };
    return item;
  }

  function renderSticker(sticker) {
    const element = createPlacedSticker(sticker.id);
    stickerLayer.append(element);
    stickerNodes.push({element, sticker});
    poseSticker(element, sticker);
    element.addEventListener('pointerdown', event => startDrag(event, sticker.id, element, sticker));
    element.addEventListener('keydown', event => {
      const delta = arrowDelta[event.key];
      if (event.key !== 'Delete' && event.key !== 'Backspace' && !delta) return;
      event.preventDefault();
      stop();
      if (delta) {
        savePlacement(sticker, position({x: sticker.x + delta[0] * 12, y: sticker.y + delta[1] * 12}));
        poseSticker(element, sticker);
      } else {
        removeSticker(sticker);
        trayButton.focus();
      }
    });
    return element;
  }

  function renderStickers() {
    stickerLayer.replaceChildren();
    stickerNodes = [];
    reward.stickers.forEach(renderSticker);
    testStickers.forEach(renderSticker);
  }

  const editor = avatar?.decorations;
  editor?.layer.addEventListener('pointerdown', event => {
    const node = event.target.closest('.placed-sticker');
    const sticker = editor.lookup(node);
    if (avatar.editing && sticker) startDrag(event, sticker.id, node, sticker);
  });
  editor?.layer.addEventListener('keydown', event => {
    const node = event.target.closest('.placed-sticker');
    const sticker = editor.lookup(node);
    const delta = arrowDelta[event.key];
    if (!avatar.editing || !sticker || (!delta && event.key !== 'Delete' && event.key !== 'Backspace')) return;
    event.preventDefault();
    const {x, y} = centerOf(node);
    avatar.pauseEditor();
    if (delta) editor.move(sticker, x + delta[0] * 12, y + delta[1] * 12);
    else {
      editor.remove(sticker);
      trayButton.focus();
    }
    avatar.resumeEditor();
  });

  if (testUnlock) {
    testUnlock.hidden = false;
    testUnlock.onclick = () => {
      stop(true);
      testUnlocked = !testUnlocked;
      testStickers = [];
      testUnlock.setAttribute('aria-pressed', String(testUnlocked));
      renderInventory();
      renderStickers();
      updatePlayback(false);
      status.textContent = testUnlocked ? '已開啟測試用全解鎖。' : '已回到正式遊玩。';
      sync();
    };
  }

  playback.onclick = () => {
    if (board.hasAttribute('data-celebrating')) {
      stop();
      resumePending = true;
      scheduleResume();
      status.textContent = '已回到原本的畫，現在可以繼續作畫。';
    } else {
      void play(true);
    }
  };
  trayButton.onclick = () => setTrayOpen(tray.hidden);
  resetCollection.onclick = () => {
    stop();
    collected = changeRewardCollection(state, false);
    delete trayButton.dataset.new;
    renderInventory();
    persist();
    restoreCollection.focus();
  };
  restoreCollection.onclick = () => {
    finishFlight();
    collected = changeRewardCollection(state, true);
    renderInventory();
    persist();
    resetCollection.focus();
  };
  document.addEventListener('pointerdown', event => {
    if (!tray.hidden && !tray.contains(event.target) && !trayButton.contains(event.target) &&
        !event.target.closest('.placed-sticker')) setTrayOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || tray.hidden) return;
    event.preventDefault();
    cancelDrag();
    setTrayOpen(false);
    trayButton.focus();
  }, true);
  ink.addEventListener('pointerdown', audio.warm);
  ink.addEventListener('lostpointercapture', drawingEnded);
  board.addEventListener('pointerup', audio.warm);
  window.addEventListener('pointermove', moveDrag, {capture: true, passive: false});
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointerup', drawingEnded);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('pointercancel', drawingEnded);
  window.addEventListener('blur', cancelDrag);
  window.addEventListener('blur', () => drawingEnded({pointerId:drawingPointer}));
  document.addEventListener('close', scheduleResume, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelResume();
      drawingPointer = undefined;
      cancelDrag();
      stop();
    }
  });

  return {sync, resize, stop, drawingStarted};
}
