// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startConversation, respond, afterTest, getQuickReplies, detectCrisis, classifyNeed,
  parsePrenom, parseAge, type Known, type AccueilState,
} from '../../src/utils/accueilFlow.ts';

const LABELS: Record<string, string> = { gad7: 'Anxiété', phq9: 'Humeur & Dépression', big_five: 'Personnalité', ecr_r: "Style d'attachement", pss10: 'Stress', pg13: 'Deuil & Pertes', brs: 'Résilience', rses: 'Estime de soi' };
const guest: Known = {
  isAuthenticated: false, guestRemaining: 3, doneScaleIds: [],
  labelOf: id => LABELS[id] ?? id, minutesOf: () => 3,
};
const last = (s: AccueilState) => s.messages[s.messages.length - 1];
const cards = (s: AccueilState) => s.messages.filter(m => m.card).map(m => m.card);

function guestToPrescription(needValue: string): AccueilState {
  let s = startConversation(guest);
  s = respond(s, { value: needValue, label: 'x' }, guest);
  s = respond(s, { text: 'Awa' }, guest);
  s = respond(s, { value: 'genre:femme', label: 'Une femme' }, guest);
  s = respond(s, { value: 'age:18-25', label: '18-25' }, guest);
  return s;
}

test('accueil invité : annonce les 3 tests gratuits sans compte', () => {
  const s = startConversation(guest);
  assert.match(s.messages.map(m => m.text).join(' '), /3 tests gratuits, sans créer de compte/);
  assert.equal(getQuickReplies(s, guest).length, 5);
});

test('stress → prénom → genre → âge → carte test Anxiété (4 échanges)', () => {
  const s = guestToPrescription('need:stress');
  assert.equal(s.step, 'prescribed');
  assert.equal(s.prescribed, 'gad7');
  assert.deepEqual(cards(s).at(-1), { type: 'test', scaleId: 'gad7' });
  assert.equal(s.prenom, 'Awa');
  assert.equal(s.messages.filter(m => m.from === 'user').length, 4);
});

test('correspondances besoin → test', () => {
  assert.equal(guestToPrescription('need:mal').prescribed, 'phq9');
  assert.equal(guestToPrescription('need:couple').prescribed, 'ecr_r');
  assert.equal(guestToPrescription('need:connaitre').prescribed, 'big_five');
  assert.equal(guestToPrescription('need:decouvre').prescribed, 'big_five');
});

test('utilisateur connu : pas de questions d\'identité, prescription directe', () => {
  const k: Known = { ...guest, isAuthenticated: true, prenom: 'Moussa', genre: 'homme', age: '26-35' };
  let s = startConversation(k);
  assert.match(s.messages[0].text, /Moussa/);
  s = respond(s, { value: 'need:stress', label: 'x' }, k);
  assert.equal(s.prescribed, 'gad7');
});

test('texte libre : deuil → test Deuil, sommeil → test Stress', () => {
  assert.deepEqual(classifyNeed("J'ai perdu ma mère il y a 2 mois"), { need: 'mal', scaleId: 'pg13' });
  assert.deepEqual(classifyNeed('je dors mal'), { need: 'stress', scaleId: 'pss10' });
  let s = startConversation(guest);
  s = respond(s, { text: 'Mon père est décédé et je ne m\'en remets pas' }, guest);
  s = respond(s, { value: 'prenom:skip', label: 'x' }, guest);
  s = respond(s, { value: 'genre:homme', label: 'x' }, guest);
  s = respond(s, { value: 'age:26-35', label: 'x' }, guest);
  assert.equal(s.prescribed, 'pg13');
});

test('texte incompris deux fois → on démarre en douceur, pas de boucle', () => {
  let s = startConversation(guest);
  s = respond(s, { text: 'bof' }, guest);
  assert.equal(s.step, 'need_clarify');
  s = respond(s, { text: 'euh' }, guest);
  assert.equal(s.need, 'decouvre');
  assert.equal(s.step, 'prenom');
});

test('crise détectée à n\'importe quelle étape → ressources, pas de test', () => {
  assert.ok(detectCrisis("J'ai plus envie de vivre"));
  assert.ok(detectCrisis('je pense au SUICIDE'));
  assert.ok(detectCrisis('parfois je veux me faire du mal'));
  assert.ok(!detectCrisis('je suis stressée par mon travail'));
  let s = startConversation(guest);
  s = respond(s, { text: "j'ai envie d'en finir" }, guest);
  assert.equal(s.step, 'crisis');
  assert.deepEqual(last(s).card, { type: 'crisis' });
  assert.equal(s.prescribed, undefined);
  s = respond(s, { value: 'crisis:safe', label: 'ok' }, guest);
  assert.equal(s.step, 'need');
});

test('crise pendant la question du prénom', () => {
  let s = startConversation(guest);
  s = respond(s, { value: 'need:mal', label: 'x' }, guest);
  s = respond(s, { text: 'je veux mourir' }, guest);
  assert.equal(s.step, 'crisis');
  assert.equal(s.prenom, undefined);
});

test('moins de 18 ans → aucun test, orientation adulte de confiance', () => {
  let s = startConversation(guest);
  s = respond(s, { value: 'need:couple', label: 'x' }, guest);
  s = respond(s, { text: 'Fatou' }, guest);
  s = respond(s, { value: 'genre:femme', label: 'x' }, guest);
  s = respond(s, { text: "j'ai 16 ans" }, guest);
  assert.equal(s.step, 'minor');
  assert.equal(s.prescribed, undefined);
  assert.equal(cards(s).filter(c => c?.type === 'test').length, 0);
  assert.deepEqual(getQuickReplies(s, guest), []);
});

test('après le test : commentaire + portrait + prochaine pièce (règle d\'or)', () => {
  let s = guestToPrescription('need:stress');
  const k = { ...guest, doneScaleIds: ['gad7'] };
  s = afterTest(s, { scaleId: 'gad7', resultLabel: 'Anxiété légère', severity: 'mild', referralRequired: false }, { portraitPct: 3, guestRemaining: 2 }, k);
  const txt = s.messages.slice(-3).map(m => m.text).join(' ');
  assert.match(txt, /Anxiété légère/);
  assert.match(txt, /portrait se dessine : 3 %/);
  assert.match(txt, /2 tests gratuits/);
  assert.equal(s.prescribed, 'pss10');
  // pas de double commentaire
  const again = afterTest(s, { scaleId: 'gad7', resultLabel: 'x', severity: 'mild', referralRequired: false }, { portraitPct: 3, guestRemaining: 2 }, k);
  assert.equal(again.messages.length, s.messages.length);
});

test('après le test, résultat sévère → orientation professionnelle', () => {
  let s = guestToPrescription('need:mal');
  s = afterTest(s, { scaleId: 'phq9', resultLabel: 'Période très difficile', severity: 'severe', referralRequired: true }, { portraitPct: 3, guestRemaining: 2 }, { ...guest, doneScaleIds: ['phq9'] });
  assert.ok(s.messages.some(m => /professionnel de santé/.test(m.text) && m.card?.type === 'crisis'));
});

test('après le dernier test gratuit → proposition de compte', () => {
  let s = guestToPrescription('need:connaitre');
  s = afterTest(s, { scaleId: 'big_five', resultLabel: 'Profil équilibré', severity: 'none', referralRequired: false }, { portraitPct: 9, guestRemaining: 0 }, { ...guest, doneScaleIds: ['big_five'] });
  assert.deepEqual(last(s).card, { type: 'signup' });
});

test('parseurs', () => {
  assert.equal(parsePrenom("je m'appelle aminata"), 'Aminata');
  assert.equal(parsePrenom('Moi c\'est Pape Moussa'), 'Pape');
  assert.equal(parsePrenom('?'), null);
  assert.equal(parseAge('16'), 'minor');
  assert.equal(parseAge("j'ai 29 ans"), '26-35');
  assert.equal(parseAge('aucune idée'), null);
});
