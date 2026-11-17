import {ORIGINAL_PAPER,paperView,paperPoint,includePoint,rasterSize,beginPaper,paperMarkup} from './paper.js';
import {createMusic} from './music.js';
import {createRewards,rewardExportMarkup} from './rewards.js';
import {createGameAvatar} from './avatar-game.js';
import {clampSpectrum,spectrumColor,spectrumName} from './color-spectrum.js';
import {drawFills,fillTarget,randomFillGradient,RAINBOW_COLORS,validFills} from './fills.js';
import {closureSvgMarkup} from './number-patterns.js';
import {brushes,stamps,updateBrushSummary} from './brush-ui.js';
import {createFocusMode} from './viewport.js';
import {patterns,patternCategories,availablePatterns,isLegacyPattern,svgMarkup} from './patterns.js';
import {W,H,MAX_STROKES,MAX_POINTS,coordinate,drawStroke,validDocument,backgroundColor} from './engine.js';
const $=s=>document.querySelector(s),canvas=$('#ink'),ctx=canvas.getContext('2d'),KEY='little-color-garden-v1';
const BASIC_COLORS = [
  ['紅色',{x:.005,y:.28}],['橘色',{x:.078,y:.5}],
  ['黃色',{x:.15,y:.5}],['綠色',{x:.3,y:.62}],
  ['藍色',{x:.58,y:.55}],['紫色',{x:.762,y:.6}],
  ['黑色',{x:0,y:1}],['白色',{x:0,y:0}]
];
let colorPosition = BASIC_COLORS[0][1];
let rewards;
let avatar;
let stampShape='star',rainbow=false;
let state={version:1,pattern:'blank',strokes:[]},redo=[],color=spectrumColor(colorPosition),tool='marker',size=20,active=null,pointer=null,frame=0,saving=0,confirmAction=null,exportUrl=null,restoreMessage='',saveFailed=false;
try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(validDocument(parsed,patterns.map(p=>p.id))&&validFills(parsed)){const {numbers,...drawing}=parsed;state={...drawing,fillMode:drawing.fillMode??(numbers===true)}}else restoreMessage='舊暫存無法讀取；請另存喜歡的作品。'}}catch{restoreMessage='瀏覽器無法讀取暫存，離開前請儲存圖片。'}
let view={...ORIGINAL_PAPER};
let history=[...(state.fills||[]).map(fill=>({kind:'fill',region:fill.region,before:null,after:fill})),...state.strokes.map(stroke=>({kind:'stroke',stroke}))];
const liveInk=document.createElement('canvas');liveInk.width=W;liveInk.height=H;const liveInkCtx=liveInk.getContext('2d');
const filled=document.createElement('canvas');filled.width=W;filled.height=H;const filledCtx=filled.getContext('2d');
const committed=document.createElement('canvas');committed.width=W;committed.height=H;const committedCtx=committed.getContext('2d');let dirty=true;
function updateOverlays(){ $('#outline').innerHTML=paperMarkup(outlineMarkup(state.pattern),view) }
function paintInk(target,layer,area,preview=false,strokes=state.strokes){beginPaper(target,layer,area);for(const stroke of strokes)drawStroke(target,stroke);if(preview&&active)drawStroke(target,active);target.setTransform(1,0,0,1,0,0)}
function render(){frame=0;$('#board').style.background=backgroundColor(state);if(dirty){beginPaper(filledCtx,filled,view);drawFills(filledCtx,state,view);filledCtx.setTransform(1,0,0,1,0,0);paintInk(committedCtx,committed,view);dirty=false}ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(filled,0,0);if(active){liveInkCtx.setTransform(1,0,0,1,0,0);liveInkCtx.clearRect(0,0,liveInk.width,liveInk.height);liveInkCtx.drawImage(committed,0,0);liveInkCtx.setTransform(liveInk.width/view.width,0,0,liveInk.height/view.height,-view.x*liveInk.width/view.width,-view.y*liveInk.height/view.height);drawStroke(liveInkCtx,active);liveInkCtx.setTransform(1,0,0,1,0,0);ctx.drawImage(liveInk,0,0)}else ctx.drawImage(committed,0,0);$('#welcome').hidden=state.pattern!=='blank'||state.strokes.length>0||!!state.fills?.length||!!active;$('#welcome').style.display=$('#welcome').hidden?'none':'';$('#undo').disabled=!history.length;$('#redo').disabled=!redo.length}
function pointAt(x,y,rect){return paperPoint(x,y,rect,view)}
function rememberPoint(p){state.paper=includePoint(state.paper,p,size*2)}
function schedule(){if(!frame)frame=requestAnimationFrame(render)}
function storageWarning(message){$('#save-status').textContent=message;$('#storage-warning').hidden=false}
$('#storage-warning').onclick=()=>{finish();$('#parent-dialog').showModal()};
function save(){clearTimeout(saving);try{localStorage.setItem(KEY,JSON.stringify(state));saveFailed=false;$('#storage-warning').hidden=true;$('#save-status').textContent='✓ 已暫存在這台裝置'}catch{saveFailed=true;storageWarning('暫存空間不足，請大人儲存圖片。')}}
function changed(){dirty=true;render();rewards?.stop();rewards?.sync();clearTimeout(saving);saving=setTimeout(save,300)}
function finish(){if(pointer===null)return;const id=pointer;pointer=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);if(active?.points.length){state.strokes.push(active);history.push({kind:'stroke',stroke:active});redo=[]}active=null;changed()}
function setPattern(id){finish();avatar?.showDrawing();state={version:1,pattern:id,background:backgroundColor(state),fillMode:state.fillMode===true,strokes:[],rewardCollection:state.rewardCollection,rewardCollectionBackup:state.rewardCollectionBackup};history=[];redo=[];$('#outline').innerHTML=outlineMarkup(id);syncTool();requestAnimationFrame(fit);const p=patterns.find(p=>p.id===id);$('#picture-title').textContent=p.icon+' '+p.name;document.querySelectorAll('.pattern').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));filterPatterns();changed()}
function ask(title,message,fn,target=state.pattern){finish();const preview=$('#confirm-preview');preview.replaceChildren();const before=document.createElement('div');before.className='confirm-sheet';before.style.background=backgroundColor(state);if(typeof canvas.toDataURL==='function'){const image=document.createElement('img');image.src=canvas.toDataURL('image/png');image.alt='';before.append(image)}const lines=document.createElement('div');lines.innerHTML=paperMarkup(outlineMarkup(state.pattern),view);before.style.aspectRatio=String(view.width/view.height);before.append(lines);const arrow=document.createElement('span');arrow.textContent='→';const after=document.createElement('div');after.className='confirm-sheet';after.style.background=backgroundColor(state);after.innerHTML=outlineMarkup(target);preview.append(before,arrow,after);confirmAction=fn;$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-dialog').showModal()}
const brushPicker = $('#brush-picker');
const stampOptions = $('#stamp-options');
function syncTool() {
  const selected = state.fillMode ? 'fill' : tool;
  const summary = $('#brush-summary');
  summary.dataset.activeTool = selected;
  updateBrushSummary(summary, $('#brush-name'), selected, stampShape);
  stampOptions.hidden = selected !== 'stamp';
  for (const entry of document.querySelectorAll('.tool')) {
    entry.setAttribute('aria-pressed', String(entry.dataset.tool === selected));
  }
  canvas.setAttribute('aria-label', state.fillMode
    ? '點填色畫布，選色後點圖案區塊或畫紙背景' : '畫畫區，用手指或觸控筆拖曳繪畫');
}
$('#brush-summary').onclick = () => {
  finish();
  brushPicker.showModal();
};
$('#brush-close').onclick = () => brushPicker.close();
for (const [id,icon,name] of brushes) {
  const button = document.createElement('button');
  button.className = 'tool';
  button.dataset.tool = id;
  button.innerHTML = `<span class="tool-icon" aria-hidden="true">${icon}</span><span class="sr-only">${name}</span>`;
  button.setAttribute('aria-label',name);
  button.onclick = () => {
    finish();
    const isFill = id === 'fill';
    const changedMode = !!state.fillMode !== isFill;
    state.fillMode = isFill;
    if (!isFill) tool = id;
    syncTool();
    if (changedMode) save();
    if (stampOptions.hidden) brushPicker.close();
  };
  $('#tools').append(button);
}
for (const [id,icon,name] of stamps) {
  const button = document.createElement('button');
  button.className = 'stamp-choice';
  button.textContent = icon;
  button.setAttribute('aria-label',name+'印章');
  button.setAttribute('aria-pressed',String(id===stampShape));
  button.onclick = () => {
    finish();
    stampShape = id;
    syncTool();
    for (const entry of document.querySelectorAll('.stamp-choice')) {
      entry.setAttribute('aria-pressed',String(entry===button));
    }
    brushPicker.close();
  };
  stampOptions.append(button);
}
const brushSizes = [[9,'細筆',5],[20,'中筆',10],[38,'粗筆',17]];
const sizePicker = $('#size-picker');
const sizeOpen = $('#size-open');
function syncSize() {
  const [,label] = brushSizes.find(([value]) => value === size);
  sizeOpen.setAttribute('aria-label', '畫筆粗細，目前是'+label);
  sizeOpen.title = '畫筆粗細';
  sizeOpen.dataset.size = size;
  for(const option of document.querySelectorAll('.size')) {
    option.setAttribute('aria-pressed', String(Number(option.dataset.size) === size));
  }
}
function addSizeOptions(group) {
  for(const [value,label,diameter] of brushSizes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size';
    button.dataset.size = value;
    button.innerHTML = `<span style="width:${diameter}px;height:${diameter}px"></span>`;
    button.setAttribute('aria-label',label);
    button.onclick = () => {
      finish();
      size = value;
      syncSize();
      if (sizePicker.open) sizePicker.close();
    };
    group.append(button);
  }
}
addSizeOptions($('#sizes'));
syncSize();
let patternCategory='all';
function filterPatterns(){document.querySelectorAll('.pattern').forEach(b=>{b.hidden=(b.dataset.legacy==='true'&&b.dataset.id!==state.pattern)||(patternCategory!=='all'&&b.dataset.category!==patternCategory)});document.querySelectorAll('.category-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===patternCategory)));requestAnimationFrame(fit)}
for(const c of [{id:'all',name:'全部',icon:'✨'},...patternCategories]){const b=document.createElement('button');b.className='category-choice';b.dataset.id=c.id;b.textContent=c.icon;b.title=c.name+'圖案';b.setAttribute('aria-label',c.name+'圖案');b.setAttribute('aria-pressed',String(c.id==='all'));b.onclick=()=>{finish();patternCategory=c.id;filterPatterns()};$('#pattern-categories').append(b)}
for(const p of availablePatterns(state.pattern)){const b=document.createElement('button');const legacy=isLegacyPattern(p.id);const caption=legacy?p.name+'（舊稿）':p.name;b.className='pattern';b.dataset.id=p.id;b.dataset.category=p.category;b.dataset.legacy=String(legacy);b.setAttribute('aria-pressed',String(p.id===state.pattern));b.innerHTML=(p.id==='blank'?'<span class="blank-icon">✨</span>':outlineMarkup(p.id))+`<span class="${legacy?'legacy-caption':'sr-only'}">${legacy?'舊稿':p.name}</span>`;b.setAttribute('aria-label',caption+'畫紙');b.title=caption;b.onclick=()=>{
  $('#pattern-dialog').close();
  if(p.id===state.pattern){avatar?.showDrawing();return}
  if(state.strokes.length||state.fills?.length||active)ask('換一張圖案嗎？','這張畫會被換掉。喜歡的作品，先請大人幫忙存成圖片。',()=>setPattern(p.id),p.id);
  else setPattern(p.id);
};$('#patterns').append(b)}
canvas.addEventListener('pointerdown',e=>{if(pointer!==null||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();if(state.fillMode){const point=pointAt(e.clientX,e.clientY,canvas.getBoundingClientRect());fillAt(point);return}if(state.strokes.length>=MAX_STROKES||state.strokes.reduce((n,s)=>n+s.points.length,0)>=MAX_POINTS-15000){storageWarning('這張畫很豐富了！請大人儲存，再開新畫。');return}pointer=e.pointerId;canvas.setPointerCapture(pointer);active={tool,color,rainbow:tool!=='eraser'&&rainbow,size,stamp:stampShape,seed:crypto.getRandomValues(new Uint32Array(1))[0],points:[pointAt(e.clientX,e.clientY,canvas.getBoundingClientRect())]};rememberPoint(active.points[0]);schedule()});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!active)return;e.preventDefault();const rect=canvas.getBoundingClientRect();const events=e.getCoalescedEvents?.();for(const ev of events?.length?events:[e]){const p=pointAt(ev.clientX,ev.clientY,rect),last=active.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)>1.3&&active.points.length<14999){active.points.push(p);rememberPoint(p)}}schedule()});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer)finish()});
window.addEventListener('blur',finish);window.addEventListener('pagehide',()=>{finish();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){finish();save()}});window.addEventListener('resize',finish);
$('#undo').onclick=()=>{finish();const a=history.pop();if(a){if(a.kind==='stroke')state.strokes.pop();else restoreFill(a.region,a.before);redo.push(a)}changed()};$('#redo').onclick=()=>{finish();const a=redo.pop();if(a){if(a.kind==='stroke')state.strokes.push(a.stroke);else restoreFill(a.region,a.after);history.push(a)}changed()};
$('#parent').onclick=()=>{finish();avatar?.pauseEditor();$('#parent-dialog').showModal()};$('[data-close]').onclick=()=>$('#parent-dialog').close();$('#cancel').onclick=()=>{$('#confirm-dialog').close();confirmAction=null};$('#confirm').onclick=()=>{const action=confirmAction;confirmAction=null;$('#confirm-dialog').close();action?.()};$('#confirm-dialog').addEventListener('cancel',()=>confirmAction=null);
$('#clear').onclick=()=>{
  $('#parent-dialog').close();
  if(!avatar?.editing){ask('換一張乾淨的紙嗎？','現在的顏色會清掉，圖案保留。請先儲存想留下的作品。',()=>setPattern(state.pattern));return}
  const arrow = document.createElement('span');
  arrow.textContent = '→';
  const sheets = [false,true].map(blank => {
    const sheet = document.createElement('div');
    const image = document.createElement('img');
    image.src = avatar.exportCanvas(blank).toDataURL();
    image.alt = '';
    sheet.className = 'confirm-sheet';
    sheet.append(image);
    return sheet;
  });
  $('#confirm-preview').replaceChildren(sheets[0],arrow,sheets[1]);
  $('#confirm-title').textContent = '清除主角筆跡嗎？';
  $('#confirm-message').textContent = '清除後可以重新畫在主角身上。';
  confirmAction = () => avatar.clearMarks();
  $('#confirm-dialog').showModal();
};
const nativeApp = window.Capacitor?.isNativePlatform();
const exportButton = $('#export');
const exportLabel = nativeApp ? '分享作品 PNG' : '↓ 儲存作品 PNG';
if (nativeApp) {
  addSizeOptions($('#size-options'));
  syncSize();
  sizeOpen.hidden = false;
  sizeOpen.onclick = () => { finish(); sizePicker.showModal(); };
  $('#size-close').onclick = () => sizePicker.close();
  exportButton.textContent = exportLabel;
  $('#storage-help').textContent = '畫作暫存在這個 App。移除 App 或清除 App 資料會移除暫存，喜歡的作品可以分享成 PNG。';
  $('#export-help').textContent = '用系統分享選單儲存或傳送圖片。直向、橫向都可以畫。';
}

function artworkCanvas({width, height}) {
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  return layer;
}

function paintArtworkPaper(context, snapshot, area) {
  const output = context.canvas;
  context.fillStyle = backgroundColor(snapshot);
  context.fillRect(0, 0, output.width, output.height);
  context.save();
  context.setTransform(output.width / area.width, 0, 0, output.height / area.height,
    -area.x * output.width / area.width, -area.y * output.height / area.height);
  drawFills(context, snapshot, area);
  context.restore();
}

async function drawArtwork(snapshot, area, maxSize, stickerMarkup='') {
  const dimensions = rasterSize(area, maxSize);
  const output = artworkCanvas(dimensions);
  const ink = artworkCanvas(dimensions);
  const context = output.getContext('2d');
  paintArtworkPaper(context, snapshot, area);
  paintInk(ink.getContext('2d'), ink, area, false, snapshot.strokes);
  context.drawImage(ink, 0, 0);

  await drawSvg(context, exportMarkup(snapshot.pattern), area);
  if (stickerMarkup) await drawSvg(context, stickerMarkup, area);
  return output;
}

async function motionArtwork(snapshot) {
  const area = snapshot.paper ?? ORIGINAL_PAPER;
  const dimensions = rasterSize(area, 1200);
  const paper = artworkCanvas(dimensions);
  const ink = artworkCanvas(dimensions);
  const outline = artworkCanvas(dimensions);
  paintArtworkPaper(paper.getContext('2d'), snapshot, area);
  paintInk(ink.getContext('2d', {willReadFrequently: true}), ink, area, false, snapshot.strokes);
  await drawSvg(outline.getContext('2d'), exportMarkup(snapshot.pattern), area);
  return {area, paper, ink, outline};
}

async function drawSvg(context, markup, area) {
  const outline = new Blob([paperMarkup(markup, area)], {type: 'image/svg+xml'});
  const outlineUrl = URL.createObjectURL(outline);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = outlineUrl;
    });
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
  } finally {
    URL.revokeObjectURL(outlineUrl);
  }
}

async function createArtworkPng() {
  const output = avatar?.editing ? avatar.exportCanvas()
    : await drawArtwork(state, paperView(view.width, view.height, state.paper), 4096, rewards ? rewardExportMarkup(state) : '');
  const png = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('PNG encoding failed');
  return png;
}

async function shareArtwork(png) {
  const {Filesystem, Share} = window.Capacitor.Plugins;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(png);
  });
  const {uri} = await Filesystem.writeFile({
    path: `artwork/小小畫作-${Date.now()}.png`,
    directory: 'CACHE',
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    recursive: true
  });
  try {
    await Share.share({files: [uri], dialogTitle: '分享小小畫作'});
  } catch (error) {
    if (error.message !== 'Share canceled') throw error;
  }
}

exportButton.onclick = async () => {
  finish();
  exportButton.disabled = true;
  exportButton.textContent = '正在準備圖片…';
  const panel = $('#export-preview');
  try {
    const png = await createArtworkPng();
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(png);
    const preview = document.createElement('img');
    preview.src = exportUrl;
    preview.alt = nativeApp ? '完成的畫作' : '完成的畫作，可長按儲存';
    panel.replaceChildren(preview);
    if (nativeApp) {
      try {
        await shareArtwork(png);
      } catch {
        const notice = document.createElement('p');
        notice.setAttribute('role', 'status');
        notice.textContent = '暫時無法分享圖片，請再試一次。作品仍在畫布上。';
        panel.append(notice);
      }
    } else {
      const download = document.createElement('a');
      download.href = exportUrl;
      download.download = '我的小小畫作.png';
      download.textContent = '下載圖片（或長按上圖儲存）';
      panel.append(download);
      download.click();
    }
  } catch {
    panel.textContent = '圖片暫時無法產生，請再試一次。作品仍在畫布上。';
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = exportLabel;
  }
};
$('#outline').innerHTML=outlineMarkup(state.pattern);const p=patterns.find(p=>p.id===state.pattern);$('#picture-title').textContent=p.icon+' '+p.name;render();if(restoreMessage)storageWarning(restoreMessage);

// Resize only the presentation; vector coordinates and the stored document stay intact.
const app=$('.app'),board=$('#board'),paper=$('.paper-frame');
function fit(){
  if (avatar) {
    board.style.width='';
    board.style.height='';
  }
  const r=(avatar ? board : paper).getBoundingClientRect();
  const width=Math.max(1,r.width),height=Math.max(1,r.height);
  view=paperView(width,height,state.paper);
  if (!avatar) {
    board.style.width=width+'px';
    board.style.height=height+'px';
  }
  const dimensions=rasterSize(view);
  for(const layer of [canvas,filled,committed,liveInk]){layer.width=dimensions.width;layer.height=dimensions.height}
  updateOverlays();
  dirty=true;
  render();
  rewards?.resize(view);
  avatar?.resize(view);
}

let barsHidden;
const systemBars = nativeApp && window.Capacitor.Plugins.SystemBars;
const fullscreenToggle = $('#fullscreen-toggle');
const focusMode = createFocusMode({
  root: document.documentElement,
  doc: document,
  onChange({focused}) {
    finish();
    fullscreenToggle.setAttribute('aria-pressed',String(focused));
    if (systemBars && barsHidden !== focused) {
      barsHidden = focused;
      void systemBars[focused ? 'hide' : 'show']({}).catch(() => {});
    }
    requestAnimationFrame(fit);
  }
});
function enterFocus() {
  return focusMode.enter({systemFullscreen: !nativeApp});
}
fullscreenToggle.onclick = () => focusMode.getState().focused ? focusMode.exit() : enterFocus();
for (const event of ['fullscreenchange','webkitfullscreenchange']) {
  document.addEventListener(event,() => focusMode.change());
}
document.addEventListener('keydown',event => {
  if (event.key==='Escape' && !event.defaultPrevented && focusMode.getState().focused && !document.querySelector('dialog[open]')) {
    void focusMode.exit();
  }
});
$('#pattern-open').onclick = () => {
  finish();
  avatar?.pauseEditor();
  $('#pattern-dialog').showModal();
};
$('#pattern-close').onclick = () => $('#pattern-dialog').close();
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{finish();fit()}).observe(paper);
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);requestAnimationFrame(fit);

const colorDialog = $('#color-dialog');
const colorButton = $('#color-open');
const colorSpectrum = $('#color-spectrum');
const spectrumSelection = $('#spectrum-selection');
const customColorButton = $('#custom-color-open');
const backToBasicColors = $('#basic-colors-back');
let spectrumPointer = null;
let draftColorPosition = colorPosition;

const rainbowPreview = `linear-gradient(135deg,${RAINBOW_COLORS.join(',')})`;
function syncColorSwatch() {
  $('#current-color').style.background = rainbow ? rainbowPreview : color;
  const selected = rainbow ? undefined : basicSwatches.find(swatch => swatch.hex===color);
  const name = rainbow ? '彩虹色' : (selected?.name || spectrumName(colorPosition));
  colorButton.setAttribute('aria-label','選顏色，目前是'+name);
  for (const swatch of basicSwatches) {
    swatch.button.setAttribute('aria-pressed',String(swatch===selected));
  }
  rainbowSwatch.setAttribute('aria-pressed',String(rainbow));
}
function previewColor(position) {
  draftColorPosition = position;
  spectrumSelection.style.left = `clamp(14px, ${position.x*100}%, calc(100% - 14px))`;
  spectrumSelection.style.top = `clamp(14px, ${position.y*100}%, calc(100% - 14px))`;
  spectrumSelection.style.background = spectrumColor(position);
  colorSpectrum.setAttribute('aria-valuenow',String(Math.round(position.x*100)));
  colorSpectrum.setAttribute('aria-valuetext',spectrumName(position));
}
function positionOnSpectrum(event) {
  const rect = colorSpectrum.getBoundingClientRect();
  const width = colorSpectrum.clientWidth || rect.width;
  const height = colorSpectrum.clientHeight || rect.height;
  return {
    x: clampSpectrum((event.clientX-rect.left-(colorSpectrum.clientLeft||0))/width),
    y: clampSpectrum((event.clientY-rect.top-(colorSpectrum.clientTop||0))/height)
  };
}
function applyColor(position=draftColorPosition,useRainbow=false) {
  rainbow = useRainbow;
  colorPosition = position;
  color = spectrumColor(colorPosition);
  syncColorSwatch();
  colorDialog.close();
}
const basicSwatches = BASIC_COLORS.map(([name,position]) => {
  const button = document.createElement('button');
  const hex = spectrumColor(position);
  button.className = 'basic-swatch';
  button.style.background = hex;
  button.setAttribute('aria-label',name);
  button.title = name;
  button.onclick = () => applyColor(position);
  $('#basic-colors').append(button);
  return {name,hex,button};
});
const rainbowSwatch = document.createElement('button');
rainbowSwatch.className = 'basic-swatch';
rainbowSwatch.style.background = rainbowPreview;
rainbowSwatch.setAttribute('aria-label','彩虹色');
rainbowSwatch.title = '彩虹色';
rainbowSwatch.onclick = () => applyColor(colorPosition,true);
$('#basic-colors').append(rainbowSwatch);

function showColorPanel(custom) {
  if (!custom) spectrumPointer = null;
  $('#basic-palette').hidden = custom;
  $('#spectrum-panel').hidden = !custom;
  backToBasicColors.hidden = !custom;
  $('#color-title').textContent = custom ? '自訂顏色' : '選顏色';
}
colorButton.onclick = () => {
  finish();
  showColorPanel(false);
  colorDialog.showModal();
};
customColorButton.onclick = () => {
  showColorPanel(true);
  previewColor(colorPosition);
  colorSpectrum.focus({preventScroll:true});
};
backToBasicColors.onclick = () => {
  showColorPanel(false);
  customColorButton.focus({preventScroll:true});
};
$('#color-close').onclick = () => colorDialog.close();
colorDialog.addEventListener('close',() => { spectrumPointer = null; });
colorSpectrum.addEventListener('pointerdown',event => {
  if (spectrumPointer!==null || (event.pointerType==='mouse' && event.button!==0)) return;
  event.preventDefault();
  spectrumPointer = event.pointerId;
  colorSpectrum.setPointerCapture(event.pointerId);
  previewColor(positionOnSpectrum(event));
});
colorSpectrum.addEventListener('pointermove',event => {
  if (event.pointerId===spectrumPointer) previewColor(positionOnSpectrum(event));
});
colorSpectrum.addEventListener('pointerup',event => {
  if (event.pointerId!==spectrumPointer) return;
  spectrumPointer = null;
  previewColor(positionOnSpectrum(event));
  applyColor();
});
function cancelSpectrumGesture(event) {
  if (event.pointerId!==spectrumPointer) return;
  spectrumPointer = null;
  previewColor(colorPosition);
}
colorSpectrum.addEventListener('pointercancel',cancelSpectrumGesture);
colorSpectrum.addEventListener('lostpointercapture',cancelSpectrumGesture);
colorSpectrum.addEventListener('keydown',event => {
  const steps = {ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]};
  const step = steps[event.key];
  if (step) {
    event.preventDefault();
    previewColor({x:clampSpectrum(draftColorPosition.x+step[0]), y:clampSpectrum(draftColorPosition.y+step[1])});
  }
  if (event.key==='Enter' || event.key===' ') {
    event.preventDefault();
    applyColor();
  }
});
syncColorSwatch();

// Keep the fill boundaries for earlier artwork, including saved v1 drawings.
function outlineMarkup(id){const base=svgMarkup(id);return base.replace('</svg>',closureSvgMarkup(id).replace(/^<svg[^>]*>/,'').replace('</svg>','')+'</svg>')}
function exportMarkup(pattern=state.pattern){return outlineMarkup(pattern)}
syncTool();
if (nativeApp) void enterFocus();

const music = createMusic({audio: $('#soundtrack'), visible: !document.hidden});
document.addEventListener('pointerup', music.start);
document.addEventListener('keydown', music.start);
document.addEventListener('visibilitychange', () => music.setVisible(!document.hidden));
window.addEventListener('pagehide', () => music.setVisible(false));
window.addEventListener('pageshow', () => music.setVisible(!document.hidden));

function restoreFill(region,fill){state.fills=(state.fills||[]).filter(f=>f.region!==region);if(fill)state.fills.push(fill)}
function fillAt(point) {
  const region = fillTarget(state.pattern, point.x, point.y);
  if (!region) return;
  const before = (state.fills || []).find(fill => fill.region === region) ?? null;
  if (!rainbow && before?.color === color && !before.rainbow) return;
  const after = {region, color, rainbow};
  if (rainbow) after.gradient = randomFillGradient(state.pattern, region, state.paper);
  restoreFill(region, after);
  history.push({kind:'fill', region, before, after});
  redo = [];
  changed();
}

if (document.createElementNS) {
  if (nativeApp) {
    app.classList.add('is-native');
    avatar = createGameAvatar({board, onEditorChange(editing) {
      finish();
      if (editing) rewards.stop(true);
      app.classList.toggle('avatar-editing',editing);
      board.inert = editing;
      $('.toolbar-paint').hidden = editing;
      for (const id of ['avatar-tools','avatar-open','avatar-undo']) $(`#${id}`).hidden = !editing;
      for (const id of ['undo','redo','reward-open']) $(`#${id}`).hidden = editing;
      document.querySelectorAll('.pattern').forEach(b=>b.setAttribute('aria-pressed',String(!editing && b.dataset.id===state.pattern)));
      fit();
      rewards.sync();
    }});
  }
  rewards = createRewards({board, ink: canvas, getState: () => state, canCelebrate: () => pointer === null && !avatar?.editing, motionArtwork, save, avatar});
  rewards.resize(view);
  rewards.sync();
  avatar?.start();
}
