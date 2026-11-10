// Lancer : node --test --experimental-strip-types tests/unit/versionCheck.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideVersion } from '../../src/utils/versionCheck.ts';

test('mise à jour forcée : seulement si la version en ligne est différente, et une seule fois par version', () => {
  assert.equal(decideVersion('a1fd0b49', 'a1fd0b49', null), 'rien');
  assert.equal(decideVersion('a1fd0b49', 'c0ffee12', null), 'reparer');
  assert.equal(decideVersion('a1fd0b49', 'c0ffee12', 'c0ffee12'), 'rien'); // déjà essayé : pas de boucle
  assert.equal(decideVersion('a1fd0b49', 'c0ffee12', 'b0b0b0b0'), 'reparer');
  assert.equal(decideVersion('dev', 'c0ffee12', null), 'rien'); // en développement
  assert.equal(decideVersion('a1fd0b49', null, null), 'rien'); // hors ligne
  assert.equal(decideVersion('a1fd0b49', '<!doctype html>', null), 'rien'); // fichier absent : la page HTML répond
});
