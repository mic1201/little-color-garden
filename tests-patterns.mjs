import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {patterns,patternCategories,svgMarkup} from './dist/patterns.js';
const oldSource=execFileSync('git',['show','67730c02b9a5b0deb8b1c7ec9248f4a6c8f0877e:dist/patterns.js'],{encoding:'utf8'});
const old=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
assert.equal(patterns.length,19);
assert.equal(new Set(patterns.map(p=>p.id)).size,19);
assert.equal(patternCategories.length,6);
for(const p of old.patterns){const n=patterns.find(n=>n.id===p.id);for(const key of ['id','name','icon','shapes'])assert.equal(n[key],p[key]);assert.equal(svgMarkup(p.id),old.svgMarkup(p.id));}
for(const c of patternCategories){assert.ok(patterns.filter(p=>p.category===c.id&&!old.patterns.some(o=>o.id===p.id)).length===2);}
for(const p of patterns){assert.ok(!/<(?:script|image|foreignObject|rect)\b|\bon\w+=|\bhref=|fill=/i.test(p.shapes));assert.ok(svgMarkup(p.id).includes('fill="none"'));}
console.log('Pattern preservation,12original additions,6categories and safe transparent SVG checks passed');
