"""Generate fill regions for revised artwork from render-fill-source.mjs --clean."""

from pathlib import Path
import json

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parent.parent
INPUT = Path('/tmp/lcg-clean-fill')
COLORS = ['#a8cbbb', '#e9bd70', '#e9a7b6', '#a4bee2', '#c6b5e5', '#e7ca9d', '#89bfca']


def scan(image):
    components, _ = label(np.asarray(image)[:, :, 3] < 32)
    exterior = set(np.unique(np.concatenate((components[0], components[-1], components[:, 0], components[:, -1]))))
    regions = []
    for component, box in enumerate(find_objects(components), 1):
        if component in exterior or box is None:
            continue
        mask = components[box] == component
        if np.count_nonzero(mask) < 200:
            continue
        distances = distance_transform_edt(np.pad(mask, 1))[1:-1, 1:-1]
        y, x = np.unravel_index(distances.argmax(), distances.shape)
        if distances[y, x] < 4:
            continue
        top, left = (axis.start for axis in box)
        spans = []
        for row, line in enumerate(mask):
            edges = np.flatnonzero(np.diff(np.pad(line.astype(np.int8), 1)))
            spans.extend([top + row, left + int(start), left + int(end)]
                         for start, end in zip(edges[::2], edges[1::2]))
        regions.append({
            'id': str(len(regions) + 1),
            'seeds': [[left + int(x), top + int(y)]],
            'bounds': [left, top, box[1].stop, box[0].stop],
            'spans': spans
        })
    return regions


def main():
    paths = sorted(INPUT.glob('*-clean.png'))
    if not paths:
        raise SystemExit('Run render-fill-source.mjs with --clean first.')
    result = {}
    contact = Image.new('RGB', (3 * 320, ((len(paths) + 2) // 3) * 320), '#f7f2e8')
    for i, path in enumerate(paths):
        outline = Image.open(path).convert('RGBA')
        regions = scan(outline)
        result[path.stem] = regions
        print(path.stem, len(regions), 'fillable regions')
        preview = Image.new('RGBA', outline.size, 'white')
        draw = ImageDraw.Draw(preview)
        for index, region in enumerate(regions):
            for y, left, right in region['spans']:
                draw.line((left, y, right - 1, y), fill=COLORS[index % len(COLORS)])
        preview.alpha_composite(outline)
        preview.thumbnail((308, 288))
        x, y = (i % 3) * 320, (i // 3) * 320
        contact.paste(preview, (x + 6, y + 22))
        ImageDraw.Draw(contact).text((x + 8, y + 5), path.stem, fill='#37424c')
    contact.save(INPUT / 'contact.png')
    data = json.dumps(result, separators=(',', ':'))
    (ROOT / 'dist/clean-fill-regions.js').write_text(
        '// Generated from the revised SVG outlines. Run scripts/generate-clean-regions.py to update.\n'
        f'export const cleanFillRegions = {data};\n')


if __name__ == '__main__':
    main()
