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
  assert.ok((state.items.at(-1) as { text: string }).text.length < 90, 'une phrase brève, pas un conseil');
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

test('l\'accusé de réception reprend le thème, sans conseil', () => {
  assert.match(ackFor(1, 'je me dispute souvent avec ma mère et ça me pèse'), /famille/);
  assert.match(ackFor(1, 'mon copain ne me parle plus'), /cœur/);
  assert.match(ackFor(1, 'mon patron me met la pression'), /travail/);
  assert.equal(ackFor(1, 'rien de spécial'), 'Je t\'entends.');
});

test('page du jour : les passages s\'ajoutent à une même page, et s\'en retirent', async () => {
  const { joinParagraphs, removeParagraph, setDayPage } = await import('../../src/utils/confierFlow.ts');
  let page = joinParagraphs('', '  Matin difficile.  ');
  assert.equal(page, 'Matin difficile.');
  page = joinParagraphs(page, 'Ça va mieux ce soir.');
  assert.equal(page, 'Matin difficile.\n\nÇa va mieux ce soir.');
  assert.equal(removeParagraph(page, 'Ça va mieux ce soir.'), 'Matin difficile.');
  assert.equal(removeParagraph('Seul passage', 'Seul passage'), '');
  assert.equal(removeParagraph(page, 'introuvable'), page);
  const s = setDayPage(emptyConfier(), 'Famille', 'j9');
  assert.deepEqual(s.pages, { Famille: 'j9' });
});
