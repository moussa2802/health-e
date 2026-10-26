import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseRich } from '../../src/utils/richText.ts';

test('les réponses de Dr Lô s\'affichent sans astérisques', () => {
  assert.deepEqual(parseInline('Ce qui **te rend attachant**, c\'est *ça*.'), [
    { t: 'Ce qui ' }, { t: 'te rend attachant', b: true }, { t: ', c\'est ' }, { t: 'ça', i: true }, { t: '.' },
  ]);
  assert.deepEqual(parseInline('en cours **d\'écri'), [{ t: 'en cours d\'écri' }]);
  const b = parseRich('# Qui tu es vraiment\n\nTu es **rare**.\n- un\n- deux\n\n---\nFin');
  assert.deepEqual(b.map(x => x.kind), ['h', 'p', 'li', 'li', 'p']);
  assert.equal(b[0].spans[0].b, true);
  assert.equal(b[0].spans[0].t, 'Qui tu es vraiment');
});
