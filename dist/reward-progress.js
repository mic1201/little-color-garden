import {drawStroke, H, W} from './engine.js';
import {getFillRegions} from './fill-regions.js';

export const REWARD_THRESHOLD = 97;

export function countPaintedArea(regions, fills, ink) {
  let total = 0;
  let painted = 0;
  const filled = new Set(fills.map(fill => fill.region));
  for (const region of regions) {
    const full = filled.has(region.id);
    for (const [y, start, end] of region.spans) {
      total += end - start;
      if (full) {
        painted += end - start;
      } else if (ink) {
        for (let x = start; x < end; x++) {
          if (ink[(y * W + x) * 4 + 3] >= 32) painted++;
        }
      }
    }
  }
  return {painted, total};
}

export function createPaintProgress() {
  let context;
  let ink;
  let previous = [];
  return state => {
    const regions = getFillRegions(state.pattern);
    if (!regions.length) return null;
    const strokes = state.strokes;
    if (previous.length !== strokes.length || previous.some((stroke, i) => stroke !== strokes[i])) {
      if (!context) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        context = canvas.getContext('2d', {willReadFrequently: true});
      }
      const canContinue = previous.length <= strokes.length && previous.every((stroke, i) => stroke === strokes[i]);
      if (!canContinue) context.clearRect(0, 0, W, H);
      for (const stroke of strokes.slice(canContinue ? previous.length : 0)) drawStroke(context, stroke);
      ink = strokes.length ? context.getImageData(0, 0, W, H).data : null;
      previous = strokes.slice();
    }
    const {painted, total} = countPaintedArea(regions, state.fills ?? [], ink);
    return total ? Math.floor(painted * 100 / total) : null;
  };
}
