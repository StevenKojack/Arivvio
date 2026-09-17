"use client";
import {useEffect,useRef} from "react";
export function CalendarDayMenu({x,y,blocked,close,block,add,special}:{x:number;y:number;blocked:boolean;close:()=>void;block:()=>void;add:()=>void;special:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
 return <dialog ref={ref} aria-label="Calendar day actions" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}} className="calendar-menu hub-card m-0" style={{left:x,top:y}}><div><button onClick={()=>{block();close();}}>{blocked ? "Unblock day":"Block day"}</button><button onClick={()=>{add();close();}}>Add event</button><button onClick={()=>{special();close();}}>Special hours</button><button onClick={close}>Close menu</button></div></dialog>;
}
