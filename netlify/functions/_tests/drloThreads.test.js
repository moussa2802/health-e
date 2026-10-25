const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _cleanIndex } = require('../drlo-threads.js');

test('la liste des discussions est nettoyée avant d\'être gardée', () => {
  const ix = _cleanIndex({ current: '../x', list: [{ id: 'main', title: 'Discussion principale', updatedAt: '2026-10-24' }, { id: '../../etc' }, { id: 'cmgx3k2a1', title: 'x'.repeat(90), updatedAt: '2026-10-24' }], deleted: ['c12345', 'nope'] });
  assert.equal(ix.current, 'main');
  assert.deepEqual(ix.list.map(c => c.id), ['main', 'cmgx3k2a1']);
  assert.equal(ix.list[1].title.length, 40);
  assert.deepEqual(ix.deleted, ['c12345']);
  assert.equal(_cleanIndex(null), null);
});
