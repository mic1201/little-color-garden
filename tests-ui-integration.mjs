import * as brushUI from './dist/brush-ui.js';
import * as viewport from './dist/viewport.js';import fs from 'node:fs';import assert from 'node:assert/strict';import * as engine from './dist/engine.js';import * as pats from './dist/patterns.js';
const els=new Map(),store=new Map(),context=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
globalThis.Image=class {set src(v){queueMicrotask(()=>this.onload())}};
class E{constructor(){this.style={};this.dataset={};this.children=[];this.events={};this.attrs={};this.open=false;this.classList={toggle(){}}}setAttribute(k,v){this.attrs[k]=v}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}addEventListener(k,f){this.events[k]=f}click(){}toBlob(cb){cb(new Blob(["png"],{type:"image/png"}))}getContext(){return context}getBoundingClientRect(){return {left:10,top:20,width:500,height:450}}setPointerCapture(id){this.cap=id}hasPointerCapture(id){return this.cap===id}releasePointerCapture(){this.cap=null}showModal(){this.open=true}close(){this.open=false;this.classList={toggle(){}}}}
const get=s=>{if(!els.has(s))els.set(s,new E);return els.get(s)};const document={querySelector:get,createElement:()=>new E,querySelectorAll:s=>[...els.values()].flatMap(e=>e.children).filter(e=>e.className===s.slice(1)),addEventListener(){},hidden:false,documentElement:new E,body:new E};let timers=[];const window={addEventListener(){}};const localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};let src=fs.readFileSync('./dist/app.js','utf8').replace(/^import .*;\n/gm,'');src+='\nreturn {getState:()=>state, getActive:()=>active,save,render,finish};';const keys=[...Object.keys(engine),...Object.keys(pats),...Object.keys(viewport),...Object.keys(brushUI)];const run=new Function(...keys,'document','window','localStorage','requestAnimationFrame','setTimeout','clearTimeout',src);const api=run(...Object.values(engine),...Object.values(pats),...Object.values(viewport),...Object.values(brushUI),document,window,localStorage,()=>1,f=>(timers.push(f),timers.length),()=>{});
const cv=get('#ink');const event=(id,x,y,more={})=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',isPrimary:true,preventDefault(){},...more});cv.events.pointerdown(event(1,10,20));cv.events.pointermove(event(1,260,245));cv.events.pointerdown(event(2,200,200,{isPrimary:false}));assert.equal(api.getActive().points.length,2);cv.events.pointerup(event(2,200,200));assert.equal(api.getState().strokes.length,0);cv.events.pointerup(event(1,260,245));assert.equal(api.getState().strokes.length,1);assert.deepEqual(api.getState().strokes[0].points[1],{x:500,y:450});get('#undo').onclick();assert.equal(api.getState().strokes.length,0);get('#redo').onclick();assert.equal(api.getState().strokes.length,1);const cat=get('#patterns').children.find(e=>e.dataset.id==='cat');cat.onclick();assert(get('#confirm-dialog').open);get('#cancel').onclick();assert.equal(api.getState().strokes.length,1);cat.onclick();get('#confirm').onclick();assert.equal(api.getState().pattern,'cat');assert.equal(api.getState().strokes.length,0);api.save();assert.equal(JSON.parse([...store.values()][0]).pattern,'cat');console.log('PASS fake DOM pointer mapping, multi-touch guard, finish, undo/redo, pattern confirmation cancel/confirm, serialized local save');

await get("#export").onclick();assert.equal(get("#export-preview").children.length,2);assert.match(get("#export-preview").children[1].download,/png$/);assert.equal(get("#export").disabled,false);console.log("PASS fake DOM export resolves and exposes downloadable preview (pixel composition not tested)");

await get("#focus-enter").onclick(); assert.equal(get(".focus-controls").hidden,false); get("#focus-tools").onclick(); assert.equal(get("#focus-tools").attrs["aria-expanded"],"true"); await get("#focus-exit").onclick(); assert.equal(get(".focus-controls").hidden,true); assert.equal(api.getState().pattern,"cat"); console.log("PASS V2 app binding focus fallback, tools toggle, exit and artwork state retention.");

for(const mode of ['normal','focus']){
 if(mode==='focus'){await get('#focus-enter').onclick();get('#focus-tools').onclick()}
 for(const [i,[id,symbol,name]] of brushUI.brushes.entries()){
  get('#tools').children[i].onclick();
  assert.equal(get('#brush-icon').textContent,id==='stamp'?'★':symbol);
  assert.equal(get('#brush-name').textContent,id==='stamp'?'星星印章':name);
  assert.equal(get('#brush-picker').open,false);
  assert.equal(get('#tools').children[i].attrs['aria-pressed'],'true');
 }
 get('#tools').children.find(b=>b.attrs['aria-label']==='蓋印章').onclick();
 for(const [i,[id,symbol,name]]of brushUI.stamps.entries()){
  get('#stamp-options').children[i].onclick();
  assert.equal(get('#brush-icon').textContent,symbol);
  assert.equal(get('#brush-name').textContent,name+'印章');
 }
 get('#stamp-options').children[0].onclick();
 if(mode==='focus')await get('#focus-exit').onclick();
}
console.log('PASS actual app click bindings: all tools, stamp variants, normal/focus mode indicators.');
