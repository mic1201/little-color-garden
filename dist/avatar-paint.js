import {AVATAR_H, AVATAR_W, drawAvatar, makeAvatarInk} from './avatar-art.js';
import {drawStroke} from './engine.js';

function inkCanvas() {
  return Object.assign(document.createElement('canvas'), {width:AVATAR_W, height:AVATAR_H});
}

function clear(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,AVATAR_W,AVATAR_H);
  return ctx;
}

function surfaceMasks(person, outfit) {
  const ids = ['body', ...Object.values(outfit)];
  const colors = ids.map((_, i) => [i & 1, (i >> 1) & 1, (i >> 2) & 1].map(bit => bit * 255));
  const ctx = inkCanvas().getContext('2d', {willReadFrequently:true});
  let surfaceColor;
  // Record who owns each visible pixel using the same silhouettes and layering as the avatar.
  const picker = new Proxy(ctx, {
    get(target, key) {
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      target[key] = key === 'fillStyle' || key === 'strokeStyle' ? surfaceColor : value;
      return true;
    }
  });
  drawAvatar(picker,person,outfit,null,undefined,id => {
    surfaceColor = `rgb(${colors[ids.indexOf(id)].join(',')})`;
  });
  const pixels = ctx.getImageData(0,0,AVATAR_W,AVATAR_H).data;
  const masks = ids.map(() => ctx.createImageData(AVATAR_W,AVATAR_H));
  for (let i=0; i<pixels.length; i+=4) {
    if (pixels[i+3] < 128) continue;
    let nearest=0, shortest=Infinity;
    for (let j=0; j<colors.length; j++) {
      const [r,g,b] = colors[j];
      const distance = (pixels[i]-r)**2 + (pixels[i+1]-g)**2 + (pixels[i+2]-b)**2;
      if (distance < shortest) {
        nearest = j;
        shortest = distance;
      }
    }
    masks[nearest].data[i+3] = 255;
  }
  return ids.map((id,i) => {
    const canvas = inkCanvas();
    canvas.getContext('2d').putImageData(masks[i],0,0);
    return [id,canvas];
  });
}

export function createAvatarPainting() {
  const maskCache = new Map();
  const source = inkCanvas();
  const clipped = inkCanvas();
  const committed = new Map();
  const live = new Map();
  let lastPerson;
  let rendered = [];

  function masksFor(person,outfit) {
    const key=JSON.stringify([person,Object.entries(outfit).sort()]);
    if (!maskCache.has(key)) {
      if (maskCache.size >= 6) maskCache.delete(maskCache.keys().next().value);
      maskCache.set(key,surfaceMasks(person,outfit));
    }
    return maskCache.get(key);
  }

  function paint(person, stroke, destination, baseline) {
    const erase = stroke.tool==='eraser';
    if (erase) drawStroke(clear(source),{tool:'marker',color:'#ffffff',size:13,points:stroke.points});
    else makeAvatarInk(source,[stroke]);
    for (const [id, mask] of masksFor(person,stroke.outfit)) {
      if (!destination.has(id)) destination.set(id,inkCanvas());
      const target = destination.get(id);
      const ctx = baseline ? clear(target) : target.getContext('2d');
      if (baseline?.has(id)) ctx.drawImage(baseline.get(id),0,0);
      const clip = clear(clipped);
      clip.drawImage(source,0,0);
      clip.globalCompositeOperation = 'destination-in';
      clip.drawImage(mask,0,0);
      clip.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.drawImage(clipped,0,0);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function render(person, strokes, pending) {
    if (lastPerson !== person || !rendered.every((stroke,i)=>strokes[i]===stroke)) {
      committed.clear();
      rendered = [];
      lastPerson = person;
    }
    for (const stroke of strokes.slice(rendered.length)) {
      paint(person,stroke,committed);
      rendered.push(stroke);
    }
    if (!pending?.points.length) return committed;
    paint(person,pending,live,committed);
    const result=new Map(committed);
    for (const [id] of masksFor(person,pending.outfit)) result.set(id,live.get(id));
    return result;
  }

  function surfaceAt(person, outfit, x, y) {
    const px = Math.floor(x), py = Math.floor(y);
    if (px < 0 || py < 0 || px >= AVATAR_W || py >= AVATAR_H) return;
    return masksFor(person,outfit).find(([,mask]) =>
      mask.getContext('2d').getImageData(px,py,1,1).data[3] > 0)?.[0];
  }

  return {render, surfaceAt};
}
