import assert from 'node:assert/strict';
import {setupAdultActions} from './dist/adult-actions.js';

class Element extends EventTarget {
  hidden = true;
  open = false;
  focus() {}
  showModal() { this.open = true; }
  close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
}

const elements = new Map();
const document = Object.assign(new EventTarget(), {
  hidden: false,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  },
});
const element = (id) => document.getElementById(id);
const parent = element('parent-dialog');
const gate = element('parent-gate');
const settings = element('purchase-settings');
const controls = element('purchase-controls');
const buy = element('remove-ads');
const restore = element('restore-purchases');
const status = element('purchase-status');
const adButton = element('show-test-ad');
const adStatus = element('test-ad-status');
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
  async addListener(event, listener) {
    assert.equal(event, 'entitlementChanged');
    entitlementChanged = listener;
  },
};
const ads = {
  async show() {
    adRequests++;
    return new Promise((resolve) => { finishAd = resolve; });
  },
  async hide() { adHides++; },
};
const actions = setupAdultActions(document, {
  isPluginAvailable: (name) => ['DrawingStore', 'ParentTestAds'].includes(name),
  Plugins: {DrawingStore: store, ParentTestAds: ads},
});

function submitAnswer(correct) {
  const numbers = element('parent-gate-question').textContent.match(/\d+/g).map(Number);
  const total = correct ? numbers[0] + numbers[1] : 1;
  element('parent-gate-answer').value = String(total).replace(/\d/g, (digit) => '０１２３４５６７８９'[digit]);
  element('parent-gate-form').onsubmit(new Event('submit', {cancelable: true}));
}

assert.equal(await actions.confirm(), false);
parent.showModal();
const cancelled = settings.onclick();
assert.equal(gate.open, true);
submitAnswer(false);
assert.match(element('parent-gate-status').textContent, /答案不符/);
assert.equal(controls.hidden, true);
element('parent-gate-cancel').onclick();
await cancelled;
assert.equal(storeReads, 0);
await adButton.onclick();
assert.equal(adRequests, 0);

const opening = settings.onclick();
submitAnswer(true);
await opening;
assert.equal(controls.hidden, false);
assert.equal(buy.disabled, false);
assert.match(buy.textContent, /NT\$60/);
const requestingAd = adButton.onclick();
await adButton.onclick();
assert.equal(adRequests, 1);
finishAd({status: 'unavailable'});
await requestingAd;
assert.equal(adStatus.hidden, false);
const showingAd = adButton.onclick();
const hidesBeforePurchase = adHides;
const buying = buy.onclick();
assert(adHides > hidesBeforePurchase);
finishAd({status: 'cancelled'});
await showingAd;
await buy.onclick();
await restore.onclick();
assert.equal(purchases, 1);
finishPurchase({entitlement: 'pending'});
await buying;
assert.equal(buy.disabled, true);
assert.match(status.textContent, /等待/);
assert.equal(adButton.hidden, true);
const hidesBeforeEntitlement = adHides;
entitlementChanged({entitlement: 'purchased'});
assert.match(status.textContent, /已永久移除/);
assert(adHides > hidesBeforeEntitlement);
await adButton.onclick();
assert.equal(adRequests, 2);

document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
assert.equal(controls.hidden, true);
await restore.onclick();
assert.equal(await actions.confirm(), false);
document.hidden = false;
activeEntitlement = 'purchased';
const reopening = settings.onclick();
submitAnswer(true);
await reopening;
assert.equal(buy.disabled, true);
activeEntitlement = 'notPurchased';
await restore.onclick();
assert.equal(buy.disabled, false);
const backgroundAd = adButton.onclick();
const hidesBeforeBackground = adHides;
document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
assert(adHides > hidesBeforeBackground);
finishAd({status: 'unavailable'});
await backgroundAd;
assert.equal(adStatus.hidden, true);
document.hidden = false;

const sharing = actions.confirm();
submitAnswer(true);
const confirmed = await sharing;
assert.equal(confirmed(), true);
parent.close();
parent.showModal();
assert.equal(confirmed(), false);
assert.equal(controls.hidden, true);
assert.equal(gate.open, false);
console.log('PASS adult gate, cancelled and backgrounded flows, store price, duplicate purchase guard, pending purchase and restore.');
