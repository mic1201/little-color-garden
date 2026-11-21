import {setupAdultActions} from './dist/adult-actions.js';
import * as spectrumFunctions from './dist/color-spectrum.js';
import {createMusic} from './dist/music.js';
import * as paper from './dist/paper.js';
import * as fillRegions from './dist/fill-regions.js';
import * as fills from './dist/fills.js';
import * as numberGuides from './dist/number-patterns.js';
import * as brushUI from './dist/brush-ui.js';
import * as viewport from './dist/viewport.js';import fs from 'node:fs';import assert from 'node:assert/strict';import * as engine from './dist/engine.js';import * as pats from './dist/patterns.js';
const els=new Map(),store=new Map(),context=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
context.createLinearGradient=()=>({addColorStop(){}});
globalThis.Image=class {set src(v){queueMicrotask(()=>this.onload())}};
class E{constructor(){this.style={};this.dataset={};this.children=[];this.events={};this.attrs={};this.open=false;this.classList={toggle(){}}}setAttribute(k,v){this.attrs[k]=v}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}addEventListener(k,f){this.events[k]=f}play(){return Promise.resolve()}pause(){}focus(){}click(){}toBlob(cb){cb(new Blob(["png"],{type:"image/png"}))}getContext(){return context}getBoundingClientRect(){return {left:10,top:20,width:500,height:450}}setPointerCapture(id){this.cap=id}hasPointerCapture(id){return this.cap===id}releasePointerCapture(){this.cap=null}showModal(){this.open=true}close(){this.open=false;this.classList={toggle(){}}}}
const get=s=>{if(!els.has(s))els.set(s,new E);return els.get(s)};const document={querySelector:get,createElement:()=>new E,querySelectorAll:s=>[...els.values()].flatMap(e=>e.children).filter(e=>e.className===s.slice(1)),addEventListener(){},hidden:false,documentElement:new E,body:new E};let timers=[];const window={addEventListener(){}};const localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};let src=fs.readFileSync('./dist/app.js','utf8').replace(/^import .*;\n/gm,'');src+='\nreturn {getState:()=>state, getActive:()=>active,save,render,finish,exportMarkup,fit,getView:()=>view};';const keys=[...Object.keys(paper),...Object.keys(engine),...Object.keys(pats),...Object.keys(viewport),...Object.keys(brushUI),...Object.keys(numberGuides),...Object.keys(fillRegions),...Object.keys(fills),...Object.keys(spectrumFunctions),'createMusic','setupAdultActions'];const run=new Function(...keys,'document','window','localStorage','requestAnimationFrame','setTimeout','clearTimeout',src);const api=run(...Object.values(paper),...Object.values(engine),...Object.values(pats),...Object.values(viewport),...Object.values(brushUI),...Object.values(numberGuides),...Object.values(fillRegions),...Object.values(fills),...Object.values(spectrumFunctions),createMusic,setupAdultActions,document,window,localStorage,()=>1,f=>(timers.push(f),timers.length),()=>{});
const cv=get('#ink');const event=(id,x,y,more={})=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',isPrimary:true,preventDefault(){},...more});cv.events.pointerdown(event(1,10,20));cv.events.pointermove(event(1,260,245));cv.events.pointerdown(event(2,200,200,{isPrimary:false}));assert.equal(api.getActive().points.length,2);cv.events.pointerup(event(2,200,200));assert.equal(api.getState().strokes.length,0);cv.events.pointerup(event(1,260,245));assert.equal(api.getState().strokes.length,1);assert.deepEqual(api.getState().strokes[0].points[1],{x:500,y:450});get('#undo').onclick();assert.equal(api.getState().strokes.length,0);get('#redo').onclick();assert.equal(api.getState().strokes.length,1);const cat=get('#patterns').children.find(e=>e.dataset.id==='cat-clean');cat.onclick();assert(get('#confirm-dialog').open);get('#cancel').onclick();assert.equal(api.getState().strokes.length,1);cat.onclick();get('#confirm').onclick();assert.equal(api.getState().pattern,'cat-clean');assert.equal(api.getState().strokes.length,0);api.save();assert.equal(JSON.parse([...store.values()][0]).pattern,'cat-clean');console.log('PASS fake DOM pointer mapping, multi-touch guard, finish, undo/redo, pattern confirmation cancel/confirm, serialized local save');

await get("#export").onclick();assert.equal(get("#export-preview").children.length,2);assert.match(get("#export-preview").children[1].download,/png$/);assert.equal(get("#export").disabled,false);console.log("PASS fake DOM export resolves and exposes downloadable preview (pixel composition not tested)");

const fullscreen = get('#fullscreen-toggle');
const fixedBrush = get('#brush-summary');
const fixedColor = get('#color-open');
const bucketTool = () => get('#tools').children.find(button => button.dataset.tool === 'fill');
const toggleFill = () => {
  fixedBrush.onclick();
  if (api.getState().fillMode) get('#tools').children[0].onclick();
  else bucketTool().onclick();
};
await fullscreen.onclick();
assert.equal(fullscreen.attrs['aria-pressed'],'true');
assert.equal(get('#brush-summary'),fixedBrush);
assert.equal(get('#color-open'),fixedColor);
await fullscreen.onclick();
assert.equal(fullscreen.attrs['aria-pressed'],'false');
assert.equal(api.getState().pattern,'cat-clean');

for(const mode of ['normal','fullscreen']){
  if(mode==='fullscreen')await fullscreen.onclick();
  for(const [i,[id,,name]] of brushUI.brushes.entries()){
    fixedBrush.onclick();
    assert(get('#brush-picker').open);
    get('#tools').children[i].onclick();
    assert.equal(get('#brush-name').textContent,id==='stamp'?'星星印章':name);
    assert.equal(get('#brush-picker').open,id==='stamp');
    assert.equal(get('#tools').children[i].attrs['aria-pressed'],'true');
    if(id==='stamp')get('#brush-close').onclick();
  }
  fixedBrush.onclick();
  get('#tools').children.find(b=>b.attrs['aria-label']==='蓋印章').onclick();
  assert.equal(get('#stamp-options').hidden,false);
  for(const [i,[id,,name]]of brushUI.stamps.entries()){
    if(i){fixedBrush.onclick();get('#tools').children.find(b=>b.attrs['aria-label']==='蓋印章').onclick()}
    get('#stamp-options').children[i].onclick();
    assert.equal(get('#brush-name').textContent,name+'印章');
    assert(!get('#brush-picker').open);
  }
  get('#stamp-options').children[0].onclick();
  if(mode==='fullscreen')await fullscreen.onclick();
}
console.log('PASS the same tool controls work in both display modes, including all brushes and stamps.');
const spectrum = get('#color-spectrum');
const spectrumEvent = (id,x,y) => event(id, 10 + x*500, 20 + y*450);
function openCustomColor() {
  get('#color-open').onclick();
  assert(get('#spectrum-panel').hidden);
  get('#custom-color-open').onclick();
  assert(!get('#spectrum-panel').hidden);
}
function chooseSpectrum(x,y) {
  openCustomColor();
  spectrum.events.pointerdown(spectrumEvent(501,x,y));
  spectrum.events.pointerup(spectrumEvent(501,x,y));
  assert(!get('#color-dialog').open);
  return get('#current-color').style.background;
}
const beforePattern=api.getState().pattern;
cv.events.pointerdown(event(8,60,60));cv.events.pointerup(event(8,60,60));
const originalStrokes=JSON.stringify(api.getState().strokes);
const pastelColor = chooseSpectrum(0,.275);
assert.equal(pastelColor,'#ff8989');
toggleFill();
cv.events.pointerdown(event(9,14,24));cv.events.pointerup(event(9,14,24));
const filledPaper = {region:fills.PAPER_REGION,color:pastelColor,rainbow:false};
assert.deepEqual(api.getState().fills,[filledPaper]);
assert.equal(JSON.stringify(api.getState().strokes),originalStrokes);assert.equal(api.getState().pattern,beforePattern);
api.save();const bgDoc=JSON.parse([...store.values()][0]);assert.deepEqual(bgDoc.fills,[filledPaper]);assert(fills.validFills(bgDoc));
get('#undo').onclick();assert.equal(api.getState().fills.length,0);assert.equal(JSON.stringify(api.getState().strokes),originalStrokes);
get('#redo').onclick();assert.deepEqual(api.getState().fills,[filledPaper]);
let exportBackground; context.fill=rule=>{if(rule==='evenodd')exportBackground=context.fillStyle};
await get('#export').onclick();assert.equal(exportBackground,pastelColor);
toggleFill();
get('#tools').children.find(b=>b.attrs['aria-label']==='橡皮擦').onclick();cv.events.pointerdown(event(9,60,60));cv.events.pointerup(event(9,60,60));assert.equal(api.getState().strokes.at(-1).tool,'eraser');assert.deepEqual(api.getState().fills,[filledPaper]);
get('#clear').onclick();get('#confirm').onclick();assert(!api.getState().fills?.length);assert.equal(api.getState().strokes.length,0);
const old={version:1,pattern:'blank',strokes:[],background:'#fce6ed'};assert(engine.validDocument(old,['blank']));assert.equal(engine.backgroundColor(old),'#fce6ed');assert(!engine.validDocument({...old,background:'url(bad)'},['blank']));
console.log('PASS bucket background fill, undo/redo, PNG, existing brush strokes, and older paper colors.');
cv.events.pointerdown(event(10,80,90));cv.events.pointerup(event(10,80,90));
const categoryState=JSON.stringify(api.getState());
for(const category of get('#pattern-categories').children){category.onclick();assert.equal(JSON.stringify(api.getState()),categoryState);for(const p of get('#patterns').children)assert.equal(p.hidden,category.dataset.id!=='all'&&p.dataset.category!==category.dataset.id)}
get('#pattern-categories').children[0].onclick();
const different=get('#patterns').children.find(b=>b.dataset.id!==api.getState().pattern&&b.dataset.id!=='blank');different.onclick();assert.equal(get('#confirm-dialog').open,true);get('#cancel').onclick();assert.equal(JSON.stringify(api.getState()),categoryState);
console.log('PASS category filtering preserves drawing/background and switching still requires confirmation.');
get('#color-open').onclick();
assert(get('#color-dialog').open);
assert(!get('#basic-palette').hidden);
assert(get('#spectrum-panel').hidden);
const basicColors = get('#basic-colors').children;
assert.equal(basicColors.length,9);
const blue = basicColors.find(swatch=>swatch.attrs['aria-label']==='藍色');
blue.onclick();
assert(!get('#color-dialog').open);
assert.equal(get('#current-color').style.background,blue.style.background);
assert.equal(blue.attrs['aria-pressed'],'true');
const rainbowSwatch = basicColors.find(swatch=>swatch.attrs['aria-label']==='彩虹色');
get('#color-open').onclick();
rainbowSwatch.onclick();
assert(!get('#color-dialog').open);
assert.match(get('#current-color').style.background,/linear-gradient/);
assert.equal(blue.attrs['aria-pressed'],'false');
assert.equal(rainbowSwatch.attrs['aria-pressed'],'true');
get('#tools').children[0].onclick();
cv.events.pointerdown(event(50,70,65));cv.events.pointerup(event(50,70,65));
assert.equal(api.getState().strokes.at(-1).rainbow,true);

get('#color-open').onclick();
blue.onclick();
assert.equal(rainbowSwatch.attrs['aria-pressed'],'false');
openCustomColor();
assert(get('#basic-palette').hidden);
get('#basic-colors-back').onclick();
assert(!get('#basic-palette').hidden);
assert(get('#spectrum-panel').hidden);
get('#color-close').onclick();
assert.equal(get('#current-color').style.background,blue.style.background);

assert.equal(chooseSpectrum(0,.5),'#ff0000');
get('#tools').children[0].onclick();cv.events.pointerdown(event(20,80,90));cv.events.pointerup(event(20,80,90));
assert.equal(api.getState().strokes.at(-1).color,'#ff0000');

openCustomColor();assert(get('#color-dialog').open);
spectrum.events.pointerdown(spectrumEvent(502,0,.5));
spectrum.events.pointermove(spectrumEvent(502,1/3,.5));
assert.equal(get('#spectrum-selection').style.background,'#00ff00');
assert.equal(get('#current-color').style.background,'#ff0000');
spectrum.events.pointerup(spectrumEvent(502,1/3,.5));
assert(!get('#color-dialog').open);
assert.equal(get('#current-color').style.background,'#00ff00');

openCustomColor();
spectrum.events.pointerdown(spectrumEvent(503,.552,.28));
spectrum.events.pointercancel(spectrumEvent(503,.552,.28));
assert.equal(get('#spectrum-selection').style.background,'#00ff00');
assert(get('#color-dialog').open);
const key = k => ({key:k,preventDefault(){}});
spectrum.events.keydown(key('ArrowUp'));
const keyColor=get('#spectrum-selection').style.background;
assert.notEqual(keyColor,'#00ff00');
spectrum.events.keydown(key('Enter'));
assert(!get('#color-dialog').open);
assert.equal(get('#current-color').style.background,keyColor);

assert.equal(chooseSpectrum(.5,0),'#ffffff');
assert.equal(chooseSpectrum(.5,1),'#000000');
cv.events.pointerdown(event(21,80,90));cv.events.pointermove(event(21,180,190));cv.events.pointerup(event(21,180,190));
assert.equal(api.getState().strokes.at(-1).color,'#000000');
assert.equal(api.getState().strokes.at(-1).rainbow,false);
get('#tools').children.find(b=>b.attrs['aria-label']==='橡皮擦').onclick();cv.events.pointerdown(event(22,80,90));cv.events.pointerup(event(22,80,90));
assert.equal(api.getState().strokes.at(-1).tool,'eraser');
api.save();assert(engine.validDocument(JSON.parse([...store.values()][0]),pats.patterns.map(p=>p.id)));
console.log('PASS nine swatches including a rainbow brush, a separate custom spectrum, and retained selection.');
for(const b of get('#tools').children){assert.match(b.innerHTML,/sr-only/);assert(b.attrs['aria-label'])}
for(const b of get('#pattern-categories').children){assert(b.attrs['aria-label']);assert(!/[\u4e00-\u9fff]/.test(b.textContent))}
for(const b of get('#patterns').children){assert.match(b.innerHTML,/sr-only/);assert(b.attrs['aria-label'])}
const iconState=JSON.stringify(api.getState());different.onclick();assert.equal(get('#confirm-preview').children.length,3);get('#cancel').onclick();assert.equal(JSON.stringify(api.getState()),iconState);
fixedBrush.onclick();assert(get('#brush-picker').open);get('#brush-close').onclick();
console.log('PASS icon-only generated controls, retained labels, picture confirmation cancel, and focus tool icon.');

const savedSetter=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};api.save();assert.equal(get('#storage-warning').hidden,false);get('#storage-warning').onclick();assert.equal(get('#parent-dialog').open,true);assert.match(get('#save-status').textContent,/暫存空間不足/);localStorage.setItem=savedSetter;api.save();assert.equal(get('#storage-warning').hidden,true);console.log('PASS visible storage warning and parent details with recovery.');

const savedDrawing=JSON.stringify(api.getState().strokes);const savedBackground=api.getState().background;
toggleFill();assert.equal(api.getState().fillMode,true);assert.equal(bucketTool().attrs['aria-pressed'],'true');assert.equal(get('#brush-name').textContent,'畫桶');assert.equal(fixedBrush.dataset.activeTool,'fill');assert(!api.exportMarkup().includes('<text '));
toggleFill();assert.equal(api.getState().fillMode,false);assert.equal(JSON.stringify(api.getState().strokes),savedDrawing);assert.equal(api.getState().background,savedBackground);
toggleFill();api.save();assert.equal(JSON.parse([...store.values()][0]).fillMode,true);assert(engine.validDocument(JSON.parse([...store.values()][0]),pats.patterns.map(p=>p.id)));assert(!engine.validDocument({...api.getState(),fillMode:'yes'},pats.patterns.map(p=>p.id)));
await get('#fullscreen-toggle').onclick();get('#pattern-open').onclick();assert.equal(get('#pattern-dialog').open,true);get('#pattern-close').onclick();assert.equal(get('#pattern-dialog').open,false);assert.equal(JSON.stringify(api.getState().strokes),savedDrawing);
get('#pattern-open').onclick();get('#patterns').children.find(p=>p.dataset.id==='sea-turtle-clean').onclick();assert.equal(get('#pattern-dialog').open,false);assert.equal(get('#confirm-dialog').open,true);get('#cancel').onclick();assert.equal(JSON.stringify(api.getState().strokes),savedDrawing);
get('#pattern-open').onclick();get('#patterns').children.find(p=>p.dataset.id==='sea-turtle-clean').onclick();get('#confirm').onclick();assert.equal(api.getState().pattern,'sea-turtle-clean');assert.equal(api.getState().fillMode,true);assert.equal(bucketTool().attrs['aria-pressed'],'true');
get('#patterns').children.find(p=>p.dataset.id==='blank').onclick();assert.equal(bucketTool().attrs['aria-pressed'],'true');await get('#fullscreen-toggle').onclick();
console.log('PASS tap-fill mode preserves ink, background, state, fullscreen picker and blank-paper fill mode.');

// Tap-to-fill works with any selected color, independent of brush selection.
get('#patterns').children.find(p=>p.dataset.id==='sea-turtle-clean').onclick();
const region=fillRegions.regionAt('sea-turtle-clean',490,455);assert(region);
const purple = chooseSpectrum(.78,.61);
const tap=(id,x,y)=>{cv.events.pointerdown(event(id,10+x/2,20+y/2));cv.events.pointerup(event(id,10+x/2,20+y/2))};
tap(101,490,455);assert.equal(api.getState().strokes.length,0);assert.equal(api.getState().fills.length,1);assert.equal(api.getState().fills[0].color,purple);assert.equal(api.getState().fills[0].region,region.id);
chooseSpectrum(0,.5);tap(102,490,455);assert.equal(api.getState().fills.length,1);assert.equal(api.getState().fills[0].color,'#ff0000');get('#undo').onclick();assert.equal(api.getState().fills[0].color,purple);get('#redo').onclick();assert.equal(api.getState().fills[0].color,'#ff0000');
tap(103,5,5);assert.equal(api.getState().fills.at(-1).region,fills.PAPER_REGION);get('#undo').onclick();assert.equal(api.getState().fills.length,1);
get('#color-open').onclick();rainbowSwatch.onclick();tap(104,490,455);assert.equal(api.getState().fills[0].rainbow,true);
const firstGradient = api.getState().fills[0].gradient;
tap(105,490,455);
const secondGradient = api.getState().fills[0].gradient;
assert.notDeepEqual(firstGradient, secondGradient);
get('#undo').onclick();assert.deepEqual(api.getState().fills[0].gradient, firstGradient);
get('#redo').onclick();assert.deepEqual(api.getState().fills[0].gradient, secondGradient);
chooseSpectrum(.5,.3);tap(106,490,455);assert.equal(api.getState().fills[0].rainbow,false);api.save();assert(fills.validFills(JSON.parse([...store.values()][0])));
toggleFill();assert.equal(api.getState().fillMode,false);assert.equal(api.getState().fills.length,1);get('#tools').children[0].onclick();tap(105,500,450);assert.equal(api.getState().strokes.length,1);
toggleFill();assert.equal(api.getState().fills.length,1);get('#patterns').children.find(p=>p.dataset.id==='blank').onclick();assert.equal(get('#confirm-dialog').open,true);get('#cancel').onclick();assert.equal(api.getState().fills.length,1);get('#patterns').children.find(p=>p.dataset.id==='blank').onclick();get('#confirm').onclick();assert(!api.getState().fills?.length);
console.log('PASS selected spectrum tap fill, recolor, undo/redo, background fill, persistence, free drawing, and replacement confirmation.');

toggleFill();
// Actual app wiring: every visible white corner receives ink, including old dead margins.
get('.paper-frame').getBoundingClientRect=()=>({left:10,top:20,width:1700,height:780});
cv.getBoundingClientRect=()=>({left:10,top:20,width:1700,height:780});api.fit();const wide=api.getView();assert(wide.x<0);assert.equal(get('#board').style.width,'1700px');
get('#tools').children[0].onclick();cv.events.pointerdown(event(201,12,22));cv.events.pointermove(event(201,1708,798));cv.events.pointerup(event(201,1708,798));
const edgeStroke=api.getState().strokes.at(-1);assert(edgeStroke.points[0].x<0);assert(edgeStroke.points[1].x>1000);api.save();assert(engine.validDocument(JSON.parse([...store.values()][0]),pats.patterns.map(p=>p.id)));
get('#undo').onclick();assert.equal(api.getState().strokes.length,0);get('#redo').onclick();assert.deepEqual(api.getState().strokes.at(-1),edgeStroke);
get('.paper-frame').getBoundingClientRect=()=>({left:10,top:20,width:780,height:1700});api.fit();const portrait=api.getView();assert(portrait.x<=edgeStroke.points[0].x);assert(portrait.x+portrait.width>=edgeStroke.points[1].x);assert.deepEqual(api.getState().strokes.at(-1),edgeStroke);
await get('#export').onclick();assert.equal(get('#export').disabled,false);console.log('PASS app full-white-paper edge ink, undo/redo, saved bounds, rotation retains all artwork, PNG export path.');
get('#patterns').children.find(p=>p.dataset.id==='parrot-cute-clean').onclick();get('#confirm').onclick();if(!api.getState().fillMode)toggleFill();
const pr=fillRegions.getFillRegions('parrot-cute-clean')[0];const [py,px1,px2]=pr.spans[Math.floor(pr.spans.length/2)];
for(const [width,height]of [[1700,780],[780,1700]]){get('.paper-frame').getBoundingClientRect=()=>({left:10,top:20,width,height});cv.getBoundingClientRect=()=>({left:10,top:20,width,height});api.fit();const v=api.getView();const x=10+((px1+px2)/2-v.x)/v.width*width,y=20+(py+.5-v.y)/v.height*height;cv.events.pointerdown(event(301,x,y));assert.equal(api.getState().fills[0].region,pr.id);assert(get('#outline').innerHTML.includes(`viewBox="${v.x} ${v.y} ${v.width} ${v.height}"`));}
console.log('PASS transformed parrot tap-fill hits and outline alignment in landscape and portrait.');

// Mode toggles preserve existing contours, fills and ink.
get('#patterns').children.find(p=>p.dataset.id==='rainbow-clean').onclick();get('#confirm').onclick();
if(!api.getState().fillMode)toggleFill();api.fit();
const rr=fillRegions.getFillRegions('rainbow-clean')[0];const rv=api.getView(),rect=cv.getBoundingClientRect();const [rx,ry]=rr.seeds[0];cv.events.pointerdown(event(401,rect.left+(rx-rv.x)/rv.width*rect.width,rect.top+(ry-rv.y)/rv.height*rect.height));assert.equal(api.getState().fills.length,1);
const stableOutline=get('#outline').innerHTML;
assert(stableOutline.includes('M205 576 V500'),'arc seam included in persistent line layer');
const originalState=JSON.stringify(api.getState());
for(let i=0;i<8;i++){toggleFill();api.fit();assert.equal(get('#outline').innerHTML,stableOutline);}
assert.equal(JSON.stringify(api.getState()),originalState);
if(api.getState().fillMode)toggleFill();api.fit();assert(api.exportMarkup().includes('M205 576 V500'));assert(!api.exportMarkup().includes('<text'));await get('#export').onclick();assert.equal(get('#export').disabled,false);
console.log('PASS repeated fill-mode toggles preserve all original and closure lines with unchanged document.');

const previousArt = {
  version: 1, pattern: 'rabbit-garden', numbers: true,
  strokes: [],
  fills: [{region: '1', color: '#123abc', rainbow: true}]
};
els.clear();
store.set('little-color-garden-v1', JSON.stringify(previousArt));
let adPreloads = 0;
let closePaperAd;
const adRequests = [];
window.Capacitor = {
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  isPluginAvailable: (name) => name === 'DrawingAds',
  Plugins: {DrawingAds: {
    async preparePaperAd() { adPreloads++; },
    showPaperAd() {
      adRequests.push(restored.getState().pattern);
      return new Promise(resolve => { closePaperAd = resolve; });
    },
  }},
};
const restored = run(...Object.values(paper),...Object.values(engine),...Object.values(pats),...Object.values(viewport),...Object.values(brushUI),...Object.values(numberGuides),...Object.values(fillRegions),...Object.values(fills),...Object.values(spectrumFunctions),createMusic,setupAdultActions,document,window,localStorage,()=>1,()=>1,()=>{});
assert.equal(restored.getState().pattern, previousArt.pattern);
assert.equal(restored.getState().fillMode, true);
assert.equal(bucketTool().attrs['aria-pressed'],'true');
assert.equal(get('#brush-name').textContent,'畫桶');
assert.deepEqual(restored.getState().fills, previousArt.fills);
assert(!('numbers' in restored.getState()));
assert(!restored.exportMarkup().includes('<text'));
const legacyButton = get('#patterns').children.find(p=>p.dataset.id==='rabbit-garden');
assert.match(legacyButton.attrs['aria-label'], /舊稿/);
const newBoard = get('#patterns').children.find(p=>p.dataset.id==='rabbit-garden-v2-clean');
assert.equal(adPreloads, 1);
legacyButton.onclick();
assert.deepEqual(adRequests, []);
newBoard.onclick();
assert(get('#confirm-dialog').open);
assert.deepEqual(adRequests, []);
get('#cancel').onclick();
assert.deepEqual(restored.getState().fills, previousArt.fills);
assert.deepEqual(adRequests, []);
console.log('PASS older drawings retain their original outlines, saved fills and tap-fill selection.');

newBoard.onclick();
const switchingBoard = get('#confirm').onclick();
assert.deepEqual(adRequests, ['rabbit-garden']);
assert.equal(restored.getState().pattern, 'rabbit-garden');
const blankBoard = get('#patterns').children.find(p=>p.dataset.id==='blank');
blankBoard.onclick();
assert.deepEqual(adRequests, ['rabbit-garden']);
closePaperAd({status:'dismissed'});
await switchingBoard;
assert.equal(restored.getState().pattern, 'rabbit-garden-v2-clean');

const switchingToBlank = blankBoard.onclick();
assert.deepEqual(adRequests, ['rabbit-garden', 'rabbit-garden-v2-clean']);
closePaperAd({status:'skipped'});
await switchingToBlank;
assert.equal(restored.getState().pattern, 'blank');

window.navigator = {onLine: false};
newBoard.onclick();
assert.equal(restored.getState().pattern, 'rabbit-garden-v2-clean');
assert.equal(adRequests.length, 2);

els.clear();
store.delete('little-color-garden-v1');
let iosAdRequests = 0;
let iosAdPreloads = 0;
window.Capacitor = {
  isNativePlatform: () => true,
  getPlatform: () => 'ios',
  isPluginAvailable: (name) => name === 'PaperTestAds',
  Plugins: {PaperTestAds: {
    async preparePaperAd() { iosAdPreloads++; },
    async showPaperAd() { iosAdRequests++; },
  }},
};
window.navigator = {onLine: true};
const ios = run(...Object.values(paper),...Object.values(engine),...Object.values(pats),...Object.values(viewport),...Object.values(brushUI),...Object.values(numberGuides),...Object.values(fillRegions),...Object.values(fills),...Object.values(spectrumFunctions),createMusic,setupAdultActions,document,window,localStorage,()=>1,()=>1,()=>{});
assert.equal(iosAdPreloads, 1);
assert.equal(get('#test-ads-privacy').hidden, false);
const iosBoard = get('#patterns').children.find(p=>p.dataset.id==='rabbit-garden-v2-clean');
iosBoard.onclick();
assert.equal(iosAdRequests, 1);
iosBoard.onclick();
assert.equal(iosAdRequests, 1);
window.navigator.onLine = false;
get('#patterns').children.find(p=>p.dataset.id==='blank').onclick();
assert.equal(ios.getState().pattern, 'blank');
assert.equal(iosAdRequests, 1);
console.log('PASS Android opens the next board after dismissal or no fill, prevents duplicate transitions and works offline. iOS test ad flow stays intact.');

els.clear();
store.set('little-color-garden-v1', JSON.stringify(previousArt));
let checkedAccess = 0;
let checkedPrice = 0;
let unlockedBoards = false;
let onStoreEntitlement;
get('#purchase-controls').hidden = true;
window.Capacitor = {
  isNativePlatform: () => true,
  getPlatform: () => 'ios',
  isPluginAvailable: (name) => name === 'DrawingStore',
  Plugins: {DrawingStore: {
    async getBoardAccess() { checkedAccess++; return {entitlement: 'notPurchased'}; },
    async getState() {
      checkedPrice++;
      return {price: 'NT$60', entitlement: unlockedBoards ? 'purchased' : 'notPurchased'};
    },
    async authorizeParent() { return {status: 'authorized', hasPIN: false}; },
    async purchase() {
      unlockedBoards = true;
      onStoreEntitlement({entitlement: 'purchased'});
      return {entitlement: 'purchased'};
    },
    async lockParent() {},
    addListener(_name, callback) { onStoreEntitlement = callback; },
  }},
};
const paidIos = run(...Object.values(paper),...Object.values(engine),...Object.values(pats),...Object.values(viewport),...Object.values(brushUI),...Object.values(numberGuides),...Object.values(fillRegions),...Object.values(fills),...Object.values(spectrumFunctions),createMusic,setupAdultActions,document,window,localStorage,()=>1,()=>1,()=>{});
await new Promise(setImmediate);
assert.equal(checkedAccess, 1);
assert.equal(checkedPrice, 0);
const availableIosBoards = get('#patterns').children;
const premium = availableIosBoards.find(button => button.dataset.id === 'island-turtle-clean');
assert.equal(availableIosBoards.filter(button => button.attrs['data-locked'] === 'true').length, 23);
assert.equal(premium.attrs['data-locked'], 'true');
assert.equal(availableIosBoards.find(button => button.dataset.id === 'whale-clean').attrs['data-locked'], 'false');

get('#pattern-open').onclick();
premium.onclick();
assert(get('#locked-board-dialog').open);
assert.deepEqual(paidIos.getState().fills, previousArt.fills);
assert.equal(paidIos.getState().pattern, previousArt.pattern);
assert.equal(checkedPrice, 0, 'purchase price stays behind the parent gate');
get('#locked-board-parent').onclick();
await new Promise(setImmediate);
assert.equal(checkedPrice, 1);
assert.match(get('#remove-ads').textContent, /解鎖所有畫板 NT\$60/);
assert.equal(get('#interstitial-test-controls').hidden, true);
await get('#remove-ads').onclick();
assert.equal(get('#purchase-status').textContent, '所有畫板已解鎖。');
assert.equal(premium.attrs['data-locked'], 'false');
get('[data-close]').onclick();
get('#parent-dialog').events.close();
get('#pattern-open').onclick();
premium.onclick();
assert(get('#confirm-dialog').open, 'switching a paid board still protects current artwork');
get('#confirm').onclick();
assert.equal(paidIos.getState().pattern, premium.dataset.id);
console.log('PASS iOS free catalog, locked-board prompt, parental gate, price, and immediate board unlocking.');
