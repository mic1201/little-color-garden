"""Build background masks from the same outlines used for the coloring regions."""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parent.parent


def paper_mask(image):
    faces, _ = label(np.asarray(image.convert('RGBA'))[:, :, 3] < 32)
    border = np.concatenate((faces[0], faces[-1], faces[:, 0], faces[:, -1]))
    outside = np.setdiff1d(np.unique(border), [0])
    blocked = ~np.isin(faces, outside)
    occupied_rows = np.flatnonzero(blocked.any(axis=1))
    start, end = int(occupied_rows[0]), int(occupied_rows[-1]) + 1
    rows = [np.flatnonzero(np.diff(np.pad(row.astype(np.int8), 1))).tolist()
            for row in blocked[start:end]]
    return [start, rows]


def main():
    masks = {}
    for directory in ('/tmp/lcg-fill', '/tmp/lcg-clean-fill'):
        for file in sorted(Path(directory).glob('*.png')):
            if file.stem == 'contact':
                continue
            with Image.open(file) as image:
                masks[file.stem] = paper_mask(image)
    data = json.dumps(masks, separators=(',', ':'))
    (ROOT / 'dist/paper-masks.js').write_text(
        '// Generated from the original and revised line art by scripts/generate-paper-masks.py.\n'
        f'export const paperMasks = {data};\n')
    print(f'Generated {len(masks)} paper masks.')


if __name__ == '__main__':
    main()
