const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeCompanionName: s } = require('../_companion');
const { _buildSystemPrompt: buildSystemPrompt } = require('../dr-lo-chat');

test('un prénom ou un surnom passe, nettoyé', () => {
  assert.equal(s('Kora'), 'Kora');
  assert.equal(s('  Ami   fidèle '), 'Ami fidèle');
  assert.equal(s('Aïssatou'), 'Aïssatou');
  assert.equal(s("N'Diaye"), "N'Diaye");
});

test('« docteur », « Dr », « médecin », « Lô » sont refusés', () => {
  for (const n of ['Dr Lô', 'docteur', 'Mon Docteur', 'Médecin', 'DOC', 'dr.lo', 'Lô', 'Pr Sow']) assert.equal(s(n), '', n);
});

test('vide, trop long ou avec des signes étranges : refusé', () => {
  for (const n of ['', '   ', 'x'.repeat(25), '<b>', 'a;b', null, undefined]) assert.equal(s(n), '', String(n));
});

test('le prompt présente un compagnon IA, jamais Dr Lô ni un médecin', () => {
  const p = buildSystemPrompt({ prenom: 'Awa', companion: 'Kora' }, { message: 'bonjour' });
  assert.match(p, /Tu es Kora, le compagnon de bien-être IA/);
  assert.doesNotMatch(p, /Tu es Dr Lô/);
  assert.match(p, /ni médecin, ni Dr Lô/);
  const q = buildSystemPrompt({ prenom: 'Awa', companion: 'Docteur' }, { message: 'bonjour' });
  assert.match(q, /Tu es le compagnon de bien-être IA/);
  assert.doesNotMatch(q, /Docteur/);
});
