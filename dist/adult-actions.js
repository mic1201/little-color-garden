const PURCHASE_STATUS = {
  purchased: '全螢幕廣告已永久移除。',
  legacyPurchased: '廣告已永久移除。',
  notPurchased: '此商店帳號沒有移除廣告的購買紀錄。',
  pending: '購買等待付款或核准，完成後會自動更新。',
  cancelled: '已取消。',
  unavailable: '商店暫時無法使用，請稍後再試。',
};

const PARENT_AUTH_STATUS = {
  invalidPIN: '家長 PIN 不正確，請再試一次。',
  locked: '輸入錯誤次數過多，請稍後再試。',
  passcodeNotSet: '請先由大人到裝置的「設定」啟用解鎖密碼。',
  unavailable: '目前無法完成家長驗證，請稍後再試。',
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

function setupDrawingAd(document, ads, compareFormats, defaultFormat) {
  const view = document.defaultView;
  if (!view || !ads?.loadDrawingAd) return () => {};

  const slot = document.querySelector('#drawing-test-ad');
  const formatSelect = compareFormats ? document.querySelector('#drawing-ad-test-format') : null;
  const formatPreference = 'lcg-drawing-test-ad-format';
  let format = defaultFormat;
  if (formatSelect) {
    try {
      if (view.localStorage?.getItem(formatPreference) === 'native') format = 'native';
    } catch {
      // The comparison still works without local storage.
    }
    formatSelect.value = format;
  }
  let request;
  let loaded = false;
  let legacyOwned = false;
  let lastPosition;

  function positionAd() {
    if (!loaded) return;
    const {left, top, width, height} = slot.getBoundingClientRect();
    // The native ad sits above the WebView, so dialog stacking does not hide it automatically.
    const visible = width > 0 && height > 0 && !document.querySelector('dialog[open]');
    const position = visible
      ? {x: left, y: top, width, height, viewportWidth: view.innerWidth}
      : {width: 0};
    const key = JSON.stringify(position);
    if (key === lastPosition) return;
    lastPosition = key;
    ads.positionDrawingAd(position).catch(() => {});
  }

  async function syncAd(replace = false) {
    if (document.hidden || view.navigator.onLine === false || legacyOwned) {
      if (request) {
        request = undefined;
        loaded = false;
        lastPosition = undefined;
        ads.hideDrawingAd().catch(() => {});
      }
      return;
    }
    if (request && replace !== true) return;
    loaded = false;
    lastPosition = undefined;
    const loading = ads.loadDrawingAd({format});
    request = loading;
    const result = await loading.catch(() => null);
    if (request !== loading || result?.status !== 'loaded') return;
    loaded = true;
    positionAd();
  }

  formatSelect?.addEventListener('change', () => {
    if (formatSelect.value === format) return;
    format = formatSelect.value;
    try {
      view.localStorage?.setItem(formatPreference, format);
    } catch {
      // Keep the new format for the current session.
    }
    syncAd(true);
  });

  // Reserve the banner row before requesting an ad so the canvas never shifts when it loads.
  slot.hidden = false;
  slot.parentElement?.classList.add('has-drawing-ad');
  const sizeObserver = new view.ResizeObserver(positionAd);
  sizeObserver.observe(slot);
  const dialogObserver = new view.MutationObserver(positionAd);
  dialogObserver.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['open']});
  view.addEventListener('resize', positionAd);
  view.addEventListener('online', syncAd);
  view.addEventListener('offline', syncAd);
  document.addEventListener('visibilitychange', syncAd);
  syncAd();

  return (state) => {
    if (state === 'unknown') return;
    const hadLegacy = legacyOwned;
    legacyOwned = state === 'legacyPurchased';
    if (hadLegacy !== legacyOwned) syncAd();
  };
}

export function setupAdultActions(document, capacitor, onBoardAccessChanged) {
  const byId = (id) => document.querySelector(`#${id}`);
  const parent = byId('parent-dialog');
  const dialog = byId('adult-confirm');
  const dialogTitle = byId('adult-confirm-title');
  const dialogMessage = byId('adult-confirm-message');
  const submit = byId('adult-confirm-submit');
  const cancel = byId('adult-confirm-cancel');
  const settings = byId('purchase-settings');
  const authStatus = byId('parent-auth-status');
  const controls = byId('purchase-controls');
  const pinSettings = byId('parent-pin-settings');
  const pinRemove = byId('parent-pin-remove');
  const buy = byId('remove-ads');
  const restore = byId('restore-purchases');
  const purchaseStatus = byId('purchase-status');
  const interstitialControls = byId('interstitial-test-controls');
  const interstitialSelect = byId('interstitial-test-mode');
  const interstitialStatus = byId('interstitial-test-status');
  const store = capacitor?.isPluginAvailable('DrawingStore') ? capacitor.Plugins.DrawingStore : null;
  const legacyTestAds = ['PaperTestAds', 'ParentTestAds']
    .map(name => capacitor?.isPluginAvailable(name) ? capacitor.Plugins[name] : null)
    .find(Boolean);
  const androidAds = capacitor?.isPluginAvailable('DrawingAds') ? capacitor.Plugins.DrawingAds : null;
  const ads = androidAds ?? legacyTestAds;
  const deviceAuth = capacitor?.getPlatform?.() === 'ios';
  byId('ios-privacy-policy').hidden = !deviceAuth;
  const androidTest = androidAds && capacitor.isPluginAvailable('LocalTestTools');
  const canUseAdTests = store && (androidTest || (deviceAuth && capacitor.isPluginAvailable('PaperTestAds')));
  const boardStore = Boolean(store && deviceAuth && !legacyTestAds);
  const statusMessages = boardStore ? {
    ...PURCHASE_STATUS,
    purchased: '所有畫板已解鎖。',
    notPurchased: '此 Apple 帳號沒有解鎖畫板的購買紀錄。',
  } : PURCHASE_STATUS;
  const interstitialTestControls = androidTest ? androidAds : store;
  const updateDrawingAd = setupDrawingAd(document, ads, canUseAdTests,
    androidAds || canUseAdTests ? 'banner' : 'native');
  const drawingFormatControls = byId('drawing-ad-test-controls');
  const drawingFormatSelect = byId('drawing-ad-test-format');
  let resolvePrompt;
  let promptTimer;
  let settingsTimer;
  let openingSettings = false;
  let busy = false;
  let hasPIN = false;
  let price;
  let entitlement = 'unknown';
  let interstitialMode = 'store';
  let parentSession = 0;
  let pressedBackdrop = false;

  function isParentBackdrop(event) {
    if (event.target !== parent) return false;
    const {left, top, right, bottom} = parent.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
  }

  function isCurrent(session) {
    return session === parentSession && parent.open && !document.hidden;
  }

  function finishPrompt(value = false) {
    const resolve = resolvePrompt;
    resolvePrompt = undefined;
    clearTimeout(promptTimer);
    if (dialog.open) dialog.close();
    resolve?.(value);
  }

  function prompt(title, message, button) {
    if (!isCurrent(parentSession) || resolvePrompt) return Promise.resolve(false);
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    submit.textContent = button;
    dialog.showModal();
    cancel.focus();
    return new Promise((resolve) => {
      resolvePrompt = resolve;
      promptTimer = setTimeout(finishPrompt, 60_000);
    });
  }

  async function confirm(title, message, button) {
    const session = parentSession;
    if (!await prompt(title, message, button)) return false;
    return () => isCurrent(session);
  }

  async function authorizePurchase(session) {
    if (!deviceAuth) {
      return prompt('開啟廣告與購買？', '請由大人操作購買或恢復購買。', '繼續');
    }
    try {
      const result = await store.authorizeParent();
      if (!isCurrent(session)) return false;
      if (result.status === 'authorized') {
        hasPIN = result.hasPIN;
        return true;
      }
      authStatus.textContent = PARENT_AUTH_STATUS[result.status] ?? '';
    } catch {
      if (isCurrent(session)) authStatus.textContent = PARENT_AUTH_STATUS.unavailable;
    }
    return false;
  }

  function renderPurchaseControls() {
    const purchased = entitlement === 'purchased' || entitlement === 'legacyPurchased';
    buy.disabled = busy || !price || purchased || entitlement === 'pending';
    restore.disabled = busy;
    const productName = boardStore ? '解鎖所有畫板' : '永久移除全螢幕廣告';
    buy.textContent = boardStore && purchased ? '已解鎖所有畫板' : price && !purchased ? `${productName} ${price}` : productName;
    byId('purchase-scope').hidden = entitlement === 'legacyPurchased';
    pinSettings.hidden = !deviceAuth;
    pinSettings.disabled = busy;
    pinSettings.textContent = hasPIN ? '更改家長 PIN' : '設定家長 PIN';
    pinRemove.hidden = !deviceAuth || !hasPIN;
    pinRemove.disabled = busy;
    drawingFormatControls.hidden = !canUseAdTests;
    drawingFormatSelect.disabled = busy;
    interstitialControls.hidden = !canUseAdTests;
    interstitialSelect.disabled = busy;
    interstitialSelect.value = interstitialMode;
  }

  function updateEntitlement(state) {
    if (['purchased', 'legacyPurchased', 'notPurchased', 'pending', 'unknown'].includes(state)) {
      const accessChanged = (entitlement === 'purchased') !== (state === 'purchased');
      entitlement = state;
      if (boardStore && accessChanged) onBoardAccessChanged?.();
    }
    updateDrawingAd(entitlement);
    renderPurchaseControls();
  }

  function closeControls() {
    pressedBackdrop = false;
    parentSession++;
    finishPrompt();
    clearTimeout(settingsTimer);
    controls.hidden = true;
    settings.hidden = !store;
    authStatus.textContent = '';
    if (store && deviceAuth) store.lockParent().catch(() => {});
  }

  async function updatePIN(remove) {
    const session = parentSession;
    if (busy || controls.hidden || !isCurrent(session)) return;
    if (remove && !await prompt('改用裝置驗證？', '移除家長 PIN 後，能解鎖這台裝置的人也能開啟購買選項。', '改用裝置驗證')) return;
    if (busy || controls.hidden || !isCurrent(session)) return;
    busy = true;
    renderPurchaseControls();
    try {
      const result = await store.configureParentPIN({remove});
      if (!isCurrent(session)) return;
      if (result.status === 'saved') {
        hasPIN = result.hasPIN;
        authStatus.textContent = hasPIN ? '家長 PIN 已儲存。' : '已改用裝置驗證。';
      } else if (result.status !== 'cancelled') authStatus.textContent = PARENT_AUTH_STATUS.unavailable;
    } catch {
      if (isCurrent(session)) authStatus.textContent = PARENT_AUTH_STATUS.unavailable;
    } finally {
      busy = false;
      renderPurchaseControls();
    }
  }

  async function changeInterstitialMode() {
    const session = parentSession;
    if (busy || controls.hidden || !isCurrent(session)) return;
    const mode = interstitialSelect.value;
    busy = true;
    renderPurchaseControls();
    interstitialSelect.value = mode;
    try {
      const result = await interstitialTestControls.setInterstitialTestMode({mode});
      if (result.interstitialTestMode !== mode) throw new Error('Test mode was not set');
      interstitialMode = mode;
      if (mode !== 'removed') ads.preparePaperAd().catch(() => {});
      if (isCurrent(session)) interstitialStatus.textContent = '已切換。回到畫布換一張不同的畫板即可測試。';
    } catch {
      if (isCurrent(session)) interstitialStatus.textContent = '無法切換，請重新開啟廣告與購買。';
    } finally {
      busy = false;
      renderPurchaseControls();
    }
  }

  async function runStoreAction(action) {
    if (busy || controls.hidden || !parent.open || document.hidden) return;
    busy = true;
    renderPurchaseControls();
    try {
      const result = await (action === 'getState' ? getStoreState(store) : store[action]());
      if (action === 'getState') {
        price = result.price;
        const mode = androidTest
          ? await androidAds.getInterstitialTestMode().catch(() => null)
          : result;
        if (canUseAdTests && mode?.interstitialTestMode) interstitialMode = mode.interstitialTestMode;
      }
      updateEntitlement(result.entitlement);
      const status = result.status ?? (boardStore && action === 'getState' && result.entitlement === 'notPurchased' ? undefined : result.entitlement);
      purchaseStatus.textContent = statusMessages[status] ?? (price ? '' : statusMessages.unavailable);
    } catch {
      if (action === 'getState') price = undefined;
      purchaseStatus.textContent = statusMessages.unavailable;
    } finally {
      busy = false;
      renderPurchaseControls();
    }
  }

  byId('adult-confirm-form').onsubmit = (event) => {
    event.preventDefault();
    finishPrompt(true);
  };
  cancel.onclick = () => finishPrompt();
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishPrompt();
  });
  // A modal retargets backdrop taps to the dialog itself, including touch clicks.
  parent.addEventListener('pointerdown', (event) => {
    pressedBackdrop = isParentBackdrop(event);
  });
  parent.addEventListener('pointercancel', () => { pressedBackdrop = false; });
  parent.addEventListener('click', (event) => {
    const dismiss = pressedBackdrop && isParentBackdrop(event);
    pressedBackdrop = false;
    if (dismiss && parent.open) parent.close();
  });
  parent.addEventListener('close', closeControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeControls();
  });

  async function openPurchaseSettings() {
    const session = parentSession;
    if (busy || openingSettings || !controls.hidden || !isCurrent(session)) return;
    openingSettings = true;
    authStatus.textContent = '';
    interstitialStatus.textContent = '';
    try {
      if (!await authorizePurchase(session) || !isCurrent(session)) return;
      controls.hidden = false;
      settings.hidden = true;
      settingsTimer = setTimeout(closeControls, 120_000);
      purchaseStatus.textContent = '正在連線到商店…';
      if (boardStore) controls.scrollIntoView?.({block: 'nearest'});
      await runStoreAction('getState');
    } finally {
      openingSettings = false;
    }
  }

  if (store) {
    const purchasePrivacy = byId('purchase-privacy');
    purchasePrivacy.hidden = false;
    settings.hidden = false;
    if (boardStore) {
      settings.textContent = '畫板與購買';
      controls.setAttribute('aria-label', '畫板與購買');
      byId('purchase-scope').textContent = '一次購買，永久解鎖所有畫板。';
      purchasePrivacy.textContent = '家長可以在「畫板與購買」購買或恢復購買。Apple 處理付款，App 使用商店回傳的交易資訊確認畫板解鎖權益。';
    }
    settings.onclick = openPurchaseSettings;
    buy.onclick = () => runStoreAction('purchase');
    restore.onclick = () => runStoreAction('restore');
    if (canUseAdTests) interstitialSelect.onchange = changeInterstitialMode;
    pinSettings.onclick = () => updatePIN(false);
    pinRemove.onclick = () => updatePIN(true);
    const entitlementListener = store.addListener('entitlementChanged', ({entitlement: state}) => {
      updateEntitlement(state);
      if (!busy && !controls.hidden) purchaseStatus.textContent = boardStore && state === 'notPurchased' ? '' : statusMessages[state] ?? '';
    });
    Promise.resolve(entitlementListener).catch(() => {});
    if (boardStore) {
      store.getBoardAccess().then(({entitlement: state}) => {
        if (entitlement === 'unknown') updateEntitlement(state);
      }).catch(() => {});
    }
  }
  if (legacyTestAds || androidTest) byId('test-ads-privacy').hidden = false;
  if (androidAds && !androidTest) byId('live-ads-privacy').hidden = false;
  return {
    confirm,
    hasLockedBoards: () => boardStore && entitlement !== 'purchased',
    openBoardPurchase() {
      if (!boardStore) return;
      if (!parent.open) parent.showModal();
      settings.scrollIntoView?.({block: 'nearest'});
      return openPurchaseSettings();
    },
  };
}
