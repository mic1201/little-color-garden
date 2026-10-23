# 小小畫畫花園

Private, buildless tablet drawing/coloring app. Static ES modules in `dist/`; no server APIs, analytics, uploads or third-party assets. Six original SVG outline drawings plus blank canvas. Canvas coordinate system 1000×900, independent of viewport changes. Marker, crayon, soft/watercolor brush and eraser; line art is a separate protected overlay.

## Run and verify
`npm run check` runs JavaScript syntax validation. `npm test` runs the pure engine/pattern contracts. Preview: `python3 -m http.server 4185 --directory dist`. No dependency installation or compile step is required. Browser real-touch and iPad export tests are separate from code-level tests.

## Storage and safety
A single drawing is saved to this browser's localStorage under `little-color-garden-v1`. Saving can fail (quota/private mode); the interface reports this. It is not a durable gallery or cloud backup. Pattern changes and clearing require explicit confirmation. Parents can export an opaque white-background PNG with protected outlines and all painted strokes; displayed preview also supports long-press Save Image when download is unsupported. No child name, image or drawing is sent to an API. Hosting still uses normal private Site access.

History uses stroke vectors; at most 1200 strokes, 120000 points total and fewer than15000 points per stroke. Beyond the drawing limit, the interface asks a parent to export and start a new drawing. A second finger is ignored while one pointer owns drawing. Cancel/blur/resize finalizes active stroke; resizing does not reset canvas. Each full stroke can be undone/redone. Clear/switch clears current history only after confirmation.

## Larger canvas and focus mode (V2)
Portrait tablets now place a compact tool strip below the canvas, with the pattern tray closed until requested. Canvas presentation fits its available frame without changing the saved 1000×900 vectors. `ResizeObserver` and visual viewport changes recompute display dimensions, not artwork. Fullscreen button requests native fullscreen only on a user click. If unavailable/denied, the same button opens a CSS viewport-sized 大畫布模式; browser chrome may remain visible. A persistent 返回 button, tool drawer toggle, and undo remain reachable. Browser native exit/Escape return to normal layout. Artwork and storage keys are unchanged.

`tests-viewport.mjs` covers size/coordinate mapping, unsupported/rejected/native fullscreen, native exit and rapid enter/exit races; it is a simulation, not a physical-device fullscreen or layout test.
