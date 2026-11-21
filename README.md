# 小小畫畫花園

Private, buildless tablet drawing/coloring app. Static ES modules in `dist/`; no server APIs, analytics, uploads or third-party assets. Original categorized SVG outline drawings plus blank canvas. Canvas coordinate system 1000×900, independent of viewport changes. Marker, crayon, soft/watercolor brush and eraser; line art is a separate protected overlay.

## Run and verify
`npm run check` runs JavaScript syntax validation. `npm test` runs the pure engine/pattern contracts. Preview: `python3 -m http.server 4185 --directory dist`. No dependency installation or compile step is required. Browser real-touch and iPad export tests are separate from code-level tests.

## iOS、iPadOS 與 Android App

App 透過 Capacitor 將 `dist/` 的畫布、線稿、動畫和音樂包進安裝檔。畫畫、點填色、動畫、收藏與暫存作品可離線使用。「大人幫手」可用系統分享選單匯出作品 PNG。App 和瀏覽器各自在本機保存作品與收藏。

### 本機建置

準備 Node.js 22 以上。iOS 和 iPadOS 使用 Xcode 26 以上。Android 使用 JDK 21 和 Android SDK 36。

```sh
npm ci
npm run check
npm test
npm run mobile:sync
npm run mobile:ios
```

在 Xcode 的 `App` 方案選擇 iPhone 或 iPad 模擬器執行。Android 可以用 `npm run mobile:android` 開啟，或從 `android/` 執行 `./gradlew :app:assembleDebug`。APK 路徑為 `android/app/build/outputs/apk/debug/app-debug.apk`。每次修改 `dist/` 後，先執行 `npm run mobile:sync` 再建置。

### 測試與上架

- 依恐龍練字島的做法，先用模擬器及實機確認直向、橫向、離線畫畫、填色、重新開啟畫作與匯出，再依平台打包。App 識別碼為 `tw.mic1201.littlecolorgarden`，目前版本為 `1.2.3`（Android build 22，iOS build 20）。
- iOS 以 App 專屬識別碼及開發者團隊在 Xcode Archive，檢查版本、圖示及隱私資訊後送 TestFlight。Android 的 `./gradlew :app:bundleRelease` 會產生 AAB；Play 測試與正式發行需使用本 App 的上傳金鑰簽署。
- 商店名稱、圖示、截圖、支援／隱私網址及年齡與資料揭露，應以本 App 的實際內容填寫。若以兒童為目標受眾，送審時依各商店的兒童 App 規範填報。

### 內購測試

- iOS 正式版無廣告。主角畫布、自由畫及五張線稿免費。其餘畫紙可用非消耗型商品 `unlock_all_boards` 一次解鎖。台灣定價 NT$60，畫面顯示 StoreKit 回傳的當地價格。點鎖定畫紙後選「請大人幫忙」，或在「大人幫手 → 畫板與購買」進入。購買與恢復都需要家長驗證。
- iOS 使用 Face ID、Touch ID 或裝置密碼進入家長購買區。家長可另設 6 位數 PIN。關閉大人區、App 進入背景或超過兩分鐘後，需重新驗證。使用 StoreKit 測試設定或 App Store Connect 沙盒驗證購買、等待核准、取消、恢復及撤銷。
- Android 正式版的所有畫紙免費。家長可從「大人幫手 → 廣告與購買」用一次性商品 `remove_interstitial_ads` 買斷換畫板時的全螢幕插播，台灣定價 NT$60，畫面使用 Google Play 回傳的價格。上方固定橫幅仍可顯示，舊商品 `remove_ads` 可恢復並移除兩種廣告。Play Billing 以本 App 的 Base64 RSA 授權公鑰驗證購買，請將公鑰設定為 Gradle 屬性 `playBillingPublicKey`，例如放在本機 `android/local.properties`。已驗證的買斷權益會暫存於裝置，重新連線後更新。

### 正式廣告配置

直向與橫向畫板上方都採用 320 × 50 固定橫幅。直向預留 68 點，橫向預留 60 點，畫布位於橫幅下方。Android 正式版從本機 Gradle 屬性讀取下列資料。

| 屬性 | 內容 |
| --- | --- |
| `admobAndroidAppId` | 正式 Android App `tw.mic1201.littlecolorgarden` 在 AdMob 的 App ID |
| `admobAndroidBannerId` | 同一個 AdMob App 的正式橫幅廣告單元 ID |
| `admobAndroidInterstitialId` | 同一個 AdMob App 的標準插播廣告單元 ID。留空時只顯示橫幅 |

將屬性放在本機的 `android/local.properties`。也可用 Gradle 屬性覆蓋本機設定。同步 Android 資源後用 `./gradlew :app:bundleRelease` 建置。有正式 App ID 及橫幅單元才會包含廣告 SDK。Gradle 會拒絕 Google 測試 ID、不同發布商的單元，或重複使用的單元。測試格式、模擬插播模式和 Google 官方測試單元由 Debug 版提供。Android 廣告請求採用兒童年齡處理及 G 級素材上限。插播僅在換畫板時顯示已預載的廣告，至少相隔三次換畫板及三分鐘。離線或尚無廣告時直接開啟下一張畫板。啟用插播前，在 AdMob 關閉高參與度廣告，使用標準廣告單元與適齡素材，並驗證廣告可在五秒內關閉。

AdMob 帳戶設定時，連結商店頁所列的開發者網站，將帳戶提供的 [app-ads.txt](app-ads.txt) 放到網站根目錄，完成 App 驗證及上架準備審查。Play Console 依這次提交的版本填寫含廣告、目標年齡及資料安全，並確認廣告來源符合 Families。

iOS 的正式 **App** 方案目前以無第三方廣告送驗。**AdMobTest** 用於確認版位和 StoreKit 流程。若正式 iOS 投放兒童向第三方廣告，送審前需取得該服務公開的適齡素材人工審查說明，驗證外連家長驗證和資料傳輸，再依實際版本填寫 App 隱私資訊。Kidoz 公開說明人工審查和 iOS 外連年齡關卡，列為後續候選。

- [AdMob 的 app-ads.txt 與 App 驗證](https://support.google.com/admob/answer/14538460)
- [Google Play Families 規範](https://support.google.com/googleplay/android-developer/answer/18265346)
- [Apple 兒童類別審查要求](https://developer.apple.com/app-store/review/#incomplete-information) · [Kidoz 素材政策](https://www.kidoz.net/privacy-policies)

### Android AdMob 測試

```sh
npm run mobile:sync -- android
cd android
./gradlew :app:assembleDebug -PadmobPaperTest=true -PadmobTestEntitlement=notPurchased
```

測試 APK 是 `android/app/build/outputs/apk/debug/app-debug.apk`，識別碼 `tw.mic1201.littlecolorgarden.adtest`。BlueStacks 可用側欄「APK」安裝，或開啟本機 ADB 後以 `adb install -r` 更新。首次預設固定測試橫幅。從「大人幫手 → 廣告與購買」可切換畫板上方格式，並選「模擬顯示」或「模擬已移除」全螢幕插播。測試模式只影響廣告行為。可在 `adb logcat -s LCGAdMobTest` 查詢廣告載入和顯示結果。

### iOS 測試

在專案根目錄執行 `npm run mobile:sync -- ios`，用 Xcode 開啟 `ios/App/App.xcodeproj`，選擇 iPhone 或 iPad 模擬器後執行。

- **App** 使用本機 `UnlockBoards.storekit` 測試 `unlock_all_boards`（NT$60）。依序測試免費畫板、上鎖提示、家長驗證、取消、購買、重開 App 及恢復購買。在 Xcode 27 的 Device Hub 使用「Device → Face ID」或「Device → Touch ID」模擬驗證。
- **AdMobTest** 是獨立的開發測試版，使用 `RemoveAds.storekit` 去廣告商品，以及 Google 官方插播與原生測試單元。預載成功後切換不同的畫板，應顯示全螢幕測試廣告。關閉後等下一則載入，再換一張畫板。買斷或恢復新商品後，再切換畫板確認不顯示插播。回到直向畫板，確認原生廣告仍可載入，載入時畫板位置不變。Xcode 主控台以 `LCGAdMobTest` 標示廣告結果。
- **AdMobTest** 在「大人幫手 → 廣告與購買 → 畫板上方廣告格式」可切換 Google 原生測試廣告或 320 × 50 固定測試橫幅。首次預設固定橫幅。兩種格式共用畫板上方的廣告列，重開 App 會保留上次選擇。
- **AdMobTest** 在「大人幫手 → 廣告與購買 → 全螢幕廣告測試」可模擬顯示插播、模擬已移除插播或依 StoreKit 購買狀態。重開 App 會回到 StoreKit 狀態。
- 實機測試時，選擇已配對的 iPhone 作為 Xcode 執行裝置，替 **AdMobTest** 選定開發簽署團隊，再直接從 Xcode 執行。測試付款請保留該次 Xcode 執行工作階段，以使用本機 StoreKit 設定。

### 1.1.0

- 點外層的筆圖示開啟工具選單，可選畫桶或畫筆。彩虹畫桶每次填色會抽出不同漸層。
- 圖案內塗色達到 97% 會解鎖動畫及寶箱。右上角可播放或暫停動畫，寶箱收藏可從右下角禮物按鈕拖到畫布。
- 動畫部位內的手繪筆跡會與線稿一起動，相連且延伸到背景的筆跡也會跟著動。暫停會回到原畫。

### 1.0.9 試用版

- App 開啟即全螢幕。畫布下方固定一套工具列，選筆與選色會開啟各自的選單。全螢幕開關在「大人幫手」，兩種顯示模式共用同一套工具。
- 按色圓可直接選八個單色或彩虹色。彩虹色可套用於畫筆和畫桶。若需要別的顏色，按「自訂顏色」開啟光譜，點一下或拖曳後放開手指套用。
- 🪣 切換自由點填色，先從調色盤選顏色。點線稿外的空白可填背景，自由畫的整張畫紙也可填色。數字、對應色與匯出圖上的數字已移除，既有暫存的填色模式會自動讀入。
- 三首配樂由 `scripts/compose-music.py` 的原創旋律和振盪器合成，音檔隨 App 安裝。App 開啟即循環播放，退到背景時暫停。瀏覽器限制自動播放時，會等第一次操作。
- 已逐張檢查選圖器的線稿。蝴蝶翅膀、彩虹與雲朵、長耳兔兔、大象耳朵和三角龍頭部等交界都重新接合。1.0.3 補回萬聖節兩個妹妹頭女孩的四隻手和手勢，調整三角龍頭盾和兔兔花園的紅蘿蔔。1.0.4 調整三角龍眼睛、鼻孔和嘴角，將萬聖節女孩的手簡化為封閉的圓形輪廓。1.0.5 重新接合三角龍鼻角，將萬聖節角落小幽靈的外形收成圓弧。1.0.6 移除新版三角龍的小鼻孔，保留鼻角。舊畫作仍可讀取原來的線稿與填色，重選同名的新畫紙可使用新線稿。

改動新版線稿後，用 `node scripts/render-fill-source.mjs <resvg-wasm 套件資料夾> --clean`，再執行 `python scripts/generate-clean-regions.py` 更新填色區域及 `python scripts/generate-paper-masks.py` 更新背景。建立背景前也需執行一次無 `--clean` 的原稿渲染。音樂重製使用 Python、NumPy 與 FFmpeg。

## Storage and safety
A single drawing is saved to this browser's localStorage under `little-color-garden-v1`. Saving can fail (quota/private mode); the interface reports this. It is not a durable gallery or cloud backup. Pattern changes and clearing require explicit confirmation. Parents can export an opaque selected-background PNG (white for older drawings) with protected outlines and all painted strokes; displayed preview also supports long-press Save Image when download is unsupported. No child name, image or drawing is sent to an API. Hosting still uses normal private Site access.

History uses stroke vectors; at most 1200 strokes, 120000 points total and fewer than15000 points per stroke. Beyond the drawing limit, the interface asks a parent to export and start a new drawing. A second finger is ignored while one pointer owns drawing. Cancel/blur/resize finalizes active stroke; resizing does not reset canvas. Each full stroke can be undone/redone. Clear/switch clears current history only after confirmation.

## Larger canvas and focus mode (V2)
Portrait tablets now place a compact tool strip below the canvas, with the pattern tray closed until requested. Canvas presentation fits its available frame without changing the saved 1000×900 vectors. `ResizeObserver` and visual viewport changes recompute display dimensions, not artwork. Fullscreen button requests native fullscreen only on a user click. If unavailable/denied, the same button opens a CSS viewport-sized 大畫布模式; browser chrome may remain visible. A persistent 返回 button, tool drawer toggle, and undo remain reachable. Browser native exit/Escape return to normal layout. Artwork and storage keys are unchanged.

`tests-viewport.mjs` covers size/coordinate mapping, unsupported/rejected/native fullscreen, native exit and rapid enter/exit races; it is a simulation, not a physical-device fullscreen or layout test.

## V3 玩樂畫筆
新增噴漆、沙畫顆粒、印章（星星／愛心／小花）、高光緞帶。點選目前畫筆即可開啟大按鈕畫筆選單，選完自動收合。印章支援點一下或拖曳連續蓋印；所有筆觸使用既有顏色與粗細。
粒子使用每筆固定 seed，重開／復原／匯出可重現同一效果。噴漆與沙畫每筆最多 700 個取樣點、印章 350 個，長筆跡會自動稀疏取樣以涵蓋整段。已完成筆跡快取到離屏畫布，手指移動時只重畫目前這一筆。原 version1 暫存及舊筆觸相容，沒有清空既有作品。
驗證：引擎、座標、全螢幕狀態、8筆觸點擊與拖曳、三種印章、固定seed重播、暫存往返及復原序列測試；四種新筆觸已以Canvas實際渲染檢視。此渲染不是瀏覽器畫面，未聲稱實體平板流暢度或手勢端到端測試。

## V4 選筆圖示、畫紙底色與分類圖案
選筆摘要圖示與名稱使用同一份選單資料，跟著8種工具與3種印章形狀更新。畫紙提供白、奶油黃、淺粉紅、天空藍、嫩綠、淡紫；只改底色，不變更筆跡及描邊。底色儲存在原version1文件的可選background欄位，舊文件預設白色。復原/重做包含本次操作的底色變更；重開後歷史以已存筆跡重建。橡皮擦仍擦除透明筆跡層，露出選定底色，PNG匯出先鋪同一底色。清空/換圖保留畫紙顏色。
六個圖案分類是海洋、動物、恐龍、水果、公主、交通工具；「全部」保留自由畫及原有小花/彩虹。切分類只是過濾預覽，不會清空目前畫作；真正換圖沿用確認流程。原有ID與線稿保留。
測試增加選筆摘要DOM更新、所有工具/印章的實際app事件模擬、底色保存/復原/匯出填色及分類不改畫作。未聲稱實體平板瀏覽器端到端驗證。

### 更多筆色
20種預設筆色放在獨立大按鈕選色視窗，另有系統調色器與彩虹筆色。調色器驗證六碼HEX；每筆記錄自己的solid色彩與可選rainbow旗標。切換後不影響既有筆跡；橡皮擦不受彩虹模式影響。畫紙底色與畫筆色分開。

## V5 圖示優先兒童介面
孩子操作區使用畫筆圖示、色塊、分類圖示及線稿縮圖，例行文字改為螢幕閱讀器隱藏標籤；家長區保留儲存與操作說明。換紙確認以目前畫作與新紙預覽、返回畫筆與換紙確認圖示呈現，同時保留完整無障礙警示。暫存失敗、還原問題或作品容量限制仍顯示可點擊的警告圖示，開啟家長說明，不會把重要警告藏起來。畫筆引擎、筆跡與儲存格式未變更。
`tests-icon-ui.mjs` 與 app 事件模擬涵蓋隱藏文字、語意標籤、圖示切換、圖像確認取消，以及暫存警告。實體平板與真實瀏覽器視覺驗證仍需另外進行。

## V6 數字畫與全螢幕選圖
每張原有描邊圖增加手工編排的數字／筆色對照，18 張都可切換；同張圖的同號固定同色，例如海龜各殼片同為綠色 1 號。點數字色塊選筆色後，仍用原有畫筆親手塗色，沒有自動填色或限制創作。細小眼睛、鬚線等裝飾不塞入數字。部分原圖為開放式線稿，數字模式用獨立圖層補上少量分界線，關閉後還原原有線稿。
數字開關在全螢幕按鈕旁邊，一般／大畫布模式同步。可選的 version1 文件欄位 `numbers` 保存開關；舊文件預設關閉。不改既有筆跡、底色與復原紀錄，橡皮擦不會擦除提示。空白紙暫不顯示提示，切回圖案會恢復選擇。匯出依目前顯示模式保留數字／輔助線，關閉數字後可匯出原有無數字成品。
全螢幕隱藏 footer 曾一併隱藏唯一選圖入口；新增常駐 🖼️ 按鈕與頂層 dialog 選圖器，正常模式也使用同一個可捲動縮圖選單。全螢幕根節點仍為 documentElement，所有 dialog 都在其內；換圖仍經原有保留／確認流程，取消不變動作品。
驗證：所有既有測試、數字圖案資料驗證、實際 app 事件模擬（切換不破壞筆跡、色碼、儲存、空白紙、全螢幕選圖及取消）與語法檢查。SVG 聯絡表有實際渲染檢視。此環境 local HTTP 預覽路徑拒絕連線，未聲稱實體平板／真瀏覽器全螢幕端到端測試。


## V7 點區塊填色
數字模式現在直接點一下封閉區塊，就用目前選定筆色填滿該區。數字／建議色只供參考，可用任何預設色、自訂色或固定彩虹漸層；再次點同區可換色，復原／重做支援填色。一般模式保留自由繪畫。空白／外部區域點擊不改作品。
18 張圖以線稿像素連通區預先產生 180 個封閉區域，包含彩虹與雲相交的 6 個額外小區塊；七個海龜殼片分開點選。微小眼睛或不足 200 像素／內切半徑小於 3 像素的細線碎片維持裝飾，不塞無法閱讀的數字。填色層與手繪筆跡層分離，歷史橡皮擦不會在新填色中挖洞；原有筆跡不會被覆蓋。新增可選 fills 欄位，舊 version1 暫存仍可還原，換圖清除填色也會先確認。
PNG 合併底色、填色、手繪與當前數字提示。關閉數字提示仍保留填色。11 組測試、語法檢查及獨立審查通過；填滿圖案 SVG/像素視覺驗證已進行。此環境預覽 HTTP 連線遭拒，未聲稱真實瀏覽器或實體平板端到端測試。

## V8 彩色鸚鵡
動物分類新增原創鸚鵡線稿與 16 個可點填色區。數字配色僅為建議，延用自由筆色、自訂色、彩虹及復原；全部共有 19 張圖案加空白紙、196 個封閉區域。舊圖與區域 ID 均不變。

## V9：整張白色畫紙都能畫

畫布現在覆蓋整個可見畫紙，不再只接受置中的 1000×900 範圍。圖案與舊筆跡仍使用原本座標，等比例置於加大的紙張中，左右／上下留白也能下筆。新增筆跡會擴展保存的紙張邊界；旋轉、開關全螢幕與工具列時等比例容納完整作品，不刪除邊緣筆跡。PNG 包含擴展後的作品及紙張。數字模式仍只填封閉圖案區域，一般畫畫模式可畫整張紙。

舊版 version 1 暫存可直接讀取；新增可選的 paper 邊界資料。畫面快取最多 2048px，PNG 最長邊最多 4096px，避免超寬紙張佔用過多記憶體。測試包含四邊下筆、負座標儲存、旋轉、復原／重做、填色座標、SVG 對齊與 1000 組尺寸邊界。另以真實 Canvas／SVG 渲染檢視橫直向；本環境預覽 HTTP 連線遭拒，未完成瀏覽器或實體平板 E2E。

## V10 場景畫紙、圓滾滾鸚鵡與輪廓修正

新增四張原創較豐富場景：兔兔花園、海底朋友、恐龍野餐、城堡花園，另提供圓頭大眼、有羽冠與腮紅的新版鸚鵡。新場景各有 24–33 個封閉區，新鸚鵡 18 區，皆支援建議數字及自由選色點填。新選圖器通常顯示 23 張圖（舊 18 張、四場景、新鸚鵡），加空白紙。舊鸚鵡保留原 ID、線稿和 16 區填色資料，以免已存作品套用到新幾何；只有載入舊鸚鵡作品時才顯示其舊版選項。

修正數字模式關閉後分界線變白：原本部分閉合分界線只放在數字提示圖層，隱藏提示後填色邊界留下白縫。現在所有原始輪廓及閉合分界線獨立保留，切換只隱藏數字，畫面、預覽及 PNG 使用一致輪廓。既有筆跡、填色、底色、儲存及復原不受影響。

14 組測試與語法檢查通過，涵蓋所有原有線稿/區域與舊鸚鵡存檔完全保留、所有新區塊有數字、填色後反覆切換提示、無數字 PNG 仍保有閉合輪廓。新圖實際 SVG 渲染與填色/數字聯絡表已檢視，並經獨立審查。本環境 HTTP 預覽連線拒絕，因此未完成真實瀏覽器或平板端到端驗證。

## V11 簡化萬聖節合照
新增原創向量著色圖：前景兩個小朋友，保留短髮、眼鏡、服裝輪廓與拍照手勢，後方萬聖節大樹、幽靈、小巫師和南瓜。省略店內文字、器具和細碎紋理，原始照片不包含於網站或備份。支援自由畫、建議數字配色及任選顏色點填，既有圖案和作品不變。
