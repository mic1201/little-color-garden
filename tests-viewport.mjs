import assert from 'node:assert/strict';
import {fitBoard,createFocusMode} from './dist/viewport.js';
import {coordinate,validDocument} from './dist/engine.js';
for(const [w,h] of [[750,780],[1200,550],[375,600],[820,1100]]){const f=fitBoard(w,h);assert(f.width<=w&&f.height<=h);assert(Math.abs(f.width/f.height-10/9)<1e-9);assert.deepEqual(coordinate(f.width/2,f.height/2,{left:0,top:0,width:f.width,height:f.height}),{x:500,y:450})}
let updates=[];const doc={fullscreenElement:null},root={};const focus=createFocusMode({root,doc,onChange:s=>updates.push(s)});
await focus.enter();assert.deepEqual(focus.getState(),{focused:true,native:false});await focus.exit();assert(!focus.getState().focused);
root.requestFullscreen=async()=>{throw Error('unsupported')};await focus.enter();assert(focus.getState().focused);assert(!focus.getState().native);await focus.exit();
root.requestFullscreen=async()=>{doc.fullscreenElement=root};doc.exitFullscreen=async()=>{doc.fullscreenElement=null};await focus.enter();focus.change();assert(focus.getState().native);doc.fullscreenElement=null;focus.change();assert(!focus.getState().focused); // Browser Escape
await focus.enter();await focus.exit();assert.equal(doc.fullscreenElement,null);assert(!focus.getState().focused);
let resolve;root.requestFullscreen=()=>new Promise(r=>resolve=()=>{doc.fullscreenElement=root;r()});const entering=focus.enter();await focus.exit();resolve();await entering;assert.equal(doc.fullscreenElement,null);assert(!focus.getState().focused);
await focus.enter({systemFullscreen:false});
assert.deepEqual(focus.getState(),{focused:true,native:false});
await focus.exit();
const old={version:1,pattern:'cat',strokes:[{tool:'marker',color:'#123456',size:20,points:[{x:500,y:450}]}]};const saved=JSON.stringify(old);await focus.exit();fitBoard(1100,500);assert.equal(JSON.stringify(old),saved);assert(validDocument(old,['cat']));
console.log('PASS: viewport fit + unchanged logical coordinates, CSS fallback, rejected/native fullscreen, browser Escape, rapid enter/exit race, preserved document.');
