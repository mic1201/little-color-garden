import assert from 'node:assert/strict';
import {patterns,svgMarkup} from './dist/patterns.js';
import {halloweenPattern,halloweenGuide} from './dist/halloween-pattern.js';
import {getFillRegions,getExtraFillLabels,regionAt} from './dist/fill-regions.js';
import {getNumberGuide,numberSvgMarkup,closureSvgMarkup} from './dist/number-patterns.js';
import {validDocument} from './dist/engine.js';
import {validFills} from './dist/fills.js';
const id='halloween-photo',p=patterns.find(p=>p.id===id),g=getNumberGuide(id),rs=getFillRegions(id);
assert.equal(p,halloweenPattern);assert.equal(g,halloweenGuide);
assert(rs.length>=15&&rs.length<100,'simple scene should have bounded child-sized regions');
assert(!/<image|href=|http|data:|foreignObject|script/i.test(p.shapes));
assert(svgMarkup(id).includes('stroke="#37424c"'));
for(const r of rs){assert([...g.labels,...getExtraFillLabels(id)].some(l=>regionAt(id,l.x,l.y)?.id===r.id),'every bounded region has number');for(const [x,y]of r.seeds)assert.equal(regionAt(id,x,y).id,r.id);assert(r.bounds[0]>0&&r.bounds[1]>0&&r.bounds[2]<1000&&r.bounds[3]<900);}
assert.equal(regionAt(id,1,1),null);
const doc={version:1,pattern:id,numbers:true,strokes:[],fills:rs.map(r=>({region:r.id,color:'#abcdef',rainbow:false}))};
assert(validDocument(doc,patterns.map(p=>p.id)));assert(validFills(doc));assert(validFills({...doc,fills:rs.map(r=>({region:r.id,color:'#abcdef',rainbow:true}))}));
assert(numberSvgMarkup(id).includes('<text'));assert(closureSvgMarkup(id).includes('stroke="#37424c"'));
console.log('PASS Halloween original vector scene, all regions labeled/bounded, arbitrary-color and rainbow saved fills');
