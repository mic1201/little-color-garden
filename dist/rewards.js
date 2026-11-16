import {beginPaper, includePoint, ORIGINAL_PAPER, paperPoint, rasterSize} from './paper.js';
import {createPaintProgress, REWARD_THRESHOLD} from './reward-progress.js';
import {createMotionScene, drawMotionScene, motionFor, motionPartAt, transformSticker} from './reward-motion.js';
import {placedStickerArt, stickerArt, stickerById, stickerIcon, stickers, STICKER_SIZE, SVG_NS} from './reward-stickers.js';

const MAX_STICKERS = 100;
const radius = STICKER_SIZE / 2;

function isSticker(sticker) {
  return sticker && stickerById.has(sticker.id) &&
    Number.isFinite(sticker.x) && Math.abs(sticker.x) <= 1001000 &&
    Number.isFinite(sticker.y) && Math.abs(sticker.y) <= 1001000;
}

function readReward(state) {
  const saved = state.reward;
  return {
    earned: saved?.earned === true,
    opened: saved?.earned === true && saved?.opened === true,
    stickers: saved?.earned === true && saved?.opened === true && Array.isArray(saved.stickers)
      ? saved.stickers.filter(isSticker).slice(0, MAX_STICKERS).map(({id, x, y}) => ({id, x, y}))
      : []
  };
}

export function rewardExportMarkup(state) {
  const pieces = readReward(state).stickers;
  return pieces.length ? `<svg xmlns="${SVG_NS}" viewBox="0 0 1000 900">${pieces.map(placedStickerArt).join('')}</svg>` : '';
}

function playChestSound() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return;
  try {
    const context = new Audio();
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
      if (i === 4) oscillator.onended = () => context.close().catch(() => {});
    });
    context.resume().catch(() => context.close().catch(() => {}));
  } catch {
    // The reward is also announced visually when audio is unavailable.
  }
}

export function createRewards({board, ink, getState, drawArtwork, save}) {
  const hud = board.querySelector('#reward-hud');
  const chest = board.querySelector('#reward-chest');
  const chestLabel = board.querySelector('#reward-chest-label');
  const progress = board.querySelector('#reward-progress');
  const preview = board.querySelector('#reward-preview');
  const previewLabel = board.querySelector('#reward-preview-label');
  const stickerLayer = board.querySelector('#reward-stickers');
  stickerLayer.removeAttribute('hidden');
  const motionLayer = board.querySelector('#reward-motion');
  const context = motionLayer.getContext('2d');
  const dialog = document.querySelector('#reward-dialog');
  const catalog = dialog.querySelector('#reward-catalog');
  const close = dialog.querySelector('#reward-close');
  const remove = dialog.querySelector('#reward-remove');
  const status = document.querySelector('#reward-status');
  const measure = createPaintProgress();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state;
  let reward;
  let parts = [];
  let area = ORIGINAL_PAPER;
  let timer = 0;
  let frame = 0;
  let generation = 0;
  let playing = false;
  let time = 0;
  let selected = -1;
  let drag = null;
  let resumeOnClose = false;
  let stickerNodes = [];

  function setPlaying(value) {
    playing = value;
    preview.setAttribute('aria-pressed', String(value));
    previewLabel.textContent = value ? '暫停動畫' : '試看動畫';
  }

  function poseSticker(index, placement) {
    const node = stickerNodes[index];
    const anchor = playing ? parts[node.part] : null;
    const pose = anchor ? transformSticker(anchor, placement, time) : placement;
    node.element.setAttribute('transform',
      `translate(${pose.x} ${pose.y}) rotate(${pose.angle ?? 0}) scale(${STICKER_SIZE / 64}) translate(-32 -32)`);
  }

  function stop() {
    generation++;
    cancelAnimationFrame(frame);
    setPlaying(false);
    motionLayer.hidden = true;
    if (reward) reward.stickers.forEach((sticker, i) => poseSticker(i, sticker));
  }

  async function play() {
    if (!parts.length) return;
    stop();
    setPlaying(true);
    const ticket = generation;
    try {
      const snapshot = {...state, strokes: state.strokes.slice(), fills: state.fills?.slice()};
      const source = await drawArtwork(snapshot, ORIGINAL_PAPER, 1000);
      if (ticket !== generation) return;
      const scene = createMotionScene(snapshot, source, parts);
      motionLayer.hidden = false;
      const started = performance.now();
      function next(now) {
        time = (now - started) / 1000;
        beginPaper(context, motionLayer, area);
        drawMotionScene(context, scene, time);
        reward.stickers.forEach((sticker, i) => poseSticker(i, sticker));
        frame = requestAnimationFrame(next);
      }
      next(started);
    } catch {
      if (ticket !== generation) return;
      stop();
      status.textContent = '動畫暫時無法播放，請再試一次。';
    }
  }

  function updateHud(percent) {
    hud.hidden = percent === null;
    if (percent === null) return;
    progress.textContent = `${percent}%`;
    progress.setAttribute('aria-label', `圖案塗色進度 ${percent}%`);
    chest.disabled = !reward.earned;
    chest.dataset.ready = String(reward.earned);
    chestLabel.textContent = reward.opened ? '裝飾品' : '寶箱';
    chest.title = reward.earned ? chestLabel.textContent : '圖案塗到 85% 就能開寶箱';
    chest.setAttribute('aria-label', chest.title);
  }

  function sync() {
    clearTimeout(timer);
    const next = getState();
    if (next !== state) {
      stop();
      state = next;
      reward = readReward(state);
      parts = motionFor(state.pattern);
      selected = -1;
      drag = null;
      renderStickers();
      updateHud(parts.length ? 0 : null);
    }
    timer = setTimeout(() => {
      if (state !== getState()) return;
      const percent = measure(state);
      if (percent !== null && percent >= REWARD_THRESHOLD && !reward.earned) {
        reward.earned = true;
        persist();
        status.textContent = '寶箱解鎖了！點一下寶箱選裝飾品。';
        if (!reducedMotion.matches) void play();
      }
      updateHud(percent);
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

  function persist() {
    state.reward = reward;
    save();
  }

  function select(index) {
    selected = index;
    remove.hidden = selected < 0;
    stickerNodes.forEach(({element}, i) => element.classList.toggle('selected-sticker', i === selected));
  }

  function removeSticker(index) {
    if (!reward.stickers[index]) return;
    stop();
    const [sticker] = reward.stickers.splice(index, 1);
    selected = -1;
    renderStickers();
    persist();
    status.textContent = `${stickerById.get(sticker.id).name}已移除`;
  }

  function locate(event) {
    return paperPoint(event.clientX, event.clientY, board.getBoundingClientRect(), area);
  }

  function moveSticker(index, point) {
    Object.assign(reward.stickers[index], point);
    poseSticker(index, reward.stickers[index]);
  }

  function savePlacement(sticker) {
    state.paper = includePoint(state.paper, sticker, radius);
    persist();
  }

  function renderStickers() {
    stickerLayer.replaceChildren();
    stickerNodes = reward.stickers.map((sticker, index) => {
      const element = document.createElementNS(SVG_NS, 'g');
      element.classList.add('placed-sticker');
      element.innerHTML = `<rect class="sticker-handle" x="0" y="0" width="64" height="64" rx="11"/>${stickerArt(sticker.id)}`;
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', stickerById.get(sticker.id).name + '，可拖曳移動');
      stickerLayer.append(element);
      return {element, part: motionPartAt(state.pattern, parts, sticker)};
    });
    stickerNodes.forEach(({element}, index) => {
      const sticker = reward.stickers[index];
      poseSticker(index, sticker);
      element.addEventListener('pointerdown', event => {
        if (drag || !event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        const resume = playing;
        const part = playing && parts[stickerNodes[index].part];
        const position = part ? transformSticker(part, sticker, time) : sticker;
        const here = locate(event);
        stop();
        select(index);
        element.focus({preventScroll: true});
        element.setPointerCapture(event.pointerId);
        drag = {
          index, pointer: event.pointerId, x: position.x - here.x, y: position.y - here.y,
          startX: event.clientX, startY: event.clientY, original: {x: sticker.x, y: sticker.y}, moved: false, resume
        };
      });
      element.addEventListener('pointermove', event => {
        if (drag?.pointer !== event.pointerId || drag.index !== index) return;
        if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 3) return;
        drag.moved = true;
        const point = locate(event);
        moveSticker(index, {
          x: Math.max(area.x + radius, Math.min(area.x + area.width - radius, point.x + drag.x)),
          y: Math.max(area.y + radius, Math.min(area.y + area.height - radius, point.y + drag.y))
        });
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        element.addEventListener(eventName, event => {
          if (drag?.pointer !== event.pointerId || drag.index !== index) return;
          const finished = drag;
          drag = null;
          if (eventName !== 'pointerup') moveSticker(index, finished.original);
          stickerNodes[index].part = motionPartAt(state.pattern, parts, sticker);
          if (eventName === 'pointerup' && finished.moved) savePlacement(sticker);
          if (finished.resume && !document.hidden) void play();
        });
      }
      element.addEventListener('keydown', event => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          removeSticker(index);
          chest.focus();
          return;
        }
        const delta = {ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1]}[event.key];
        if (!delta) return;
        event.preventDefault();
        stop();
        select(index);
        moveSticker(index, {
          x: Math.max(area.x + radius, Math.min(area.x + area.width - radius, sticker.x + delta[0] * 12)),
          y: Math.max(area.y + radius, Math.min(area.y + area.height - radius, sticker.y + delta[1] * 12))
        });
        stickerNodes[index].part = motionPartAt(state.pattern, parts, sticker);
        savePlacement(sticker);
      });
    });
    select(selected);
  }

  for (const [id, name] of stickers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reward-option';
    button.innerHTML = `${stickerIcon(id)}<span>${name}</span>`;
    button.onclick = () => {
      if (reward.stickers.length >= MAX_STICKERS) {
        status.textContent = '這張畫的裝飾品滿了，移除一個就能再加。';
        return;
      }
      const offset = (reward.stickers.length % 5) * 24;
      const sticker = {id, x: area.x + area.width / 2 + offset, y: area.y + area.height / 2 + offset};
      reward.stickers.push(sticker);
      selected = reward.stickers.length - 1;
      renderStickers();
      savePlacement(sticker);
      dialog.close();
      stickerNodes[selected].element.focus({preventScroll: true});
      status.textContent = `${name}已放在畫布中央，可以拖動位置。`;
    };
    catalog.append(button);
  }

  chest.onclick = () => {
    if (!reward.earned) return;
    resumeOnClose = playing;
    stop();
    if (!reward.opened) {
      reward.opened = true;
      persist();
      playChestSound();
      chestLabel.textContent = '裝飾品';
      chest.setAttribute('aria-label', '裝飾品');
      chest.title = '裝飾品';
    }
    dialog.showModal();
  };
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (resumeOnClose && !document.hidden) void play();
    resumeOnClose = false;
  });
  remove.onclick = () => removeSticker(selected);
  preview.onclick = () => playing ? stop() : void play();
  ink.addEventListener('pointerdown', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);

  return {sync, resize, stop};
}
