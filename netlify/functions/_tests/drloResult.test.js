// Lancer : node --test netlify/functions/_tests/drloResult.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeInput, mustUseTemplate, buildSystemPrompt, buildUserPrompt, cleanOutput } = require('../_drloResult');

test('pas d\'IA pour une alerte, une orientation ou un résultat sévère', () => {
  assert.equal(mustUseTemplate(sanitizeInput({ scaleId: 'phq9', resultLabel: 'x', alertLevel: 2 })), true);
  assert.equal(mustUseTemplate(sanitizeInput({ scaleId: 'phq9', resultLabel: 'x', alertLevel: 3 })), true);
  assert.equal(mustUseTemplate(sanitizeInput({ scaleId: 'phq9', resultLabel: 'x', referralRequired: true })), true);
  assert.equal(mustUseTemplate(sanitizeInput({ scaleId: 'phq9', resultLabel: 'x', severity: 'severe' })), true);
  assert.equal(mustUseTemplate(sanitizeInput({ scaleId: 'gad7', resultLabel: 'Légère', severity: 'mild' })), false);
});

test('entrée nettoyée : identifiant valide, textes tronqués, genre contrôlé', () => {
  const i = sanitizeInput({ scaleId: 'gad7; drop', resultLabel: 'a'.repeat(500), genre: 'autre', description: 'd'.repeat(2000) });
  assert.equal(i.scaleId, '');
  assert.equal(i.resultLabel.length, 80);
  assert.equal(i.genre, '');
  assert.equal(i.description.length, 400);
});

test('le prompt impose la voix, la brièveté, aucune question, aucun score', () => {
  const sys = buildSystemPrompt();
  assert.match(sys, /70 mots/);
  assert.match(sys, /AUCUNE question/);
  assert.match(sys, /CE QUI EST INTIME RESTE INTIME/);
  const u = buildUserPrompt(sanitizeInput({ scaleId: 'gad7', scaleLabel: 'Anxiété', resultLabel: 'Anxiété légère', prenom: 'Awa', genre: 'femme' }));
  assert.match(u, /Awa/);
  assert.match(u, /femme/);
});

test('sortie : acceptée si propre, refusée avec sigle, score, pourcentage ou question', () => {
  const ok = 'Tu es quelqu\'un qui sent vite quand ça ne va pas, et qui garde beaucoup pour toi. Ça pèse sans te briser. Ce soir, pose cinq minutes de respiration lente avant de dormir.';
  assert.equal(cleanOutput(ok), ok);
  assert.equal(cleanOutput(ok + ' Ton GAD-7 le montre.'), null);
  assert.equal(cleanOutput(ok + ' Score 8/21.'), null);
  assert.equal(cleanOutput(ok + ' Tu en penses quoi ?'), null);
  assert.equal(cleanOutput('Trop court.'), null);
  assert.equal(cleanOutput('**Titre**\n' + ok), 'Titre ' + ok);
});
