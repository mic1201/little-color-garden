// Developer-only region source renderer. Pass the installed @resvg/resvg-wasm path.
import {patterns,svgMarkup} from '../dist/patterns.js';
import {getNumberGuide} from '../dist/number-patterns.js';
import fs from 'node:fs';

const [root,mode] = process.argv.slice(2);
const {Resvg,initWasm} = await import(root + '/index.mjs');
await initWasm(fs.readFileSync(root + '/index_bg.wasm'));
const clean = mode === '--clean';
const target = clean ? '/tmp/lcg-clean-fill' : '/tmp/lcg-fill';
fs.mkdirSync(target, {recursive: true});
for (const pattern of patterns) {
  if (pattern.id === 'blank' || pattern.id.endsWith('-clean') !== clean) continue;
  const guide = getNumberGuide(pattern.id);
  const svg = clean ? svgMarkup(pattern.id) : svgMarkup(pattern.id).replace(
    '</svg>', `<g fill="none" stroke="#37424c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${guide.extraShapes}</g></svg>`);
  fs.writeFileSync(`${target}/${pattern.id}.png`, new Resvg(svg).render().asPng());
  if (!clean) fs.writeFileSync(`${target}/${pattern.id}.json`, JSON.stringify(guide));
}
