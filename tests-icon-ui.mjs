import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
for(const id of ['fullscreen-toggle','brush-summary','brush-close','fill-toggle','pattern-open','undo','redo','parent','color-open','color-close','basic-colors-back','cancel','confirm']){const tag=html.match(new RegExp('<(?:button|input)[^>]*id="'+id+'"[^>]*>'))?.[0];assert(tag,id);assert.match(tag,/aria-label="[^"]+"/,id+' accessible label')}
for(const id of ['brush-name','spectrum-keys'])assert.match(html,new RegExp('id="'+id+'" class="sr-only"'));
assert(!html.includes('number-guide')&&!html.includes('number-colors')&&!html.includes('數字畫模式'));
assert.match(html, /id="basic-colors"[^>]*aria-label="基本顏色"/);
assert.match(html, /id="custom-color-open"[^>]*>[\s\S]*?自訂顏色/);
assert.match(html, /id="spectrum-panel" hidden>[\s\S]*?id="color-spectrum"[^>]*role="slider"[^>]*aria-label="顏色光譜"/);
assert(!/<input[^>]+type="color"|id="(?:colors|rainbow-color|custom-color)"/.test(html));
assert(!/id="(?:music-toggle|focus-music|background-open|background-dialog)"/.test(html));
for(const id of ['fullscreen-toggle','brush-summary','color-open','pattern-open','undo','redo','parent','fill-toggle']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
}
assert(!html.includes('focus-controls'));
assert.match(html,/id="parent-dialog"[\s\S]*id="fullscreen-toggle"/);
const child=html.split('<dialog id="parent-dialog">')[0];assert(!child.includes('上一步</small>'));assert(!child.includes('選圖案 <span>'));assert(!child.includes('大或小？'));assert(!child.includes('彩虹筆色</button>'));assert(!child.includes('自己調色 <input'));assert(child.includes('picture-picker-icon'));
assert.match(css,/\.sr-only\s*\{[^}]*clip:\s*rect/);assert.match(css,/\.confirm-sheet/);assert.match(html,/id="confirm-preview"/);assert.match(html,/id="save-status"/);assert.match(html,/作品只暫存在/);
console.log('PASS icon-first static structure, accessible labels, parent-only help, and pictorial confirmation.');
