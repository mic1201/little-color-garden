import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brushes,stamps,updateBrushSummary} from './dist/brush-ui.js';
const attrs={},summary={setAttribute(k,v){attrs[k]=v}},label={},toolbarIcon={},pickerIcon={};
for(const [id,icon,name]of brushes){
 updateBrushSummary(summary,label,id,'star',toolbarIcon,pickerIcon);
 assert.equal(label.textContent,id==='stamp'?'星星印章':name);
 assert.equal(toolbarIcon.textContent,id==='stamp'?stamps[0][1]:icon);
 assert.equal(pickerIcon.textContent,toolbarIcon.textContent);
 assert.ok(attrs['aria-label'].includes(label.textContent));
}
for(const [id,icon,name] of stamps){
 updateBrushSummary(summary,label,'stamp',id,toolbarIcon,pickerIcon);
 assert.equal(label.textContent,name+'印章');
 assert.equal(toolbarIcon.textContent,icon);
 assert.equal(pickerIcon.textContent,icon);
 updateBrushSummary(summary,label,'eraser',id);assert.equal(label.textContent,'橡皮擦');
 updateBrushSummary(summary,label,'stamp',id);assert.equal(label.textContent,name+'印章');
}
const html=readFileSync('dist/index.html','utf8');
assert.equal((html.match(/id="brush-icon"/g)||[]).length,1);
assert.match(html,/<span id="brush-icon" aria-hidden="true">🖍️<\/span>/);
assert.match(html,/<button id="brush-summary"[^>]+aria-haspopup="dialog"/);
assert.match(html,/<dialog id="brush-picker"/);
console.log('Selected-brush DOM updater: all 9 tools and 3 stamp shapes pass.');
