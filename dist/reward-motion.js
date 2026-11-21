import {backgroundColor, H, W} from './engine.js';
import {fillPaint, PAPER_REGION} from './fills.js';
import {paperMasks} from './paper-masks.js';
import {islandMotion} from './island-motion.js';
import {interactionArtwork, pictureActionTime} from './picture-interactions.js';

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
const unit = n => Math.max(0, Math.min(1, n));
const ease = n => {
  const u = unit(n);
  return u * u * (3 - 2 * u);
};
const interval = (t, start, end) => unit((t - start) / (end - start));
const arc = n => 4 * n * (1 - n);
const swell = (t, period) => (1 - Math.cos(t * 2 * Math.PI / period)) / 2;

const rabbitHops = [
  [.17,.78,0,.28,88,0,.035],
  [1.02,1.82,.28,1,112,.035,.105],
  [2.22,2.81,1,.59,85,.105,.045],
  [3.05,3.82,.59,0,110,.045,0]
];

function rabbitHop(t, reach, pivot) {
  const time = t % 4.35;
  let dx = 0, lift = 0, depth = 0, landing = 0;
  for (const [start, end, from, to, height, near, closer] of rabbitHops) {
    if (time < start) break;
    const progress = interval(time, start, end);
    dx = reach * (from + (to - from) * progress);
    depth = near + (closer - near) * ease(progress);
    lift = height * arc(progress);
    landing = time >= end ? .12 * Math.sin(Math.PI * interval(time, end, end + .17)) : 0;
  }
  return {dx, dy: depth * 24 - lift, scaleX: 1 + depth + landing * .65, scaleY: 1 + depth - landing + lift * .00016, pivot};
}

const travelAndReturn = (t, period, reach) => {
  const phase = (t % period) / period;
  return reach * (ease(phase * 2) - ease((phase - .52) / .48));
};

export const busDepartureTime = 3.15;
export const fruitBiteTimes = [2.23, 3.23, 4.23];
export const fruitBiteCycle = 6.25;
export const fruitBites = {
  'apple-clean': [[802,519,55],[800,461,58],[802,400,54]],
  watermelon: [[694,314,50],[633,314,52],[572,314,50]]
};
const fruitReset = 5.45;

function fruitCrumbs(ctx, phase, bites) {
  bites.forEach(([x, y], index) => {
    const age = phase - fruitBiteTimes[index];
    if (age < 0 || age >= .62) return;
    ctx.globalAlpha = 1 - age / .62;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(x - 20 + age * (62 + i * 23), y + (i - 1.5) * 10 - age * (104 - i * 18) + 146 * age * age);
      ctx.rotate(i + age * 6);
      ctx.fillStyle = i % 2 ? '#ffe3a3' : '#f3a78f';
      ctx.fillRect(-5, -4, 11 - i, 8);
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}

function fruitScene(pattern, rect, pivot) {
  const bites = fruitBites[pattern];
  return [{
    rect,
    pose(t) {
      const phase = t % fruitBiteCycle;
      const chew = fruitBiteTimes.reduce((total, start) => total + arc(interval(phase, start, start + .32)), 0);
      const reset = arc(interval(phase, fruitReset, fruitReset + .55));
      return {dy:-11 * chew - 26 * reset, scaleX:1 + .035 * chew,
        scaleY:1 - .055 * chew + .045 * reset, pivot};
    },
    cut(t) {
      const phase = t % fruitBiteCycle;
      return phase < fruitReset ? bites.filter((_, index) => phase >= fruitBiteTimes[index]) : [];
    },
    detail: (ctx, t) => fruitCrumbs(ctx, t % fruitBiteCycle, bites)
  }];
}

function bubbles(ctx, t, [x, y], count = 5) {
  for (let i = 0; i < count; i++) {
    const age = (t * .62 + i * .23) % 1;
    const fade = Math.sin(Math.PI * age);
    const radius = 6 + (i % 3) * 4;
    ctx.globalAlpha = fade * .58;
    ctx.strokeStyle = '#4caac3';
    ctx.lineWidth = 2.6;
    ctx.fillStyle = '#d9f6fb';
    ctx.beginPath();
    ctx.arc(x + 8 * oscillate(age + i, .92) + (i % 3 - 1) * 22, y - age * 108, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function litWindows(windows) {
  return (ctx, t) => {
    windows.forEach(([x,y,rx,ry], i) => {
      const phase = (t % 5.1) - .37 * i;
      const intensity = ease((phase - .12) / .62) * (1 - ease((phase - 3.55) / .66));
      if (!intensity) return;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(rx,ry);
      const glow = ctx.createRadialGradient(0,0,0,0,0,1);
      glow.addColorStop(0, '#fff7b7');
      glow.addColorStop(.43, '#ffd260aa');
      glow.addColorStop(1, '#ffd26000');
      ctx.globalAlpha = intensity;
      ctx.fillStyle = glow;
      ctx.fillRect(-1,-1,2,2);
      ctx.restore();
    });
  };
}

const scenes = {
  'cat-clean': [wave([225,140,878,810], t => {
    const phase = t % 4.15;
    const pounce = interval(phase, .79, 1.48);
    const crouch = arc(interval(phase, .08, .89));
    const returnHop = interval(phase, 2.42, 3.21);
    const lift = 104 * arc(pounce) + 45 * arc(returnHop);
    return {dx: 51 * (ease(pounce) - ease(returnHop)), dy: -lift, angle: -8 * arc(pounce), scaleX: 1 + .11 * crouch, scaleY: 1 - .16 * crouch, pivot: [500,795]};
  })],
  'butterfly-clean': [{
    rect: [170,200,830,695],
    axis: 'x',
    offset(x, t) {
      const edge = Math.abs(x - 500);
      const fold = Math.max(0, (edge - 45) / 310) * bounce(t, .78);
      return {x: -(x - 500) * .28 * fold, y: -18 * fold};
    },
    pose: t => ({dx: 48 * oscillate(t, 4.6), dy: -108 * swell(t, 4.6), angle: -8 * oscillate(t, 4.6), pivot: [500,451]})
  }],
  'flower-clean': [wave([265,205,741,749], t => ({
    scaleX: 1 + .15 * swell(t, 3.8), scaleY: 1 + .13 * ease(swell(t, 3.8)), pivot: [500,739]
  }))],
  'dinosaur-clean': [wave([250,285,866,790], t => ({
    dx: -travelAndReturn(t, 4.2, 59), dy: -17 * bounce(t, .66), angle: 2.4 * oscillate(t, .66), pivot: [560,769]
  }))],
  'rainbow-clean': [
    wave([92,222,210,344], t => ({scaleX: 1 + .27 * swell(t, 2.2), scaleY: 1 + .27 * swell(t, 2.2), angle: 9 * oscillate(t, 2.2), pivot: [150,280]})),
    wave([783,139,886,240], t => ({scaleX: 1 + .25 * swell(t, 2.9), scaleY: 1 + .25 * swell(t, 2.9), angle: -9 * oscillate(t, 2.9), pivot: [835,184]}))
  ],
  'rocket-clean': [
    cutout(
      wave([239,137,758,833], t => {
        const phase = t % 4.9;
        const flight = ease((phase - .36) / 1.18) - ease((phase - 2.08) / 1.7);
        return {dx: 3 * oscillate(t, .19) * (1 - flight), dy: -138 * flight, angle: -5 * flight, pivot: [500,608]};
      }),
      [[310,137],[700,137],[700,438],[758,459],[758,833],[239,833],[239,438],[310,420]]
    ),
    wave([712,210,818,321], t => ({angle: 20 * oscillate(t, 3.3), scaleX: 1 + .2 * swell(t, 1.8), scaleY: 1 + .2 * swell(t, 1.8), pivot: [762,263]}))
  ],
  'whale-clean': [
    cutout(wave([216,192,874,716], t => {
      const phase = t % 4.75;
      const leap = interval(phase, .42, 2.1);
      return {dx: -33 * (ease(leap) - ease((phase - 2.76) / 1.08)), dy: -120 * arc(leap) + 13 * arc(interval(phase, 2.1, 2.6)), angle: 14 * arc(leap) * (1 - 2 * leap), pivot: [499,505]};
    }), [[216,303],[354,303],[354,192],[489,192],[492,292],[874,320],[874,716],[216,716]]),
    wave([128,290,212,373], t => ({dx: -9 * swell(t, 2.7), dy: -61 * swell(t, 2.7)})),
    wave([714,204,814,298], t => ({dx: 18 * swell(t, 3.4), dy: -39 * swell(t, 3.4)}))
  ],
  'sea-turtle-clean': [{
    ...wave([146,222,878,730], t => ({
      dx: 51 * oscillate(t, 5.8), dy: -62 * swell(t, 5.8), angle: -8 * oscillate(t, 5.8), pivot: [490,480]
    })),
    detail: (ctx, t) => bubbles(ctx, t, [889,469])
  }],
  'rabbit-clean': [wave([267,105,733,814], t => {
    const pose = rabbitHop(t, 133, [500,793]);
    const [, pivotY] = pose.pivot;
    const earHeight = pivotY - paperMasks['rabbit-clean'][0];
    return {...pose, scaleY: Math.min(pose.scaleY, (pivotY + pose.dy - 8) / earHeight)};
  })],
  'elephant-clean': [{
    rect: [144,186,854,786], axis: 'y',
    offset(y,t) {
      const bend = Math.sin(Math.PI * interval(y, 472, 776)) * swell(t, 3.25);
      return {x: 52 * bend, y: -23 * bend};
    },
    pose: t => ({scaleY: 1 + .025 * swell(t, 3.25), pivot: [500,775]})
  }],
  'longneck-clean': [{
    rect: [247,136,863,801], axis: 'y',
    polygon: [[247,136],[863,136],[863,801],[288,801],[288,665],[247,655]],
    offset(y,t) {
      const neck = unit((518 - y) / 325) ** 1.25;
      return {x: 31 * neck * oscillate(t, 4.4), y: -36 * neck * swell(t, 4.4)};
    },
    pose: t => ({dy: -7 * bounce(t, 4.4)})
  }],
  'triceratops-v4-clean': [{
    rect: [167,290,910,793], axis: 'x',
    offset: (x, t) => ({y: 34 * unit((500 - x) / 290) * bounce(t, 2.45)}),
    pose: t => ({dx: -23 * swell(t, 4.9), dy: -12 * bounce(t, .87)})
  }],
  'apple-clean': fruitScene('apple-clean', [197,102,806,778], [500,753]),
  watermelon: fruitScene('watermelon', [162,303,840,806], [500,739]),
  'princess-dress-clean': [{
    rect: [230,92,772,840], axis: 'y',
    offset: (y, t) => ({x: 27 * Math.sin(Math.PI * unit((y - 490) / 710)) * oscillate(t, 3.7)}),
    pose: t => ({angle: 8 * oscillate(t, 3.7), scaleX: 1 - .35 * swell(t, 3.7), dy: -22 * swell(t, 3.7), pivot: [500,671]})
  }],
  'princess-castle-clean': [{
    ...wave([180,45,827,797], t => ({scaleY: 1 + .012 * swell(t, 4.7), pivot: [500,780]})),
    detail: litWindows([[292,504,33,47],[500,414,36,48],[708,504,33,47]])
  }],
  'bus-clean': [wave([128,255,884,772], t => {
    const driving = Math.max(0, t - busDepartureTime);
    return {dx:travelAndReturn(driving, 4.4, 88), dy:-7 * bounce(driving, .52),
      angle:.75 * oscillate(driving, .52), pivot:[500,735]};
  })],
  sailboat: [wave([156,48,912,774], t => ({
    dx: 25 * oscillate(t, 4.4), dy: -14 * swell(t, 2.2), angle: 6 * oscillate(t, 4.4), pivot: [500,679]
  }))],
  'parrot-cute-clean': [{
    rect: [279,91,721,727], axis: 'x',
    fixedBelow:732,
    offset: (x,t) => ({y: -36 * unit((Math.abs(x - 500) - 90) / 120) * bounce(t,.59)}),
    pose: t => {
      const air = arc(interval(t % 4.1, .49, 2.97));
      return {dx: -24 * air, dy: -85 * air, angle: 5 * air, pivot: [500,704]};
    }
  }],
  'rabbit-garden-v2-clean': [
    wave([334,207,665,741], t => rabbitHop(t, 70, [500,722])),
    cutout(wave([740,346,908,560], t => ({scaleX: 1 + .15 * swell(t, 4), scaleY: 1 + .1 * swell(t, 4), pivot: [828,550]})),
      [[740,346],[908,346],[908,560],[822,560],[822,537],[740,537]]),
    wave([720,543,826,722], () => ({}))
  ],
  'ocean-friends-clean': [
    {...wave([270,230,759,535], t => ({dx: 43 * oscillate(t, 4.1), dy: -42 * swell(t, 4.1), angle: 8 * oscillate(t, 4.1), pivot: [500,410]})),
      detail: (ctx, t) => bubbles(ctx, t, [269,375], 4)},
    wave([87,566,302,678], t => ({dx: 31 * oscillate(t, 3.2), dy: -37 * swell(t, 3.2)})),
    wave([719,549,917,650], t => ({dx: -28 * oscillate(t, 3.2), dy: 28 * swell(t, 3.2)}))
  ],
  'dino-picnic-clean': [wave([287,287,767,700], t => {
    const nod = bounce(t, 2.65);
    return {dx: -29 * swell(t, 4.7), angle: -6 * nod, scaleY: 1 - .11 * nod, pivot: [519,687]};
  })],
  // The upper-right flag crosses a ray, so the sun moves with the castle.
  'castle-garden-clean': [cutout({
    ...wave([185,52,914,686], t => ({scaleY: 1 + .012 * swell(t, 4.8), pivot: [500,673]})),
    detail: litWindows([[287,504,26,41],[500,407,25,36],[713,504,26,41]])
  }, [[185,104],[729,104],[729,52],[914,52],[914,235],[815,235],[815,686],[185,686]])],
  'halloween-photo-v4-clean': [
    wave([720,288,891,461], t => ({
      dx: 26 * oscillate(t, 3.9), dy: -68 * swell(t, 3.9), scaleY: 1 - .12 * swell(t, 1.95), pivot: [792,380]
    })),
    cutout(wave([219,443,719,842], t => rabbitHop(t, 19, [466,818])),
      [[219,443],[719,443],[719,626],[685,651],[685,842],[219,842]])
  ]
};

const coordinatedScenes = Object.fromEntries(Object.entries(interactionArtwork).map(([id, rule]) => {
  const parts = scenes[id] ?? islandMotion[id];
  const visualTime = t => rule.time ? rule.time(pictureActionTime(t)) : t;
  return [id, parts.map((part, index) => ({
    ...part,
    axis:rule.axis ?? part.axis,
    pose: t => ({...part.pose?.(visualTime(t)), ...rule.pose?.(pictureActionTime(t), index)}),
    offset: rule.axis === false ? undefined : rule.offset ? (position,t) => rule.offset(position,pictureActionTime(t))
      : part.offset && ((position,t) => part.offset(position,visualTime(t))),
    detail:rule.detail === false || !part.detail ? undefined : (ctx,t) => part.detail(ctx,visualTime(t))
  }))];
}));

export function motionFor(pattern) {
  if (!paperMasks[pattern]) return [];
  return coordinatedScenes[pattern] ?? scenes[pattern] ?? islandMotion[pattern] ?? [dance([0,0,W,H], 3.2, 14, 14, 2, [500,620])];
}

const PIXELS = W * H;
const STATIC_PART = 255;
const WARP_PADDING = 64;
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
function visitComponents(mask, visit, width = W) {
  const queue = new Int32Array(mask.length);
  const rows = [-width, 0, width];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let end = 1;
    queue[0] = start;
    mask[start] = 0;
    for (let i = 0; i < end; i++) {
      const pixel = queue[i];
      const x = pixel % width;
      const first = x === 0 ? 0 : -1;
      const last = x === width - 1 ? 0 : 1;
      for (const d of rows) {
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

function getMotionGeometry(pattern, parts) {
  if (lastGeometry?.pattern === pattern && lastGeometry.parts === parts) return lastGeometry;
  const [top, rows] = paperMasks[pattern] ?? [0, []];
  const mask = new Uint8Array(PIXELS);
  for (const [i, row] of rows.entries()) {
    const start = (top + i) * W;
    for (let j = 0; j < row.length; j += 2) mask.fill(1, start + row[j], start + row[j + 1]);
  }

  const owners = new Uint8Array(PIXELS);
  if (!parts.length) return {owners};
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
    const owner = coverage[winner] * 2 > length ? winner + 1 : STATIC_PART;
    const fixedBelow = parts[winner].fixedBelow ?? H;
    for (let i = 0; i < length; i++) {
      const pixel = pixels[i];
      owners[pixel] = pixel >= fixedBelow * W ? STATIC_PART : owner;
    }
  });
  // Padding can take empty edge pixels only, leaving static art intact.
  const padded = owners.slice();
  for (let i = 0; i < PIXELS; i++) {
    const owner = owners[i];
    if (!owner || owner === STATIC_PART) continue;
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
  lastGeometry = {pattern, parts, owners: padded};
  return lastGeometry;
}

export function motionGeometry(pattern, parts) {
  const geometry = getMotionGeometry(pattern, parts);
  return geometry.moving ??= geometry.owners.map(owner => owner === STATIC_PART ? 0 : owner);
}

export function motionPartAt(pattern, parts, {x, y}) {
  if (x < 0 || x >= W || y < 0 || y >= H || !parts.length) return -1;
  return motionGeometry(pattern, parts)[Math.floor(y) * W + Math.floor(x)] - 1;
}

export function inkMotionOwners(rgba, geometry, width = W) {
  const mask = new Uint8Array(geometry.length);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3] !== 0;
  const owners = new Uint8Array(mask.length);
  const coverage = new Uint32Array(256);
  visitComponents(mask, (pixels, length) => {
    coverage.fill(0);
    let winner = 0;
    for (let i = 0; i < length; i++) {
      const pixel = pixels[i];
      const part = geometry[pixel];
      if (part === STATIC_PART) continue;
      owners[pixel] = part;
      if (part && ++coverage[part] > coverage[winner]) winner = part;
    }
    // Carry attached overflow to avoid cutting an outline-shaped hole in a brush mark.
    if (!winner) return;
    for (let i = 0; i < length; i++) {
      const pixel = pixels[i];
      if (!geometry[pixel]) owners[pixel] = winner;
    }
  }, width);
  return owners;
}

function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

function projectGeometry(geometry, {area, width, height, sx, sy}) {
  if (!area.x && !area.y && sx === 1 && sy === 1 && width === W && height === H) return geometry;
  const projected = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.floor(area.y + (y + .5) / sy);
    if (sourceY < 0 || sourceY >= H) continue;
    for (let x = 0; x < width; x++) {
      const sourceX = Math.floor(area.x + (x + .5) / sx);
      if (sourceX >= 0 && sourceX < W) projected[y * width + x] = geometry[sourceY * W + sourceX];
    }
  }
  return projected;
}

function rasterPaths(owners, count, width, height) {
  const all = new Path2D();
  const layers = Array.from({length: count}, () => null);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width;) {
      const owner = owners[row + x];
      if (!owner || owner === STATIC_PART) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < width && owners[row + end] === owner) end++;
      all.rect(x, y, end - x, 1);
      const layer = layers[owner - 1] ??= {path: new Path2D(), bounds: [width, height, 0, 0]};
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
  const context = surface(image.width, image.height);
  context.save();
  if (mask) context.clip(mask);
  context.drawImage(image, 0, 0);
  context.restore();
  return context;
}

function addBackdrop(context, state, {area, sx, sy}) {
  const fill = state.fills?.find(fill => fill.region === PAPER_REGION);
  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.setTransform(sx, 0, 0, sy, -area.x * sx, -area.y * sy);
  context.fillStyle = fill ? fillPaint(context, fill) : backgroundColor(state);
  context.fillRect(area.x, area.y, area.width, area.height);
  context.restore();
}

export function createMotionScene(state, art, parts) {
  const {width, height} = art.paper;
  const raster = {area: art.area, width, height, sx: width / art.area.width, sy: height / art.area.height};
  const geometry = projectGeometry(getMotionGeometry(state.pattern, parts).owners, raster);
  const masks = rasterPaths(geometry, parts.length, width, height);
  const hasInk = state.strokes.some(stroke => stroke.tool !== 'eraser');
  const inkMasks = hasInk ? rasterPaths(inkMotionOwners(art.ink.getContext('2d').getImageData(0, 0, width, height).data, geometry, width), parts.length, width, height) : null;

  const base = copy(art.paper);
  removePixels(base, masks.all);
  addBackdrop(base, state, raster);
  const stillOutline = copy(art.outline);
  removePixels(stillOutline, masks.all);
  const stillInk = hasInk ? copy(art.ink) : null;
  if (inkMasks) removePixels(stillInk, inkMasks.all);

  const layers = [];
  for (const [i, mask] of masks.layers.entries()) {
    if (!mask) continue;
    const colors = copy(art.paper, mask.path);
    const inkMask = inkMasks?.layers[i];
    let bounds = mask.bounds;
    if (inkMask) {
      // Assigned ink can extend beyond the silhouette.
      colors.clip(inkMask.path);
      colors.drawImage(art.ink, 0, 0);
      bounds = bounds.map((edge, j) => (j < 2 ? Math.min : Math.max)(edge, inkMask.bounds[j]));
    }
    layers.push({
      ...parts[i], bounds, colors: colors.canvas,
      silhouette: mask.path,
      outline: copy(art.outline, mask.path).canvas,
      warped: parts[i].axis ? surface(width + 2 * WARP_PADDING, height + 2 * WARP_PADDING) : null
    });
  }
  return {raster, base: base.canvas, stillInk: stillInk?.canvas, outline: stillOutline.canvas, layers};
}

const angleRadians = angle => (angle ?? 0) * Math.PI / 180;
const zeroPose = {};
function offsetAt(part, position, time) {
  if (!part.offset) return zeroPose;
  const start = part.axis === 'x' ? part.rect[0] : part.rect[1];
  const end = part.axis === 'x' ? part.rect[2] : part.rect[3];
  return part.offset(Math.max(start, Math.min(end, position)), time);
}

export function transformSticker(part, sticker, time) {
  const offset = offsetAt(part, part.axis === 'x' ? sticker.x : sticker.y, time);
  const {dx = 0, dy = 0, angle = 0, scaleX = 1, scaleY = 1, pivot = [0, 0]} = part.pose?.(time) ?? zeroPose;
  const [px, py] = pivot;
  const x = (sticker.x + (offset.x ?? 0) - px) * scaleX;
  const y = (sticker.y + (offset.y ?? 0) - py) * scaleY;
  const radians = angleRadians(angle);
  return {
    x: px + dx + x * Math.cos(radians) - y * Math.sin(radians),
    y: py + dy + x * Math.sin(radians) + y * Math.cos(radians),
    angle, scaleX, scaleY,
    hidden: part.cut?.(time).some(([x,y,radius]) => Math.hypot(sticker.x - x, sticker.y - y) < radius) ?? false
  };
}

function drawWarp(context, part, image, time, {area, sx, sy}) {
  const [left, top, right, bottom] = part.bounds;
  const vertical = part.axis === 'y';
  const start = vertical ? top : left;
  const end = vertical ? bottom : right;
  function rasterOffset(position) {
    const axis = vertical ? area.y + position / sy : area.x + position / sx;
    const {x = 0, y = 0} = offsetAt(part, axis, time);
    return {x: x * sx, y: y * sy};
  }
  // Rasterize shared edges at the same integer coordinate so neighboring
  // strips meet even when the shape narrows or moves by a fraction of a pixel.
  for (let a = start; a < end; a += 12) {
    const b = Math.min(a + 12, end);
    const step = b - a;
    const from = rasterOffset(a);
    const to = rasterOffset(b);
    context.save();
    if (vertical) {
      const top = Math.round(a + from.y);
      const bottom = Math.round(b + to.y);
      const x = from.x;
      context.transform(1, 0, (to.x - x) / step, (bottom - top) / step, x, top);
      context.drawImage(image, left, a, right - left, step, left, 0, right - left, step);
    } else {
      const left = Math.round(a + from.x);
      const right = Math.round(b + to.x);
      const y = from.y;
      context.transform((right - left) / step, (to.y - y) / step, 0, 1, left, y);
      context.drawImage(image, a, top, step, bottom - top, 0, top, step, bottom - top);
    }
    context.restore();
  }
}

function drawLayer(context, image, {area, sx, sy}, padding = 0) {
  context.drawImage(image, area.x - padding / sx, area.y - padding / sy, image.width / sx, image.height / sy);
}

function clipOutsideCircle(context, [x,y,radius], area) {
  context.beginPath();
  context.rect(area.x - 1, area.y - 1, area.width + 2, area.height + 2);
  context.moveTo(x + radius, y);
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip('evenodd');
}

function drawBiteEdges(context, part, holes, {area, sx, sy}) {
  context.save();
  context.translate(area.x, area.y);
  context.scale(1 / sx, 1 / sy);
  context.clip(part.silhouette);
  context.scale(sx, sy);
  context.translate(-area.x, -area.y);
  context.strokeStyle = '#37424c';
  context.lineWidth = 9;
  for (const hole of holes) {
    context.save();
    for (const other of holes) if (other !== hole) clipOutsideCircle(context, other, area);
    context.beginPath();
    context.arc(...hole, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  context.restore();
}

function drawPart(context, part, image, time, raster) {
  const {dx = 0, dy = 0, angle = 0, scaleX = 1, scaleY = 1, pivot = [0, 0]} = part.pose?.(time) ?? zeroPose;
  const [x, y] = pivot;
  if (part.warped) {
    part.warped.clearRect(0, 0, part.warped.canvas.width, part.warped.canvas.height);
    part.warped.save();
    part.warped.translate(WARP_PADDING, WARP_PADDING);
    drawWarp(part.warped, part, image, time, raster);
    part.warped.restore();
  }
  context.save();
  context.translate(dx + x, dy + y);
  context.rotate(angleRadians(angle));
  context.scale(scaleX, scaleY);
  context.translate(-x, -y);
  const holes = part.cut?.(time);
  if (holes?.length) {
    context.save();
    for (const hole of holes) clipOutsideCircle(context, hole, raster.area);
  }
  drawLayer(context, part.warped?.canvas ?? image, raster, part.warped ? WARP_PADDING : 0);
  if (holes?.length) {
    context.restore();
    if (image === part.outline) drawBiteEdges(context, part, holes, raster);
  }
  if (image === part.outline) part.detail?.(context, time);
  context.restore();
}

export function drawMotionScene(context, scene, time) {
  const {raster} = scene;
  drawLayer(context, scene.base, raster);
  if (scene.stillInk) drawLayer(context, scene.stillInk, raster);
  for (const part of scene.layers) drawPart(context, part, part.colors, time, raster);
  drawLayer(context, scene.outline, raster);
  for (const part of scene.layers) drawPart(context, part, part.outline, time, raster);
}
