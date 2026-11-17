import {drawAvatar, itemById} from './avatar-art.js';
import {svgMarkup} from './patterns.js';
import {closureSvgMarkup} from './number-patterns.js';
import {getFillRegions} from './fill-regions.js';
import {drawFills} from './fills.js';
import {ORIGINAL_PAPER} from './paper.js';
import {createMotionScene, drawMotionScene, motionFor, motionPartAt, transformSticker} from './reward-motion.js';

export const STAGE_W = 960;
export const STAGE_H = 620;
export const frame = {x:134,y:112,width:692,height:405};
const picture = {x:215,y:66,scale:.53};
const rabbitPicture = {x:290,y:168,scale:.38};
const TRACK = {left:79,right:881,top:105,bottom:603};

function pictureFor(sceneId) {
  return sceneId==='rabbit-clean' ? rabbitPicture : picture;
}

export const scenes = [
  {id:'rabbit-clean', label:'長耳兔兔', icon:'🐰', paper:'#fdf6ed', mat:'#e2e7da',
    action:'跟兔兔一起跳', colors:['#f6c4c7','#f6c4c7','#f7dbe3','#f7dbe3','#f5deb7','#f5deb7','#edacb5','#ebbea7','#ebbea7']},
  {id:'sea-turtle-clean', label:'海龜朋友', icon:'🐢', paper:'#eaf5f2', mat:'#dce8de',
    action:'騎在龜殼上一起游', colors:['#80bf9e','#79bba4','#b1d984','#94bf86','#8dcda4','#7eb99b','#a1cfa0','#b7db9a','#8cb9ae','#83bea0','#87bda3','#8ec7a5','#bbd694']},
  {id:'longneck-clean', label:'長頸恐龍', icon:'🦕', paper:'#f8f3e6', mat:'#eddfd0',
    action:'爬上恐龍身邊揮手', colors:['#a8c5a0','#f4cc83','#f3af8b','#91c8ab','#99c9b5']}
];
export const sceneById = new Map(scenes.map(scene => [scene.id, scene]));

const unit = n => Math.max(0,Math.min(1,n));
const lerp = (a,b,p) => a + (b-a)*p;
const smooth = p => {const u=unit(p);return u*u*(3-2*u);};
const sine = (t,speed) => Math.sin(t*speed*Math.PI*2);
const arc = p => 4 * unit(p) * (1 - unit(p));
const fract = n => n-Math.floor(n);
export const enterDuration = 1.18;
const backdrops = new Map();
function canvas(width = ORIGINAL_PAPER.width, height = ORIGINAL_PAPER.height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export async function loadArtwork(scene) {
  const regions = getFillRegions(scene.id);
  const fills = regions.map(({id},i) => ({region:id,color:scene.colors[i%scene.colors.length],rainbow:false}));
  const outline = canvas();
  const lines = svgMarkup(scene.id).replace('</svg>',
    closureSvgMarkup(scene.id).replace(/^<svg[^>]*>/,'').replace('</svg>','') + '</svg>');
  const image = new Image();
  const url = URL.createObjectURL(new Blob([lines],{type:'image/svg+xml'}));
  try {
    image.src = url;
    await image.decode();
    outline.getContext('2d').drawImage(image,0,0);
  } finally {
    URL.revokeObjectURL(url);
  }
  const state = {pattern:scene.id, strokes:[],background:scene.paper,fills};
  const paper = canvas();
  const ctx = paper.getContext('2d');
  ctx.fillStyle = scene.paper;
  ctx.fillRect(0,0,paper.width,paper.height);
  drawFills(ctx,state);
  const partial = canvas();
  const pc = partial.getContext('2d');
  pc.fillStyle = scene.paper;
  pc.fillRect(0,0,partial.width,partial.height);
  drawFills(pc,{...state,fills:fills.slice(0,Math.ceil(fills.length*.67))});
  pc.drawImage(outline,0,0);
  const parts = motionFor(scene.id);
  const animation = createMotionScene(state,{area:ORIGINAL_PAPER,paper,outline},parts);
  return {partial, parts, animation};
}

export function loadSticker(id, art) {
  const url = URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${art}</svg>`],{type:'image/svg+xml'}));
  const image = new Image();
  image.src = url;
  return image.decode().then(() => ({id,image})).finally(() => URL.revokeObjectURL(url));
}

export function stageToPicture(x,y,sceneId) {
  const layout=pictureFor(sceneId);
  return {x:(x-layout.x)/layout.scale, y:(y-layout.y)/layout.scale};
}

export function withinFrame(x,y) {
  return x>frame.x && x<frame.x+frame.width && y>frame.y && y<frame.y+frame.height;
}

const wingRoute = [
  [0,79,603,0,0,1],
  [.32,79,592,.6,-.08,1],
  [2.65,79,105,1,-.21,1],
  [3.08,151,102,1,.07,1],
  [6.11,881,102,1,-.08,1],
  [8.63,881,573,1,.19,1],
  [9.09,834,600,.89,.04,-1],
  [11.94,79,603,0,0,-1]
];

function outsideFlight(t) {
  const time=t % wingRoute.at(-1)[0];
  const next=wingRoute.findIndex(([end])=>end>time);
  const [start,x,y,air,lean,face]=wingRoute[next-1];
  const [end,toX,toY,toAir,toLean]=wingRoute[next];
  const p=unit((time-start)/(end-start));
  return {x:lerp(x,toX,p),y:lerp(y,toY,p),airborne:lerp(air,toAir,p),
    lean:lerp(lean,toLean,p),face,stride:.13*sine(t,2),size:.29,gait:'flight'};
}

export function patrolPose(t, gear) {
  if(gear.bag==='wingpack') return outsideFlight(t);
  const walk = 5.6, climb = 3.6, loop = (walk+climb)*2;
  const phase = (t+.74) % loop;
  const spring = gear.shoes === 'spring';
  const skates = gear.shoes === 'star-skates';
  const pace = spring ? 2.15 : skates ? 1.22 : gear.bag === 'picnic' ? 1.65 : 1.9;
  const gait = sine(t,pace);
  const lift = (spring?11:gear.shoes==='rabbitslippers'?8:skates?1.6:4) * Math.max(0,gait);
  if(phase<walk) return {x:lerp(TRACK.left,TRACK.right,phase/walk),y:TRACK.bottom-lift,face:1,stride:gait,gait:'walk'};
  if(phase<walk+climb) return {x:TRACK.right,y:lerp(TRACK.bottom,TRACK.top,(phase-walk)/climb),face:-1,lean:-.19,stride:gait*.9,climb:.92,gait:'climb'};
  if(phase<2*walk+climb) return {x:lerp(TRACK.right,TRACK.left,(phase-walk-climb)/walk),y:TRACK.top-lift,face:-1,stride:gait,gait:'walk'};
  return {x:TRACK.left,y:lerp(TRACK.top,TRACK.bottom,(phase-2*walk-climb)/climb),face:1,lean:.19,stride:gait*.9,climb:.92,gait:'climb'};
}

function landmark(part,t,x,y,layout=picture) {
  const at=transformSticker(part,{x,y},t);
  return {x:layout.x+at.x*layout.scale,y:layout.y+at.y*layout.scale,angle:at.angle};
}

function mixPosition(a,b,progress) {
  return {x:lerp(a.x,b.x,progress),y:lerp(a.y,b.y,progress)};
}

function flightOverPicture(t, loop, ground, scene, part) {
  const coordinates = scene.id==='sea-turtle-clean' ? [530,423] : scene.id==='longneck-clean' ? [590,353] : [570,405];
  const focus=landmark(part,t,...coordinates,pictureFor(scene.id));
  const phase=loop%6.6;
  const p=unit((phase-.16)/5.9);
  const rise=Math.sin(Math.PI*p)**1.05;
  const orbit=Math.sin(p*Math.PI*2);
  const forward=phase<3.35 ? ground.x<focus.x : ground.x>=focus.x;
  return {
    x:lerp(ground.x,focus.x,rise)+108*orbit*rise,
    y:ground.y-(171+19*orbit)*rise,
    shadowY:ground.y, airborne:unit(rise*2), size:.35,
    face:forward?1:-1, lean:.24*orbit*rise, stride:.24*sine(t,1.58),
    wave:rise>.82?.86:0, gait:'flight'
  };
}

function hopWithRabbit(t, loop, ground, part, gear, shoes) {
  const foot=landmark(part,t,376,793,rabbitPicture);
  const previous=landmark(part,Math.max(0,t-.026),376,793,rabbitPicture);
  const lift=Math.max(0,rabbitPicture.y+793*rabbitPicture.scale-foot.y);
  const bounce=unit(lift/41);
  const approach=smooth(loop/.46);
  const goingLeft=foot.x<previous.x-.03;
  const pairX=foot.x-61;
  const pairY=ground.y-lift*shoes;
  const wearingWings=gear.bag==='wingpack';
  const flightPhase=unit(((loop%7.8)-2.55)/4.47);
  const rise=wearingWings?Math.sin(Math.PI*flightPhase)**1.1:0;
  return {
    x:lerp(ground.x,pairX,approach)+rise*(230+56*Math.sin(Math.PI*2*flightPhase)),
    y:lerp(ground.y,pairY,approach)-145*rise,
    face:rise>.1&&flightPhase<.62?1:goingLeft?-1:1,
    lean:rise>.08 ? .18*rise : (goingLeft?-.15:.12)*bounce,
    stride:rise>.08?.2*sine(t,1.7):.82*bounce,
    wave:.74*bounce, crouch:bounce>0?.1:.5,
    airborne:unit(rise*2), shadowY:ground.y, size:.345+.022*bounce, gait:rise>.08?'flight':'hop'
  };
}

export function insidePose(t, entry, scene, part, gear) {
  const ground = scene.id==='sea-turtle-clean' ? {x:653,y:462} : scene.id==='longneck-clean' ? {x:415,y:477} : {x:347,y:467};
  const jump = gear.shoes==='spring' ? 1.35 : gear.shoes==='rabbitslippers' ? 1.17 : gear.shoes==='boot' ? .87 : 1;
  const wing=gear.bag==='wingpack';
  if(t<enterDuration) {
    const p = smooth(t/enterDuration);
    const toward = ground.x > entry.x ? 1 : -1;
    const pos=mixPosition(entry,ground,p);
    const air=wing ? arc(p) : 0;
    return {...pos,y:pos.y-48*air,face:toward,stride:sine(t,wing?1.4:3.05),
      airborne:air, lean:wing?.15*air:0, gait:wing?'flight':'run',size:.33};
  }
  const loop=t-enterDuration;
  if(scene.id==='rabbit-clean' && gear.hat==='rabbit-ears') return hopWithRabbit(t,loop,ground,part,gear,jump);
  if(wing) return flightOverPicture(t,loop,ground,scene,part);
  if(scene.id==='sea-turtle-clean') {
    const phase=loop%6.6;
    const shell = landmark(part,t,528,394);
    const mount=unit((phase-.28)/1.03);
    const off=unit((phase-4.87)/.98);
    const blend=smooth(mount)*(1-smooth(off));
    const pos=mixPosition(ground,{x:shell.x+10,y:shell.y},blend);
    return {...pos,y:pos.y-jump*(49*arc(mount)+41*arc(off)),face:phase<4.85?-1:1,
      lean:shell.angle*Math.PI/180*blend + .07*sine(t,.65),stride:.48*sine(t,1.25),
      wave:blend*(gear.gloves==='swim'?.95:.56), size:.36,gait:blend>.94?'ride':'hop'};
  }
  if(scene.id==='longneck-clean') {
    const phase=loop%7.15;
    const start=landmark(part,t,499,575);
    const climb=smooth((phase-.91)/2.24);
    const current=landmark(part,t,495+66*climb,575-300*climb);
    const approach=smooth(phase/.91);
    const off=unit((phase-4.97)/1.1);
    const pos=mixPosition(mixPosition(ground,start,approach),current,climb);
    const result=mixPosition(pos,ground,smooth(off));
    return {...result,y:result.y-jump*38*arc(off),face:1,lean:(1-off)*(climb<1?.17:.035),
      stride:sine(t,2.05)*.85,climb:phase>.84&&phase<3.19?.96:0,wave:phase>3.18&&phase<4.96?1:0,
      size:.34,gait:phase>3.18&&phase<4.96?'wave':'climb'};
  }
  const rabbit = landmark(part,t,366,764,rabbitPicture);
  const rhythm = (t+.55)%1.05;
  const hop = arc(unit((rhythm-.16)/.72));
  const approach=smooth(loop/.72);
  return {x:lerp(ground.x,rabbit.x-63+13*sine(loop,.36),approach),y:lerp(ground.y,476-63*hop*jump,approach),
    face:1,stride:.71*sine(t,1.35),wave:.58*hop,crouch:.65*Math.max(0,sine(t,1.9)),
    size:.34+hop*.018,gait:'hop'};
}

export function stageDescription(scene, gear, inside) {
  const wing=gear.bag==='wingpack';
  if(!inside) return wing ? '拍動翅膀，沿著畫框外飛一圈。' : '作畫時，主角沿著框外散步和攀爬。';
  if(scene.id==='rabbit-clean' && gear.hat==='rabbit-ears') {
    return wing ? '和兔兔一起起跳、落地，再拍翅升空。' : '戴上兔耳帽，跟兔兔同步起跳、落地。';
  }
  return wing ? `飛進畫框，繞過${scene.label}再落地。` : scene.action + '。';
}

function ellipse(ctx,x,y,rx,ry,color) {
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=color; ctx.fill();
}

function drawFrame(ctx, scene) {
  ctx.fillStyle=scene.mat;
  ctx.fillRect(0,0,STAGE_W,STAGE_H);
  ctx.fillStyle='#ffffff45';
  for (let y=16;y<STAGE_H;y+=23) for (let x=14;x<STAGE_W;x+=23) {
    ctx.fillRect(x,y,1.4,1.4);
  }
  ctx.strokeStyle='#7e927966';
  ctx.lineWidth=2;
  ctx.setLineDash([3,10]);
  ctx.beginPath();
  ctx.roundRect(TRACK.left,TRACK.top,TRACK.right-TRACK.left,TRACK.bottom-TRACK.top,19);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='#82928962';
  ctx.beginPath();
  ctx.roundRect(frame.x-17,frame.y-9,frame.width+34,frame.height+34,25);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(frame.x-13,frame.y-12,frame.width+26,frame.height+24,23);
  ctx.fillStyle='#fcfaf2'; ctx.fill();
  ctx.strokeStyle='#b2b7a5'; ctx.lineWidth=2.2; ctx.stroke();
}

export function drawActor(ctx, player, gear, ink, pose, t, outside = false) {
  ctx.save();
  if(outside) {
    const margin = new Path2D();
    margin.rect(0,0,STAGE_W,STAGE_H);
    margin.roundRect(frame.x,frame.y,frame.width,frame.height,13);
    ctx.clip(margin,'evenodd');
  }
  const size=pose.size ?? .326;
  const high=pose.gait==='hop' || pose.gait==='ride';
  const wing=gear.bag==='wingpack';
  const air=pose.airborne ?? 0;
  if(air>.08) {
    if(pose.shadowY!==undefined) ellipse(ctx,pose.x,pose.shadowY+2,26-10*air,3.6,'#263d4b21');
    const direction=pose.face??1;
    for(let i=1;i<=3;i++) {
      const shimmer=.74+.22*sine(t,2+i*.25);
      ellipse(ctx,pose.x-direction*(25+i*10),pose.y+8+i*5,
        (4.8-i*.7)*shimmer,(4.8-i*.7)*shimmer,'#fff7d1b0');
    }
  } else if (!pose.climb) ellipse(ctx,pose.x,pose.y+2,26*(high?.84:1),4.3,'#263d4b27');
  ctx.translate(pose.x,pose.y);
  ctx.rotate(pose.lean ?? 0);
  ctx.scale((pose.face??1)*size,size);
  ctx.translate(-122,-280);
  const bag=itemById.get(gear.bag);
  const packWeight=gear.bag==='picnic' ? .69 : bag?.style==='back' && !wing ? .83 : 1;
  const steps=gear.pants==='jogger'?1.16:gear.pants==='denim'||gear.pants==='berryoveralls'?.84:1;
  const waving=(pose.wave??0)*(gear.gloves==='pawglove'?1.22:gear.gloves?1.11:1);
  drawAvatar(ctx,player,gear,ink,{
    ...pose, stride:(pose.stride??0)*packWeight*steps,wave:waving,glide:.93*air,
    climb:(pose.climb??0)*(gear.gloves==='mitten'?.88:gear.gloves==='swim'?1.11:1),
    bagSwing:.29*sine(t,2.1)*(gear.bag==='moon'?1.22:gear.bag==='carrotsling'?1.04:.77),
    flap:wing?sine(t,3.25)*(.57+.83*air):0,
    earBounce:gear.hat==='rabbit-ears'?sine(t,2.15)*(high?1:.66):0,
    headTilt:sine(t,1.1)*(gear.hat==='sunhat'?.13:gear.hat==='cap'?.078:.045),
    blink:fract(t*.313)>.974,
    crouch:(pose.crouch??0)+(gear.top==='hoodie'?.24*Math.max(pose.stride??0,0):0)
  });
  if (gear.neck && waving>.65) {
    const pulse=1.5+3.3*unit(sine(t,1.8));
    ellipse(ctx,126,165,pulse,pulse,'#fff5b6');
  }
  ctx.restore();
}

export function renderStage(ctx, scene, art, t, inside, entry, person, gear, ink, stickers, stickerImages) {
  if (!backdrops.has(scene.id)) {
    const background = canvas(STAGE_W,STAGE_H);
    drawFrame(background.getContext('2d'),scene);
    backdrops.set(scene.id,background);
  }
  ctx.drawImage(backdrops.get(scene.id),0,0);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frame.x,frame.y,frame.width,frame.height,13);
  ctx.clip();
  ctx.fillStyle=scene.paper;
  ctx.fillRect(frame.x,frame.y,frame.width,frame.height);
  if(art) {
    const layout=pictureFor(scene.id);
    ctx.save();
    ctx.translate(layout.x,layout.y);
    ctx.scale(layout.scale,layout.scale);
    if(inside) drawMotionScene(ctx, art.animation, t);
    else ctx.drawImage(art.partial,0,0);
    for(const sticker of stickers) {
      const image=stickerImages.get(sticker.id);
      if(!image) continue;
      const part = inside ? art.parts[motionPartAt(scene.id,art.parts,sticker)] : null;
      const pos = part ? transformSticker(part,sticker,t) : sticker;
      ctx.save();
      ctx.translate(pos.x,pos.y);
      ctx.rotate((pos.angle??0)*Math.PI/180);
      ctx.drawImage(image,-41,-41,82,82);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(frame.x,frame.y,frame.width,frame.height,13);
  ctx.strokeStyle='#bbc1ad';
  ctx.lineWidth=1.7;
  ctx.stroke();
  if (!person) return;
  const actor = inside && art ? insidePose(t,entry,scene,art.parts[0],gear) : patrolPose(t,gear);
  drawActor(ctx,person,gear,ink,actor,t,!inside || !art);
}
