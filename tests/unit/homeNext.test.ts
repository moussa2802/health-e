import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickHomeNext, sinceLabel, VIRAL_ORDER } from '../../src/utils/homeNext.ts';

const NOW = Date.UTC(2026, 10, 3);
const ago = (d: number) => new Date(NOW - d * 86400000);

test('un test du moment pas encore fait passe en premier', () => {
  assert.deepEqual(pickHomeNext({ gad7: ago(200) }, NOW), { kind: 'new', id: 'bonus_jalousie' });
  assert.deepEqual(pickHomeNext({ bonus_jalousie: ago(1) }, NOW, ['bonus_hsp']), { kind: 'new', id: 'bonus_tdah' });
});

test('tout est fait : on propose de refaire le test d\'état le plus ancien', () => {
  const all: Record<string, Date> = Object.fromEntries(VIRAL_ORDER.map(id => [id, ago(10)]));
  assert.equal(pickHomeNext(all, NOW), null);
  const r = pickHomeNext({ ...all, gad7: ago(60), phq9: ago(210), big_five: ago(400) }, NOW);
  assert.deepEqual(r, { kind: 'retake', id: 'phq9', days: 210 });
});

test('durées lisibles', () => {
  assert.equal(sinceLabel(210), '7 mois');
  assert.equal(sinceLabel(21), '3 semaines');
});
