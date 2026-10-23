// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAD7 } from '../../src/data/scales/mentalHealth/gad7.ts';
import { PHQ9 } from '../../src/data/scales/mentalHealth/phq9.ts';
import {
  nextItem, previousItem, progress, visibleItems, cleanAnswers, questionText, criticalAlert, signatureFrom, introText,
  type ActiveTest,
} from '../../src/utils/chatTest.ts';
import {
  startConversation, respond, beginChatTest, askQuestion, recordChatAnswer, pauseChatTest, alertDuringTest,
  afterTest, getQuickReplies, type Known,
} from '../../src/utils/accueilFlow.ts';
import type { AssessmentScale } from '../../src/types/assessment.ts';

const k: Known = { isAuthenticated: false, guestRemaining: 3, doneScaleIds: [], labelOf: () => 'Anxiété', minutesOf: () => 3, genre: 'femme' };

test('ordre des questions : celui du test classique, une à une', () => {
  const ans: Record<number, number> = {};
  const seen: number[] = [];
  let it = nextItem(GAD7, ans);
  while (it) { seen.push(it.id); ans[it.id] = 0; it = nextItem(GAD7, ans); }
  assert.deepEqual(seen, GAD7.items.map(i => i.id));
  assert.deepEqual(progress(GAD7, ans), { done: GAD7.items.length, total: GAD7.items.length });
});

test('items conditionnels : même règle que la page de test', () => {
  const sc = {
    ...GAD7,
    items: [
      { ...GAD7.items[0], id: 1 },
      { ...GAD7.items[1], id: 2, conditional: { itemId: 1, value: 3 } },
      { ...GAD7.items[2], id: 3 },
    ],
  } as AssessmentScale;
  assert.equal(visibleItems(sc, { 1: 0 }).length, 2);
  assert.equal(nextItem(sc, { 1: 0 })!.id, 3);
  assert.equal(nextItem(sc, { 1: 3 })!.id, 2);
  // réponse devenue inutile : retirée avant le calcul
  assert.deepEqual(cleanAnswers(sc, { 1: 0, 2: 2, 3: 1 }), { 1: 0, 3: 1 });
});

test('revenir en arrière', () => {
  const ans = { 1: 0, 2: 1, 3: 2 };
  assert.equal(previousItem(GAD7, ans, 4)!.id, 3);
  assert.equal(previousItem(GAD7, ans, 2)!.id, 1);
  assert.equal(previousItem(GAD7, ans, 1), null);
});

test('encouragements : mi-chemin et dernière question', () => {
  assert.match(questionText(PHQ9.items[4], 4, 9), /mi-chemin/);
  assert.match(questionText(PHQ9.items[8], 8, 9), /^Dernière question/);
  assert.equal(questionText(PHQ9.items[1], 1, 9), PHQ9.items[1].text);
  assert.match(introText('Anxiété', 8, 0), /8 petites questions.*diagnostic/);
  assert.match(introText('Anxiété', 8, 3), /question 4 sur 8/);
});

test('alerte critique (PHQ-9 item 9) : même message, accordé au genre ; GAD-7 item 7 = niveau 2, pas de crise', () => {
  assert.match(criticalAlert(PHQ9, 9, 1, 'femme')!, /morte.*seule/);
  assert.match(criticalAlert(PHQ9, 9, 2, 'homme')!, /mort\b.*seul\b/);
  assert.equal(criticalAlert(PHQ9, 9, 0), null);
  assert.equal(criticalAlert(GAD7, 7, 3), null);
});

test('signature : même calcul que la page de test', () => {
  const sig = signatureFrom(GAD7, { 1: 2, 2: 1 });
  assert.deepEqual(sig, [{ value: 2, max: 3 }, { value: 1, max: 3 }]);
});

test('conversation : début, réponse, pause, reprise par la carte', () => {
  const t: ActiveTest = { scaleId: 'gad7', sessionId: 'g1', guest: true, answers: {}, askedItemId: null };
  let s = startConversation(k);
  s = beginChatTest(s, t, 'intro');
  assert.equal(s.step, 'testing');
  assert.deepEqual(getQuickReplies(s, k), []);
  s = askQuestion(s, 1, GAD7.items[0].text);
  assert.equal(s.activeTest!.askedItemId, 1);
  s = recordChatAnswer(s, 1, 2, 'Plus de la moitié du temps');
  assert.deepEqual(s.activeTest!.answers, { 1: 2 });
  assert.equal(s.messages.at(-1)!.text, 'Plus de la moitié du temps');
  // texte libre pendant le test : on invite à choisir une réponse, sans quitter le test
  const free = respond(s, { text: 'je sais pas trop' }, k);
  assert.equal(free.step, 'testing');
  assert.match(free.messages.at(-1)!.text, /choisis plutôt une des réponses/);
  // pause : réponses gardées, carte pour reprendre
  const p = pauseChatTest(s, 1, 'Anxiété');
  assert.equal(p.step, 'prescribed');
  assert.equal(p.activeTest, undefined);
  assert.deepEqual(p.messages.at(-1)!.card, { type: 'test', scaleId: 'gad7', resume: true });
  assert.match(p.messages.at(-1)!.text, /arrêtée/);
});

test('crise pendant le test : ressources, puis retour au test', () => {
  const t: ActiveTest = { scaleId: 'gad7', sessionId: 'g1', guest: true, answers: { 1: 0 }, askedItemId: 2 };
  let s = beginChatTest(startConversation(k), t, 'intro');
  s = respond(s, { text: "j'ai envie de mourir" }, k);
  assert.equal(s.step, 'crisis');
  assert.ok(s.messages.some(m => m.card?.type === 'crisis'));
  s = respond(s, { value: 'crisis:safe', label: 'ok' }, k);
  assert.equal(s.step, 'testing');
  assert.deepEqual(s.activeTest!.answers, { 1: 0 });
  // alerte venant d'une réponse : carte de crise, le test continue
  const a = alertDuringTest(s, 'message');
  assert.equal(a.step, 'testing');
  assert.equal(a.messages.at(-2)!.card?.type, 'crisis');
});

test('fin du test : commentaire + lien vers le résultat détaillé', () => {
  const t: ActiveTest = { scaleId: 'gad7', sessionId: 'g1', guest: true, answers: {}, askedItemId: null };
  const s = beginChatTest(startConversation(k), t, 'intro');
  const done = afterTest(s, { scaleId: 'gad7', resultLabel: 'Anxiété légère', severity: 'mild', referralRequired: false },
    { portraitPct: 10, guestRemaining: 2, resultPath: '/assessment/results/g1?guest=true' }, k);
  assert.equal(done.activeTest, undefined);
  assert.notEqual(done.step, 'testing');
  const first = done.messages.find(m => /Tu as terminé/.test(m.text))!;
  assert.deepEqual(first.card, { type: 'result', path: '/assessment/results/g1?guest=true' });
});

test('réponse critique : jamais « rassurant », pas de test suivant, ressources affichées', () => {
  const t: ActiveTest = { scaleId: 'phq9', sessionId: 'g2', guest: true, answers: {}, askedItemId: null };
  const s = beginChatTest(startConversation(k), t, 'intro');
  const done = afterTest(s, { scaleId: 'phq9', resultLabel: 'Moral plutôt bon', severity: 'minimal', referralRequired: false, alertLevel: 3 },
    { portraitPct: 3, guestRemaining: 2, resultPath: '/r' }, k);
  const txt = done.messages.map(m => m.text).join(' ');
  assert.doesNotMatch(txt, /rassurant/);
  assert.equal(done.prescribed, undefined);
  assert.ok(!done.messages.some(m => m.card?.type === 'test'));
  assert.ok(done.messages.some(m => m.card?.type === 'crisis'));
  assert.match(alertDuringTest(s, 'x', true).messages.at(-1)!.text, /regarde l'ensemble/);
  assert.doesNotMatch(txt, /👏/);
  // ressources déjà affichées juste avant (alerte pendant le test) : pas de deuxième carte
  const after = afterTest(alertDuringTest(s, 'x', true), { scaleId: 'phq9', resultLabel: 'x', severity: 'minimal', referralRequired: false, alertLevel: 3 },
    { portraitPct: 3, guestRemaining: 2 }, k);
  assert.equal(after.messages.filter(m => m.card?.type === 'crisis').length, 1);
});

test('alerte de niveau 2 : on le signale sans dramatiser, le portrait continue', () => {
  const s = beginChatTest(startConversation(k), { scaleId: 'gad7', sessionId: 'g3', guest: true, answers: {}, askedItemId: null }, 'i');
  const done = afterTest(s, { scaleId: 'gad7', resultLabel: 'Légère', severity: 'mild', referralRequired: false, alertLevel: 2 },
    { portraitPct: 3, guestRemaining: 2 }, k);
  assert.match(done.messages.map(m => m.text).join(' '), /mérite qu'on s'y arrête/);
  assert.ok(done.messages.some(m => m.card?.type === 'test'));
});
