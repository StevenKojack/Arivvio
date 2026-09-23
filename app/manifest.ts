import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return {name:'Arivvio',short_name:'Arivvio',description:'Your occasion. Everything it needs.',start_url:'/demo',scope:'/',display:'standalone',background_color:'#031020',theme_color:'#031020',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
