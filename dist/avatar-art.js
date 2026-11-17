export const AVATAR_W = 240;
export const AVATAR_H = 304;
const LINE = '#394351';
const SKIN = '#ffc99e';
const HAIR = '#624236';
const WHITE = '#fff9ec';

const item = (id, name, color, trim) => ({id, name, color, trim});
const bag = (style, ...details) => ({...item(...details), style});
export const wardrobe = [
  {slot:'top', name:'上衣', icon:'👕', items:[
    item('sailor','帆船條紋','#81c8e1','#fff7e7'),
    item('sprout','嫩芽口袋','#87c6a0','#ffe18a'),
    item('hoodie','莓果帽Ｔ','#e48ba8','#f9d3de'),
    item('cloudtee','棉花雲朵衫','#e8a6be','#f9f6ef'),
    item('bearcape','小熊斗篷','#dda876','#fcdfaa')
  ]},
  {slot:'pants', name:'褲子', icon:'👖', items:[
    item('denim','星星牛仔褲','#769bc9','#e1f2fe'),
    item('shorts','陽光短褲','#edb86c','#fff2b5'),
    item('jogger','紫芋運動褲','#aa95d4','#f4def9'),
    item('berryoveralls','草莓吊帶褲','#e291a8','#ffe4c0'),
    item('moonpants','月亮口袋褲','#8292ca','#ffe297')
  ]},
  {slot:'hat', name:'帽子', icon:'🧢', items:[
    item('cap','藍天棒球帽','#74b9ea','#fff1b5'),
    item('sunhat','向日葵草帽','#f3c565','#df805f'),
    item('beanie','梅子毛帽','#b681d3','#edc7f9'),
    item('rabbit-ears','兔耳帽','#bba6e5','#ffb8cc'),
    item('bearhat','小熊圓耳帽','#d4a375','#ffe2ab')
  ]},
  {slot:'neck', name:'項鍊', icon:'📿', items:[
    item('star','星星項鍊','#ffcf5b','#ab7147'),
    item('heart','愛心墜飾','#ec91b2','#dc9c57'),
    item('leaf','嫩葉項鍊','#8bd0a8','#759b83'),
    item('cloudbell','雲朵鈴鐺','#e3f2fb','#83b7d1'),
    item('fishneck','小魚項鍊','#83d0c1','#4e9f88')
  ]},
  {slot:'gloves', name:'手套', icon:'🧤', items:[
    item('mitten','柑橘連指手套','#f4a966','#ffd68f'),
    item('swim','薄荷划水手套','#79cdbf','#d8fcf0'),
    item('flower','花瓣手套','#eaa0bc','#fff0a3'),
    item('pawglove','貓咪肉球手套','#c6b7dc','#f092ab'),
    item('duckglove','小鴨手套','#f9d06e','#ed9a5b')
  ]},
  {slot:'shoes', name:'鞋子', icon:'👟', items:[
    item('sneaker','海風球鞋','#6ebdd1','#d6f2f8'),
    item('boot','紅莓雨靴','#e67986','#ffccd1'),
    item('spring','彈簧跳跳鞋','#a996df','#ffe58c'),
    item('rabbitslippers','兔兔拖鞋','#f3d7e5','#e990af'),
    item('star-skates','星光溜冰鞋','#84c9d1','#f9e396')
  ]},
  {slot:'bag', name:'包包', icon:'🎒', items:[
    bag('back','wingpack','天使翅膀背包','#f5e9fa','#bd9eda'),
    bag('sling','carrotsling','小兔胡蘿蔔斜背包','#f6a374','#83bd98'),
    bag('back','picnic','蜂蜜野餐包','#efb557','#ffe4a3'),
    bag('back','space','小星球背包','#7b9ac9','#c6dbf9'),
    bag('back','berries','草莓旅行包','#e78699','#ffc3d0'),
    bag('sling','cloud','小雲朵斜背包','#e0f0fa','#8ccde8'),
    bag('sling','apple','蘋果斜背包','#ef7c85','#9fd299'),
    bag('sling','moon','月亮斜背包','#f2c965','#fff0aa')
  ]}
];
export const itemById = new Map(wardrobe.flatMap(({slot, items}) => items.map(piece => [piece.id, {...piece, slot}])));

export function restoreOutfit(saved) {
  const outfit = {};
  for (const {slot} of wardrobe) {
    const choices = slot === 'bag' ? [saved?.bag, saved?.sling, saved?.pack] : [saved?.[slot]];
    const id = choices.find(candidate => itemById.get(candidate)?.slot === slot);
    if (id) outfit[slot] = id;
  }
  return outfit;
}

const bodyPath = 'M92 151Q94 143 111 138Q120 135 130 138Q146 142 150 150Q153 159 148 174L151 208Q149 214 121 215Q94 215 89 209L93 174Q89 163 92 151Z';
const facePath = 'M77 74Q81 46 120 42Q160 42 164 76V96Q161 126 128 133Q93 137 79 109Z';
const pathCache = new Map();
function shape(d) {
  if (!pathCache.has(d)) pathCache.set(d, new Path2D(d));
  return pathCache.get(d);
}

function paint(ctx, d, fill, stroke = LINE, width = 3.4) {
  const path = shape(d);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  line(ctx, path, stroke, width);
}

function line(ctx, d, color = LINE, width = 3.4) {
  if (!color) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(typeof d === 'string' ? shape(d) : d);
}

function oval(ctx, x, y, rx, ry, fill, stroke, width = 3) {
  const path = new Path2D();
  path.ellipse(x,y,rx,ry,0,0,Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (stroke) line(ctx,path,stroke,width);
}

function rect(ctx, x, y, w, h, radius, fill, stroke = LINE) {
  const path = new Path2D();
  path.roundRect(x,y,w,h,radius);
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (stroke) line(ctx,path,stroke,3);
}

function star(ctx,x,y,r,color) {
  const path = new Path2D();
  for(let i=0;i<10;i++) {
    const a = -Math.PI/2 + i*Math.PI/5;
    const length = i%2 ? .46*r : r;
    if(i) path.lineTo(x+length*Math.cos(a),y+length*Math.sin(a));
    else path.moveTo(x+length*Math.cos(a),y+length*Math.sin(a));
  }
  path.closePath();
  ctx.fillStyle = color;
  ctx.fill(path);
}

function cloud(ctx,x,y,color) {
  ctx.save();
  ctx.translate(x,y);
  paint(ctx,'M-13 5Q-17-1-10-5Q-9-12-2-9Q1-14 7-8Q13-8 15-2Q18 7 7 8H-8Z',color,LINE,2.1);
  ctx.restore();
}

function bearFace(ctx,x,y,color,trim) {
  oval(ctx,x-8,y-7,4.6,4.6,color,LINE,1.8);
  oval(ctx,x+8,y-7,4.6,4.6,color,LINE,1.8);
  oval(ctx,x,y,10,8.5,color,LINE,1.8);
  oval(ctx,x,y+3,4.3,3,trim);
  oval(ctx,x-3.9,y-1.3,1.1,1.3,LINE);
  oval(ctx,x+3.9,y-1.3,1.1,1.3,LINE);
  oval(ctx,x,y+1,1.5,1.1,LINE);
}

function paintMarks(ctx,d,ink,armOrigin) {
  if (!ink) return;
  ctx.save();
  ctx.clip(shape(d));
  if (armOrigin) {
    const [x,y,angle] = armOrigin;
    ctx.rotate(-angle);
    ctx.translate(-x,-y);
  }
  ctx.drawImage(ink,0,0,AVATAR_W,AVATAR_H);
  ctx.restore();
}

function drawTop(ctx,piece,person,ink) {
  const fill = piece?.color ?? (person === 'girl' ? '#b7a7e2' : '#88c6b7');
  const trim = piece?.trim ?? '#fff7e7';
  paint(ctx,bodyPath,fill,null);
  if (piece?.id === 'sailor') {
    ctx.save();
    ctx.clip(shape(bodyPath));
    for (const y of [159,174,189,204]) line(ctx,`M79 ${y}H160`,trim,7);
    ctx.restore();
  }
  if (piece?.id === 'hoodie') {
    paint(ctx,'M95 147Q101 131 120 137Q141 131 147 148L133 159 121 151 108 159Z',trim);
    line(ctx,'M120 154V209 M105 190Q120 196 136 190',LINE,2.3);
  } else if(piece?.id!=='bearcape') {
    paint(ctx,'M108 137Q121 147 133 137Q133 152 120 152Q109 150 108 137Z',trim,LINE,2.1);
  }
  if (piece?.id === 'sprout') {
    paint(ctx,'M127 169H143V182Q135 190 127 182Z',trim,LINE,2.1);
    line(ctx,'M135 178V166Q128 160 129 157Q137 156 137 166Q139 159 145 162Q144 169 137 169', '#46785f', 2.2);
  }
  if (piece?.id === 'cloudtee') {
    cloud(ctx,120,174,'#fff9ef');
    oval(ctx,117,177,1.6,1.6,'#d99caf');
    oval(ctx,125,175,1.6,1.6,'#d99caf');
  }
  paintMarks(ctx,bodyPath,ink);
  line(ctx,bodyPath);
}

function drawCape(ctx,piece,flutter=0,necklace=false) {
  if(piece?.id!=='bearcape') return;
  ctx.save();
  ctx.translate(120,144);
  ctx.rotate(flutter * .06);
  ctx.translate(-120,-144);
  paint(ctx,'M94 150Q101 143 111 141Q121 151 132 141Q141 143 148 150Q154 156 154 166Q144 178 122 170Q100 178 88 166Q89 156 94 150Z',piece.trim);
  line(ctx,'M94 167Q105 174 119 168M126 168Q139 173 148 167','#c18360',2.2);
  bearFace(ctx,necklace?106:121,157,piece.color,WHITE);
  ctx.restore();
}

function legPath(cx,y,piece) {
  const length = {denim:55,jogger:55,berryoveralls:46,moonpants:50}[piece?.id] ?? 27;
  const bottom = y + length;
  return `M${cx-15} ${y}L${cx+14} ${y} ${cx+12} ${bottom}Q${cx} ${bottom+6} ${cx-13} ${bottom}Z`;
}

function drawPantsLeg(ctx,cx,y,piece,person,ink) {
  const fill = piece?.color ?? (person === 'girl' ? '#7b91ae' : '#d6ac7a');
  const trim = piece?.trim ?? '#f5d7aa';
  const d = legPath(cx,y,piece);
  paint(ctx,d,fill,null);
  if(piece?.id==='denim') {
    line(ctx,`M${cx+9} ${y+7}V${y+51}`,trim,2);
    star(ctx,cx-2,y+30,6,trim);
  } else if(piece?.id==='jogger') {
    line(ctx,`M${cx-8} ${y+7}V${y+49}`,trim,3);
  } else if(piece?.id==='shorts') {
    line(ctx,`M${cx-11} ${y+22}H${cx+12}`,trim,4);
  } else if(piece?.id==='berryoveralls') {
    line(ctx,`M${cx-10} ${y+40}H${cx+11}`,trim,3);
    for(const [dx,dy] of [[-6,14],[4,21],[-2,29],[7,34]]) oval(ctx,cx+dx,y+dy,1.4,2,trim);
  } else if(piece?.id==='moonpants') {
    paint(ctx,`M${cx-9} ${y+18}H${cx+8}V${y+31}Q${cx} ${y+37} ${cx-9} ${y+31}Z`,'#687eaf',LINE,1.8);
    oval(ctx,cx,y+25,5.5,5.5,trim);
    oval(ctx,cx+2.7,y+23,4,4,'#687eaf');
  }
  paintMarks(ctx,d,ink);
  line(ctx,d);
}

function drawSuspenders(ctx,pants,ink) {
  if(pants?.id!=='berryoveralls') return;
  const bib='M101 146Q104 144 108 145L112 178H130L134 145Q138 144 142 146L138 181Q143 190 142 207Q121 215 98 207Q97 190 103 181Z';
  paint(ctx,bib,pants.color,LINE,2.6);
  oval(ctx,105,182,3.8,3.8,pants.trim,LINE,1.6);
  oval(ctx,136,182,3.8,3.8,pants.trim,LINE,1.6);
  paint(ctx,'M111 192Q118 187 128 192Q126 206 120 208Q114 207 111 192Z','#f2afbb',LINE,1.6);
  line(ctx,'M115 192Q116 186 120 190Q123 185 125 192','#56987b',2.4);
  paintMarks(ctx,bib,ink);
  line(ctx,bib,LINE,2.6);
}

function drawShoe(ctx,x,y,piece,ink) {
  const fill = piece?.color ?? '#f8efd8';
  const trim = piece?.trim ?? '#e4c29b';
  const upper = piece?.id==='boot' ? 19 : 9;
  const shape = `M${x-10} ${y-upper}Q${x} ${y-upper-4} ${x+7} ${y-upper}L${x+9} ${y-4}Q${x+23} ${y-6} ${x+25} ${y+3}Q${x+25} ${y+11} ${x+16} ${y+11}H${x-11}Z`;
  paint(ctx,shape,fill,null);
  paintMarks(ctx,shape,ink);
  line(ctx,shape);
  line(ctx,`M${x-9} ${y+5}H${x+21}`,trim,3.6);
  if (piece?.id==='sneaker') line(ctx,`M${x+1} ${y-6}H${x+9}M${x+3} ${y-2}H${x+12}`,WHITE,2.5);
  if (piece?.id==='spring') line(ctx,`M${x-4} ${y}l5-7 5 7 5-7 `,trim,2.7);
  if (piece?.id==='boot') line(ctx,`M${x-8} ${y-14}H${x+7}`,trim,3.3);
  if (piece?.id==='rabbitslippers') {
    oval(ctx,x+13,y-8,3,7,fill,LINE,1.7);
    oval(ctx,x+20,y-9,3,7.5,fill,LINE,1.7);
    oval(ctx,x+17,y-3,7.7,4.8,fill,LINE,1.7);
    oval(ctx,x+14.4,y-4,1.05,1.15,LINE);
    oval(ctx,x+19.7,y-4,1.05,1.15,LINE);
    oval(ctx,x+17.4,y-1.8,1.4,1,trim);
  }
  if (piece?.id==='star-skates') {
    star(ctx,x+11,y-1,6,trim);
    oval(ctx,x-4,y+13,4.3,4.3,trim,LINE,2);
    oval(ctx,x+16,y+13,4.3,4.3,trim,LINE,2);
  }
}

function drawGlove(ctx,x,y,piece) {
  if (!piece) {
    oval(ctx,x,y,9.6,11,SKIN,LINE);
    return;
  }
  oval(ctx,x,y,11,13,piece.color,LINE);
  if (piece.id==='mitten') oval(ctx,x+9,y-2,5,7,piece.color,LINE,2.1);
  line(ctx,`M${x-8} ${y-8}H${x+8}`,piece.trim,3);
  if (piece.id==='flower') {
    for (let i=0;i<5;i++) oval(ctx,x+4*Math.cos(i*1.256),y+4*Math.sin(i*1.256),2.9,2.9,piece.trim);
    oval(ctx,x,y,2.4,2.4,'#e18c5b');
  } else if(piece.id==='swim') {
    line(ctx,`M${x-6} ${y+3}q3-5 6 0t6 0`,piece.trim,2);
  } else if(piece.id==='pawglove') {
    oval(ctx,x,y+5,5,3.6,piece.trim);
    for (const [dx,dy] of [[-6,0],[-2.1,-3],[2.4,-3],[6.1,0]]) oval(ctx,x+dx,y+dy,1.5,2,piece.trim);
  } else if(piece.id==='duckglove') {
    oval(ctx,x+4.3,y+3.6,4.8,2.4,piece.trim,LINE,1.4);
    oval(ctx,x-2.6,y-.5,1.4,1.9,LINE);
    oval(ctx,x+2.8,y-.5,1.4,1.9,LINE);
  }
}

function drawHat(ctx,piece,wiggle=0) {
  if (!piece) return;
  const {id,color,trim} = piece;
  if (id==='cap') {
    paint(ctx,'M74 69Q77 38 112 35Q148 33 160 69L166 72Q186 75 188 80Q177 88 149 83L77 78Z',color);
    line(ctx,'M121 37Q129 51 127 68M79 70Q118 67 156 72',trim,4);
    star(ctx,105,55,8,trim);
  } else if(id==='sunhat') {
    paint(ctx,'M79 65Q84 36 109 35H135Q153 39 160 65Q191 69 192 77Q182 94 120 90Q66 90 55 79Q58 70 79 65Z',color);
    line(ctx,'M78 66Q120 79 162 66',trim,7);
    oval(ctx,151,68,7,7,'#fff4c4',LINE,2.2);
  } else if(id==='rabbit-ears') {
    for(const [x,side] of [[101,-1],[140,1]]) {
      ctx.save();
      ctx.translate(x,61);
      ctx.rotate(side*.17+wiggle*(side<0?.17:.24));
      paint(ctx,'M-10 0Q-16-14-13-36Q-10-63 0-60Q14-58 12-37Q13-15 10 0Z',color);
      oval(ctx,0,-34,5,17,trim);
      ctx.restore();
    }
    paint(ctx,'M74 79Q75 49 120 46Q164 47 167 77Q155 88 120 88Q91 87 74 79Z',color);
    line(ctx,'M79 76Q119 86 161 76',trim,4.6);
    oval(ctx,114,69,1.6,2,LINE);
    oval(ctx,125,69,1.6,2,LINE);
    paint(ctx,'M117 74Q120 71 123 74L120 77Z',trim,LINE,1.3);
  } else if(id==='bearhat') {
    for(const x of [86,155]) {
      oval(ctx,x,50,12,12,color,LINE);
      oval(ctx,x,50,5.6,5.6,trim);
    }
    paint(ctx,'M73 80Q71 51 119 45Q164 47 170 79Q150 88 121 88Q91 87 73 80Z',color);
    bearFace(ctx,121,70,color,trim);
  } else {
    paint(ctx,'M75 76V65Q78 32 118 31Q156 29 166 66V77Q135 89 75 76Z',color);
    paint(ctx,'M74 66Q120 75 166 65L169 79Q119 92 72 79Z',trim);
    oval(ctx,118,27,13,11,trim,LINE);
    line(ctx,'M105 40Q97 51 98 67M129 40Q136 49 139 69',trim,2);
  }
}

function drawNecklace(ctx,piece) {
  if (!piece) return;
  line(ctx,'M102 143Q106 161 120 170Q134 163 139 143',piece.trim,3.8);
  if(piece.id==='star') star(ctx,120,172,10,piece.color);
  else if(piece.id==='heart') paint(ctx,'M120 183Q101 170 111 165Q117 161 120 169Q124 161 129 165Q138 170 120 183Z',piece.color,LINE,2.1);
  else if(piece.id==='cloudbell') {
    cloud(ctx,120,171,piece.color);
    oval(ctx,120,182,2.6,3,'#ffcd62',LINE,1.4);
  } else if(piece.id==='fishneck') {
    paint(ctx,'M125 171L132 164V180L124 175Q116 184 106 174Q115 163 125 171Z',piece.color,LINE,2.1);
    oval(ctx,112,172,1.5,1.5,LINE);
  } else paint(ctx,'M114 179Q105 167 130 164Q133 180 114 179Z',piece.color,LINE,2.2);
  oval(ctx,119,169,2.4,2.4,WHITE);
}

function drawWings(ctx,piece,flap) {
  ctx.save();
  ctx.translate(120,179);
  for(const side of [-1,1]) {
    ctx.save();
    ctx.scale(side,1);
    ctx.rotate(-.09 + flap*.22);
    paint(ctx,'M18 15Q22-13 43-24Q60-32 82-39Q90-37 87-26Q82-13 67-6Q82-12 80 1Q77 14 60 19Q70 16 68 26Q51 49 22 36Z',piece.color);
    line(ctx,'M33 16Q49-2 66-6M35 25Q52 17 61 20M36 32Q49 28 55 28',piece.trim,2.9);
    star(ctx,58,-11,5,'#ffda87');
    ctx.restore();
  }
  rect(ctx,-21,-14,43,54,16,piece.trim);
  line(ctx,'M-7-15Q-6-28 7-24Q13-22 13-13',LINE,3.3);
  ctx.restore();
}

function drawPack(ctx,piece,swing=0,flap=0) {
  if (!piece) return;
  if(piece.id==='wingpack') {
    drawWings(ctx,piece,flap);
    return;
  }
  ctx.save();
  ctx.translate(153,158);
  ctx.rotate(swing * .4);
  paint(ctx,'M-20 10Q-22-9 0-12Q27-14 33 14V39Q31 52 14 51H-13Q-25 47-23 35Z',piece.color);
  line(ctx,'M1-11Q0-23 14-21Q21-20 20-11',LINE,4);
  rect(ctx,7,19,25,24,7,piece.trim);
  line(ctx,'M10 27H27',LINE,2.3);
  if(piece.id==='space') star(ctx,21,34,5,'#ffed93');
  if(piece.id==='berries') for(const [x,y] of [[10,4],[17,8],[25,2]]) oval(ctx,x,y,1.7,2.2,WHITE);
  if(piece.id==='picnic') line(ctx,'M12 33H26M16 27V40M22 27V40','#c2874e',1.6);
  ctx.restore();
}

function drawSling(ctx,piece,swing) {
  if (!piece) return;
  ctx.save();
  ctx.translate(99,151);
  ctx.rotate(swing);
  line(ctx,'M0 0Q20 22 54 55',LINE,7.2);
  line(ctx,'M0 0Q20 22 54 55',piece.trim,3.6);
  ctx.translate(55,55);
  if(piece.id==='cloud') paint(ctx,'M-17 12Q-22-1-11-4Q-9-15 1-10Q8-16 13-5Q25-4 21 12Q13 21-10 18Z',piece.color);
  else if(piece.id==='apple') {
    paint(ctx,'M0-5Q-17-15-21 2Q-24 20-4 21Q0 19 4 21Q23 19 22 3Q20-15 0-5Z',piece.color);
    paint(ctx,'M0-6Q0-17 14-15Q14-6 0-6Z',piece.trim,LINE,2.2);
  } else if(piece.id==='carrotsling') {
    paint(ctx,'M-14-8Q-7-15 14-13Q28-10 19 2L-6 28Q-16 36-19 24Z',piece.color);
    paint(ctx,'M5-13Q-12-20-7-26Q-2-29 7-17Q7-34 16-30Q24-29 16-16Q32-24 34-16Q33-9 17-10Z',piece.trim,LINE,2.5);
    line(ctx,'M-12 10l7 3M-3-2l8 4M-6 19l5 2','#cf7e67',2.3);
  } else paint(ctx,'M10-16Q4-1 21 5Q20 23 1 22Q-17 22-20 5Q-22-12-4-16Z',piece.color);
  if(piece.id!=='carrotsling') line(ctx,'M-11 8Q1 12 13 7',piece.id==='cloud'?'#79acca':WHITE,2.8);
  ctx.restore();
}

function drawHairBehind(ctx,person) {
  if(person==='girl') {
    paint(ctx,'M78 71Q63 50 52 73Q43 88 61 109Q47 112 53 133Q68 145 91 125L96 84Z',HAIR);
    paint(ctx,'M162 66Q178 54 187 77Q195 94 180 106Q196 120 185 134Q171 145 151 125L145 89Z',HAIR);
    oval(ctx,64,79,8,5,'#a9c9e7',LINE,2);
    oval(ctx,177,79,8,5,'#a9c9e7',LINE,2);
  } else {
    paint(ctx,'M78 94Q59 82 76 67Q65 54 83 51Q73 37 96 38Q99 27 116 33Q129 23 141 36Q166 31 167 52Q183 54 163 93Z',HAIR);
  }
}

function drawHead(ctx,person,ink,blink) {
  const hair = person==='girl'
    ? 'M76 99Q67 81 78 60Q88 36 120 40Q164 37 170 78L164 99Q158 83 150 75Q135 78 124 65Q113 81 91 79L82 95Z'
    : 'M76 90L74 68Q84 51 101 52Q113 38 132 46Q154 45 164 65L165 93Q158 81 153 75Q139 79 128 64Q113 78 98 72Q91 82 83 82Z';
  drawHairBehind(ctx,person);
  oval(ctx,77,93,10,12,SKIN,LINE);
  oval(ctx,165,93,10,12,SKIN,LINE);
  paint(ctx,facePath,SKIN,null);
  paintMarks(ctx,facePath,ink);
  line(ctx,facePath);
  paint(ctx,hair,HAIR,null);
  paintMarks(ctx,hair,ink);
  line(ctx,hair);
  if(person==='girl') line(ctx,'M145 59L154 64','#f5c87b',4);
  const eyeHeight=blink ? 1.2 : 4.3;
  oval(ctx,104,94,3.7,eyeHeight,LINE);
  oval(ctx,139,94,3.7,eyeHeight,LINE);
  oval(ctx,95,106,6.5,3.4,'#f3a19b');
  oval(ctx,148,106,6.5,3.4,'#f3a19b');
  line(ctx,'M115 111Q122 119 130 111',LINE,2.4);
}

function arm(ctx,x,y,angle,top,person,glove,ink) {
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  const armPath = 'M-7 12Q-9 21-8 33Q-7 43-6 45Q0 51 7 44Q9 36 8 29Q9 19 7 12Z';
  const sleeve = 'M-10 4Q-10-5 0-5Q10-5 10 4L10 12Q9 15 6 16Q-1 18-10 14Z';
  const origin = [x,y,x<120 ? .28 : -.28];
  paint(ctx,armPath,SKIN,null);
  paintMarks(ctx,armPath,ink,origin);
  line(ctx,armPath);
  paint(ctx,sleeve,top?.color ?? (person==='girl'?'#b7a7e2':'#88c6b7'),null);
  paintMarks(ctx,sleeve,ink,origin);
  line(ctx,sleeve);
  drawGlove(ctx,0,46,glove);
  if (!glove) paintMarks(ctx,'M-9 46a9 10 0 1 0 18 0a9 10 0 1 0-18 0Z',ink,origin);
  ctx.restore();
}

export function drawAvatar(ctx, person, equipped, ink, pose = {}) {
  const worn = slot => itemById.get(equipped[slot]);
  const {stride=0, climb=0, wave=0, glide=0, bagSwing=0, headTilt=0, blink=false, crouch=0, flap=0, earBounce=0} = pose;
  const top = worn('top'), pants = worn('pants'), gloves = worn('gloves'), shoes = worn('shoes'), bag = worn('bag');
  for (const [side,x] of [[-1,105],[1,135]]) {
    ctx.save();
    ctx.translate(x,207);
    ctx.rotate(side*stride*.68);
    ctx.translate(-x,-207);
    const leg = `M${x-9} 220H${x+9}V269H${x-9}Z`;
    paint(ctx,leg,SKIN,null);
    paintMarks(ctx,leg,ink);
    line(ctx,leg);
    drawPantsLeg(ctx,x,205,pants,person,ink);
    drawShoe(ctx,x,269,shoes,ink);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(0,crouch*7);
  if(bag?.style==='back') drawPack(ctx,bag,bagSwing,flap);
  arm(ctx,88,151,.28 - stride*.52 + climb*(1.45 + .68*stride) + glide*.96,top,person,gloves,ink);
  arm(ctx,152,151,-.28 + stride*.52 - climb*(1.45 - .68*stride) - Math.max(glide*.96,wave*(2.1+.3*stride)),top,person,gloves,ink);
  paint(ctx,'M112 121H132V140Q123 147 112 140Z',SKIN);
  drawTop(ctx,top,person,ink);
  drawSuspenders(ctx,pants,ink);
  drawCape(ctx,top,bagSwing,Boolean(worn('neck')));
  drawNecklace(ctx,worn('neck'));
  if(bag?.style==='sling') drawSling(ctx,bag,bagSwing);
  ctx.save();
  ctx.translate(121,133);
  ctx.rotate(headTilt);
  ctx.translate(-121,-133);
  drawHead(ctx,person,ink,blink);
  drawHat(ctx,worn('hat'),earBounce);
  ctx.restore();
  ctx.restore();
}

export function drawWardrobeItem(ctx, piece) {
  const crops = {
    top: [120,174,104], pants: [120,231,86], hat: [121,56,154], neck: [120,161,56],
    gloves: [0,0,42], shoes: [0,0,51]
  };
  const crop = piece.id==='wingpack' ? [120,173,193] : piece.id==='berryoveralls' ? [120,201,136] :
    piece.slot==='bag' ? (piece.style==='back' ? [159,176,84] : [143,187,110]) : crops[piece.slot];
  const [x,y,size] = crop;
  const scale = Math.min(ctx.canvas.width,ctx.canvas.height) / size;
  ctx.save();
  ctx.translate(ctx.canvas.width/2,ctx.canvas.height/2);
  ctx.scale(scale,scale);
  ctx.translate(-x,-y);
  switch(piece.slot) {
    case 'top': drawTop(ctx,piece,'boy'); drawCape(ctx,piece); break;
    case 'pants': drawPantsLeg(ctx,105,205,piece,'boy'); drawPantsLeg(ctx,135,205,piece,'boy'); drawSuspenders(ctx,piece); break;
    case 'hat': drawHat(ctx,piece); break;
    case 'neck': drawNecklace(ctx,piece); break;
    case 'gloves': drawGlove(ctx,0,0,piece); break;
    case 'shoes': drawShoe(ctx,-5,1,piece); break;
    case 'bag': if(piece.style==='back') drawPack(ctx,piece); else drawSling(ctx,piece,0); break;
  }
  ctx.restore();
}

export function makeAvatarInk(canvas, strokes, pending) {
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,AVATAR_W,AVATAR_H);
  for (const stroke of pending ? [...strokes,pending] : strokes) {
    const [first,...rest] = stroke.points;
    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const {x,y} of rest) ctx.lineTo(x,y);
    if (!rest.length) ctx.lineTo(first.x + .03, first.y);
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = .86;
    ctx.strokeStyle = stroke.color;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
