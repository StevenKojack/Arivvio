import { ImageResponse } from "next/og";
export const alt = "Arivvio. Plan the day. Keep it together.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:72,background:"#152035",color:"#f7f6f2"}}><div style={{display:"flex",alignItems:"center",gap:22}}><svg width="48" height="56" viewBox="220 10 520 560" fill="none"><g stroke="#c5ad72" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round"><path d="M358 500 L300 535 Q241 557 256 502 L452 69 Q480 12 506 69 L701 502 Q723 557 661 535 L601 502"/><path d="M291 324 Q393 382 480 533 Q564 393 670 324"/><path d="M438 326 L479 386 L521 326"/></g></svg><span style={{fontSize:30,letterSpacing:5}}>ARIVVIO</span></div><div style={{display:"flex",flexDirection:"column",fontSize:76,lineHeight:1.08,letterSpacing:-3}}><span>Plan the day.</span><span>Keep it together.</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:24,color:"#c5cbd5"}}><span>Venues. Vendors. One event plan.</span><span>arivvio.com</span></div></div>,size);
}
