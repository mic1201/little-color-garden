import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brushes,stamps,updateBrushSummary} from './dist/brush-ui.js';
const attrs={},summary={setAttribute(k,v){attrs[k]=v}},icon={},label={};
for(const [id,symbol,name]of brushes){
 updateBrushSummary(summary,icon,label,id,'star');
 assert.equal(icon.textContent,id==='stamp'?'★':symbol);
 assert.equal(label.textContent,id==='stamp'?'星星印章':name);
 assert.ok(attrs['aria-label'].includes(label.textContent));
}
for(const [id,symbol,name] of stamps){
 updateBrushSummary(summary,icon,label,'stamp',id);
 assert.equal(icon.textContent,symbol);assert.equal(label.textContent,name+'印章');
 // Switching away and back retains selected shape; eraser is not the pen icon.
 updateBrushSummary(summary,icon,label,'eraser',id);assert.equal(icon.textContent,'▱');
 updateBrushSummary(summary,icon,label,'stamp',id);assert.equal(icon.textContent,symbol);
}
const html=readFileSync('dist/index.html','utf8');
assert.equal((html.match(/id="brush-icon"/g)||[]).length,1);
assert.match(html,/<button id="brush-summary"[^>]+aria-haspopup="dialog"/);
assert.match(html,/<dialog id="brush-picker"/);
console.log('Selected-brush DOM updater: all 9 tools and 3 stamp shapes pass.');
