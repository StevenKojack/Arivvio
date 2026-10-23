import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier, context, next) {
  if (specifier === '@supabase/supabase-js') return {url:'data:text/javascript,export function createClient(){return {}}',shortCircuit:true};
  return next(specifier,context);
}});
const {createBrowserSupabaseClient}=await import('./client.ts');
test('browser clients share auth listeners while server clients remain isolated',()=>{
  const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.example';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
  try {
    assert.notEqual(createBrowserSupabaseClient(),createBrowserSupabaseClient());
    globalThis.window={};
    assert.equal(createBrowserSupabaseClient(),createBrowserSupabaseClient());
    delete globalThis.window;
    assert.notEqual(createBrowserSupabaseClient(),createBrowserSupabaseClient());
  } finally {
    delete globalThis.window;
    if(oldUrl===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
    if(oldKey===undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;
  }
});
