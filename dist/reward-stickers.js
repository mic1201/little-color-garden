const pink = '#ff84ad';
const blue = '#7bddeb';
const gold = '#ffda69';
const peach = '#ffac77';
const violet = '#b6a0f1';
const green = '#9bdb91';
const mint = '#6bcfbb';
const cream = '#fff5d8';
const berry = '#ee6680';

const path = (d, fill = 'none') => `<path d="${d}" fill="${fill}"/>`;
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const ellipse = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const heart = 'M32 53C27 49 7 36 7 23C7 12 22 8 32 20C42 8 57 12 57 23C57 36 37 49 32 53Z';
const star = 'M32 5L40 22L59 25L45 38L48 57L32 48L16 57L19 38L5 25L24 22Z';

export const stickers = [
  ['bow', '蝴蝶結', path('M29 26Q8 8 6 22L6 45Q8 56 29 38M35 26Q56 8 58 22L58 45Q56 56 35 38', pink)+circle(32,32,8,berry)],
  ['crown', '皇冠', path('M6 17L20 28L32 9L44 28L58 17L52 50H12Z',gold)+circle(32,37,5,pink)],
  ['hat', '小禮帽', path('M17 42L20 12Q32 7 44 12L47 42Z',violet)+path('M18 33H46L47 42H17Z',pink)+ellipse(32,47,26,7,violet)],
  ['party', '派對帽', path('M12 52L30 11L54 49Q33 59 12 52Z',peach)+path('M21 35L47 37M17 44L51 45')+circle(30,10,5,pink)],
  ['glasses', '愛心眼鏡', path('M28 28Q32 24 36 28')+path('M16 44C-9 26 8 14 16 23C24 14 41 26 16 44ZM48 44C23 26 40 14 48 23C56 14 73 26 48 44Z',pink)],
  ['star','星星',path(star,gold)+path('M23 31L27 24')],
  ['sparkle','亮晶晶',path('M31 5Q35 26 52 32Q35 36 31 58Q26 37 10 32Q27 26 31 5Z',violet)+path('M51 7V21M44 14H58M11 43V54M6 49H16')],
  ['sun','太陽',path('M32 4V11M32 53V60M4 32H11M53 32H60M12 12L17 17M47 47L52 52M12 52L17 47M47 17L52 12')+circle(32,32,17,gold)+path('M25 33Q32 42 39 33')],
  ['moon','月亮',path('M47 51A24 24 0 1 1 30 8C20 26 29 48 47 51Z',gold)+path('M47 11V27M39 19H55')],
  ['cloud','小雲朵',path('M14 48C-2 48 4 27 17 29C19 12 43 10 46 29C61 23 66 48 50 48Z',blue)+path('M24 37H24.1M39 37H39.1M28 41Q32 45 36 41')],
  ['heart','愛心',path(heart,pink)+path('M13 24Q15 19 19 19')],
  ['flower','小花',path('M32 15C44-4 60 16 48 28C68 31 59 55 43 49C43 70 20 67 20 49C3 55-4 33 16 28C3 13 20-2 32 15Z',pink)+circle(32,33,10,gold)],
  ['leaf','葉子',path('M11 52C4 18 26 7 56 8C57 39 41 61 11 52Z',green)+path('M9 57L44 20M23 42L22 24M30 35L46 36')],
  ['sprout','嫩芽',path('M32 53V27M22 56H42')+path('M32 35C13 37 4 28 6 15C22 11 32 20 32 35ZM32 29C32 13 42 4 57 8C59 21 49 31 32 29Z',mint)],
  ['clover','幸運草',path('M32 33Q38 47 28 57')+path('M32 28C11 20 23 3 32 13C41 3 53 20 32 28C24 50 7 38 17 29C7 20 24 8 32 28C54 19 60 36 47 40C39 42 34 36 32 28Z',green)],
  ['balloon','氣球',path('M32 43Q25 49 32 54Q36 58 29 60')+ellipse(32,22,16,19,berry)+path('M30 39L27 46H37L34 39Z',pink)+path('M21 24Q21 15 27 13')],
  ['gift','禮物',path('M32 21C8 23 12 1 24 10L32 21C56 23 53 1 40 10Z',pink)+path('M11 28H53V55H11Z',gold)+path('M8 20H56V32H8Z',peach)+path('M27 20H37V55H27Z',pink)],
  ['ribbon','彩帶',path('M7 45Q25 55 34 38Q42 25 52 33L52 46L60 31L56 19Q41 11 27 30Q18 44 7 33Z',violet)+path('M11 18L17 10M25 15L29 6M37 51L41 58')],
  ['candy','糖果',path('M20 27L6 19L7 45L20 37M44 27L58 19L57 45L44 37',gold)+circle(32,32,15,pink)+path('M22 40L37 20M29 46L44 28')],
  ['cupcake','杯子蛋糕',path('M14 36H50L45 56H19Z',peach)+path('M23 42L25 52M32 42V53M41 42L39 52')+path('M14 38C3 38 7 26 16 26C15 18 25 18 27 14C32 6 43 13 42 20C48 20 52 25 51 28C59 30 57 38 50 38Z',pink)+circle(33,11,5,berry)],
  ['shell','貝殼',path('M23 52L8 35C0 9 64 2 56 35L41 52Z',peach)+path('M23 44L15 22M30 44L27 15M36 44L39 15M43 44L50 21')+path('M22 47H42V55H22Z',cream)],
  ['bubbles','泡泡',circle(25,35,18,blue)+circle(47,15,10,'#c1f4f6')+circle(50,49,8,mint)+path('M15 33Q16 26 22 26M44 14L47 12')],
  ['fish','小魚',path('M46 28L59 18V46L46 36Z',gold)+path('M7 32Q25 7 47 26V38Q25 58 7 32Z',blue)+circle(21,30,2.5,'#37424c')+path('M34 23Q28 32 35 41')],
  ['droplet','水滴',path('M32 6C27 17 12 29 12 42A20 17 0 0 0 52 42C52 29 37 17 32 6Z',blue)+path('M21 40Q21 47 27 49')],
  ['coral','珊瑚',path('M27 57V36L12 27L7 16Q8 10 13 13L18 22L27 26V12Q29 5 35 10V33L46 24L51 13Q57 10 59 15L54 28L36 43V57Z',pink)],
  ['butterfly','小蝴蝶',path('M31 29C20-1 0 7 7 28Q9 35 21 38C1 45 18 61 31 44M33 29C44-1 64 7 57 28Q55 35 43 38C63 45 46 61 33 44',violet)+ellipse(32,36,4,12,gold)+path('M30 24L25 17M34 24L39 17')],
  ['ladybug','瓢蟲',circle(32,19,10,'#514262')+ellipse(32,37,19,20,berry)+path('M32 19V56')+circle(23,34,3,'#514262')+circle(41,31,3,'#514262')+circle(41,45,3,'#514262')+circle(23,47,3,'#514262')],
  ['mushroom','蘑菇',path('M25 36L22 55Q32 60 42 55L39 36Z',cream)+path('M7 35C9 2 55 2 57 35Q32 42 7 35Z',berry)+circle(23,26,5,cream)+circle(39,20,5,cream)+circle(45,30,3,cream)],
  ['carrot','紅蘿蔔',path('M40 24Q22 11 33 6Q40 5 43 17Q44 3 52 7Q59 10 48 23Q63 14 63 24Q60 30 46 29Z',green)+path('M46 24Q30 10 20 30L7 57Q6 62 12 59L45 40Q54 33 46 24Z',peach)+path('M19 33L27 37M31 46L36 48')],
  ['paw','小腳印',ellipse(13,26,6,8,violet)+ellipse(25,17,6,8,violet)+ellipse(39,17,6,8,violet)+ellipse(51,26,6,8,violet)+path('M32 32C24 32 22 42 16 47C12 58 25 60 32 54C39 60 52 58 48 47C42 42 40 32 32 32Z',pink)]
];

export const stickerById = new Map(stickers.map(([id, name, art]) => [id, {name, art}]));
export const STICKER_SIZE = 88;
export const SVG_NS = 'http://www.w3.org/2000/svg';

export function stickerArt(id) {
  return `<g stroke="#50435c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${stickerById.get(id).art}</g>`;
}

export function stickerIcon(id) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${stickerArt(id)}</svg>`;
}

export function createPlacedSticker(id) {
  const element = document.createElementNS(SVG_NS, 'g');
  element.classList.add('placed-sticker');
  element.innerHTML = `<rect class="sticker-handle" width="64" height="64"/>${stickerArt(id)}`;
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `${stickerById.get(id).name}，可拖曳移動`);
  return element;
}

export function placedStickerArt(sticker) {
  const offset = 32 * STICKER_SIZE / 64;
  return `<g transform="translate(${sticker.x - offset} ${sticker.y - offset}) scale(${STICKER_SIZE / 64})">${stickerArt(sticker.id)}</g>`;
}
