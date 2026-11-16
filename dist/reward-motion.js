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
const flutter = (rect, period, amplitude, start, end) => ({
  rect, axis: 'x',
  offset: (x, t) => ({y: Math.max(0, Math.min(1, (x - start) / (end - start))) * amplitude * oscillate(t - (x - start) / 180, period)})
});

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
  'princess-castle-clean': [
    flutter([490,49,591,122], 1.5, 13, 501, 580),
    flutter([281,150,368,220], 1.7, 11, 293, 357),
    flutter([697,150,783,220], 1.4, 12, 709, 773)
  ],
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
  'castle-garden-clean': [
    flutter([490,104,580,174], 1.6, 11, 501, 571),
    flutter([275,172,359,238], 1.8, 12, 288, 347),
    flutter([702,172,785,238], 1.5, 12, 714, 773)
  ],
  'halloween-photo-v4-clean': [
    wave([720,288,891,461], t => ({dx: 16 * oscillate(t, 3.7), dy: -37 * bounce(t, 3.7), angle: 6 * oscillate(t, 3.7), pivot: [792,380]})),
    dance([219,458,467,842], 2.1, 2, 24, 2.5, [340,810]),
    cutout(dance([468,443,719,842], 2.7, 2, 24, -2.5, [580,810]),
      [[468,443],[719,443],[719,626],[685,651],[685,842],[468,842]])
  ]
};

export function motionFor(pattern) {
  if (!paperMasks[pattern]) return [];
  return scenes[pattern] ?? [dance([0,0,W,H], 3.2, 14, 14, 2, [500,620])];
}

export function motionPartAt(pattern, parts, {x, y}) {
  const [top, rows] = paperMasks[pattern] ?? [0, []];
  const row = rows[Math.floor(y) - top] ?? [];
  if (!row.some((left, i) => i % 2 === 0 && x >= left && x < row[i + 1])) return -1;
  return parts.findIndex(({rect: [l, t, r, b], polygon}) =>
    x >= l && x < r && y >= t && y < b && (!polygon || insidePolygon(polygon, x, y)));
}

function insidePolygon(polygon, x, y) {
  let inside = false;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % polygon.length];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

function surface() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return canvas.getContext('2d');
}

function maskPath(pattern) {
  const path = new Path2D();
  const [top, rows] = paperMasks[pattern];
  // Include the antialiased edge beyond the solid mask.
  for (const [i, row] of rows.entries()) {
    for (let j = 0; j < row.length; j += 2) {
      path.rect(row[j] - 1, top + i - 1, row[j + 1] - row[j] + 2, 3);
    }
  }
  return path;
}

export function createMotionScene(state, source, parts) {
  const base = surface();
  base.drawImage(source, 0, 0);
  const silhouette = maskPath(state.pattern);
  const layers = parts.map(part => {
    const [x, y, right, bottom] = part.rect;
    const context = surface();
    context.beginPath();
    context.rect(x, y, right - x, bottom - y);
    context.clip();
    if (part.polygon) {
      context.beginPath();
      context.moveTo(...part.polygon[0]);
      for (const point of part.polygon.slice(1)) context.lineTo(...point);
      context.closePath();
      context.clip();
    }
    context.clip(silhouette);
    context.drawImage(source, 0, 0);
    base.globalCompositeOperation = 'destination-out';
    base.drawImage(context.canvas, 0, 0);
    return {...part, image: context.canvas, warped: part.axis ? surface() : null};
  });
  const fill = state.fills?.find(fill => fill.region === PAPER_REGION);
  base.globalCompositeOperation = 'destination-over';
  base.fillStyle = fill?.color ?? backgroundColor(state);
  if (fill?.rainbow) {
    const gradient = base.createLinearGradient(0, 0, W, H);
    RAINBOW_COLORS.forEach((color, i) => gradient.addColorStop(i / (RAINBOW_COLORS.length - 1), color));
    base.fillStyle = gradient;
  }
  base.fillRect(0, 0, W, H);
  return {base: base.canvas, layers};
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

function drawWarp(context, part, time) {
  const [left, top, right, bottom] = part.rect;
  const vertical = part.axis === 'y';
  const start = vertical ? top : left;
  const end = vertical ? bottom : right;
  // Strips share a mapped edge. Interpolate displacement along each strip.
  for (let a = start; a < end; a += 12) {
    const b = Math.min(a + 12, end);
    const step = b - a;
    const from = part.offset(a, time);
    const to = part.offset(b, time);
    const x = from.x ?? 0;
    const y = from.y ?? 0;
    const changeX = ((to.x ?? 0) - x) / step;
    const changeY = ((to.y ?? 0) - y) / step;
    context.save();
    if (vertical) {
      context.translate(0, a);
      context.transform(1, 0, changeX, 1 + changeY, x, y);
      context.drawImage(part.image, left, a, right - left, step, left, 0, right - left, step);
    } else {
      context.translate(a, 0);
      context.transform(1 + changeX, changeY, 0, 1, x, y);
      context.drawImage(part.image, a, top, step, bottom - top, 0, top, step, bottom - top);
    }
    context.restore();
  }
}

export function drawMotionScene(context, scene, time) {
  context.drawImage(scene.base, 0, 0);
  for (const part of scene.layers) {
    const {dx = 0, dy = 0, angle = 0, pivot = [0, 0]} = part.pose?.(time) ?? zeroPose;
    const [x, y] = pivot;
    context.save();
    context.translate(dx + x, dy + y);
    context.rotate(angleRadians(angle));
    context.translate(-x, -y);
    if (part.warped) {
      part.warped.clearRect(0, 0, W, H);
      drawWarp(part.warped, part, time);
    }
    context.drawImage(part.warped?.canvas ?? part.image, 0, 0);
    context.restore();
  }
}
