const PURCHASE_STATUS = {
  purchased: '廣告已永久移除。',
  notPurchased: '此商店帳號沒有去廣告權益。',
  pending: '購買等待付款或核准，完成後會自動更新。',
  cancelled: '已取消。',
  unavailable: '商店暫時無法使用，請稍後再試。',
};

async function getStoreState(store) {
  let timer;
  try {
    return await Promise.race([
      store.getState(),
      new Promise((_, reject) => { timer = setTimeout(reject, 15_000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function setupAdultActions(document, capacitor) {
  const byId = (id) => document.getElementById(id);
  const parent = byId('parent-dialog');
  const gate = byId('parent-gate');
  const answer = byId('parent-gate-answer');
  const question = byId('parent-gate-question');
  const gateStatus = byId('parent-gate-status');
  const settings = byId('purchase-settings');
  const controls = byId('purchase-controls');
  const buy = byId('remove-ads');
  const restore = byId('restore-purchases');
  const purchaseStatus = byId('purchase-status');
  const adButton = byId('show-test-ad');
  const adStatus = byId('test-ad-status');
  const store = capacitor.isPluginAvailable('DrawingStore') ? capacitor.Plugins.DrawingStore : null;
  const testAds = capacitor.isPluginAvailable('ParentTestAds') ? capacitor.Plugins.ParentTestAds : null;
  let resolveGate;
  let expectedAnswer;
  let gateTimer;
  let settingsTimer;
  let busy = false;
  let loadingAd = false;
  let price;
  let entitlement = 'unknown';
  let parentSession = 0;

  function newQuestion(message = '') {
    const first = 12 + Math.floor(Math.random() * 30);
    const second = 17 + Math.floor(Math.random() * 30);
    expectedAnswer = first + second;
    question.textContent = `請輸入 ${first} ＋ ${second} 的答案。`;
    answer.value = '';
    gateStatus.textContent = message;
  }

  function finishGate(allowed) {
    const resolve = resolveGate;
    const session = parentSession;
    resolveGate = undefined;
    clearTimeout(gateTimer);
    if (gate.open) gate.close();
    resolve?.(allowed && (() => session === parentSession && parent.open && !document.hidden));
  }

  function confirm() {
    if (!parent.open || document.hidden || resolveGate) return Promise.resolve(false);
    newQuestion();
    gate.showModal();
    answer.focus();
    return new Promise((resolve) => {
      resolveGate = resolve;
      gateTimer = setTimeout(() => finishGate(false), 60_000);
    });
  }

  function renderPurchaseControls() {
    buy.disabled = busy || !price || entitlement === 'purchased' || entitlement === 'pending';
    restore.disabled = busy;
    buy.textContent = price && entitlement !== 'purchased' ? `永久移除廣告 ${price}` : '永久移除廣告';
    adButton.hidden = !testAds || entitlement === 'purchased' || entitlement === 'pending';
    adButton.disabled = busy || loadingAd;
  }

  function hideAd() {
    adStatus.hidden = true;
    testAds?.hide().catch(() => {});
  }

  function updateEntitlement(state) {
    if (['purchased', 'notPurchased', 'pending', 'unknown'].includes(state)) {
      entitlement = state;
    }
    if (entitlement === 'purchased' || entitlement === 'pending') hideAd();
    renderPurchaseControls();
  }

  function closeControls() {
    parentSession++;
    finishGate(false);
    clearTimeout(settingsTimer);
    controls.hidden = true;
    settings.hidden = !store;
    hideAd();
  }

  async function runStoreAction(action) {
    if (busy || controls.hidden || !parent.open || document.hidden) return;
    busy = true;
    if (action !== 'getState') hideAd();
    renderPurchaseControls();
    try {
      const result = await (action === 'getState' ? getStoreState(store) : store[action]());
      if (action === 'getState') price = result.price;
      updateEntitlement(result.entitlement);
      purchaseStatus.textContent = PURCHASE_STATUS[result.status ?? result.entitlement]
        ?? (price ? '' : PURCHASE_STATUS.unavailable);
    } catch {
      if (action === 'getState') price = undefined;
      purchaseStatus.textContent = PURCHASE_STATUS.unavailable;
    } finally {
      busy = false;
      renderPurchaseControls();
    }
  }

  byId('parent-gate-form').onsubmit = (event) => {
    event.preventDefault();
    if (!resolveGate) return;
    if (Number(answer.value.normalize('NFKC')) === expectedAnswer) {
      finishGate(true);
    } else {
      newQuestion('答案不符，請大人再試一次。');
      answer.focus();
    }
  };
  byId('parent-gate-cancel').onclick = () => finishGate(false);
  gate.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishGate(false);
  });
  parent.addEventListener('close', closeControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeControls();
  });

  if (store) {
    byId('purchase-privacy').hidden = false;
    settings.hidden = false;
    settings.onclick = async () => {
      if (busy) return;
      const confirmed = await confirm();
      if (!confirmed || !confirmed()) return;
      controls.hidden = false;
      settings.hidden = true;
      settingsTimer = setTimeout(closeControls, 120_000);
      purchaseStatus.textContent = '正在連線到商店…';
      await runStoreAction('getState');
    };
    buy.onclick = () => runStoreAction('purchase');
    restore.onclick = () => runStoreAction('restore');
    store.addListener('entitlementChanged', ({entitlement: state}) => {
      updateEntitlement(state);
      if (!busy && !controls.hidden) purchaseStatus.textContent = PURCHASE_STATUS[state] ?? '';
    }).catch(() => {});
  }
  if (testAds) {
    byId('test-ads-privacy').hidden = false;
    adButton.onclick = async () => {
      if (busy || loadingAd || adButton.hidden || controls.hidden || !parent.open || document.hidden) return;
      const session = parentSession;
      loadingAd = true;
      adStatus.hidden = true;
      renderPurchaseControls();
      let status = 'unavailable';
      try {
        ({status} = await testAds.show());
      } catch {
        // The drawing app stays usable when the ad SDK cannot load.
      } finally {
        loadingAd = false;
        renderPurchaseControls();
      }
      if (status === 'unavailable' && session === parentSession && !controls.hidden && !adButton.hidden) {
        adStatus.textContent = '目前無法顯示測試廣告。請確認網路與去廣告權益測試設定。';
        adStatus.hidden = false;
      }
    };
  }
  return {confirm};
}
