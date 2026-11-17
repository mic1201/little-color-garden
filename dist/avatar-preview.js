import {AVATAR_W, AVATAR_H, drawAvatar, drawWardrobeItem, itemById, makeAvatarInk, restoreOutfit, wardrobe} from './avatar-art.js';
import {STAGE_W, STAGE_H, loadArtwork, loadSticker, patrolPose, renderStage, sceneById, scenes, stageDescription, stageToPicture, withinFrame} from './avatar-stage.js';
import {stickerArt, stickerById, stickerIcon, stickers} from './reward-stickers.js';

const $ = selector => document.querySelector(selector);
const KEY = 'little-color-garden-avatar-preview-v1';
const people = {boy:'小男孩',girl:'小女孩'};
const colors = [['莓果紅','#ef7790'],['芒果黃','#edb247'],['薄荷綠','#4faf85'],['海水藍','#4b9dc6'],['芋頭紫','#9873cf']];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const freshProfile = () => ({equipped:{}, strokes:[]});

function restore() {
  const state = {person:null, profiles:{boy:freshProfile(),girl:freshProfile()}, wearables:[], paperStickers:[]};
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (!stored || typeof stored !== 'object') return state;
    if (Object.hasOwn(people,stored.person)) state.person = stored.person;
    for (const person of Object.keys(people)) {
      const prior = stored.profiles?.[person];
      if (!prior) continue;
      const profile = state.profiles[person];
      profile.equipped = restoreOutfit(prior.equipped);
      if (Array.isArray(prior.strokes)) {
        profile.strokes = prior.strokes.slice(0,120).filter(stroke => stroke &&
          colors.some(([,color]) => color === stroke.color) &&
          Array.isArray(stroke.points) && stroke.points.length <= 640 &&
          stroke.points.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)));
      }
    }
    if (Array.isArray(stored.wearables)) state.wearables = [...new Set(stored.wearables.filter(id => itemById.has(id)))];
    if (Array.isArray(stored.paperStickers)) state.paperStickers = [...new Set(stored.paperStickers.filter(id => stickerById.has(id)))];
  } catch {
    // Preview remains usable when storage is unavailable.
  }
  return state;
}

const state = restore();
const current = () => state.profiles[state.person ?? 'boy'];
const save = () => {
  try { localStorage.setItem(KEY,JSON.stringify(state)); }
  catch { $('#announcement').textContent='暫存空間不足，這次造型先保留在頁面上。'; }
};

const stage = $('#stage');
const ctx = stage.getContext('2d');
const portrait = $('#portrait');
const portraitCtx = portrait.getContext('2d');
const ink = document.createElement('canvas');
ink.width = AVATAR_W;
ink.height = AVATAR_H;
const chooser = $('#choose-character');
const tabs = $('#item-categories');
const items = $('#wearables');
const itemButtons = new Map();
const toneButtons = [];
const stickerImages = new Map();
const stageStickers = new Map(scenes.map(({id}) => [id,[]]));
let scene = scenes[0];
let art = null, sceneTicket = 0;
let slot = 'top', activeColor = colors[0][1], pending = null, pointer = null;
let playing = !reduced.matches, inside = false, elapsed = 0, lastFrame, frameId;
let entry = patrolPose(0, current().equipped);
let reward = null, opening = false, chestOpened = false, drawTicket = 0, drag = null, ignoreRewardClick = false;

function frame(now) {
  frameId = 0;
  if (lastFrame !== undefined && playing && !document.hidden) elapsed += Math.min(.08,(now-lastFrame)/1000);
  lastFrame = now;
  renderStage(ctx,scene,art,elapsed,inside,entry,state.person,current().equipped,ink,stageStickers.get(scene.id),stickerImages);
  if (playing && !document.hidden) schedule();
}

function schedule() {
  if (!frameId) frameId = requestAnimationFrame(frame);
}

function updatePortrait() {
  const profile = current();
  makeAvatarInk(ink,profile.strokes,pending);
  portraitCtx.setTransform(1,0,0,1,0,0);
  portraitCtx.clearRect(0,0,portrait.width,portrait.height);
  portraitCtx.scale(portrait.width / AVATAR_W,portrait.height / AVATAR_H);
  drawAvatar(portraitCtx,state.person ?? 'boy',profile.equipped,ink);
  $('#character-name').textContent = people[state.person] ?? '';
  $('#undo-portrait').disabled = !profile.strokes.length;
  schedule();
}

function updateWardrobe() {
  for(const button of tabs.children) button.setAttribute('aria-pressed',String(button.dataset.slot===slot));
  const category = wardrobe.find(group => group.slot === slot);
  const equipped = current().equipped[slot];
  items.replaceChildren(...category.items.map(({id}) => itemButtons.get(id)));
  for(const button of items.children) button.setAttribute('aria-pressed',String(button.dataset.item===equipped));
  $('#take-off').disabled = !equipped;
  $('#take-off').textContent = slot==='top' || slot==='pants' ? '換回預設' : '取下';
}

function wear(piece) {
  if (!state.person) return;
  current().equipped[piece.slot] = piece.id;
  slot = piece.slot;
  updateWardrobe();
  updatePortrait();
  updateMotionCaption();
  save();
  $('#announcement').textContent = `已穿戴${piece.name}。`;
}

for(const group of wardrobe) {
  const button = document.createElement('button');
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden','true');
  icon.textContent = group.icon;
  button.type = 'button';
  button.dataset.slot = group.slot;
  button.append(icon,group.name);
  button.onclick = () => { slot=group.slot; updateWardrobe(); };
  tabs.append(button);
  for(const piece of group.items) {
    const option = document.createElement('button');
    option.className = 'wearable';
    option.type = 'button';
    option.dataset.item = piece.id;
    const sample = makeSample(itemById.get(piece.id),86);
    option.append(sample,piece.name);
    option.onclick = () => wear(itemById.get(piece.id));
    itemButtons.set(piece.id,option);
  }
}

function makeSample(piece, size) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = size;
  sample.setAttribute('aria-hidden','true');
  drawWardrobeItem(sample.getContext('2d'),piece);
  return sample;
}

$('#take-off').onclick = () => {
  delete current().equipped[slot];
  updateWardrobe();
  updatePortrait();
  updateMotionCaption();
  save();
};

for(const [name,color] of colors) {
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.setAttribute('aria-label',name);
  swatch.title = name;
  swatch.style.setProperty('--swatch',color);
  swatch.setAttribute('aria-pressed',String(color===activeColor));
  swatch.onclick = () => {
    activeColor = color;
    toneButtons.forEach(button => button.setAttribute('aria-pressed',String(button===swatch)));
  };
  toneButtons.push(swatch);
  $('#paint-colors').append(swatch);
}

function coordinates(event, element, width, height) {
  const b = element.getBoundingClientRect();
  return {x:(event.clientX-b.left)*width/b.width,y:(event.clientY-b.top)*height/b.height};
}

portrait.onpointerdown = event => {
  if(!state.person || pointer!==null || !event.isPrimary || (event.pointerType==='mouse' && event.button!==0)) return;
  event.preventDefault();
  pointer = event.pointerId;
  portrait.setPointerCapture(event.pointerId);
  pending={color:activeColor,points:[coordinates(event,portrait,AVATAR_W,AVATAR_H)]};
  updatePortrait();
};
portrait.onpointermove = event => {
  if(event.pointerId!==pointer || !pending || pending.points.length>=640) return;
  const p=coordinates(event,portrait,AVATAR_W,AVATAR_H);
  const last=pending.points.at(-1);
  if(Math.hypot(p.x-last.x,p.y-last.y)<1) return;
  pending.points.push(p);
  updatePortrait();
};
function finishStroke(event) {
  if(event.pointerId!==pointer) return;
  if(event.type==='pointerup' && pending?.points.length) {
    const strokes=current().strokes;
    strokes.push(pending);
    if(strokes.length>120) strokes.shift();
    save();
  }
  pending=null;
  pointer=null;
  updatePortrait();
}
for(const name of ['pointerup','pointercancel','lostpointercapture']) portrait.addEventListener(name,finishStroke);
$('#undo-portrait').onclick = () => { current().strokes.pop(); updatePortrait(); save(); };

for(const button of chooser.querySelectorAll('[data-person]')) {
  const person=button.dataset.person;
  drawAvatar(button.querySelector('canvas').getContext('2d'),person,{},null);
  button.onclick = () => {
    state.person=person;
    pending=null;
    pointer=null;
    updatePortrait();
    updateWardrobe();
    updateMotionCaption();
    save();
    chooser.close();
  };
}
$('#choose-again').onclick = () => {
  $('#close-chooser').hidden = !state.person;
  chooser.showModal();
};
$('#close-chooser').onclick = () => chooser.close();
chooser.addEventListener('cancel',event => { if(!state.person) event.preventDefault(); });

function updateStageControls() {
  $('#outside').setAttribute('aria-pressed',String(!inside));
  $('#inside').setAttribute('aria-pressed',String(inside));
  const label = playing ? '暫停動畫' : '播放動畫';
  const pause = $('#pause-motion');
  pause.setAttribute('aria-label',label);
  pause.title=label;
  pause.querySelector('span').textContent=playing?'Ⅱ':'▶';
  updateMotionCaption();
  const chest=$('#open-chest');
  chest.disabled=!inside || opening || !art;
  chest.textContent=opening?'開啟中…':chestOpened?'再抽一次':'開寶箱';
  $('#treasure-caption').textContent = inside ? '有機會抽到畫布貼紙或主角穿搭。' : '切到「完成後」就能開寶箱。';
  drawChest(chestOpened);
  schedule();
}

function updateMotionCaption() {
  const caption=stageDescription(scene,current().equipped,inside);
  $('#stage-caption').textContent=caption;
  stage.setAttribute('aria-label',caption);
}

function restartClock() {
  elapsed=0;
  lastFrame=undefined;
}

function setMode(value) {
  if (value===inside) return;
  if(value) entry=patrolPose(elapsed,current().equipped);
  else {
    drawTicket++;
    opening=false;
  }
  inside=value;
  playing=!reduced.matches;
  restartClock();
  updateStageControls();
}

$('#inside').onclick=()=>setMode(true);
$('#outside').onclick=()=>setMode(false);
$('#pause-motion').onclick=()=>{
  playing=!playing;
  lastFrame=undefined;
  updateStageControls();
};
document.addEventListener('visibilitychange',()=>{
  lastFrame=undefined;
  if(!document.hidden) schedule();
});

async function selectScene(id) {
  scene=sceneById.get(id);
  art=null;
  restartClock();
  if(inside) entry=patrolPose(0,current().equipped);
  const ticket=++sceneTicket;
  for(const button of $('#scene-picker').children) button.setAttribute('aria-pressed',String(button.dataset.scene===id));
  updateStageControls();
  try {
    const next=await loadArtwork(scene);
    if(ticket!==sceneTicket) return;
    art=next;
    restartClock();
    updateStageControls();
  } catch {
    if(ticket===sceneTicket) $('#stage-caption').textContent='這張圖暫時載入失敗，可以點圖案再試一次。';
  }
}

for(const option of scenes) {
  const button=document.createElement('button');
  const icon=document.createElement('span');
  icon.setAttribute('aria-hidden','true');
  icon.textContent=option.icon;
  button.type='button';
  button.dataset.scene=option.id;
  button.append(icon,option.label);
  button.onclick=()=>{ if(option.id!==scene.id || !art) void selectScene(option.id); };
  $('#scene-picker').append(button);
}

function drawChest(open) {
  const c=$('#chest-art').getContext('2d');
  c.clearRect(0,0,64,58);
  function block(x,y,w,h,r,color) {
    c.beginPath();
    c.roundRect(x,y,w,h,r);
    c.fillStyle=color;
    c.strokeStyle='#896445';
    c.lineWidth=2;
    c.fill();
    c.stroke();
  }
  if(open) {
    c.fillStyle='#ffe294';
    for(const [x,y,size] of [[6,9,4],[49,5,5],[59,18,3]]) {
      c.fillRect(x-size,y-1,size*2,2);
      c.fillRect(x-1,y-size,2,size*2);
    }
  }
  block(7,26,50,25,6,'#cb8859');
  block(11,47,42,4,2,'#a96952');
  c.save();
  if(open) {
    c.translate(-4,-10);
    c.rotate(-.11);
  }
  block(7,19,50,14,5,'#e5b36a');
  block(28,25,9,12,2,'#ffdb71');
  c.restore();
}

function chooseReward() {
  const clothing = Math.random() < .57;
  const all = clothing ? [...itemById.keys()] : stickers.map(([id]) => id);
  const owned = clothing ? state.wearables : state.paperStickers;
  const available = all.filter(id => !owned.includes(id));
  const pool = available.length ? available : all;
  const id = pool[Math.floor(Math.random()*pool.length)];
  if(!owned.includes(id)) owned.push(id);
  return {clothing,id};
}

function showReward() {
  const preview=$('#reward-preview');
  const use=$('#use-reward');
  preview.replaceChildren();
  if(reward.clothing) {
    const piece=itemById.get(reward.id);
    preview.append(makeSample(piece,76));
    $('#reward-name').textContent=piece.name;
    $('#reward-type').textContent='主角穿搭';
    use.textContent='試穿';
    use.removeAttribute('data-paper');
  } else {
    preview.innerHTML=stickerIcon(reward.id);
    $('#reward-name').textContent=stickerById.get(reward.id).name;
    $('#reward-type').textContent='畫布貼紙';
    use.textContent='拖到圖上';
    use.dataset.paper='';
  }
  $('#treasure-result').hidden=false;
  $('#announcement').textContent=`抽到${$('#reward-name').textContent}。`;
}

$('#open-chest').onclick = async () => {
  if(!inside || opening || !art) return;
  const ticket=++drawTicket;
  opening=true;
  updateStageControls();
  if(!reduced.matches) {
    const anim=$('#chest-art').animate([{transform:'rotate(0)'},{transform:'rotate(-11deg) scale(1.13)'},{transform:'rotate(9deg)'},{transform:'none'}],{duration:470});
    await anim.finished.catch(()=>{});
  }
  if(ticket!==drawTicket) return;
  opening=false;
  chestOpened=true;
  reward=chooseReward();
  showReward();
  save();
  updateStageControls();
};

async function placeSticker(id,x,y) {
  if(!withinFrame(x,y)) return;
  const placedScene=scene.id;
  if(!stickerImages.has(id)) {
    try {
      const {image}=await loadSticker(id,stickerArt(id));
      stickerImages.set(id,image);
    } catch {
      $('#announcement').textContent='貼紙載入失敗，請再試一次。';
      return;
    }
  }
  stageStickers.get(placedScene).push({id,...stageToPicture(x,y,placedScene)});
  $('#announcement').textContent='貼紙已放到畫布上。';
  schedule();
}

const rewardButton=$('#use-reward');
rewardButton.onclick = () => {
  if(!reward || ignoreRewardClick) return;
  if(reward.clothing) wear(itemById.get(reward.id));
  else void placeSticker(reward.id,647,350);
};

rewardButton.onpointerdown = event => {
  if(!reward || reward.clothing || !event.isPrimary || (event.pointerType==='mouse' && event.button!==0)) return;
  ignoreRewardClick=false;
  drag={pointer:event.pointerId,id:reward.id,x:event.clientX,y:event.clientY};
  rewardButton.setPointerCapture(event.pointerId);
};
rewardButton.onpointermove = event => {
  if(drag?.pointer!==event.pointerId) return;
  if(!drag.ghost) {
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5) return;
    const ghost=document.createElement('div');
    ghost.className='reward-drag';
    ghost.setAttribute('aria-hidden','true');
    ghost.innerHTML=stickerIcon(drag.id);
    document.body.append(ghost);
    drag.ghost=ghost;
  }
  drag.ghost.style.transform=`translate(${event.clientX-27}px,${event.clientY-27}px)`;
};
function endDrag(event) {
  if(drag?.pointer!==event.pointerId) return;
  const {id,ghost}=drag;
  drag=null;
  if(!ghost) return;
  ghost.remove();
  ignoreRewardClick=true;
  setTimeout(()=>{ignoreRewardClick=false;},350);
  if(event.type==='pointerup') {
    const to=coordinates(event,stage,STAGE_W,STAGE_H);
    void placeSticker(id,to.x,to.y);
  }
}
for(const name of ['pointerup','pointercancel','lostpointercapture']) rewardButton.addEventListener(name,endDrag);

updateWardrobe();
updatePortrait();
void selectScene(scene.id);
if(!state.person) chooser.showModal();
