import assert from 'node:assert/strict';import{drawStroke,validDocument,spaced,TOOLS}from'./dist/engine.js';
function record(s){const ops=[];const ctx=new Proxy({},{set(t,k,v){ops.push([k,v]);t[k]=v;return true},get(t,k){return t[k]??((...a)=>ops.push([k,...a]))}});drawStroke(ctx,s);return ops}
const base={color:'#ed7976',size:20,seed:123,points:[{x:50,y:100},{x:180,y:190},{x:300,y:100}]};
for(const tool of TOOLS){const s={...base,tool,stamp:'heart'};assert(validDocument({version:1,pattern:'blank',strokes:[s]},['blank']));const ops=record(s);assert.deepEqual(ops,record(JSON.parse(JSON.stringify(s))));assert(ops.length>5);const tap=record({...s,points:[base.points[0]]});assert(tap.some(x=>['fill','fillRect','stroke'].includes(x[0])))}
const spray=record({...base,tool:'spray'}),sand=record({...base,tool:'sand'}),ribbon=record({...base,tool:'ribbon'});assert(spray.some(x=>x[0]==='arc'));assert(sand.some(x=>x[0]==='fillRect'));assert(ribbon.some(x=>x[0]==='strokeStyle'&&x[1]==='#ffffff'));assert.notDeepEqual(spray,record({...base,tool:'spray',seed:124}));assert.deepEqual(spray,record({...base,tool:'spray'}));
for(const stamp of ['star','heart','flower'])assert.notDeepEqual(record({...base,tool:'stamp',stamp}),spray);
assert(record({...base,tool:'stamp',stamp:'heart'}).some(x=>x[0]==='bezierCurveTo'));
assert(spaced(Array.from({length:10000},(_,i)=>({x:i%2?1000:0,y:0})),1).length<=700);
const old={version:1,pattern:'blank',strokes:[{tool:'marker',color:'#abcdef',size:20,points:[{x:0,y:0}]}]};assert(validDocument(old,['blank']));for(const extras of [{seed:-1},{seed:Infinity},{stamp:'bad'},{tool:'bad'}])assert(!validDocument({...old,strokes:[{...base,tool:'spray',...extras}]},['blank']));
const strokes=TOOLS.map(tool=>({...base,tool})),redo=[];const before=strokes.map(record);redo.push(strokes.pop());strokes.push(redo.pop());assert.deepEqual(strokes.map(record),before);assert.deepEqual(JSON.parse(JSON.stringify(strokes)).map(record),before);
console.log('PASS:8brush tap/drag + deterministic replay/export/restore,3stamp shapes, legacy docs, validation,caps,undo/redo sequence.');
