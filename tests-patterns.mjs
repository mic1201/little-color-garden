import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {patterns,patternCategories,availablePatterns,isLegacyPattern,svgMarkup} from './dist/patterns.js';
const oldSource=execFileSync('git',['show','67730c02b9a5b0deb8b1c7ec9248f4a6c8f0877e:dist/patterns.js'],{encoding:'utf8'});
const old=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
assert.equal(patterns.filter(p=>!p.id.endsWith("-clean")).length,26);
assert.equal(new Set(patterns.map(p=>p.id)).size,patterns.length);
assert.equal(patternCategories.length,7);
assert.equal(availablePatterns().filter(({category})=>category==='island').length,4);
for(const p of old.patterns){const n=patterns.find(n=>n.id===p.id);for(const key of ['id','name','icon','shapes'])assert.equal(n[key],p[key]);assert.equal(svgMarkup(p.id),old.svgMarkup(p.id));}
for(const c of patternCategories){assert.ok(patterns.filter(p=>p.category===c.id&&!old.patterns.some(o=>o.id===p.id)).length>=(c.id==='animals'?3:2));}
for(const p of patterns){assert.ok(!/<(?:script|image|foreignObject|rect)\b|\bon\w+=|\bhref=|fill=/i.test(p.shapes.replace(/<circle cx="[0-9]+" cy="[0-9]+" r="[0-9]+" fill="#37424c" stroke="none"\/>/g,'')));assert.ok(svgMarkup(p.id).includes('fill="none"'));}
console.log('Original patterns preserved, four island coloring pages available, and safe transparent SVG checks passed');

for(const id of ['halloween-photo','triceratops','rabbit-garden']){
  assert(isLegacyPattern(id+'-clean'));
  const current = id==='rabbit-garden' ? id+'-v2-clean' : id+'-v4-clean';
  assert(availablePatterns().some(pattern=>pattern.id===current));
  if(id!=='rabbit-garden'){
    assert(isLegacyPattern(id+'-v2-clean'));
    assert(availablePatterns(id+'-v2-clean').some(pattern=>pattern.id===id+'-v2-clean'));
    assert(availablePatterns(id+'-v3-clean').some(pattern=>pattern.id===id+'-v3-clean'));
  }
  assert(!availablePatterns().some(pattern=>pattern.id===id+'-clean'));
  assert(availablePatterns(id+'-clean').some(pattern=>pattern.id===id+'-clean'));
}
