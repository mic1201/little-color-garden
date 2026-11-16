import {getFillRegions,regionAt} from './fill-regions.js';
import {ORIGINAL_PAPER} from './paper.js';
import {paperMasks} from './paper-masks.js';

export const PAPER_REGION = 'paper-background';
export const RAINBOW_COLORS = ['#ef476f','#ffd166','#06d6a0','#118ab2','#9b5de5'];

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
    seen.add(fill.region) && /^#[0-9a-f]{6}$/i.test(fill.color) && typeof fill.rainbow==='boolean');
}

function paint(ctx,fill) {
  if (!fill.rainbow) return fill.color;
  const gradient = ctx.createLinearGradient(0,0,1000,900);
  RAINBOW_COLORS.forEach((color,i)=>gradient.addColorStop(i/(RAINBOW_COLORS.length-1),color));
  return gradient;
}

function drawPaperBackground(ctx,pattern,fill,area) {
  ctx.fillStyle = paint(ctx,fill);
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
    ctx.fillStyle = paint(ctx,fill);
    ctx.beginPath();
    for (const [y,x1,x2] of region.spans) ctx.rect(x1,y,x2-x1,1);
    ctx.fill();
  }
  ctx.restore();
}
