import {getFillRegions,regionAt} from './fill-regions.js';
import {ORIGINAL_PAPER} from './paper.js';
import {paperMasks} from './paper-masks.js';

export const PAPER_REGION = 'paper-background';
export const RAINBOW_COLORS = ['#ef476f','#ffd166','#06d6a0','#118ab2','#9b5de5'];
const ORIGINAL_GRADIENT = [0, 0, ORIGINAL_PAPER.width, ORIGINAL_PAPER.height];

export function fillTarget(pattern,x,y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const region = regionAt(pattern,x,y);
  if (region) return region.id;
  const mask = paperMasks[pattern];
  if (!mask) return PAPER_REGION; // The blank sheet is one region.
  const [top,rows] = mask;
  const row = rows[Math.floor(y)-top] || [];
  const column = Math.floor(x);
  for (let i=0; i<row.length; i+=2) {
    if (column>=row[i] && column<row[i+1]) return null;
  }
  return PAPER_REGION;
}

export function validFills(state) {
  if (state.fills===undefined) return true;
  if (!Array.isArray(state.fills) || state.fills.length>200) return false;
  const ids = new Set([PAPER_REGION,...getFillRegions(state.pattern).map(r=>r.id)]);
  const seen = new Set();
  return state.fills.every(fill => fill && ids.has(fill.region) && !seen.has(fill.region) &&
    seen.add(fill.region) && /^#[0-9a-f]{6}$/i.test(fill.color) && typeof fill.rainbow==='boolean' &&
    (fill.gradient === undefined || (fill.rainbow && validGradient(fill.gradient))));
}

function validGradient(points) {
  return Array.isArray(points) && points.length === 4 &&
    [...points].every(point => Number.isFinite(point) && Math.abs(point) <= 4000000) &&
    (points[0] !== points[2] || points[1] !== points[3]);
}

export function randomFillGradient(pattern, region, area = ORIGINAL_PAPER, sample = Math.random) {
  const bounds = getFillRegions(pattern).find(candidate => candidate.id === region)?.bounds;
  const [left, top, right, bottom] = bounds ?? [area.x, area.y, area.x + area.width, area.y + area.height];
  const angle = sample() * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const radius = (Math.abs(dx) * (right - left) + Math.abs(dy) * (bottom - top)) / 2;
  const shift = (sample() - .5) * radius * .5;
  const halfLength = radius * (.7 + sample() * .25);
  const x = (left + right) / 2 + dx * shift;
  const y = (top + bottom) / 2 + dy * shift;
  return [x - dx * halfLength, y - dy * halfLength, x + dx * halfLength, y + dy * halfLength];
}

export function fillPaint(ctx,fill) {
  if (!fill.rainbow) return fill.color;
  const gradient = ctx.createLinearGradient(...(fill.gradient ?? ORIGINAL_GRADIENT));
  RAINBOW_COLORS.forEach((color,i)=>gradient.addColorStop(i/(RAINBOW_COLORS.length-1),color));
  return gradient;
}

function drawPaperBackground(ctx,pattern,fill,area) {
  ctx.fillStyle = fillPaint(ctx,fill);
  const mask = paperMasks[pattern];
  if (!mask) {
    ctx.fillRect(area.x,area.y,area.width,area.height);
    return;
  }
  const [top,rows] = mask;
  ctx.beginPath();
  ctx.rect(area.x,area.y,area.width,area.height);
  for (const [offset,row] of rows.entries()) {
    for (let i=0; i<row.length; i+=2) {
      ctx.rect(row[i],top+offset,row[i+1]-row[i],1);
    }
  }
  ctx.fill('evenodd');
}

export function drawFills(ctx,state,area=ORIGINAL_PAPER) {
  const fills = state.fills || [];
  if (!fills.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const background = fills.find(fill=>fill.region===PAPER_REGION);
  if (background) drawPaperBackground(ctx,state.pattern,background,area);
  const regions = getFillRegions(state.pattern);
  for (const fill of fills) {
    const region = regions.find(r=>r.id===fill.region);
    if (!region) continue;
    ctx.fillStyle = fillPaint(ctx,fill);
    ctx.beginPath();
    for (const [y,x1,x2] of region.spans) ctx.rect(x1,y,x2-x1,1);
    ctx.fill();
  }
  ctx.restore();
}
