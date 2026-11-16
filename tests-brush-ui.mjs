import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brushes,stamps,updateBrushSummary} from './dist/brush-ui.js';
const attrs={},summary={setAttribute(k,v){attrs[k]=v}},label={};
for(const [id,,name]of brushes){
 updateBrushSummary(summary,label,id,'star');
 assert.equal(label.textContent,id==='stamp'?'星星印章':name);
 assert.ok(attrs['aria-label'].includes(label.textContent));
}
for(const [id,,name] of stamps){
 updateBrushSummary(summary,label,'stamp',id);
 assert.equal(label.textContent,name+'印章');
 updateBrushSummary(summary,label,'eraser',id);assert.equal(label.textContent,'橡皮擦');
 updateBrushSummary(summary,label,'stamp',id);assert.equal(label.textContent,name+'印章');
}
const html=readFileSync('dist/index.html','utf8');
assert.equal((html.match(/id="brush-icon"/g)||[]).length,1);
assert.match(html,/<span id="brush-icon" aria-hidden="true">🖍️<\/span>/);
assert.match(html,/<button id="brush-summary"[^>]+aria-haspopup="dialog"/);
assert.match(html,/<dialog id="brush-picker"/);
console.log('Selected-brush DOM updater: all 9 tools and 3 stamp shapes pass.');
