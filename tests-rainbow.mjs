import assert from 'node:assert/strict';
import {drawStroke,validDocument,TOOLS,backgroundColor} from './dist/engine.js';
import {AVATAR_RAINBOW,makeAvatarInk} from './dist/avatar-art.js';
import {restoreAvatar} from './dist/avatar-game.js';
function record(s){const ops=[];const ctx=new Proxy({},{set(t,k,v){ops.push([k,v]);t[k]=v;return true},get(t,k){return t[k]??((...a)=>ops.push([k,...a]))}});drawStroke(ctx,s);return ops}
const base={color:'#1256ef',size:20,seed:481,points:[{x:50,y:100},{x:180,y:190},{x:600,y:100}]};
for(const tool of TOOLS){const solid={...base,tool},rainbow={...solid,rainbow:true};
 assert.deepEqual(record(solid),record({...solid,rainbow:false}));
 assert.deepEqual(record(rainbow),record(JSON.parse(JSON.stringify(rainbow))));
 assert(validDocument({version:1,pattern:'blank',background:'#eefaff',strokes:[rainbow]},['blank']));
 const hues=record(rainbow).filter(x=>['fillStyle','strokeStyle'].includes(x[0])&&String(x[1]).startsWith('hsl(')).map(x=>x[1]);
 if(tool==='eraser'){assert.equal(hues.length,0);assert.deepEqual(record(rainbow),record(solid))}else assert(new Set(hues).size>1,tool+' uses multiple hues');
 const tap=record({...rainbow,points:[base.points[0]]});assert(tap.some(x=>['fill','fillRect'].includes(x[0])));
}
const old={version:1,pattern:'blank',strokes:[{...base,tool:'marker'}]};assert(validDocument(old,['blank']));assert.equal(backgroundColor(old),'#ffffff');
for(const rainbow of ['true',1,null,{},[]])assert(!validDocument({...old,strokes:[{...old.strokes[0],rainbow}]},['blank']));
for(const tool of ['spray','sand','stamp','marker','crayon','soft','ribbon']){const ops=record({...base,tool,rainbow:true,points:Array.from({length:10000},(_,i)=>({x:i%2?1000:0,y:i%2?900:0}))});assert(ops.length<110000,tool+' bounded render commands');}

function recordAvatarInk(strokes) {
  const colors=[];
  const ctx=new Proxy({}, {
    set(target,key,value) {
      if (key==='strokeStyle' || key==='fillStyle') colors.push(value);
      target[key]=value;
      return true;
    },
    get(target,key) { return target[key] ?? (()=>{}); }
  });
  makeAvatarInk({getContext:()=>ctx},strokes);
  return colors;
}
const avatarPoints=[{x:85,y:105},{x:153,y:105}];
const avatarStrokes=[{color:'#ef7790',points:avatarPoints},{color:AVATAR_RAINBOW,points:avatarPoints}];
const restoredAvatarStrokes=restoreAvatar(JSON.parse(JSON.stringify({
  person:'girl',profiles:{girl:{strokes:avatarStrokes}}
}))).profiles.girl.strokes;
assert.deepEqual(restoredAvatarStrokes,avatarStrokes.map(stroke=>({...stroke,outfit:{}})),
  'Avatar saves retain both rainbow and legacy solid strokes');
const migratedProfile=restoreAvatar({
  person:'girl',profiles:{girl:{equipped:{bag:'wingpack'},strokes:[
    avatarStrokes[0],{...avatarStrokes[1],tool:'crayon',outfit:{bag:'moon'}}
  ]}}
}).profiles.girl;
migratedProfile.equipped.bag='apple';
assert.equal(migratedProfile.strokes[0].outfit.bag,'wingpack','Older marks use a snapshot of the equipped outfit');
assert.equal(migratedProfile.strokes[1].outfit.bag,'moon','New marks retain the outfit used when they were drawn');
assert.deepEqual(recordAvatarInk(restoredAvatarStrokes),recordAvatarInk(avatarStrokes));
assert.deepEqual(recordAvatarInk([avatarStrokes[0]]),['#ef7790']);
assert(new Set(recordAvatarInk([avatarStrokes[1]]).filter(color=>color.startsWith('hsl('))).size>5);
console.log('PASS rainbow all brushes, distance hues, replay/restore, solid legacy, eraser, taps and bounded rendering.');
