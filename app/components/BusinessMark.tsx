import Image from "next/image";
const palettes=["#285957","#694755","#42476f","#66503e","#445c45","#724a37"];
export function BusinessMark({name,logo,large=false}:{name:string;logo?:string|null;large?:boolean}){
 const words=name.trim().split(/\s+/).filter(w=>/^[\p{L}\p{N}]/u.test(w));
 const letters=words.slice(0,2).map(w=>w[0]).join("").toUpperCase();
 const color=palettes[Array.from(name).reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0)%palettes.length];
 const size=large?64:40;
 return logo?<Image src={logo} alt={name+" logo"} width={size} height={size} unoptimized className="shrink-0 rounded-xl bg-white object-contain p-1" style={{width:size,height:size}}/>:<span aria-hidden="true" className="business-monogram" style={{width:size,height:size,fontSize:large?25:16,backgroundColor:color}}>{letters}</span>;
}
