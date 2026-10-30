// Lancer : node --test netlify/functions/_tests/drloChatPrompt.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _buildSystemPrompt: build, _splitActions: split } = require('../dr-lo-chat');
const { rulesV2 } = require('../_drloChatRules');
const { filterNotes, wantsJournal, wantsNumbers } = require('../_drloChatContext');
const { KORIS_COSTS } = require('../_koris');

const ctx = {
  prenom: 'Awa', age: 30, genre: 'Femme', situation: 'Célibataire',
  scores_mentaux: { gad7: { scaleName: 'Anxiété', label: 'légère', score: 8, scoreMax: 21, subscaleScores: { a: 1.5 } } },
  scores_intimes: {}, tests_bonus: {},
  journal_recent: [{ date: '2026-10-20', humeur: 'triste', themes: ['famille'], contenu: 'Ma démarche de papiers me ronge' }],
  memoire: ['Travaille comme infirmière.', 'Doit régulariser sa situation d\'immigrée au Canada.', 'Sa sœur Awa vit à Paris.'],
};

test('v2 : le principe « répondre d\'abord » et les fiches par type sont dans le prompt', () => {
  const p = build(ctx, { message: 'Est-ce que je suis jalouse ?' });
  for (const k of ['PRINCIPE N°1', 'PRINCIPE N°2', 'A. QUESTION FERMÉE', 'D. DANGER', 'K. HORS SUJET', 'L. PIÈGES', 'M. MESSAGES TRÈS COURTS', 'RELIS-TOI AVANT D\'ENVOYER']) assert.ok(p.includes(k), k);
});

test('aucun chiffre de score tant que la personne n\'en demande pas', () => {
  const sans = build(ctx, { message: 'Est-ce que je suis anxieuse ?' });
  assert.ok(sans.includes('Anxiété : légère'));
  assert.ok(!sans.includes('8/21'));
  const avec = build(ctx, { message: 'Quel est mon score d\'anxiété ?' });
  assert.ok(avec.includes('8/21'));
});

test('le journal n\'entre dans le prompt que si le message en parle', () => {
  assert.ok(!build(ctx, { message: 'Est-ce que la religion compte pour moi ?' }).includes('démarche de papiers'));
  assert.ok(build(ctx, { message: 'Relis mon journal' }).includes('démarche de papiers'));
  assert.ok(build(ctx, { message: 'Décris-moi la personne que je suis vraiment' }).includes('démarche de papiers'));
  assert.equal(wantsJournal('Salut'), false);
});

test('les notes sur les papiers ou l\'immigration restent hors du prompt sauf si le message y touche', () => {
  const notes = ctx.memoire;
  const a = filterNotes(notes, 'Est-ce que la religion a de l\'importance pour moi ?');
  assert.deepEqual(a, ['Travaille comme infirmière.', 'Sa sœur Awa vit à Paris.']);
  const b = filterNotes(notes, 'J\'ai un souci avec mes papiers');
  assert.equal(b.length, 3);
  assert.ok(!build(ctx, { message: 'Ça va ?' }).includes('immigrée'));
});

test('v1 reste disponible pour comparer, et un texte de règles peut remplacer les règles (banc d\'essai)', () => {
  assert.ok(build(ctx, { message: 'x', version: 'v1' }).includes('1. TU AS TOUTES LES DONNÉES'));
  assert.ok(!build(ctx, { message: 'x', version: 'v1' }).includes('PRINCIPE N°1'));
  const p = build(ctx, { message: 'x', rules: 'RÈGLES DE TEST UNIQUES' });
  assert.ok(p.includes('RÈGLES DE TEST UNIQUES') && !p.includes('PRINCIPE N°1'));
});

test('les balises citées dans les règles sont toutes comprises par l\'application', () => {
  const tags = [...new Set([...rulesV2(false).matchAll(/\[\[([a-z_]+)(?::ID)?\]\]/g)].map(m => m[1]))];
  for (const t of tags) {
    const id = t === 'test' ? 'test:gad7' : t === 'chaine' ? 'chaine:AbCd1234' : t;
    const out = split(`Texte\n[[${id}]]`, { AbCd1234: 'X' });
    assert.ok(out.actions.length === 1, `balise non reconnue : ${t}`);
  }
});

test('les règles disent le vrai prix d\'un message et rien de plus', () => {
  const r = rulesV2(false);
  assert.equal(KORIS_COSTS.chat, 1);
  assert.ok(r.includes('coûte 1 étincelle'));
  assert.ok(!/messages? offerts?/i.test(r));
});

test('accord féminin : « Yaay boy » seulement pour une femme', () => {
  assert.ok(rulesV2(true).includes('Yaay boy'));
  assert.ok(!rulesV2(false).includes('Yaay boy'));
});

test('wantsNumbers', () => {
  assert.equal(wantsNumbers('quel est mon score ?'), true);
  assert.equal(wantsNumbers('est-ce que je suis jaloux ?'), false);
});
