const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../_drloProgramme');

test('propose : axe inconnu refusé, contexte nettoyé', () => {
  assert.equal(P.sanitizePropose({ axis: 'tdah' }), null);
  const c = P.sanitizePropose({ axis: 'stress', prenom: 'Awa\nX', genre: 'autre', signals: [{ test: 'Anxiété', result: 'Anxiété légère' }, { test: '' }], moodLowDays: 99 });
  assert.equal(c.genre, null);
  assert.equal(c.signals.length, 1);
  assert.equal(c.moodLowDays, 31);
  const pr = P.buildProposePrompt(c);
  assert.match(pr.user, /SA1 = Respirer 4-6/);
  assert.match(pr.system, /n'inventes aucun exercice/);
});

test('propose : seuls les exercices de la semaine 1 de l\'axe sont gardés', () => {
  const out = P.parsePropose('ok {"intro":"Ton stress est là (e) ces temps-ci.","order":["SA4","SA4","HU1","SA2","inventé"]}', 'stress');
  assert.deepEqual(out.order, ['SA4', 'SA2']);
  assert.equal(out.intro, 'Ton stress est là ces temps-ci.');
  assert.equal(P.parsePropose('{"intro":"","order":[]}', 'stress'), null);
  assert.equal(P.parsePropose('pas de json', 'stress'), null);
});

test('propose fragile : le prompt demande d\'orienter vers un professionnel', () => {
  const pr = P.buildProposePrompt(P.sanitizePropose({ axis: 'humeur', fragile: true }));
  assert.match(pr.system, /professionnel/);
  assert.match(pr.user, /légère/);
});

test('bilan : conseil fermé, texte borné, humeur basse → 1515', () => {
  const c = P.sanitizeBilan({ axis: 'sommeil', week: 9, activeDays: 12, counts: { mood: 3 }, moodNow: 1.5, sleep: { mal: 4 } });
  assert.equal(c.week, 4);
  assert.equal(c.activeDays, 7);
  const pr = P.buildBilanPrompt(c);
  assert.match(pr.system, /1515/);
  assert.match(pr.user, /4 mauvaises/);
  const b = P.parseBilan(`{"text":"${'a'.repeat(900)}","advice":"tout arrêter"}`);
  assert.equal(b.advice, 'garder');
  assert.ok(b.text.length <= 700);
});
