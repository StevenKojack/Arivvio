import assert from 'node:assert/strict';
import test from 'node:test';
import { checklistAdditions, decimal, pricingLabel, serviceRate } from './model.ts';

test('catalog rates distinguish an unknown price from a saved zero and enforce cents', () => {
  assert.equal(decimal('', 'Price'), null);
  assert.equal(decimal('0.00', 'Price'), 0);
  assert.equal(decimal('12.25', 'Price'), 12.25);
  for (const invalid of ['-1', '1.005', '2e3', '10000000000']) assert.throws(() => decimal(invalid, 'Price'));
  assert.throws(() => decimal('0', 'Minimum hours', 999.99, true));
  assert.equal(pricingLabel('flat', null), 'Request a quote');
  assert.equal(pricingLabel('flat', 0), '$0 flat price');
  assert.equal(pricingLabel('hourly', 12.25), '$12.25 per hour');
  assert.equal(pricingLabel('hourly', 12.25, 2), '$12.25 per hour · 2 hour minimum');
  assert.equal(pricingLabel('per_guest', 45, null, 15), '$45 per guest · 15 guest minimum');
  assert.equal(serviceRate({ pricing_type: 'hourly', base_price: 95, hourly_rate: null }), 95);
  assert.equal(serviceRate({ pricing_type: 'flat', base_price: null, hourly_rate: 95 }), null);
});

test('copying checklist tasks is additive, deduplicated and detached from the template', () => {
  const tasks = [{ title: 'Pack cables', done: true }, { title: 'Check venue', done: false }];
  const template = ['Pack cables', ' Review timeline ', 'Review timeline', 'Check venue', 'Test batteries'];
  const copied = [...tasks, ...checklistAdditions(tasks, template)];
  template[1] = 'Changed template';
  assert.deepEqual(copied, [...tasks, { title: 'Review timeline', done: false }, { title: 'Test batteries', done: false }]);
  assert.deepEqual(checklistAdditions(copied, ['Review timeline']), []);
});
