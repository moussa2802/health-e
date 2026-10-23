import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyIndex, createConv, renameConv, deleteConv, touchConv, sortedConvs, convStorageKey, MAIN_ID, defaultTitle } from '../../src/utils/conversations.ts';

test('discussions : principale + secondaires, renommer, supprimer', () => {
  let i = emptyIndex();
  assert.equal(i.current, MAIN_ID);
  const c = createConv(i, 'Ma famille', new Date('2026-10-23T10:00:00Z'));
  i = c.idx;
  assert.equal(i.current, c.id);
  assert.equal(i.list.length, 2);
  i = renameConv(i, c.id, '  Mes parents  ');
  assert.equal(i.list.find(x => x.id === c.id)!.title, 'Mes parents');
  assert.equal(renameConv(i, c.id, '').list.find(x => x.id === c.id)!.title, 'Mes parents');
  i = touchConv(i, c.id, 'ma mère ne m\'écoute pas', new Date('2026-10-24T10:00:00Z'));
  assert.equal(sortedConvs(i)[0].id, MAIN_ID);
  assert.equal(deleteConv(i, MAIN_ID).list.length, 2);
  i = deleteConv(i, c.id);
  assert.equal(i.current, MAIN_ID);
  assert.equal(i.list.length, 1);
});

test('la discussion principale garde l\'ancienne clé', () => {
  assert.equal(convStorageKey('he_accueil_v1:', 'uid1', MAIN_ID), 'he_accueil_v1:uid1');
  assert.equal(convStorageKey('he_accueil_v1:', 'uid1', 'cx'), 'he_accueil_v1:uid1:cx');
  assert.match(defaultTitle(new Date('2026-10-23T10:00:00')), /^Discussion du 23 oct\./);
});
