import type { ArivvioSupabaseClient } from '../repositories/types';
import { requestQuotesFromCart } from '../services/quoteService';
export async function loadCloudCart(client:ArivvioSupabaseClient,eventId:string){
 const {data,error}=await client.from('cart_items').select('*').eq('event_id',eventId).eq('status','draft');if(error)throw error;return data??[];
}
export async function removeCloudCartItem(client:ArivvioSupabaseClient,eventId:string,id:string){
 const {error}=await client.from('cart_items').update({status:'removed'}).eq('id',id).eq('event_id',eventId);if(error)throw error;
}
export async function sendCloudCart(client:ArivvioSupabaseClient,eventId:string,ids:string[],message:string){
 const {data:event,error}=await client.from('events').select('*').eq('id',eventId).single();if(error)throw error;
 if(['cancelled','completed'].includes(event.status))throw new Error('This event is read only.');
 const rows=(await loadCloudCart(client,eventId)).filter(row=>ids.includes(row.id));
 if(rows.length!==ids.length)throw new Error('Your shortlist changed. Reload before sending requests.');
 return requestQuotesFromCart(client,{event,plannerId:event.planner_id,cartItems:rows,message:message.trim()});
}
