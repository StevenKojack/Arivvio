let depth=0;
let restore:(()=>void)|undefined;
/** Fixed-body lock also prevents iOS background scrolling. Supports nested dialogs. */
export function lockDocumentScroll(doc:Document=document,win:Window=window){
 if(depth++===0){
  const body=doc.body,root=doc.documentElement,x=win.scrollX,y=win.scrollY;
  const original={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow,paddingRight:body.style.paddingRight};
  const rootOverflow=root.style.overflow;
  const gap=win.innerWidth-root.clientWidth;
  if(gap>0)body.style.paddingRight=`${gap}px`;
  Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',overflow:'hidden'});root.style.overflow='hidden';
  restore=()=>{Object.assign(body.style,original);root.style.overflow=rootOverflow;const behavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';win.scrollTo(x,y);root.style.scrollBehavior=behavior;};
 }
 let released=false;return()=>{if(released)return;released=true;if(--depth===0){restore?.();restore=undefined;}};
}
