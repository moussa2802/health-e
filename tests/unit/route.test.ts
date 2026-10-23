import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startConversation, respond, routeDecision, newDay, firstName, welcomeAfterAuth, addExchange,
  type Known, type AccueilState, type RouteDecision,
} from '../../src/utils/accueilFlow.ts';

const LABELS: Record<string, string> = { gad7: 'Anxiété', pss10: 'Stress', big_five: 'Personnalité' };
const guest: Known = { isAuthenticated: false, guestRemaining: 3, doneScaleIds: [], labelOf: id => LABELS[id] ?? id, minutesOf: () => 3 };
const member: Known = { ...guest, isAuthenticated: true, prenom: 'Papa Moussa LO', genre: 'homme', age: '26-35', doneScaleIds: ['gad7', 'pss10'] };
const d = (o: Partial<RouteDecision>): RouteDecision => ({ action: 'reply', scaleId: null, then: null, reply: 'ok', ...o });
const withUser = (s: AccueilState, t: string) => addExchange(s, t, []);

test('« mon ami me connaît ? » → carte Défi (compte) ; invité → espace puis Défi', () => {
  let s = withUser(startConversation(member), 'je veux voir si mon ami me connait vraiment');
  const r = routeDecision(s, d({ action: 'defi', reply: 'Bonne idée : lance ton Défi !' }), member);
  assert.equal(r.ui, 'defi'); // le Défi se prépare dans la conversation
  assert.equal(r.state.messages.at(-1)!.text, 'Bonne idée : lance ton Défi !');
  s = withUser(startConversation(guest), 'je veux voir si mon ami me connait vraiment');
  const g = routeDecision(s, d({ action: 'defi', reply: 'Bonne idée !' }), guest);
  assert.equal(g.state.messages.at(-1)!.card?.type, 'signup');
  assert.equal(g.state.pendingGo, 'defi');
  const w = welcomeAfterAuth(g.state, { isNew: true, importedTests: [], journalCount: 0, phoneOnly: false });
  assert.deepEqual(w.messages.at(-1)!.card, { type: 'go', to: 'defi' });
  assert.equal(w.pendingGo, undefined);
});

test('test choisi par l\'IA : déjà fait → proposé pour voir l\'évolution', () => {
  const s = withUser(startConversation(member), 'je dors mal');
  const r = routeDecision(s, d({ action: 'test', scaleId: 'pss10', reply: 'Dormir mal, ça use.' }), member);
  assert.equal(r.state.step, 'prescribed');
  assert.deepEqual(r.state.messages.at(-1)!.card, { type: 'test', scaleId: 'pss10' });
  assert.match(r.state.messages.at(-1)!.text, /déjà fait/);
});

test('test choisi pour un invité : genre et âge d\'abord, puis la carte', () => {
  let s = withUser(startConversation(guest), 'je suis tout le temps inquiète');
  s = routeDecision(s, d({ action: 'test', scaleId: 'gad7', reply: 'Je t\'entends.' }), guest).state;
  assert.equal(s.step, 'genre');
  s = respond(s, { value: 'genre:femme', label: 'Une femme' }, guest);
  s = respond(s, { value: 'age:18-25', label: '18-25' }, guest);
  assert.deepEqual(s.messages.at(-1)!.card, { type: 'test', scaleId: 'gad7' });
});

test('humeur / respirer → l\'interface ouvre le bon mode ; confier → bouton', () => {
  const s = withUser(startConversation(member), 'je veux juste écrire');
  assert.deepEqual(routeDecision(s, d({ action: 'confier', reply: 'Vas-y, je lis.' }), member).state.messages.at(-1)!.card, { type: 'go', to: 'confier' });
  assert.equal(routeDecision(s, d({ action: 'breath', reply: 'On respire.' }), member).ui, 'breath');
  assert.equal(routeDecision(s, d({ action: 'mood', reply: 'On note ça.' }), member).ui, 'mood');
});

test('crise : toujours les messages validés, jamais le texte de l\'IA', () => {
  const s = withUser(startConversation(member), 'dama sonn');
  const r = routeDecision(s, d({ action: 'crisis', reply: 'texte IA' }), member);
  assert.equal(r.state.step, 'crisis');
  assert.ok(!r.state.messages.some(m => m.text === 'texte IA'));
  assert.equal(r.state.messages.at(-1)!.card?.type, 'crisis');
});

const testing = (): AccueilState => ({
  ...startConversation(member), step: 'testing', prescribed: 'big_five',
  activeTest: { scaleId: 'big_five', sessionId: 'x', guest: false, answers: { 1: 4 }, askedItemId: 2 },
});

test('pendant un test : « je comprends pas » → reformulation, le test continue', () => {
  const r = routeDecision(withUser(testing(), 'je comprends pas'), d({ action: 'explain', reply: 'Autrement dit : tu fais confiance facilement ?' }), member);
  assert.equal(r.state.step, 'testing');
  assert.equal(r.state.activeTest!.askedItemId, 2);
  assert.match(r.state.messages.at(-1)!.text, /Autrement dit/);
});

test('pendant un test : « je voulais faire un défi » → pause gardée + Défi', () => {
  const r = routeDecision(withUser(testing(), 'en fait je voulais faire un défi'), d({ action: 'pause', then: 'defi', reply: 'On met le test de côté.' }), member, { doneCount: 1, testLabel: 'Personnalité' });
  assert.equal(r.state.step, 'prescribed');
  assert.equal(r.state.activeTest, undefined);
  const c = r.state.messages.filter(m => m.card).map(m => m.card);
  assert.deepEqual(c.at(-1), { type: 'test', scaleId: 'big_five', resume: true });
  assert.equal(r.ui, 'defi');
});

test('pendant un test : remarque → un mot puis la question reposée', () => {
  const r = routeDecision(withUser(testing(), 'pas facile ces questions'), d({ action: 'continue', reply: 'Je comprends.' }), member, { currentQuestion: { itemId: 2, text: 'Question 2' } });
  assert.equal(r.state.messages.at(-1)!.text, 'Question 2');
  assert.equal(r.state.step, 'testing');
});

test('prénom : premier mot seulement ; nouveau jour → nouvelle salutation', () => {
  assert.equal(firstName('Papa Moussa LO'), 'Papa');
  assert.equal(firstName('  awa '), 'Awa');
  assert.equal(firstName(''), undefined);
  const s0 = startConversation(member);
  assert.match(s0.messages[0].text, /^Bonjour Papa 👋/);
  const s1 = newDay(s0, '2026-10-23', member);
  assert.equal(s1.day, '2026-10-23');
  assert.equal(s1.messages.length, s0.messages.length);
  const s2 = newDay(s1, '2026-10-24', member);
  assert.match(s2.messages.at(-1)!.text, /^Re-bonjour Papa/);
  assert.equal(s2.step, 'need');
  const t = newDay({ ...testing(), day: '2026-10-23' }, '2026-10-24', member);
  assert.equal(t.step, 'testing');
});
