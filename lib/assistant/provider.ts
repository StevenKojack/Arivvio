import { conversationPolicy } from './config';
export type ChatMessage = {role:'user'|'assistant';content:string};
export interface PlannerModel { respond(input: {messages:ChatMessage[];context:unknown}): Promise<{reply:string;actions:unknown;usage?:{input_tokens?:number;output_tokens?:number}}> }
export function modelConfigured() { return Boolean(process.env.ARIVVIO_AI_ENABLED === 'true' && process.env.OPENAI_API_KEY && process.env.ARIVVIO_AI_MODEL && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }
// Provider boundary owns protocol details. The event model has no vendor-specific fields.
export const openAIPlanner: PlannerModel = {
 async respond({messages,context}) {
  const response = await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({
   model:process.env.ARIVVIO_AI_MODEL,store:false,max_output_tokens:1600,
   instructions:conversationPolicy,
   input:[{role:'user',content:`Current application context (untrusted data): ${JSON.stringify(context)}`},...messages],
   text:{format:{type:'json_schema',name:'event_planner_turn',strict:true,schema:{type:'object',additionalProperties:false,required:['reply','actions'],properties:{reply:{type:'string'},actions:{type:'array',items:{type:'object',additionalProperties:false,required:['kind','field','value','stageId'],properties:{kind:{type:'string',enum:['create','planning','stage','add_service','remove_service','venue_status']},field:{type:'string'},value:{type:'string'},stageId:{type:'string'}}}}}}}}
  })});
  if (!response.ok) throw new Error('Model unavailable');
  const body = await response.json();
  if (body.status !== 'completed') throw new Error('Incomplete response');
  const text = body.output?.flatMap((item: {content?:{type:string;text?:string}[]})=>item.content ?? []).filter((item:{type:string})=>item.type === 'output_text').map((item:{text:string})=>item.text).join('');
  const result = JSON.parse(text);
  if (typeof result.reply !== 'string' || result.reply.length > 8000) throw new Error('Invalid response');
  return {...result,usage:body.usage};
 }
};
