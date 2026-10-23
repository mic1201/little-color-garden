// Fit without stretching the existing logical 1000×900 artwork.
export function fitBoard(width,height){const w=Math.max(1,Math.min(width,height*10/9));return {width:w,height:w*9/10}}
export function createFocusMode({root,doc,onChange}){
 let focused=false,tools=false,owned=false,epoch=0;
 const full=()=>doc.fullscreenElement===root||doc.webkitFullscreenElement===root;
 const emit=()=>onChange({focused,tools,native:full()});
 async function enter(){focused=true;tools=false;const token=++epoch;emit();const request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request)return;try{await request.call(root);if(token!==epoch||!focused){if(full())await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);return}owned=full();emit()}catch{if(token===epoch&&focused)emit()}}
 async function exit(){++epoch;focused=false;tools=false;owned=false;emit();if(full())try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc)}catch{focused=full();emit()}}
 function change(){if(full()){owned=true;focused=true}else if(owned){focused=false;tools=false;owned=false}emit()}
 function toggleTools(){tools=!tools;emit()}
 return {enter,exit,change,toggleTools,getState:()=>({focused,tools,native:full()})};
}
