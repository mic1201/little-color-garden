import {fillTarget,PAPER_REGION} from './dist/fills.js';
import {paperMasks} from './dist/paper-masks.js';
import assert from 'node:assert/strict';import {patterns} from './dist/patterns.js';import {getNumberGuide} from './dist/number-patterns.js';import {getFillRegions,regionAt,getExtraFillLabels} from './dist/fill-regions.js';
let count=0;for(const p of patterns.filter(p=>p.id!=='blank')){const regions=getFillRegions(p.id),guide=getNumberGuide(p.id);assert(regions.length);let seen=new Set();for(const r of regions){count++;assert(!seen.has(r.id));seen.add(r.id);if(guide)assert(guide.palette.some(c=>c.number===r.number));else assert.equal(r.number,undefined);let last=-1;for(const [y,x1,x2] of r.spans){assert(y>=last);last=y;assert(y>0&&y<899&&x1>0&&x2<1000&&x1<x2);assert.equal(regionAt(p.id,x1,y)?.id,r.id)}for(const [x,y] of r.seeds)assert.equal(regionAt(p.id,x,y)?.id,r.id)}for(const l of [...(guide?.labels||[]),...getExtraFillLabels(p.id)])assert.equal(regionAt(p.id,l.x,l.y)?.number,l.number);assert.equal(regionAt(p.id,0,0),null);assert.equal(regionAt(p.id,NaN,300),null)}
assert.equal(getFillRegions('blank').length,0);assert.equal(getExtraFillLabels('rainbow').length,6);assert.equal(getFillRegions('sea-turtle').filter(r=>r.number===1).length,7);console.log(`Fill region geometry passed: ${count} bounded regions, all guide seeds, six rainbow/cloud pockets, seven independent shell panels`);

const rabbit = 'rabbit-garden-clean';
const touchTargets = [[420,287], [580,287], [500,445], [433,614], [500,632], [408,705], [592,705]];
const rabbitParts = touchTargets.map(([x,y]) => {
  const region = regionAt(rabbit,x,y);
  assert(region, `Rabbit part at ${x},${y} is closed and fillable`);
  return region.id;
});
assert.equal(new Set(rabbitParts).size, rabbitParts.length, 'The head, ears, belly, body and feet are independent regions');

assert.equal(fillTarget('blank',500,400),PAPER_REGION);
assert.equal(fillTarget('butterfly-clean',-100,450),PAPER_REGION);
assert.equal(fillTarget('rainbow-clean',500,600),PAPER_REGION);
assert.equal(fillTarget('rainbow-clean',205,550),null);
for(const p of patterns.filter(p=>p.id!=='blank')){
  assert(paperMasks[p.id], p.id);
  assert.equal(fillTarget(p.id,0,0),PAPER_REGION);
}
for(const [id,points] of Object.entries({
  'butterfly-clean': [[500,485],[240,336],[760,336],[285,559],[715,559]],
  'rainbow-clean': [[500,225],[500,295],[500,350],[240,631],[760,631]],
  'rabbit-clean': [[500,383],[500,650],[326,772],[674,772]],
  'elephant-clean': [[480,290],[232,349],[768,349],[333,629]],
  'triceratops-clean': [[345,351],[305,503],[533,487],[727,540]],
  'triceratops-v3-clean': [[343,352],[280,478],[542,487],[728,541]],
  'halloween-photo-v3-clean': [[246,587],[444,591],[490,596],[696,596]],
  'triceratops-v4-clean': [[343,352],[280,478],[542,487],[728,541],[195,480]],
  'halloween-photo-v4-clean': [[246,587],[444,591],[490,596],[696,596],[795,347]]
})){
  const ids=points.map(([x,y])=>fillTarget(id,x,y));
  assert(ids.every(region=>region && region!==PAPER_REGION), id + ' has closed target areas: '+ids);
  assert.equal(new Set(ids).size,ids.length,id+' has separate target areas');
}

assert.equal(fillTarget('triceratops-v4-clean',240,508),fillTarget('triceratops-v4-clean',280,478));
