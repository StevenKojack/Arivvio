import { modelConfigured, openAIPlanner, type ChatMessage } from '@/lib/assistant/provider';
import { reserveModelTurn } from '@/lib/assistant/limits';
import { previewPlanningTurn } from '@/lib/assistant/preview';
import { buildEventIntelligenceProfile } from '@/lib/event-intelligence/engine';
import { validateActions } from '@/lib/assistant/actions';
import { clearlyOffTopic, scopeRedirect } from '@/lib/assistant/config';
import { compactEvent } from '@/lib/assistant/context';
import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';
export const runtime = 'nodejs';
export async function GET() { return Response.json({available:modelConfigured()},{headers:{'Cache-Control':'no-store'}}); }
export async function POST(request: Request) {
 if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Use the assistant on this website.'},{status:403});
 if (!modelConfigured()) return Response.json({error:'Live conversation is not connected yet. Preview your event details or continue with guided planning.',unavailable:true},{status:503});
 try {
  if (Number(request.headers.get('content-length')) > 65000) return Response.json({error:'Context is too large.'},{status:413});
  const raw=await request.text(); if(raw.length > 65000) return Response.json({error:'Context is too large.'},{status:413});
  const body=JSON.parse(raw);
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 10 || !body.messages.every((m:ChatMessage)=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string' && m.content.length<=2000) || body.messages.at(-1).role !== 'user' || typeof body.session !== 'string' || body.session.length>100) return Response.json({error:'Invalid conversation.'},{status:400});
  const latest=body.messages.at(-1).content;
  if (clearlyOffTopic(latest)) return Response.json({reply:scopeRedirect,actions:[]});
  const profile = body.profile as EventIntelligenceProfile | null;
  // Compact projection and shared intelligence validate required structure before model use.
  const event=compactEvent(profile);
  const page=body.page && typeof body.page.path==='string' ? {path:body.page.path.slice(0,200),services:Array.isArray(body.page.services)?body.page.services.slice(0,8):[],providers:Array.isArray(body.page.providers)?body.page.providers.slice(0,5):[],readOnly:Boolean(body.page.readOnly),requestStatus:typeof body.page.requestStatus === 'string' ? body.page.requestStatus.slice(0,500):''} : {};
  if (JSON.stringify(page).length > 9000) return Response.json({error:'Page context is too large.'},{status:400});
  const ip=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0] : 'local-development';
  if (!ip || !await reserveModelTurn(ip,body.session)) return Response.json({error:'Today’s conversation limit has been reached. Your plan is saved. Continue in guided planning.'},{status:429});
  const parsed=previewPlanningTurn(latest,profile);
  const deterministicPreview={actions:parsed.actions,clarification:parsed.clarification,understanding:profile ? undefined : compactEvent(buildEventIntelligenceProfile({query:latest}))};
  const result=await openAIPlanner.respond({messages:body.messages,context:{event,page,deterministicPreview}});
  const actions=validateActions(result.actions,profile);
  // Only aggregate token counts, never messages or event data.
  console.info('arivvio_ai_usage',{inputTokens:result.usage?.input_tokens,outputTokens:result.usage?.output_tokens});
  return Response.json({reply:result.reply,actions:body.page?.readOnly ? [] : actions});
 } catch { return Response.json({error:'Unable to complete this turn. Your plan has not changed. Try again or use guided planning.'},{status:502}); }
}
