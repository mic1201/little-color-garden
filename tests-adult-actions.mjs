import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupAdultActions} from './dist/adult-actions.js';

class Element extends EventTarget {
  hidden = true;
  open = false;
  focus() {}
  getBoundingClientRect() { return {left: 8, top: 60, right: 308, bottom: 128, width: 300, height: 68}; }
  showModal() { this.open = true; }
  close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
}

function createDocument() {
  const elements = new Map();
  let notifyDialogChange;
  return Object.assign(new EventTarget(), {
    hidden: false,
    body: {},
    notifyDialogChange: () => notifyDialogChange?.(),
    defaultView: Object.assign(new EventTarget(), {
      navigator: {onLine: true}, innerWidth: 400,
      ResizeObserver: class { observe() {} },
      MutationObserver: class {
        constructor(callback) { notifyDialogChange = callback; }
        observe() {}
      },
    }),
    querySelector(selector) {
      if (selector === 'dialog[open]') return [...elements.values()].find(element => element.open);
      if (!elements.has(selector)) elements.set(selector, new Element());
      return elements.get(selector);
    },
  });
}

const iosReleaseDocument = createDocument();
setupAdultActions(iosReleaseDocument, {
  getPlatform: () => 'ios',
  isPluginAvailable: () => false,
});
for (const id of ['purchase-settings', 'purchase-controls', 'purchase-privacy', 'live-ads-privacy']) {
  assert.equal(iosReleaseDocument.querySelector(`#${id}`).hidden, true, `${id} stays hidden in iOS Release`);
}
assert.equal(iosReleaseDocument.querySelector('#ios-privacy-policy').hidden, false);
assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'),
  /id="ios-privacy-policy"[^>]*><a[^>]*href="https:\/\/mic1201\.github\.io\/privacy-ios\.html"/);

const document = createDocument();
const element = (id) => document.querySelector(`#${id}`);
const parent = element('parent-dialog');
const gate = element('adult-confirm');
const settings = element('purchase-settings');
const controls = element('purchase-controls');
const buy = element('remove-ads');
const restore = element('restore-purchases');
const status = element('purchase-status');
const adSlot = element('drawing-test-ad');
const drawingClasses = new Set();
adSlot.parentElement = {classList: drawingClasses};
const adPositions = [];
let activeEntitlement = 'notPurchased';
let storeReads = 0;
let purchases = 0;
let finishPurchase;
let entitlementChanged;
let adRequests = 0;
let adHides = 0;
let finishAd;

const store = {
  async getState() {
    storeReads++;
    return {price: 'NT$60', entitlement: activeEntitlement};
  },
  async purchase() {
    purchases++;
    return new Promise((resolve) => { finishPurchase = resolve; });
  },
  async restore() {
    return {entitlement: activeEntitlement};
  },
  addListener(event, listener) {
    assert.equal(event, 'entitlementChanged');
    entitlementChanged = listener;
    return {remove: async () => {}};
  },
};
const ads = {
  async loadDrawingAd({format}) {
    assert.equal(format, 'banner', 'Android release requests only the banner');
    adRequests++;
    return new Promise((resolve) => { finishAd = resolve; });
  },
  async positionDrawingAd(position) { adPositions.push(position); },
  async hideDrawingAd() { adHides++; },
};
const actions = setupAdultActions(document, {
  isPluginAvailable: (name) => ['DrawingStore', 'DrawingAds'].includes(name),
  Plugins: {DrawingStore: store, DrawingAds: ads},
});
assert.equal(element('ios-privacy-policy').hidden, true);
assert.equal(drawingClasses.has('has-drawing-ad'), true);

function submitConfirmation(query = element) {
  query('adult-confirm-form').onsubmit(new Event('submit', {cancelable: true}));
}

assert.equal(element('test-ads-privacy').hidden, true);
assert.equal(element('live-ads-privacy').hidden, false);
assert.equal(adSlot.hidden, false, 'reserve the banner row before the ad loads');
assert.equal(adRequests, 1);
assert.deepEqual(adPositions, []);
finishAd({status: 'loaded'});
await new Promise(setImmediate);
assert.deepEqual(adPositions.at(-1), {x: 8, y: 60, width: 300, height: 68, viewportWidth: 400});
assert.equal(adSlot.hidden, false, 'loading must not change the reserved row');

assert.equal(await actions.confirm(), false);
parent.showModal();
document.notifyDialogChange();
assert.deepEqual(adPositions.at(-1), {width: 0});
const cancelled = settings.onclick();
assert.equal(gate.open, true);
assert.match(element('adult-confirm-title').textContent, /廣告與購買/);
assert.equal(controls.hidden, true);
element('adult-confirm-cancel').onclick();
await cancelled;
assert.equal(storeReads, 0);

const opening = settings.onclick();
submitConfirmation();
await opening;
assert.equal(controls.hidden, false);
assert.equal(buy.disabled, false);
assert.match(buy.textContent, /永久移除全螢幕廣告 NT\$60/);
assert.equal(element('interstitial-test-controls').hidden, true);
assert.equal(element('drawing-ad-test-controls').hidden, true);

const buying = buy.onclick();
await buy.onclick();
await restore.onclick();
assert.equal(purchases, 1);
finishPurchase({entitlement: 'pending'});
await buying;
assert.equal(buy.disabled, true);
assert.match(status.textContent, /等待/);
entitlementChanged({entitlement: 'purchased'});
assert.match(status.textContent, /全螢幕廣告已永久移除/);
assert.equal(adHides, 0);
assert.equal(adRequests, 1);

activeEntitlement = 'purchased';
await restore.onclick();
assert.equal(buy.disabled, true);
parent.close();
document.notifyDialogChange();
assert.equal(adPositions.at(-1).width, 300, 'the purchased state still shows the banner');

const portraitRect = adSlot.getBoundingClientRect();
adSlot.getBoundingClientRect = () => ({left: 320, top: 8, width: 440, height: 60});
document.defaultView.innerWidth = 1280;
document.defaultView.dispatchEvent(new Event('resize'));
assert.deepEqual(adPositions.at(-1), {x: 320, y: 8, width: 440, height: 60, viewportWidth: 1280});
assert.equal(adSlot.hidden, false, 'landscape keeps the reserved banner row');
assert.equal(adHides, 0);
assert.equal(adRequests, 1, 'rotation repositions the loaded banner');
adSlot.getBoundingClientRect = () => portraitRect;
document.defaultView.innerWidth = 400;
document.defaultView.dispatchEvent(new Event('resize'));
assert.deepEqual(adPositions.at(-1), {x: 8, y: 60, width: 300, height: 68, viewportWidth: 400});
assert.equal(adRequests, 1, 'returning to portrait reuses the same banner');

document.defaultView.navigator.onLine = false;
document.defaultView.dispatchEvent(new Event('offline'));
assert.equal(adHides, 1);
document.defaultView.navigator.onLine = true;
document.defaultView.dispatchEvent(new Event('online'));
assert.equal(adRequests, 2);
finishAd({status: 'unavailable'});
await new Promise(setImmediate);
assert.equal(adSlot.hidden, false, 'no fill leaves the fixed row in place');

entitlementChanged({entitlement: 'legacyPurchased'});
assert.equal(adHides, 2);
assert.equal(adRequests, 2);
activeEntitlement = 'notPurchased';
entitlementChanged({entitlement: activeEntitlement});
assert.equal(adRequests, 3);

const positionsBeforeBackground = adPositions.length;
document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
finishAd({status: 'loaded'});
await new Promise(setImmediate);
assert.equal(adPositions.length, positionsBeforeBackground, 'a stale load cannot position the ad after backgrounding');
assert.equal(await actions.confirm(), false);
document.hidden = false;
parent.showModal();

const sharing = actions.confirm('要分享嗎？', '即將開啟分享選單。', '分享');
assert.equal(element('adult-confirm-submit').textContent, '分享');
submitConfirmation();
const confirmed = await sharing;
assert.equal(confirmed(), true);
parent.close();
parent.showModal();
assert.equal(confirmed(), false);
assert.equal(controls.hidden, true);
assert.equal(gate.open, false);
parent.close();

const iosDocument = createDocument();
const ios = (id) => iosDocument.querySelector(`#${id}`);
let finishAuthorization;
let finishPINSetup;
let lockRequests = 0;
let paperPreloads = 0;
const iosAdFormats = [];
const iosAdPositions = [];
const preferences = new Map();
iosDocument.defaultView.localStorage = {
  getItem: key => preferences.get(key),
  setItem: (key, value) => preferences.set(key, value),
};
let interstitialTestMode = 'store';
const modeChanges = [];
const iosStore = {
  ...store,
  async getState() {
    return {...await store.getState(), interstitialTestMode};
  },
  async setInterstitialTestMode({mode}) {
    modeChanges.push(mode);
    interstitialTestMode = mode;
    return {interstitialTestMode};
  },
  async addListener(event, listener) {
    return store.addListener(event, listener);
  },
  authorizeParent(...args) {
    assert.equal(args.length, 0);
    return new Promise((resolve) => { finishAuthorization = resolve; });
  },
  configureParentPIN(options) {
    assert.deepEqual(Object.keys(options), ['remove']);
    if (options.remove) return Promise.resolve({status: 'saved', hasPIN: false});
    return new Promise((resolve) => { finishPINSetup = resolve; });
  },
  async lockParent() { lockRequests++; },
};
setupAdultActions(iosDocument, {
  getPlatform: () => 'ios',
  isPluginAvailable: (name) => ['DrawingStore', 'PaperTestAds'].includes(name),
  Plugins: {DrawingStore: iosStore, PaperTestAds: {
    async preparePaperAd() { paperPreloads++; },
    async loadDrawingAd({format}) {
      return new Promise(resolve => iosAdFormats.push({format, resolve}));
    },
    async positionDrawingAd(position) { iosAdPositions.push(position); },
    async hideDrawingAd() {},
  }},
});
assert.equal(iosAdFormats[0].format, 'banner');
assert.equal(ios('drawing-test-ad').hidden, false);

const iosParent = ios('parent-dialog');
const iosSettings = ios('purchase-settings');
const iosControls = ios('purchase-controls');
iosParent.showModal();
const staleDevicePrompt = iosSettings.onclick();
iosParent.close();
iosParent.showModal();
finishAuthorization({status: 'authorized', hasPIN: false});
await staleDevicePrompt;
assert.equal(iosControls.hidden, true);
assert.equal(lockRequests, 1);

const devicePrompt = iosSettings.onclick();
assert.equal(iosControls.hidden, true);
finishAuthorization({status: 'authorized', hasPIN: false});
await devicePrompt;
assert.equal(iosControls.hidden, false);
assert.equal(ios('parent-pin-settings').hidden, false);
assert.equal(ios('interstitial-test-controls').hidden, false);
assert.equal(ios('drawing-ad-test-controls').hidden, false);
const formatSelect = ios('drawing-ad-test-format');
assert.equal(formatSelect.value, 'banner');
formatSelect.value = 'native';
formatSelect.dispatchEvent(new Event('change'));
assert.equal(iosAdFormats[1].format, 'native');
assert.deepEqual([...preferences.values()], ['native']);
iosAdFormats[0].resolve({status: 'loaded'});
await new Promise(setImmediate);
assert.deepEqual(iosAdPositions, [], 'discard the old format when its load completes late');
iosAdFormats[1].resolve({status: 'loaded'});
await new Promise(setImmediate);
assert.deepEqual(iosAdPositions, [{width: 0}], 'keep the ad detached while a dialog is open');
assert.equal(ios('drawing-test-ad').hidden, false);
const modeSelect = ios('interstitial-test-mode');
assert.equal(modeSelect.value, 'store');
activeEntitlement = 'purchased';
entitlementChanged({entitlement: activeEntitlement});
assert.equal(ios('remove-ads').disabled, true);
for (const mode of ['shown', 'removed', 'store']) {
  modeSelect.value = mode;
  await modeSelect.onchange();
  assert.equal(modeSelect.value, mode);
  assert.equal(ios('remove-ads').disabled, true);
}
assert.deepEqual(modeChanges, ['shown', 'removed', 'store']);
assert.equal(paperPreloads, 2);
const settingPIN = ios('parent-pin-settings').onclick();
finishPINSetup({status: 'saved', hasPIN: true});
await settingPIN;
assert.match(ios('parent-pin-settings').textContent, /更改/);
iosParent.close();

iosParent.showModal();
const wrongPIN = iosSettings.onclick();
finishAuthorization({status: 'invalidPIN'});
await wrongPIN;
assert.match(ios('parent-auth-status').textContent, /不正確/);
assert.equal(iosControls.hidden, true);

const correctPIN = iosSettings.onclick();
finishAuthorization({status: 'authorized', hasPIN: true});
await correctPIN;
assert.equal(iosControls.hidden, false);
assert.match(ios('parent-pin-settings').textContent, /更改/);
assert.equal(modeSelect.value, 'store');
assert.equal(formatSelect.value, 'native');
formatSelect.value = 'banner';
formatSelect.dispatchEvent(new Event('change'));
assert.equal(iosAdFormats[2].format, 'banner');
iosAdFormats[2].resolve({status: 'loaded'});
await new Promise(setImmediate);
const removingPIN = ios('parent-pin-remove').onclick();
submitConfirmation(ios);
await removingPIN;
assert.equal(ios('parent-pin-remove').hidden, true);
const tap = (type, clientX, clientY) => iosParent.dispatchEvent(Object.assign(
  new Event(type), {clientX, clientY}
));
tap('pointerdown', 10, 70);
tap('click', 10, 70);
assert.equal(iosParent.open, true, 'tapping inside the settings keeps it open');
tap('pointerdown', 10, 70);
tap('click', 10, 40);
assert.equal(iosParent.open, true, 'a gesture starting inside must not close the dialog');
tap('pointerdown', 10, 40);
tap('pointercancel', 10, 40);
tap('click', 10, 40);
assert.equal(iosParent.open, true, 'a cancelled backdrop press must not close the dialog');
const locksBeforeBackdrop = lockRequests;
tap('pointerdown', 10, 40);
tap('click', 10, 40);
assert.equal(iosParent.open, false);
assert.equal(iosControls.hidden, true);
assert.equal(lockRequests, locksBeforeBackdrop + 1);
iosDocument.notifyDialogChange();
assert.deepEqual(iosAdPositions.at(-1), {x: 8, y: 60, width: 300, height: 68, viewportWidth: 400});

console.log('PASS adult confirmations, iOS device/PIN bridge, closed sessions, price, pending purchase, ads and restore.');
