import {richGuides} from './rich-patterns.js';
import {getExtraFillLabels} from './fill-regions.js';
// Original, hand-positioned color guides. Numbers describe meaningful paintable
// areas, not tiny eyes/whiskers. A number always means one color within a page.
// Closure contours remain visible in both modes; only numeric labels toggle.
// The original source artwork and saved fill IDs remain unchanged.
const colors={
 red:['#ed7976','草莓紅'],orange:['#f5aa62','橘子橙'],yellow:['#f3d36b','陽光黃'],
 green:['#39a66d','森林綠'],lime:['#8bbf83','嫩葉綠'],blue:['#7ba8d3','天空藍'],
 aqua:['#70b8b1','湖水綠'],purple:['#a89bcc','葡萄紫'],pink:['#e3a0b8','櫻花粉'],
 brown:['#9f7e69','可可棕'],dark:['#42545b','石頭黑'],cream:['#fff4d6','奶油黃']
};
const guide=(names,points,extraShapes='')=>({
 palette:names.map((key,i)=>({number:i+1,color:colors[key][0],name:colors[key][1]})),
 labels:points.map(([x,y,number,size])=>({x,y,number,...(size?{size}:{})})),extraShapes
});
const guides={
 cat:guide(['orange','pink','cream'],[
 [500,285,1],[350,290,1],[650,290,1], // face, ears outside inner triangles
 [332,230,2,20],[668,230,2,20],
 [500,600,3],[380,690,1],[620,690,1],[500,725,3]
 ],'<path d="M318 250 358 235 M642 235 682 250 M425 650 425 770 M575 650 575 770 M425 650 330 650 M575 650 670 650"/>'),
 butterfly:guide(['purple','pink','yellow','orange'],[
 [250,340,1],[750,340,1],[245,570,2],[755,570,2],
 [340,360,3],[660,360,3],[350,580,3],[650,580,3],[500,455,4]
 ],'<path d="M480 450 480 530 M520 450 520 530 M240 475 465 475 M535 475 760 475"/>'),
 flower:guide(['pink','yellow','green'],[
 [410,215,1],[585,215,1],[680,365,1],[555,525,1],[350,485,1],[330,330,1],
 [500,355,2],[750,180,2],[405,650,3],[600,715,3]
 ]),
 dinosaur:guide(['lime','orange','yellow'],[
 [365,470,1],[590,550,1],[400,730,1],[665,735,1],[790,610,1],
 [500,455,2,22],[610,445,2,22],[700,490,2,22],[515,580,3],[650,610,3,22]
 ],'<path d="M465 492 560 472 M560 472 650 482 M650 482 735 522"/>'),
 rainbow:guide(['red','yellow','blue','purple'],[
 [500,235,1],[500,295,2],[500,355,3],[235,650,4],[765,650,4],
 [150,290,2,22],[835,195,2,20]
 ],'<path d="M205 600 265 600 M265 600 325 600 M325 600 385 600 M615 600 675 600 M675 600 735 600 M735 600 795 600"/>'),
 rocket:guide(['red','blue','yellow','orange','purple'],[
 [500,250,1],[420,470,1],[500,575,1],[310,565,2],[690,565,2],
 [500,385,2],[500,322,3,20],[500,780,4],[500,690,3],[230,245,5,20],
 [230,295,5,20],[290,242,3,18],[173,297,3,18],[760,275,3,22]
 ],'<path d="M465 640 535 640 M405 535 375 535 M595 535 625 535"/>'),
 whale:guide(['blue','aqua','purple'],[
 [500,410,1],[810,510,1],[350,620,2],[620,625,2],[495,635,1],
 [170,315,3],[770,230,3]
 ],'<path d="M245 540 228 540 M690 555 710 590 M450 570 450 585 M540 585 540 590"/>'),
 'sea-turtle':guide(['green','lime'],[
 // All seven shell panels deliberately carry the same green number.
 [490,455,1],[490,320,1],[365,375,1],[615,375,1],
 [330,530,1],[650,525,1],[495,610,1],
 [765,480,2],[245,310,2],[250,645,2],[675,275,2],[680,665,2],[235,485,2,20]
 ],'<path d="M345 325 357 338 M405 315 400 307 M580 320 590 312 M695 440 698 440 M595 625 600 623 M385 625 380 623 M285 435 284 435"/>'),
 rabbit:guide(['cream','pink','purple'],[
 [350,270,1,18],[650,270,1,18],[500,365,1],[500,550,1],[500,635,1],
 [350,770,3],[650,770,3],[390,755,3,18],[610,755,3,18],[368,210,2,18],[632,210,2,18]
 ],'<path d="M355 145 Q390 170 385 280 M645 145 Q610 170 615 280"/>'),
 elephant:guide(['blue','pink','purple'],[
 [500,280,1],[520,490,1,20],[520,545,1,20],[580,610,1,22],
 [255,335,2],[745,335,2],[375,395,2,20],[625,395,2,20],
 [385,575,1],[660,575,1],[360,775,3,20],[615,775,3,20]
 ]),
 longneck:guide(['lime','orange','green'],[
 [570,240,1],[560,400,1],[335,590,1],[650,595,1],
 [385,745,1],[660,745,1],[785,635,1],
 [415,570,2],[555,610,2],[145,675,3,20],[220,670,3,20]
 ]),
 triceratops:guide(['lime','orange','cream','yellow'],[
 [670,535,1],[410,735,1],[710,740,1],[830,645,1],
 [315,510,1],[295,350,2,20],[410,425,2,18],[182,465,2,18],
 [385,555,2,18],[255,572,2,18],
 [250,375,3,20],[355,375,3,20],[435,490,3,18],[570,510,4]
 ]),
 apple:guide(['red','green','brown'],[
 [500,500,1],[630,235,2],[510,220,3,18]
 ],'<path d="M500 300 Q515 230 545 150 L530 145"/>'),
 watermelon:guide(['red','green','dark'],[
 [420,400,1],[500,545,1],[500,755,2,24],
 [350,450,3,20],[500,430,3,20],[650,450,3,20],
 [420,570,3,20],[580,570,3,20],[500,655,3,18]
 ]),
 'princess-dress':guide(['yellow','brown','cream','purple','pink'],[
 [500,195,1],[420,265,2,20],[570,280,2,20],[385,410,2,20],[615,410,2,20],
 [500,365,3],[425,500,3,18],[575,500,3,18],
 [500,495,4],[350,750,4],[650,750,4],[500,760,5],[500,675,1]
 ],'<path d="M450 565 453 545 M550 565 547 545 M400 800 400 820 M600 800 600 820 M440 560 435 505 M560 560 565 505"/>'),
 'princess-castle':guide(['pink','purple','blue','brown','yellow'],[
 [315,650,1],[685,650,1],[500,600,1],
 [275,330,2],[725,330,2],[500,240,2],
 [275,510,3,24],[725,510,3,24],[500,430,3],
 [470,730,4],[530,730,4],[500,535,5,20],
 [535,85,5,18],[300,165,5,16],[750,165,5,16]
 ],'<path d="M235 380 315 380 M685 380 765 380 M315 380 395 380 M605 380 685 380 M395 295 365 295 M605 295 635 295"/>'),
 bus:guide(['yellow','blue','dark','purple','red'],[
 [455,620,1],[255,405,2],[455,405,2],[650,405,2],[790,420,2,20],
 [300,755,3,24],[680,755,3,24],[300,645,3,24],[680,645,3,24],
 [300,680,4,20],[680,680,4,20],[300,720,4,20],[680,720,4,20],[780,610,4],[193,575,5,20]
 ]),
 parrot:guide(['red','yellow','blue','green','brown'],[[430,260,1],[580,395,1],[540,290,2],[697,284,2],[490,430,3],[480,530,4],[400,770,3],[505,780,1],[650,746,5],[331,745,5,18],[406,741,5,18],[489,741,5,16],[457,622,1,20],[517,629,1,24],[415,681,3,24],[495,693,1,24],[537,679,1,16]]),
 sailboat:guide(['brown','red','blue','yellow'],[
 [500,725,1],[415,470,2],[600,475,3],[370,670,3,22],[500,670,3,22],[630,670,3,22],
 [550,140,2,20],[780,180,4]
 ])
};
export function getNumberGuide(id){return richGuides[id]||guides[id]||null}
export function closureSvgMarkup(id){
 const g=getNumberGuide(id);if(!g)return '';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 900"><g fill="none" stroke="#37424c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${g.extraShapes}</g></svg>`;
}
export function numberSvgMarkup(id){
 const g=getNumberGuide(id);if(!g)return '';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 900" aria-hidden="true"><g fill="#28343b" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700">${[...g.labels,...getExtraFillLabels(id)].map(l=>`<text x="${l.x}" y="${l.y}" font-size="${l.size||28}">${l.number}</text>`).join('')}</g></svg>`;
}
