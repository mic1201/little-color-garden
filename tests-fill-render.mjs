import {beginPaper} from './dist/paper.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {drawFills,validFills} from './dist/fills.js';
import {getFillRegions} from './dist/fill-regions.js';
const region=getFillRegions('sea-turtle')[0];
const state={pattern:'sea-turtle',fills:[{region:region.id,color:'#123456',rainbow:false}],strokes:[{tool:'eraser'}]};
const rectangles=[];const ctx={save(){},restore(){},fillRect(...r){rectangles.push(r)},createLinearGradient(){return {addColorStop(){}}}};
drawFills(ctx,state);
assert.equal(rectangles.length,region.spans.length);
region.spans.forEach(([y,x1,x2],i)=>assert.deepEqual(rectangles[i],[x1,y,x2-x1,1]));
assert(validFills(state));assert(validFills({pattern:'cat'}));assert(!validFills({...state,fills:[state.fills[0],state.fills[0]]}));assert(!validFills({...state,fills:[{...state.fills[0],region:'not-a-region'}]}));assert(!validFills({...state,fills:[{...state.fills[0],color:'url(x)'}]}));
// Execute the actual render function with distinct layer contexts, not a single-context DOM mock.
const app=fs.readFileSync('./dist/app.js','utf8');
const paintSource=app.slice(app.indexOf('function paintInk('),app.indexOf('function render(){'));
const renderSource=app.slice(app.indexOf('function render(){'),app.indexOf('\nfunction schedule()'));
const calls=[];
function context(name){return {name,setTransform(){},clearRect(){calls.push([name,'clear'])},drawImage(source){calls.push([name,'image',source.name])}}}
const filled={name:'filled'},committed={name:'committed'},liveInk={name:'liveInk'};
const elements=new Map();const $=s=>{if(!elements.has(s))elements.set(s,{style:{}});return elements.get(s)};
const make=new Function('state','filled','committed','liveInk','ctx','filledCtx','committedCtx','liveInkCtx','$','drawFills','drawStroke','backgroundColor','beginPaper',`const canvas={width:1000,height:900};let view={x:0,y:0,width:1000,height:900};let frame=0,dirty=true,active=null,history=[],redo=[],W=1000,H=900;${paintSource}${renderSource};return {render,setActive:x=>{active=x},markDirty:()=>dirty=true}`);
const api=make(state,filled,committed,liveInk,context('display'),context('filled'),context('committed'),context('liveInk'),$,()=>calls.push(['filled','paint']),(_ctx,s)=>calls.push([_ctx.name,'stroke',s.tool]),()=> '#fff',beginPaper);
api.render();assert.deepEqual(calls,[['filled','clear'],['filled','paint'],['committed','clear'],['committed','stroke','eraser'],['display','clear'],['display','image','filled'],['display','image','committed']]);
calls.length=0;api.setActive({tool:'eraser'});api.render();assert.deepEqual(calls,[['display','clear'],['display','image','filled'],['liveInk','clear'],['liveInk','image','committed'],['liveInk','stroke','eraser'],['display','image','liveInk']]);
assert(!calls.some(c=>c[0]==='display'&&c[1]==='stroke'));
console.log('PASS exclusive span widths, fill data validation, separate committed/live eraser compositing, and fill-under-ink preservation.');
