const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanNotes, MAX_NOTES } = require('../_drloMemory.js');

test('les notes de Dr Lô sont propres et limitées', () => {
  const now = new Date('2026-10-26T10:00:00Z');
  const out = cleanNotes('Voici : ["Vit une séparation récente", "vit une séparation récente", "Aime qu\'on aille droit au but"]', [{ text: 'Aime qu\'on aille droit au but', at: '2026-10-01T00:00:00Z' }], now);
  assert.deepEqual(out.map(n => n.text), ['Vit une séparation récente', 'Aime qu\'on aille droit au but']);
  assert.equal(out[1].at, '2026-10-01T00:00:00Z');
  assert.equal(out[0].at, now.toISOString());
  assert.equal(cleanNotes('pas de json'), null);
  assert.equal(cleanNotes(JSON.stringify(Array.from({ length: 30 }, (_, i) => `note ${i}`))).length, MAX_NOTES);
});
