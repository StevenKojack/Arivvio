import { createHmac } from 'node:crypto';
// Atomic distributed counters. Fail closed if the limiter cannot be reached.
export async function reserveModelTurn(ip: string, session: string) {
 const hash = (value:string)=>createHmac('sha256',process.env.UPSTASH_REDIS_REST_TOKEN!).update(value).digest('hex').slice(0,32);
 const script = `for i=1,#KEYS do if tonumber(redis.call('GET',KEYS[i]) or '0') >= tonumber(ARGV[i*2-1]) then return 0 end end for i=1,#KEYS do local n=redis.call('INCR',KEYS[i]); if n==1 then redis.call('EXPIRE',KEYS[i],ARGV[i*2]) end end return 1`;
 const response=await fetch(process.env.UPSTASH_REDIS_REST_URL!,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(4000),body:JSON.stringify(['EVAL',script,4,`arivvio:ai:minute:${hash(ip)}`,`arivvio:ai:day:${hash(ip)}`,`arivvio:ai:session:${hash(session)}`,'arivvio:ai:global','5','60','30','86400','20','86400','200','86400'])});
 if (!response.ok) throw new Error('Usage protection unavailable');
 const body=await response.json(); if (body.error) throw new Error('Usage protection unavailable');
 return body.result === 1;
}
