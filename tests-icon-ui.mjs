import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
for(const id of ['focus-enter','focus-exit','focus-tools','undo','redo','parent','background-open','color-open','rainbow-color','custom-color','cancel','confirm']){const tag=html.match(new RegExp('<(?:button|input)[^>]*id="'+id+'"[^>]*>'))?.[0];assert(tag,id);assert.match(tag,/aria-label="[^"]+"/,id+' accessible label')}
for(const id of ['brush-name','color-name','focus-label'])assert.match(html,new RegExp('id="'+id+'" class="sr-only"'));
const child=html.split('<dialog id="parent-dialog">')[0];assert(!child.includes('上一步</small>'));assert(!child.includes('選圖案 <span>'));assert(!child.includes('大或小？'));assert(!child.includes('彩虹筆色</button>'));assert(!child.includes('自己調色 <input'));assert(child.includes('picture-picker-icon'));
assert.match(css,/\.sr-only\{[^}]*clip:rect/);assert.match(css,/\.confirm-sheet/);assert.match(html,/id="confirm-preview"/);assert.match(html,/id="save-status"/);assert.match(html,/作品只暫存在/);
console.log('PASS icon-first static structure, accessible labels, parent-only help, and pictorial confirmation.');
