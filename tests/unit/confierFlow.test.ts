// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyConfier, deposit, markSaved, markCancelled, markError, pendingForAdvice, addAdvice, entries, ackFor, hasLiveEntries, MAX_ITEMS,
} from '../../src/utils/confierFlow.ts';

test('déposer : l\'entrée part au journal, Dr Lô répond d\'un mot bref', () => {
  const { state, entryId, crisis } = deposit(emptyConfier(), '  Journée lourde au boulot.  ', 1000);
  assert.equal(crisis, false);
  const e = entries(state)[0];
  assert.equal(e.id, entryId);
  assert.equal(e.text, 'Journée lourde au boulot.');
  assert.equal(e.status, 'saving');
  assert.equal(state.items.at(-1)!.kind, 'ack');
  assert.ok((state.items.at(-1) as { text: string }).text.length < 40, 'un mot bref, pas un conseil');
  assert.notEqual(ackFor(1), ackFor(2));
});

test('crise : Dr Lô sort du silence (ressources), l\'entrée reste dans le journal', () => {
  const { state, crisis } = deposit(emptyConfier(), "des fois j'ai envie de mourir");
  assert.equal(crisis, true);
  assert.equal(state.items.at(-1)!.kind, 'crisis');
  assert.equal(entries(state).length, 1);
});

test('enregistré → annulé ; erreur visible', () => {
  let { state, entryId } = deposit(emptyConfier(), 'a');
  state = markSaved(state, entryId, 'j1');
  assert.equal(entries(state)[0].status, 'saved');
  assert.equal(entries(state)[0].journalId, 'j1');
  assert.equal(hasLiveEntries(state), true);
  state = markCancelled(state, entryId);
  assert.equal(entries(state)[0].status, 'cancelled');
  assert.equal(hasLiveEntries(state), false);
  const b = deposit(state, 'b');
  assert.equal(entries(markError(b.state, b.entryId)).at(-1)!.status, 'error');
});

test('avis : seulement les entrées gardées depuis le dernier avis', () => {
  let s = emptyConfier();
  const a = deposit(s, 'premier'); s = markSaved(a.state, a.entryId, 'j1');
  const b = deposit(s, 'retiré'); s = markCancelled(markSaved(b.state, b.entryId, 'j2'), b.entryId);
  const c = deposit(s, 'deuxième'); s = markSaved(c.state, c.entryId, 'j3');
  let p = pendingForAdvice(s);
  assert.equal(p.count, 2);
  assert.equal(p.text, 'premier\n\ndeuxième');
  assert.equal(p.lastJournalId, 'j3');
  s = addAdvice(s, 'Mon avis');
  assert.equal(pendingForAdvice(s).count, 0);
  const d = deposit(s, 'troisième'); s = markSaved(d.state, d.entryId, 'j4');
  p = pendingForAdvice(s);
  assert.equal(p.text, 'troisième');
});

test('fil limité en taille', () => {
  let s = emptyConfier();
  for (let i = 0; i < 30; i++) s = deposit(s, `t${i}`).state;
  assert.ok(s.items.length <= MAX_ITEMS);
});
