import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {patterns} from './dist/patterns.js';
import {getNumberGuide} from './dist/number-patterns.js';
import {getFillRegions,getExtraFillLabels,regionAt} from './dist/fill-regions.js';
const baseline='9d0d68b27cd86a0d6b90b63372aad66837780aa0';
async function before(path){return import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',`${baseline}:${path}`])).toString('base64'))}
const oldPatterns=await before('dist/patterns.js'),oldRegions=await before('dist/fill-regions.js');
for(const old of oldPatterns.patterns){
 assert.deepEqual(patterns.find(p=>p.id===old.id),old,`${old.id} original template preserved`);
 assert.deepEqual(getFillRegions(old.id),oldRegions.getFillRegions(old.id),`${old.id} saved fill IDs and geometry preserved`);
 assert.deepEqual(getExtraFillLabels(old.id),oldRegions.getExtraFillLabels(old.id),`${old.id} extra labels preserved`);
}
const p=patterns.find(p=>p.id==='parrot');assert(p);assert.equal(p.category,'animals');
const g=getNumberGuide('parrot'),regions=getFillRegions('parrot');assert.equal(regions.length,16);assert.equal(g.palette.length,5);
for(const r of regions){assert([...g.labels,...getExtraFillLabels('parrot')].some(l=>regionAt('parrot',l.x,l.y)?.id===r.id),`region ${r.id} numbered`)}
for(const x of [331,406,489,650])assert.equal(regionAt('parrot',x,745)?.number,5,'perch uses same suggested brown');
assert.equal(regionAt('parrot',0,0),null);assert.equal(regionAt('parrot',900,450),null);
console.log('PASS parrot16 labeled regions, coherent perch, and complete V7 template/fill-data preservation');
