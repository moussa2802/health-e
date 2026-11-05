const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanNotes, MAX_NOTES } = require('../_drloMemory.js');

test('les notes de Dr Lô sont propres et limitées', () => {
  const now = new Date('2026-10-26T10:00:00Z');
  const out = cleanNotes('Voici : ["Vit une séparation récente", "vit une séparation récente", "Aime qu\'on aille droit au but"]', [{ text: 'Aime qu\'on aille droit au but', at: '2026-10-01T00:00:00Z' }], now);
  assert.deepEqual(out.map(n => n.text), ['Vit une séparation récente', 'Aime qu\'on aille droit au but']);
  assert.equal(out[1].at, '2026-10-01T00:00:00Z');
  assert.equal(out[0].at, now.toISOString());
  assert.equal(cleanNotes('pas de json'), null);
  assert.equal(cleanNotes(JSON.stringify(Array.from({ length: 30 }, (_, i) => `note ${i}`))).length, MAX_NOTES);
});

test('le carnet range les notes par thème et dit ce qui est nouveau', () => {
  const { newNotes, shouldRemember } = require('../_drloMemory.js');
  const now = new Date('2026-11-04T10:00:00Z');
  const cur = ['Vit à Thiès'];
  const out = cleanNotes('[{"t":"Vit à Thiès","c":"vie"},{"t":"Sa sœur Awa se marie en décembre","c":"proches"},{"t":"Entretien jeudi","c":"inconnu"}]', cur, now);
  assert.deepEqual(out.map(n => n.cat), ['vie', 'proches', 'vie']);
  assert.deepEqual(newNotes(out, cur).map(n => n.text), ['Sa sœur Awa se marie en décembre', 'Entretien jeudi']);
  assert.equal(shouldRemember(1), false);
  assert.equal(shouldRemember(2), true);
  assert.equal(shouldRemember(3), true);
  assert.equal(shouldRemember(4), false);
  assert.equal(shouldRemember(6), true);
});

test('le tiroir intime est gardé à part et jamais annoncé', () => {
  const out = cleanNotes('[{"t":"Parle de difficultés d\'érection qu\'il relie au stress","c":"intime"},{"t":"Travaille de nuit","c":"vie"}]', []);
  assert.deepEqual(out.map(n => n.cat), ['intime', 'vie']);
  const { formatMemory } = require('../_drloMemory.js');
  assert.match(formatMemory(out), /INTIME \(discret/);
});

test('tiroir intime : la sexualité est rangée dans « intime » même si l\'IA choisit un autre thème', () => {
  const { cleanNotes, catOf } = require('../_drloMemory');
  const out = cleanNotes('[{"t":"Souhaite consulter un vrai médecin pour le sommeil et les difficultés érectiles","c":"suivre"},{"t":"Dort mal","c":"pese"}]');
  assert.equal(out[0].cat, 'intime');
  assert.equal(out[1].cat, 'pese');
  assert.equal(catOf('Parle de sa libido', 'vie'), 'intime');
});
