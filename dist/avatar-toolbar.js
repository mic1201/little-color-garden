const tools = [
  ['pattern-open', 'peek', 2.35],
  ['brush-summary', 'brush', 2.65],
  ['undo', 'water', 2.25],
  ['redo', 'water', 2.25],
  ['parent', 'gear', 2.45],
  ['reward-open', 'chest', 2.75]
];
const unit = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = n => { const x = unit(n); return x * x * (3 - 2 * x); };
const span = (p, start, end) => ease((p - start) / (end - start));
const pulse = (p, start, end) => Math.sin(Math.PI * unit((p - start) / (end - start)));

function dot(ctx, x, y, radius, fill) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCrayon(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.roundRect(-14, -4, 24, 8, 2);
  ctx.fillStyle = '#ef7479';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#a64454';
  ctx.stroke();
  ctx.fillStyle = '#ffdfaa';
  ctx.fillRect(-7, -3.5, 10, 7);
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.lineTo(16, 0);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fillStyle = '#c9505b';
  ctx.fill();
  ctx.restore();
}

function sprayWater(ctx, p, center, pose) {
  const endY = pose.y - 174 * pose.size;
  for (let i = 0; i < 8; i++) {
    const travel = (p - .31 - (i % 4) * .025) / .27;
    if (travel <= 0 || travel >= 1) continue;
    const x = mix(center.x, pose.x + (i - 4) * 2.6, travel);
    const y = mix(center.y, endY + (i % 3) * 8, travel) - (12 + i * 3) * Math.sin(Math.PI * travel);
    dot(ctx, x, y, 2 + (i % 3) * .66, i % 2 === 0 ? '#66c6ee' : '#9ce1ef');
  }
  const splash = pulse(p, .52, .77);
  if (splash > 0) {
    for (let i = -2; i <= 2; i++) {
      dot(ctx, pose.x + i * (8 + splash * 3), endY - 9 * splash + Math.abs(i) * 3, 2.4 * splash, '#68bde8');
    }
  }
}

function showFace(ctx, center, amount, time, drawPlayer) {
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.beginPath();
  ctx.roundRect(center.x - 14, center.y - 12, 28, 24, 3);
  ctx.fillStyle = '#fff1c6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#bf8c57';
  ctx.stroke();
  ctx.clip();
  drawPlayer({x:center.x, y:center.y + 42, face:1, size:.23, climb:1}, time);
  ctx.restore();
}

function paintInteraction(ctx, action, drawPlayer) {
  const {button, center, start, near, kind, duration, time} = action;
  const p = unit(time / duration);
  const peek = kind === 'peek' ? span(p, .27, .43) * (1 - span(p, .61, .76)) : 0;
  const walkIn = span(p, 0, .25);
  const walkOut = span(p, .72, 1);
  const approach = walkIn * (1 - walkOut);
  const reaction = pulse(p, .38, .74);
  const face = center.x >= near.x ? 1 : -1;
  const pulseTwo = pulse(p, .24, .39) + pulse(p, .39, .53);
  const poses = {
    peek: {crouch:peek, wave:.26 * approach},
    brush: {wave:.72 * pulse(p, .27, .72) * (.7 + .3 * Math.sin(time * 12))},
    water: {lean:-face * .21 * reaction, blink:reaction > .35, crouch:reaction * .65},
    gear: {lean:.17 * face * reaction, glide:.82 * reaction},
    chest: {wave:.65 * pulseTwo, stride:.92 * reaction * Math.sin(time * 19)}
  };
  const flinch = kind === 'chest' ? pulse(p, .50, .89) : kind === 'water' ? reaction * .48 : 0;
  const striding = p < .25 || p > .72;
  const pose = {
    x:mix(mix(start.x, near.x, approach), center.x, peek) - 27 * face * flinch,
    y:mix(start.y, near.y, approach) - 19 * flinch,
    size:mix(start.size, near.size, approach),
    face:p > .64 && kind === 'chest' ? -face : face,
    stride:striding ? .65 * Math.sin(time * 19) : 0,
    gait:flinch > .1 ? 'hop' : 'walk',
    ...poses[kind]
  };
  ctx.save();
  ctx.globalAlpha = 1 - peek;
  drawPlayer(pose, time);
  ctx.restore();

  if (kind === 'peek' && peek > 0) showFace(ctx, center, peek, time, drawPlayer);
  if (kind === 'brush') {
    const hold = span(p, .25, .38) * (1 - span(p, .65, .79));
    button.style.setProperty('--actor-icon-opacity', String(1 - hold));
    if (hold > 0) {
      const swing = Math.sin(time * 10);
      drawCrayon(ctx, mix(center.x, pose.x + face * 20, hold), mix(center.y, pose.y - 31, hold), -.7 + swing * hold);
    }
  }
  if (kind === 'water') sprayWater(ctx, p, center, pose);
  if (kind === 'gear') button.style.setProperty('--actor-icon-angle', `${180 * span(p, .29, .72)}deg`);
  if (kind === 'chest') {
    const shake = Math.sin(time * 58) * pulse(p, .43, .76);
    button.style.setProperty('--actor-icon-angle', `${12 * shake}deg`);
    button.style.setProperty('--actor-icon-shift', `${3.5 * shake}px`);
    for (let i = 0; i < 3 && pulseTwo > .05; i++) {
      dot(ctx, center.x - face * (15 + i * 4), center.y - (i - 1) * 7, 2.3 * pulseTwo, '#cf9b64');
    }
  }
}

export function chooseToolbarInteraction(options, previousKind, random = Math.random) {
  if (!options.length || random() >= .62) return undefined;
  const different = options.filter(option => option.kind !== previousKind);
  const eligible = different.length ? different : options;
  return eligible[Math.floor(random() * eligible.length)];
}

export function createToolbarInteractions({toolbar, layer, rewardTray, drawPlayer}) {
  const ctx = layer.getContext('2d');
  const buttons = tools.map(([id, kind, duration]) => ({
    button:toolbar.querySelector(`#${id}`), kind, duration
  }));
  let board;
  let vertical;
  let lastEdge;
  let previousKind;
  let next;
  let action;
  let ratio = 1;

  function cancel() {
    next = undefined;
    if (!action) return;
    delete action.button.dataset.avatarInteraction;
    for (const property of ['--actor-icon-opacity', '--actor-icon-angle', '--actor-icon-shift']) {
      action.button.style.removeProperty(property);
    }
    action = undefined;
    layer.hidden = true;
  }

  function resize(bounds) {
    const {left, top, width, height} = bounds;
    const rightSide = toolbar.getBoundingClientRect().left >= bounds.right - 2;
    if (board && [left-board.left, top-board.top, width-board.width, height-board.height].every(delta => Math.abs(delta) < .5) &&
        vertical === rightSide) return;
    cancel();
    board = {left, top, width, height};
    vertical = rightSide;
    lastEdge = undefined;
  }

  function axisOf(pose) {
    return vertical ? pose.y : pose.x;
  }

  function pick(pose) {
    const flight = pose.gait === 'flight';
    const direction = vertical ? (flight ? 1 : -1) : (flight ? -1 : 1);
    const low = 8 + pose.size * (vertical ? 284 : 125);
    const high = vertical ? board.height * (flight ? .92 : 1) - 8 : board.width - low;
    const candidates = buttons.flatMap(option => {
      const box = option.button.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return [];
      const center = {x:box.left + box.width / 2, y:box.top + box.height / 2};
      const anchor = vertical ? center.y - board.top + 105 * pose.size : center.x - board.left;
      const at = Math.min(high, Math.max(low, anchor));
      if (direction * (at - axisOf(pose)) < -12) return [];
      return [{...option, box, center, at, direction}];
    });
    return chooseToolbarInteraction(candidates, previousKind);
  }

  function start(pose) {
    layer.hidden = false;
    const {width, height} = layer.getBoundingClientRect();
    ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(width * ratio);
    const h = Math.round(height * ratio);
    if (layer.width !== w || layer.height !== h) {
      layer.width = w;
      layer.height = h;
    }
    const {box, center} = next;
    const near = vertical ? {x:box.left - 8, y:center.y + 22}
      : {x:Math.max(25, center.x - 18), y:box.top + Math.min(13, box.height / 3)};
    const origin = {...pose, x:pose.x + board.left, y:pose.y + board.top};
    action = {...next, start:origin, near:{...near, size:Math.max(.15, pose.size)}, time:0};
    next = undefined;
    previousKind = action.kind;
    action.button.dataset.avatarInteraction = action.kind;
  }

  function allowed() {
    return rewardTray.hidden && !document.querySelector('dialog[open]');
  }

  function frame(pose, delta, available) {
    if (!board) return false;
    if (!available) cancel();
    if (pose.edge !== lastEdge) {
      lastEdge = pose.edge;
      next = available && pose.edge === (vertical ? 'right' : 'bottom') && allowed() ? pick(pose) : undefined;
    }
    if (next && next.direction * (axisOf(pose) - next.at) >= 0) {
      if (allowed()) start(pose);
      else next = undefined;
    }
    if (!action) return false;
    if (!allowed() || (action.time += delta) >= action.duration) {
      cancel();
      return false;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, layer.width / ratio, layer.height / ratio);
    paintInteraction(ctx, action, (pose, time) => drawPlayer(ctx, pose, time));
    return true;
  }

  return {resize, frame, cancel, get active() { return Boolean(action); }};
}
