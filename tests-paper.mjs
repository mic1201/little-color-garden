import assert from 'node:assert/strict';
import {ORIGINAL_PAPER,paperView,paperPoint,includePoint,rasterSize,validPaper,paperMarkup} from './dist/paper.js';
import {validDocument} from './dist/engine.js';
for(const [width,height]of [[1700,780],[780,1700],[500,450],[2800,500],[375,600],[2048,1536]]){
 const v=paperView(width,height);assert(Math.abs(v.width/v.height-width/height)<1e-8);assert(v.x<=0&&v.y<=0&&v.x+v.width>=1000&&v.y+v.height>=900);
 const rect={left:10,top:20,width,height};const tl=paperPoint(10,20,rect,v),br=paperPoint(10+width,20+height,rect,v);assert.equal(tl.x,v.x);assert.equal(br.y,v.y+v.height);
 let sheet=includePoint(undefined,tl,40);sheet=includePoint(sheet,br,40);assert(validPaper(sheet));
 const doc={version:1,pattern:'blank',paper:sheet,strokes:[{tool:'marker',color:'#123456',size:20,points:[tl,br]}]};assert(validDocument(doc,['blank']));assert(validDocument(JSON.parse(JSON.stringify(doc)),['blank']));
 const rotated=paperView(height,width,sheet);assert(rotated.x<=sheet.x&&rotated.y<=sheet.y);assert(rotated.x+rotated.width>=sheet.x+sheet.width-1e-8);assert(rotated.y+rotated.height>=sheet.y+sheet.height-1e-8);
 const r=rasterSize(rotated);assert(r.width<=2048&&r.height<=2048);assert.match(paperMarkup('<svg viewBox="0 0 1000 900"></svg>',v),new RegExp(`viewBox="${v.x}`));
}
assert(validDocument({version:1,pattern:'blank',strokes:[]},['blank']));assert(!validPaper({...ORIGINAL_PAPER,x:Infinity}));assert(!validPaper({...ORIGINAL_PAPER,width:1e9}));
console.log('PASS full paper edges, wide/portrait/focus layouts, uniform scale, legacy save, expanded save and export raster limits.');
let large;for(const pt of [{x:-999900,y:-999900},{x:1000900,y:1000800}])large=includePoint(large,pt,76);assert(validPaper(large));assert(validDocument({version:1,pattern:'blank',paper:large,strokes:[{tool:'marker',color:'#123456',size:38,points:[{x:-999900,y:-999900},{x:1000900,y:1000800}]}]},['blank']));
for(let i=0;i<1000;i++){const w=300+i*1.731,h=250+(i%511)*1.13,v=paperView(w,h),p=paperPoint(0,0,{left:0,top:0,width:w,height:h},v);const sheet=includePoint(undefined,p,40);assert(validPaper(sheet));}
