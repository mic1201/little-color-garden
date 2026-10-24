import {getExtraFillLabels} from './dist/fill-regions.js';
import assert from 'node:assert/strict';
import {patterns} from './dist/patterns.js';
import {getNumberGuide,numberSvgMarkup} from './dist/number-patterns.js';
assert.equal(getNumberGuide('blank'),null);assert.equal(getNumberGuide('unknown'),null);
assert.equal(numberSvgMarkup('blank'),'');
const pages=patterns.filter(p=>p.id!=='blank');assert.equal(pages.length,18);
for(const p of pages){
 const g=getNumberGuide(p.id);assert.ok(g,`${p.id} has a guide`);
 assert.ok(g.palette.length>=2&&g.palette.length<=7,p.id);
 assert.equal(new Set(g.palette.map(c=>c.color)).size,g.palette.length);
 g.palette.forEach((c,i)=>{assert.equal(c.number,i+1);assert.match(c.color,/^#[a-f0-9]{6}$/i);assert.ok(c.name);assert.ok(g.labels.some(l=>l.number===c.number),`${p.id} uses ${c.number}`)});
 assert.ok(g.labels.length>0);
 const seen=new Set();for(const l of g.labels){assert.ok(l.x>=30&&l.x<=970&&l.y>=30&&l.y<=870,p.id);assert.ok(g.palette.some(c=>c.number===l.number));assert.ok(!seen.has(`${l.x},${l.y}`));seen.add(`${l.x},${l.y}`);assert.ok((l.size||28)>=16)}
 assert.ok(!/<script|on\w+=|href=/i.test(g.extraShapes));
 const svg=numberSvgMarkup(p.id);assert.match(svg,/viewBox="0 0 1000 900"/);assert.equal((svg.match(/<text /g)||[]).length,g.labels.length+getExtraFillLabels(p.id).length);
}
const turtle=getNumberGuide('sea-turtle');assert.equal(turtle.labels.filter(l=>l.number===1).length,7);assert.equal(turtle.palette[0].color,'#39a66d');
console.log('number patterns: all 18 templates, valid repeated color IDs and safe labels passed');
