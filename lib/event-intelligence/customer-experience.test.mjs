import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('./') && !/\.(ts|mjs)$/.test(specifier)) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { recognizeEventIntent, searchEventIntents } = await import('./search.ts');
const { getEventVisualTone } = await import('./visual-tone.ts');

test('parent concepts expose taxonomy children without choosing a holiday for the user', () => {
  for (const query of ['Holiday', 'holidays', 'holiday party', 'holiday gathering']) {
    const results = searchEventIntents(query, 30);
    assert.equal(results.length, 18);
    assert.ok(results.some(item => item.label === 'Halloween'));
    assert.ok(results.some(item => item.label === 'Eid'));
    assert.equal(recognizeEventIntent(query).profile.id, 'private-party');
  }
  assert.ok(searchEventIntents('social events', 30).length > 0);
});
test('specific and unconventional occasions retain their identities', () => {
  assert.equal(recognizeEventIntent('Halloween').identity.selectedDisplayEvent, 'Halloween');
  assert.equal(recognizeEventIntent('Divorce Party').identity.canonicalEventType, 'divorce-party');
  assert.ok(searchEventIntents('Divorce Party').some(item => item.label === 'Divorce Party'));
  for (const query of ['Galactic banana party', 'Robot knitting circle', 'Space party']) {
    const result = recognizeEventIntent(query);
    assert.equal(result.profile.id, 'private-party');
    assert.equal(result.identity.selectedDisplayEvent, query);
  }
});
test('event personality is conservative for serious, professional and unknown contexts', () => {
  assert.equal(getEventVisualTone(recognizeEventIntent('Birthday')), 'celebratory');
  assert.equal(getEventVisualTone(recognizeEventIntent('Wedding')), 'elegant');
  for (const query of ['Funeral', 'Memorial', 'Celebration of Life', 'Birthday memorial', 'Corporate birthday', 'Wedding remembrance', 'Unknown occasion', 'Divorce Party']) {
    assert.equal(getEventVisualTone(recognizeEventIntent(query)), 'neutral', query);
  }
});
test('reduced-motion removes decorative effects as well as shortening transitions', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.event-moment \{ display: none !important/);
});
