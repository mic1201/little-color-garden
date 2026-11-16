import {beginPaper, includePoint, ORIGINAL_PAPER, paperPoint, rasterSize} from './paper.js';
import {createPaintProgress, REWARD_THRESHOLD} from './reward-progress.js';
import {createMotionScene, drawMotionScene, motionFor, motionPartAt, transformSticker} from './reward-motion.js';
import {placedStickerArt, stickerArt, stickerById, stickerIcon, stickers, STICKER_SIZE, SVG_NS} from './reward-stickers.js';

const MAX_PLACED = 100;
const radius = STICKER_SIZE / 2;
const clamp = (n, low, high) => Math.max(low, Math.min(n, high));

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

export function rewardCollection(state) {
  const saved = Array.isArray(state.rewardCollection) ? state.rewardCollection.filter(id => stickerById.has(id)) : [];
  return [...new Set([...saved, ...readReward(state).stickers.map(sticker => sticker.id)])];
}

export function chooseReward(collected, random = Math.random) {
  const available = stickers.map(([id]) => id).filter(id => !collected.includes(id));
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

function stickerGhost(id) {
  const ghost = document.createElement('div');
  ghost.className = 'reward-floating-sticker';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.innerHTML = stickerIcon(id);
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

export function createRewards({board, ink, getState, motionArtwork, canCelebrate, save}) {
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
  const emptyTray = document.querySelector('#reward-empty');
  emptyTray.textContent = `塗色達到 ${REWARD_THRESHOLD}% 就能收集裝飾品。`;
  const status = document.querySelector('#reward-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure = createPaintProgress();
  const audio = createChestAudio();
  stickerLayer.hidden = false;
  stickerLayer.removeAttribute('hidden');
  trayButton.hidden = false;

  let state;
  let reward;
  let collected = [];
  let parts = [];
  let area = ORIGINAL_PAPER;
  let timer = 0;
  let frame = 0;
  let motionTime = 0;
  let generation = 0;
  let flyingReward;
  let drag;
  let suppressedClick;
  let stickerNodes = [];

  function persist() {
    state.reward = reward;
    state.rewardCollection = collected;
    save();
  }

  function setTrayOpen(open) {
    tray.hidden = !open;
    trayButton.setAttribute('aria-expanded', String(open));
    if (open) delete trayButton.dataset.new;
  }

  function updateInventory() {
    emptyTray.hidden = collected.length > 0;
    inventory.hidden = !collected.length;
  }

  function updatePlayback(playing) {
    playback.hidden = !reward?.completed || !parts.length;
    playback.toggleAttribute('data-playing', playing);
    const label = playing ? '暫停動畫，繼續作畫' : '播放動畫';
    playback.setAttribute('aria-label', label);
    playback.title = label;
  }

  function poseSticker(element, {x, y, angle = 0}) {
    element.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${STICKER_SIZE / 64}) translate(-32 -32)`);
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
    delete flight.item.dataset.arriving;
    flight.item.tabIndex = 0;
    celebration.hidden = true;
    if (tray.hidden) trayButton.dataset.new = '';
    status.textContent = `收集到${stickerById.get(flight.id).name}，可以打開裝飾品拖到畫布。`;
  }

  function stop() {
    generation++;
    cancelAnimationFrame(frame);
    board.removeAttribute('data-celebrating');
    updatePlayback(false);
    motionLayer.hidden = true;
    stickerNodes.forEach(({element, sticker}) => poseSticker(element, sticker));
    finishFlight();
  }

  async function play(manual = false) {
    if (!reward.completed || !parts.length || (reducedMotion.matches && !manual)) {
      updatePlayback(false);
      return;
    }
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
      function next(now) {
        motionTime = (now - started) / 1000;
        beginPaper(context, motionLayer, area);
        drawMotionScene(context, scene, motionTime);
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

  function showChest(id, item) {
    item.dataset.arriving = '';
    item.tabIndex = -1;
    const flight = {id, item};
    flyingReward = flight;
    celebration.hidden = false;
    flight.sound = setTimeout(audio.play, 295);
    flight.launch = setTimeout(() => {
      if (reducedMotion.matches) {
        finishFlight();
        return;
      }
      const center = centerOf(chest);
      const start = {x: center.x, y: center.y - chest.getBoundingClientRect().height * .12};
      if (!tray.hidden) item.scrollIntoView({block: 'nearest'});
      const end = centerOf(tray.hidden ? trayButton : item);
      flight.ghost = stickerGhost(id);
      if (!flight.ghost.animate) {
        finishFlight();
        return;
      }
      flight.animation = flight.ghost.animate([
        {transform: ghostAt(start, .55), opacity: 0},
        {transform: ghostAt({x: start.x, y: start.y - 55}, 1.18), opacity: 1, offset: .32},
        {transform: ghostAt(end, .57), opacity: 1}
      ], {duration: 720, easing: 'ease-in-out', fill: 'both'});
      flight.animation.finished.then(() => {
        if (flyingReward === flight) finishFlight();
      }).catch(() => {});
    }, reducedMotion.matches ? 520 : 565);
  }

  function award() {
    reward.completed = true;
    const id = chooseReward(collected);
    if (id) collected.push(id);
    persist();
    if (id) {
      const item = makeInventoryItem(id);
      inventory.append(item);
      updateInventory();
      showChest(id, item);
    }
    void play();
  }

  function sync() {
    clearTimeout(timer);
    const next = getState();
    if (next !== state) {
      cancelDrag();
      stop();
      state = next;
      reward = readReward(state);
      collected = rewardCollection(state);
      if (collected.length) state.rewardCollection = collected;
      parts = motionFor(state.pattern);
      renderStickers();
      inventory.replaceChildren(...collected.map(makeInventoryItem));
      updateInventory();
      setTrayOpen(false);
      updatePlayback(false);
      hud.hidden = true;
    }
    timer = setTimeout(() => {
      if (state !== getState() || !canCelebrate()) return;
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
    state.paper = includePoint(state.paper, sticker, radius);
    persist();
  }

  function addSticker(id, point) {
    if (reward.stickers.length >= MAX_PLACED) {
      status.textContent = '這張畫的裝飾品滿了，移除一個就能再加。';
      return;
    }
    const sticker = {id};
    reward.stickers.push(sticker);
    savePlacement(sticker, point);
    status.textContent = `${stickerById.get(id).name}已放到畫布上。`;
    return renderSticker(sticker);
  }

  function removeSticker(sticker) {
    reward.stickers.splice(reward.stickers.indexOf(sticker), 1);
    renderStickers();
    persist();
    status.textContent = `${stickerById.get(sticker.id).name}已收回裝飾品欄。`;
  }

  function startDrag(event, id, node, sticker) {
    if (drag || event.isPrimary === false || event.pointerType === 'mouse' && event.button !== 0) return;
    suppressedClick = null;
    const {clientX: x, clientY: y, pointerId} = event;
    const rect = board.getBoundingClientRect();
    const paperAtPointer = paperPoint(x, y, rect, area);
    const anchor = sticker && !motionLayer.hidden && parts[motionPartAt(state.pattern, parts, sticker)];
    const displayed = anchor ? transformSticker(anchor, sticker, motionTime) : sticker;
    drag = {
      pointerId, id, node, sticker, x, y, moved: false,
      offset: displayed ? {x: displayed.x - paperAtPointer.x, y: displayed.y - paperAtPointer.y} : {x: 0, y: 0}
    };
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
      stop();
      if (!drag.sticker) {
        tray.dataset.dragging = '';
        drag.ghost = stickerGhost(drag.id);
      }
    }
    event.preventDefault();
    if (drag.sticker) {
      poseSticker(drag.node, positionFromEvent(event, board.getBoundingClientRect(), drag.offset));
    } else {
      drag.ghost.style.transform = ghostAt({x: event.clientX, y: event.clientY});
    }
  }

  function inRect(x, y, {left, top, right, bottom}) {
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  function cancelDrag() {
    if (!drag) return;
    if (drag.sticker) poseSticker(drag.node, drag.sticker);
    drag.ghost?.remove();
    delete tray.dataset.dragging;
    drag = null;
  }

  function endDrag(event) {
    if (drag?.pointerId !== event.pointerId) return;
    const {id, sticker, node, moved, offset} = drag;
    cancelDrag();
    if (!moved || event.type !== 'pointerup') return;
    event.preventDefault();
    if (!sticker) {
      suppressedClick = node;
      setTimeout(() => { if (suppressedClick === node) suppressedClick = null; }, 350);
    }
    const rect = board.getBoundingClientRect();
    const {clientX: x, clientY: y} = event;
    if (sticker && (inRect(x, y, trayButton.getBoundingClientRect()) ||
        (!tray.hidden && inRect(x, y, tray.getBoundingClientRect())))) {
      removeSticker(sticker);
    } else if (inRect(x, y, rect)) {
      const point = positionFromEvent(event, rect, offset);
      if (sticker) {
        savePlacement(sticker, point);
        poseSticker(node, sticker);
      } else if (addSticker(id, point)) {
        setTrayOpen(false);
      }
    }
  }

  function makeInventoryItem(id) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'reward-item';
    item.dataset.sticker = id;
    item.setAttribute('aria-label', `${stickerById.get(id).name}，拖放到畫布`);
    item.title = stickerById.get(id).name;
    item.innerHTML = stickerIcon(id);
    item.addEventListener('pointerdown', event => startDrag(event, id, item));
    item.onclick = event => {
      if (event.detail && suppressedClick === item) return;
      stop();
      const placed = addSticker(id, position({x: area.x + area.width / 2, y: area.y + area.height / 2}));
      if (placed) {
        setTrayOpen(false);
        placed.focus();
      }
    };
    return item;
  }

  function renderSticker(sticker) {
    const element = document.createElementNS(SVG_NS, 'g');
    element.classList.add('placed-sticker');
    element.innerHTML = `<rect class="sticker-handle" width="64" height="64"/>${stickerArt(sticker.id)}`;
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `${stickerById.get(sticker.id).name}，可拖曳移動`);
    stickerLayer.append(element);
    stickerNodes.push({element, sticker});
    poseSticker(element, sticker);
    element.addEventListener('pointerdown', event => startDrag(event, sticker.id, element, sticker));
    element.addEventListener('keydown', event => {
      const delta = {ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1]}[event.key];
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
  }

  playback.onclick = () => {
    if (board.hasAttribute('data-celebrating')) {
      stop();
      status.textContent = '已回到原本的畫，現在可以繼續作畫。';
    } else {
      void play(true);
    }
  };
  trayButton.onclick = () => setTrayOpen(tray.hidden);
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
  board.addEventListener('pointerup', audio.warm);
  window.addEventListener('pointermove', moveDrag, {capture: true, passive: false});
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('blur', cancelDrag);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelDrag();
      stop();
    }
  });

  return {sync, resize, stop};
}
