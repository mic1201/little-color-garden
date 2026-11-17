import {AVATAR_W, AVATAR_H, itemById} from './avatar-art.js';
import {loadSticker} from './avatar-stage.js';
import {createPlacedSticker, stickerArt, stickerById} from './reward-stickers.js';

const SIZE = 32;
const MAX_PLACED = 100;
const inRange = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
const clampUnit = value => Math.max(0, Math.min(1, value));

export function restoreAvatarStickers(saved) {
  if (!Array.isArray(saved)) return [];
  return saved.filter(sticker => {
    if (!stickerById.has(sticker?.id)) return false;
    const {x, y, surface} = sticker;
    return surface === undefined ? inRange(x, 1) && inRange(y, 1) :
      (surface === 'body' || itemById.has(surface)) && inRange(x, AVATAR_W) && inRange(y, AVATAR_H);
  }).slice(0, MAX_PLACED).map(({id, x, y, surface}) => ({id, x, y, surface}));
}

export function createAvatarStickers({layer, profile, layout, surfaceAt, visibleSurface, save}) {
  const nodes = new Map();
  const images = new Map();
  const decoded = new Map();
  const testPlacements = new Map();
  let testing = false;
  let width = 1;
  let height = 1;

  function placements() {
    const current = profile();
    return [...(current?.stickers ?? []), ...(testPlacements.get(current) ?? [])];
  }

  function sync() {
    const stickers = placements();
    for (const [sticker, element] of nodes) {
      if (!stickers.includes(sticker)) {
        element.remove();
        nodes.delete(sticker);
      }
    }
    for (const sticker of stickers) {
      if (nodes.has(sticker)) continue;
      const element = createPlacedSticker(sticker.id);
      nodes.set(sticker, element);
      layer.append(element);
      if (!images.has(sticker.id)) {
        images.set(sticker.id, loadSticker(sticker.id, stickerArt(sticker.id)).then(({id, image}) => {
          decoded.set(id, image);
        }).catch(() => { images.delete(sticker.id); }));
      }
    }
  }

  function placeElement(element, x, y, scale, matrix = '') {
    element.setAttribute('transform', `${matrix}translate(${x} ${y}) scale(${scale * SIZE / 64}) translate(-32 -32)`);
  }

  function pose({a, b, c, d, e, f}, ratio) {
    if (!nodes.size) return;
    const matrix = `matrix(${a/ratio} ${b/ratio} ${c/ratio} ${d/ratio} ${e/ratio} ${f/ratio}) `;
    const {scale} = layout();
    for (const [sticker, element] of nodes) {
      const {x, y, surface} = sticker;
      const visible = !surface || visibleSurface(surface);
      element.toggleAttribute('hidden', !visible);
      if (!visible) continue;
      if (surface) placeElement(element, x, y, 1, matrix);
      else placeElement(element, x * width, y * height, scale);
    }
  }

  const bounds = () => layer.getBoundingClientRect();
  function location(clientX, clientY) {
    const box = bounds();
    const {x, y, scale} = layout();
    const localX = clientX - box.left;
    const localY = clientY - box.top;
    const avatarX = (localX - x) / scale;
    const avatarY = (localY - y) / scale;
    const surface = surfaceAt(avatarX, avatarY);
    return surface ? {surface, x:avatarX, y:avatarY} :
      {surface:undefined, x:clampUnit(localX / width), y:clampUnit(localY / height)};
  }

  function drawImage(ctx, sticker, x, y, size) {
    const image = decoded.get(sticker.id);
    if (image) ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  }

  return {
    layer, bounds, pose, sync,
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
    },
    setTesting(value) {
      testing = value;
      if (!value) testPlacements.clear();
    },
    lookup(element) {
      return [...nodes].find(([, node]) => node === element)?.[0];
    },
    preview(element, clientX, clientY) {
      const box = bounds();
      placeElement(element, clientX - box.left, clientY - box.top, layout().scale);
    },
    add(id, x, y) {
      if (placements().length >= MAX_PLACED) return;
      const current = profile();
      if (testing && !testPlacements.has(current)) testPlacements.set(current, []);
      const sticker = {id, ...location(x, y)};
      (testing ? testPlacements.get(current) : current.stickers).push(sticker);
      if (!testing) save();
      sync();
      return nodes.get(sticker);
    },
    move(sticker, x, y) {
      Object.assign(sticker, location(x, y));
      if (profile().stickers.includes(sticker)) save();
    },
    remove(sticker) {
      const current = profile();
      const saved = current.stickers.includes(sticker);
      const list = saved ? current.stickers : testPlacements.get(current);
      list.splice(list.indexOf(sticker), 1);
      if (saved) save();
      sync();
    },
    drawAttached(ctx, headOnly = false) {
      for (const sticker of nodes.keys()) {
        if (headOnly && sticker.y > 141) continue;
        if (sticker.surface && visibleSurface(sticker.surface)) drawImage(ctx, sticker, sticker.x, sticker.y, SIZE);
      }
    },
    drawBackground(ctx) {
      const {scale} = layout();
      for (const sticker of nodes.keys()) {
        if (!sticker.surface) drawImage(ctx, sticker, sticker.x * width, sticker.y * height, SIZE * scale);
      }
    },
    ready: () => Promise.all(images.values())
  };
}
