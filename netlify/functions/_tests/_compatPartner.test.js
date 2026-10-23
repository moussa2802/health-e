// Lancer : node --test netlify/functions/_compatPartner.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codeType, partnerView } = require('../_compatPartner');

const profile = {
  uid: 'u2', displayName: 'Moussa Diop',
  onboardingProfile: { prenom: 'Moussa', genre: 'homme', age: '26-35', deuil: 'oui' },
  drLoAnalysis: 'texte privé', drLoSynthesis: 'texte privé',
  scaleResults: {
    gad7: { scaleId: 'gad7', totalScore: 6, interpretation: { label: 'Légère', severity: 'mild', description: 'long', recommendation: 'r' }, alertsTriggered: [{ itemId: 7 }] },
    hsp: { scaleId: 'hsp', totalScore: 40, interpretation: { label: 'HSP', severity: 'positive' } },
    fsfi: { scaleId: 'fsfi', totalScore: 20, interpretation: { label: 'x', severity: 'moderate' } },
  },
};

test('formats de code', () => {
  assert.equal(codeType('HE-MNT-2026-AB12'), 'mental');
  assert.equal(codeType('se-ab12'), 'sexual');
  assert.equal(codeType('n\'importe quoi'), null);
});

test('code psychologique : psy + bonus seulement, rien d\'intime ni de privé', () => {
  const v = partnerView(profile, ['mental']);
  assert.deepEqual(Object.keys(v.scaleResults).sort(), ['gad7', 'hsp']);
  assert.equal(v.prenom, 'Moussa'); assert.equal(v.genre, 'homme');
  const json = JSON.stringify(v);
  assert.doesNotMatch(json, /texte privé|deuil|alertsTriggered|description|recommendation|26-35/);
});

test('code intime : vie intime seulement', () => {
  assert.deepEqual(Object.keys(partnerView(profile, ['sexual']).scaleResults), ['fsfi']);
  assert.equal(Object.keys(partnerView(profile, ['mental', 'sexual']).scaleResults).length, 3);
});
