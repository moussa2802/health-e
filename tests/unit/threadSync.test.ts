import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeIndex, pickNewer, trimForCloud } from '../../src/utils/threadSync.ts';
import { deleteConv, emptyIndex } from '../../src/utils/conversations.ts';

const st = (n: number, savedAt?: string, talkStart?: number) => ({
  v: 1 as const, seq: n, messages: Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}` })),
  ...(savedAt ? { savedAt } : {}), ...(talkStart !== undefined ? { talk: { conv: 'x', start: talkStart } } : {}),
});

test('la version la plus récente l\'emporte', () => {
  assert.equal(pickNewer(null, st(3)), 'remote');
  assert.equal(pickNewer(st(3), null), 'local');
  assert.equal(pickNewer(st(9, '2026-10-20T10:00:00Z'), st(2, '2026-10-24T10:00:00Z')), 'remote'); // effacée puis reprise ailleurs
  assert.equal(pickNewer(st(5, '2026-10-24T11:00:00Z'), st(8, '2026-10-24T10:00:00Z')), 'local');
  assert.equal(pickNewer(st(5), st(8)), 'remote');
});

test('le compte garde les derniers messages, la discussion approfondie suit', () => {
  const t = trimForCloud(st(310, undefined, 305), 300);
  assert.equal(t.messages.length, 300);
  assert.deepEqual(t.messages[0], { id: 'm11' });
  assert.equal(t.talk!.start, 295);
  assert.equal(trimForCloud(st(10), 300).messages.length, 10);
});

test('les listes de discussions se réunissent, les supprimées ne reviennent pas', () => {
  const a = { ...emptyIndex(), list: [...emptyIndex().list, { id: 'c1', title: 'Couple', updatedAt: '2026-10-20T00:00:00Z' }] };
  const b = { ...emptyIndex(), list: [...emptyIndex().list, { id: 'c2', title: 'Travail', updatedAt: '2026-10-21T00:00:00Z' }] };
  const m = mergeIndex(a, b);
  assert.deepEqual(m.list.map(c => c.id).sort(), ['c1', 'c2', 'main']);
  const del = deleteConv(m, 'c1');
  assert.deepEqual(mergeIndex(b, del).list.map(c => c.id).sort(), ['c2', 'main']);
  assert.deepEqual(mergeIndex(del, a).list.map(c => c.id).sort(), ['c2', 'main']);
  assert.equal(mergeIndex(a, null), a);
});

import { rebuildToday } from '../../src/utils/confierFlow.ts';

test('la séance « Écrire » du jour se reconstruit depuis le journal du compte', () => {
  const day = (iso: string) => iso.slice(0, 10);
  const list = [
    { id: 'j3', date: '2026-10-24T18:00:00Z', contenu: 'ce soir', drLo: null },
    { id: 'j2', date: '2026-10-24T09:00:00Z', contenu: 'ce matin', drLo: 'Je t\'entends.' },
    { id: 'j1', date: '2026-10-23T22:00:00Z', contenu: 'hier', drLo: null },
  ];
  const s = rebuildToday(list, '2026-10-24', day)!;
  assert.deepEqual(s.items.map(i => i.kind), ['entry', 'advice', 'entry']);
  assert.equal((s.items[0] as { text: string }).text, 'ce matin');
  assert.equal(s.advisedUpTo, 1);
  assert.equal(rebuildToday(list, '2026-10-25', day), null);
});
