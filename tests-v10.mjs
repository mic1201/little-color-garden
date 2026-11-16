import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {patterns,svgMarkup} from './dist/patterns.js';
import {richPatterns} from './dist/rich-patterns.js';
import {getNumberGuide,numberSvgMarkup,closureSvgMarkup} from './dist/number-patterns.js';
import {getFillRegions,getExtraFillLabels,regionAt} from './dist/fill-regions.js';
import {validDocument} from './dist/engine.js';
import {validFills} from './dist/fills.js';
const baseline='d8c6c523d2ed0e3b4c9b8be0d4ce2d551d7ddbb2';
async function before(path){return import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',`${baseline}:${path}`])).toString('base64'))}
const old=await before('dist/patterns.js'),oldRegions=await before('dist/fill-regions.js');
for(const p of old.patterns){assert.deepEqual(patterns.find(n=>n.id===p.id),p);assert.deepEqual(getFillRegions(p.id),oldRegions.getFillRegions(p.id));assert.deepEqual(getExtraFillLabels(p.id),oldRegions.getExtraFillLabels(p.id));}
assert.equal(richPatterns.length,5);assert(richPatterns.some(p=>p.id==='parrot-cute'));
for(const p of richPatterns){const regions=getFillRegions(p.id);assert(regions.length>=10&&regions.length<=100,p.id+' child-sized region count');const g=getNumberGuide(p.id);for(const r of regions){assert([...g.labels,...getExtraFillLabels(p.id)].some(l=>regionAt(p.id,l.x,l.y)?.id===r.id),p.id+' all regions numbered');}assert(!/stroke="#ffffff"/.test(closureSvgMarkup(p.id)));}
const legacy={version:1,pattern:'parrot',numbers:true,strokes:[],fills:getFillRegions('parrot').map(r=>({region:r.id,color:'#ed7976',rainbow:false}))};
assert(validDocument(legacy,patterns.map(p=>p.id)));assert(validFills(legacy));
for(const p of patterns.filter(p=>p.id!=='blank'&&!p.id.endsWith('-clean'))){assert(!numberSvgMarkup(p.id).includes(getNumberGuide(p.id).extraShapes)||!getNumberGuide(p.id).extraShapes,'labels cannot own the closure paths');assert(closureSvgMarkup(p.id).includes(getNumberGuide(p.id).extraShapes));assert(svgMarkup(p.id).includes('stroke="#37424c"'));}
console.log('PASS V10 all prior geometry/save preservation, cute parrot +4scenes, bounded labeled regions and persistent closure line contracts');
