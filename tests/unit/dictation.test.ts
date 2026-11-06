import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidy } from '../../src/hooks/useDictation.ts';

test('dictée : ponctuation dite à voix haute et majuscules', () => {
  assert.equal(tidy('je dors mal virgule je suis fatigué point d\'interrogation pourquoi'), 'Je dors mal, je suis fatigué ? Pourquoi');
  assert.equal(tidy('ça va  bien'), 'Ça va bien');
  assert.equal(tidy('le point de vue'), 'Le point de vue'); // « point » seul reste un mot
});
