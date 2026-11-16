// Single source for the picker and its currently selected tool indicator.
export const brushes=[['marker','🖍️','彩色筆'],['crayon','✏️','蠟筆'],['soft','🖌️','水彩筆'],['spray','💨','噴漆'],['sand','🏖️','沙畫'],['stamp','⭐','蓋印章'],['ribbon','🎀','緞帶'],['eraser','▱','橡皮擦'],['fill','🪣','畫桶']];
export const stamps=[['star','★','星星'],['heart','♥','愛心'],['flower','✿','小花']];
export function updateBrushSummary(summary,icon,label,tool,shape){
 const brush=brushes.find(b=>b[0]===tool)||brushes[0];
 const stamp=tool==='stamp'?(stamps.find(s=>s[0]===shape)||stamps[0]):null;
 icon.textContent=stamp?stamp[1]:brush[1];
 label.textContent=stamp?stamp[2]+'印章':brush[2];
 summary.setAttribute('aria-label','目前工具：'+label.textContent+'，點一下選擇工具');
}
