// Lancer : node --test netlify/functions/_tests/motDuJour.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../_motDuJour');

test('mot du jour : une forme différente chaque jour, en boucle', () => {
  const ids = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) => M.kindFor(d).id);
  assert.equal(new Set(ids).size, 5);
  assert.equal(M.kindFor('2026-11-06').id, ids[0]);
});

test('mot du jour : jamais le tiroir intime ni ce qui pèse dans le prompt', () => {
  const memory = [
    { text: 'Aime la musique douce pour se poser', cat: 'aide' },
    { text: 'Parle de difficultés d\'érection qu\'il relie au stress', cat: 'intime' },
    { text: 'Son père est décédé il y a deux mois', cat: 'pese' },
    { text: 'Souhaite consulter pour ses difficultés érectiles', cat: 'suivre' },
  ];
  const p = M.buildMotPrompt({ day: '2026-11-05', prenom: 'Papa', genre: 'homme', companion: 'Zeus', animal: 'hibou', memory, recent: ['Hier'] });
  assert.ok(p.user.includes('musique douce'));
  assert.ok(!/érect|décédé/.test(p.user));
  assert.ok(p.system.includes('Zeus') && p.system.includes('hibou') && p.system.includes('masculin'));
});

test('mot du jour : nettoyage et garde-fous', () => {
  assert.equal(M.cleanMot('« Prends deux minutes pour toi ce soir. »'), 'Prends deux minutes pour toi ce soir.');
  assert.equal(M.cleanMot('ok'), null);
  assert.equal(M.cleanMot('Ta libido reviendra, courage.'), null);
  assert.ok(M.cleanMot('a'.repeat(30) + '. ' + 'b '.repeat(150)).length <= 221);
  assert.ok(M.fallbackFor('2026-11-05', 'femme').length > 20);
  assert.ok(!/parfait\b/.test(M.fallbackFor('2026-11-04', '')));
});
