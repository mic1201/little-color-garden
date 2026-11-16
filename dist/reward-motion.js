import {backgroundColor, H, W} from './engine.js';
import {PAPER_REGION, RAINBOW_COLORS} from './fills.js';
import {paperMasks} from './paper-masks.js';

const oscillate = (t, period) => Math.sin(t * 2 * Math.PI / period);
const bounce = (t, period) => Math.max(0, oscillate(t, period)) ** 2;
const wave = (rect, pose) => ({rect, pose});
const cutout = (part, polygon) => ({...part, polygon});
const dance = (rect, period, distance, height, angle, pivot) => wave(rect, t => ({
  dx: oscillate(t, period) * distance,
  dy: -bounce(t, period / 2) * height,
  angle: oscillate(t, period) * angle,
  pivot
}));
const scenes = {
  'cat-clean': [dance([225,140,878,810], 2.6, 14, 29, 2.5, [500,760])],
  'butterfly-clean': [{
    rect: [170,200,830,695],
    axis: 'x',
    offset(x, t) {
      const edge = Math.abs(x - 500);
      const fold = Math.max(0, (edge - 45) / 310);
      return {x: -(x - 500) * (.20 * bounce(t, 1.35)) * fold, y: -fold * 15 * bounce(t, 1.35)};
    },
    pose: t => ({dy: -12 * bounce(t, 2.7)})
  }],
  'flower-clean': [{
    rect: [265,205,741,749], axis: 'y',
    offset: (y, t) => ({x: 22 * (1 - y / 750) * oscillate(t, 3)})
  }],
  'dinosaur-clean': [dance([250,285,866,790], 3, 38, 19, 2.3, [560,720])],
  'rainbow-clean': [
    dance([92,222,210,344], 2.4, 0, 20, 15, [150,280]),
    dance([783,139,886,240], 2.9, 0, 17, -14, [835,184])
  ],
  'rocket-clean': [
    cutout(
      wave([239,137,758,833], t => ({dx: 4 * oscillate(t, .25), dy: -70 * bounce(t, 3.6), angle: 4 * oscillate(t, 3.6), pivot: [500,608]})),
      [[310,137],[700,137],[700,438],[758,459],[758,833],[239,833],[239,438],[310,420]]
    ),
    dance([712,210,818,321], 3.2, 0, 9, 12, [762,263])
  ],
  'whale-clean': [
    cutout(dance([216,192,874,716], 4.5, 36, 27, 4.5, [499,505]),
      [[216,303],[354,303],[354,192],[489,192],[492,292],[874,320],[874,716],[216,716]]),
    wave([128,290,212,373], t => ({dx: 5 * oscillate(t, 2.5), dy: -31 * bounce(t, 3)})),
    wave([714,204,814,298], t => ({dx: 10 * oscillate(t, 3), dy: -20 * bounce(t, 2.8)}))
  ],
  'sea-turtle-clean': [dance([146,222,878,730], 4.8, 40, 22, -4, [490,480])],
  'rabbit-clean': [dance([267,105,733,814], 2.2, 22, 51, 3, [500,755])],
  'elephant-clean': [{
    rect: [144,186,854,786], axis: 'y',
    offset: (y, t) => ({x: 23 * Math.max(0, 1 - (y - 190) / 580) * oscillate(t, 2.4)}),
    pose: t => ({angle: 2.4 * oscillate(t, 4.3), pivot: [500,740]})
  }],
  'longneck-clean': [{
    rect: [247,136,863,801], axis: 'y',
    polygon: [[247,136],[863,136],[863,801],[288,801],[288,665],[247,655]],
    offset: (y, t) => ({x: 43 * Math.max(0, Math.min(1, (518 - y) / 325)) ** 1.25 * oscillate(t, 3.5)}),
    pose: t => ({dx: 13 * oscillate(t, 7), dy: -6 * bounce(t, 3.5)})
  }],
  'triceratops-v4-clean': [{
    rect: [167,290,910,793], axis: 'x',
    offset: (x, t) => ({y: 19 * Math.max(0, Math.min(1, (500 - x) / 290)) * oscillate(t, 2.1)}),
    pose: t => ({dx: 28 * oscillate(t, 4.2), dy: -9 * bounce(t, 2.1)})
  }],
  'apple-clean': [dance([197,102,806,778], 2.3, 13, 23, 7, [500,715])],
  watermelon: [dance([162,303,840,806], 2.7, 13, 17, 7.5, [500,759])],
  'princess-dress-clean': [{
    rect: [230,92,772,840], axis: 'y',
    offset: (y, t) => ({x: 21 * Math.sin(Math.PI * Math.max(0, (y - 490) / 355) / 2) * oscillate(t, 2.9)}),
    pose: t => ({angle: 3.5 * oscillate(t, 2.9), pivot: [500,745]})
  }],
  'princess-castle-clean': [dance([180,45,827,797], 4.8, 0, 6, 1.6, [500,780])],
  'bus-clean': [wave([128,255,884,772], t => ({
    dx: 48 * oscillate(t, 4.3), dy: -5 * bounce(t, .95), angle: .9 * oscillate(t, .95), pivot: [500,735]
  }))],
  sailboat: [wave([156,93,845,774], t => ({
    dx: 25 * oscillate(t, 4.4), dy: 11 * oscillate(t, 3), angle: 6 * oscillate(t, 4.4), pivot: [500,665]
  }))],
  'parrot-cute-clean': [dance([279,91,721,727], 2.05, 15, 25, 5, [500,704])],
  'rabbit-garden-v2-clean': [
    dance([334,207,665,741], 2.75, 14, 37, 3, [500,705]),
    cutout(dance([740,346,908,560], 3.8, 0, 0, 4.4, [828,550]),
      [[740,346],[908,346],[908,560],[822,560],[822,537],[740,537]]),
  ],
  'ocean-friends-clean': [
    wave([270,230,759,535], t => ({dx: 35 * oscillate(t, 4.1), dy: 18 * oscillate(t, 3.5), angle: 4 * oscillate(t, 4.1), pivot: [500,410]})),
    wave([87,566,302,678], t => ({dx: 19 * oscillate(t, 3.2), dy: 14 * oscillate(t, 2.8)})),
    wave([719,549,917,650], t => ({dx: -22 * oscillate(t, 3.2), dy: 12 * oscillate(t, 3.6)}))
  ],
  'dino-picnic-clean': [dance([287,287,767,700], 2.8, 19, 27, -4, [519,645])],
  'castle-garden-clean': [dance([185,104,815,686], 4.2, 0, 7, -1.5, [500,670])],
  'halloween-photo-v4-clean': [
    wave([720,288,891,461], t => ({dx: 16 * oscillate(t, 3.7), dy: -37 * bounce(t, 3.7), angle: 6 * oscillate(t, 3.7), pivot: [792,380]})),
    cutout(dance([219,443,719,842], 2.7, 5, 24, -2.5, [466,810]),
      [[219,443],[719,443],[719,626],[685,651],[685,842],[219,842]])
  ]
};

export function motionFor(pattern) {
  if (!paperMasks[pattern]) return [];
  return scenes[pattern] ?? [dance([0,0,W,H], 3.2, 14, 14, 2, [500,620])];
}

const PIXELS = W * H;
const NEIGHBOR_ROWS = [-W, 0, W];
let lastGeometry;

function insidePart({rect: [left, top, right, bottom], polygon}, x, y) {
  if (x < left || x >= right || y < top || y >= bottom) return false;
  if (!polygon) return true;
  let inside = false;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % polygon.length];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

// Visit whole painted components. Include diagonal neighbors so thin lines
// and antialiased edges cannot be split between animation layers.
function visitComponents(mask, visit) {
  const queue = new Int32Array(PIXELS);
  for (let start = 0; start < PIXELS; start++) {
    if (!mask[start]) continue;
    let end = 1;
    queue[0] = start;
    mask[start] = 0;
    for (let i = 0; i < end; i++) {
      const pixel = queue[i];
      const x = pixel % W;
      const first = x === 0 ? 0 : -1;
      const last = x === W - 1 ? 0 : 1;
      for (const d of NEIGHBOR_ROWS) {
        for (let dx = first; dx <= last; dx++) {
          const neighbor = pixel + d + dx;
          if (!mask[neighbor]) continue;
          mask[neighbor] = 0;
          queue[end++] = neighbor;
        }
      }
    }
    visit(queue, end);
  }
}

export function motionGeometry(pattern, parts) {
  if (lastGeometry?.pattern === pattern && lastGeometry.parts === parts) return lastGeometry.owners;
  const [top, rows] = paperMasks[pattern] ?? [0, []];
  const mask = new Uint8Array(PIXELS);
  for (const [i, row] of rows.entries()) {
    const start = (top + i) * W;
    for (let j = 0; j < row.length; j += 2) mask.fill(1, start + row[j], start + row[j + 1]);
  }

  const owners = new Uint8Array(PIXELS);
  if (!parts.length) return owners;
  const coverage = new Uint32Array(parts.length);
  visitComponents(mask, (pixels, length) => {
    coverage.fill(0);
    for (let i = 0; i < length; i++) {
      const pixel = pixels[i];
      const x = pixel % W, y = Math.floor(pixel / W);
      const part = parts.findIndex(candidate => insidePart(candidate, x, y));
      if (part !== -1) coverage[part]++;
    }
    const winner = coverage.indexOf(Math.max(...coverage));
    const owner = coverage[winner] * 2 > length ? winner + 1 : 255;
    for (let i = 0; i < length; i++) owners[pixels[i]] = owner;
  });
  // 255 marks a static component. Padding can take empty edge pixels only.
  const padded = owners.slice();
  for (let i = 0; i < PIXELS; i++) {
    const owner = owners[i];
    if (!owner || owner === 255) continue;
    const x = i % W;
    for (let dy = -W; dy <= W; dy += W) {
      const from = x ? -1 : 0;
      const to = x < W - 1 ? 1 : 0;
      for (let dx = from; dx <= to; dx++) {
        const index = i + dx + dy;
        if (padded[index] === 0) padded[index] = owner;
      }
    }
  }
  for (let i = 0; i < PIXELS; i++) if (padded[i] === 255) padded[i] = 0;
  lastGeometry = {pattern, parts, owners: padded};
  return padded;
}

export function motionPartAt(pattern, parts, {x, y}) {
  if (x < 0 || x >= W || y < 0 || y >= H || !parts.length) return -1;
  return motionGeometry(pattern, parts)[Math.floor(y) * W + Math.floor(x)] - 1;
}

export function inkMotionOwners(rgba, geometry) {
  const mask = new Uint8Array(PIXELS);
  for (let i = 0; i < PIXELS; i++) mask[i] = rgba[i * 4 + 3] !== 0;
  const owners = new Uint8Array(PIXELS);
  visitComponents(mask, (pixels, length) => {
    const owner = geometry[pixels[0]];
    if (!owner) return;
    for (let i = 1; i < length; i++) if (geometry[pixels[i]] !== owner) return;
    for (let i = 0; i < length; i++) owners[pixels[i]] = owner;
  });
  return owners;
}

function surface() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return canvas.getContext('2d');
}

function rasterPaths(owners, count) {
  const all = new Path2D();
  const layers = Array.from({length: count}, () => null);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W;) {
      const owner = owners[row + x];
      if (!owner) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < W && owners[row + end] === owner) end++;
      all.rect(x, y, end - x, 1);
      const layer = layers[owner - 1] ??= {path: new Path2D(), bounds: [W, H, 0, 0]};
      layer.path.rect(x, y, end - x, 1);
      const bounds = layer.bounds;
      bounds[0] = Math.min(bounds[0], x);
      bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], end);
      bounds[3] = y + 1;
      x = end;
    }
  }
  return {all, layers};
}

function removePixels(context, path) {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.fill(path);
  context.restore();
}

function copy(image, mask) {
  const context = surface();
  if (mask) context.clip(mask);
  context.drawImage(image, 0, 0);
  return context;
}

function addBackdrop(context, state) {
  const fill = state.fills?.find(fill => fill.region === PAPER_REGION);
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = fill?.color ?? backgroundColor(state);
  if (fill?.rainbow) {
    const gradient = context.createLinearGradient(0, 0, W, H);
    RAINBOW_COLORS.forEach((color, i) => gradient.addColorStop(i / (RAINBOW_COLORS.length - 1), color));
    context.fillStyle = gradient;
  }
  context.fillRect(0, 0, W, H);
  context.globalCompositeOperation = 'source-over';
}

export function createMotionScene(state, art, parts) {
  const geometry = motionGeometry(state.pattern, parts);
  const masks = rasterPaths(geometry, parts.length);
  const hasInk = state.strokes.some(stroke => stroke.tool !== 'eraser');
  const inkMasks = hasInk ? rasterPaths(inkMotionOwners(art.ink.getContext('2d').getImageData(0, 0, W, H).data, geometry), parts.length) : null;

  const base = copy(art.paper);
  removePixels(base, masks.all);
  addBackdrop(base, state);
  const stillOutline = copy(art.outline);
  removePixels(stillOutline, masks.all);
  const stillInk = hasInk ? copy(art.ink) : null;
  if (inkMasks) removePixels(stillInk, inkMasks.all);

  const layers = [];
  for (const [i, mask] of masks.layers.entries()) {
    if (!mask) continue;
    const colors = copy(art.paper, mask.path);
    const inkMask = inkMasks?.layers[i];
    if (inkMask) {
      colors.clip(inkMask.path);
      colors.drawImage(art.ink, 0, 0);
    }
    layers.push({
      ...parts[i], bounds: mask.bounds, colors: colors.canvas,
      outline: copy(art.outline, mask.path).canvas,
      warped: parts[i].axis ? surface() : null
    });
  }
  return {base: base.canvas, stillInk: stillInk?.canvas, outline: stillOutline.canvas, layers};
}

const angleRadians = angle => (angle ?? 0) * Math.PI / 180;
const zeroPose = {};
const offsetAt = (part, x, y, time) => part.offset?.(part.axis === 'x' ? x : y, time) ?? zeroPose;

export function transformSticker(part, sticker, time) {
  const offset = offsetAt(part, sticker.x, sticker.y, time);
  const {dx = 0, dy = 0, angle = 0, pivot = [0, 0]} = part.pose?.(time) ?? zeroPose;
  const [px, py] = pivot;
  const x = sticker.x + (offset.x ?? 0) - px;
  const y = sticker.y + (offset.y ?? 0) - py;
  const radians = angleRadians(angle);
  return {
    x: px + dx + x * Math.cos(radians) - y * Math.sin(radians),
    y: py + dy + x * Math.sin(radians) + y * Math.cos(radians),
    angle
  };
}

function drawWarp(context, part, image, time) {
  const [left, top, right, bottom] = part.bounds;
  const vertical = part.axis === 'y';
  const start = vertical ? top : left;
  const end = vertical ? bottom : right;
  // Rasterize shared edges at the same integer coordinate so neighboring
  // strips meet even when the shape narrows or moves by a fraction of a pixel.
  for (let a = start; a < end; a += 12) {
    const b = Math.min(a + 12, end);
    const step = b - a;
    const from = part.offset(a, time);
    const to = part.offset(b, time);
    context.save();
    if (vertical) {
      const top = Math.round(a + (from.y ?? 0));
      const bottom = Math.round(b + (to.y ?? 0));
      const x = from.x ?? 0;
      context.transform(1, 0, ((to.x ?? 0) - x) / step, (bottom - top) / step, x, top);
      context.drawImage(image, left, a, right - left, step, left, 0, right - left, step);
    } else {
      const left = Math.round(a + (from.x ?? 0));
      const right = Math.round(b + (to.x ?? 0));
      const y = from.y ?? 0;
      context.transform((right - left) / step, ((to.y ?? 0) - y) / step, 0, 1, left, y);
      context.drawImage(image, a, top, step, bottom - top, 0, top, step, bottom - top);
    }
    context.restore();
  }
}

function drawPart(context, part, image, time) {
  const {dx = 0, dy = 0, angle = 0, pivot = [0, 0]} = part.pose?.(time) ?? zeroPose;
  const [x, y] = pivot;
  if (part.warped) {
    part.warped.clearRect(0, 0, W, H);
    drawWarp(part.warped, part, image, time);
  }
  context.save();
  context.translate(dx + x, dy + y);
  context.rotate(angleRadians(angle));
  context.translate(-x, -y);
  context.drawImage(part.warped?.canvas ?? image, 0, 0);
  context.restore();
}

export function drawMotionScene(context, scene, time) {
  context.drawImage(scene.base, 0, 0);
  for (const part of scene.layers) drawPart(context, part, part.colors, time);
  if (scene.stillInk) context.drawImage(scene.stillInk, 0, 0);
  context.drawImage(scene.outline, 0, 0);
  for (const part of scene.layers) drawPart(context, part, part.outline, time);
}
