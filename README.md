# 小小畫畫花園

Private, buildless tablet drawing/coloring app. Static ES modules in `dist/`; no server APIs, analytics, uploads or third-party assets. Original categorized SVG outline drawings plus blank canvas. Canvas coordinate system 1000×900, independent of viewport changes. Marker, crayon, soft/watercolor brush and eraser; line art is a separate protected overlay.

## Run and verify
`npm run check` runs JavaScript syntax validation. `npm test` runs the pure engine/pattern contracts. Preview: `python3 -m http.server 4185 --directory dist`. No dependency installation or compile step is required. Browser real-touch and iPad export tests are separate from code-level tests.

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
