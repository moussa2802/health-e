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
  // Au 2e message du jour, puis tous les 5 (A2 : avant, tous les 3)
  assert.equal(shouldRemember(1), false);
  assert.equal(shouldRemember(2), true);
  assert.equal(shouldRemember(3), false);
  assert.equal(shouldRemember(4), false);
  assert.equal(shouldRemember(5), true);
  assert.equal(shouldRemember(6), false);
  assert.equal(shouldRemember(10), true);
  assert.equal(shouldRemember(15), true);
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

test('A2 : le carnet en mode changements garde les mêmes thèmes, interdits et règles que le carnet entier', () => {
  const { buildMemoryPrompt, buildMemoryDeltaPrompt, memoryUserPayload } = require('../_drloMemory');
  const full = buildMemoryPrompt();
  const delta = buildMemoryDeltaPrompt();
  const shared = full.slice(full.indexOf('Thèmes (champ "c")'), full.indexOf('\nRéponds UNIQUEMENT'));
  assert.ok(shared.length > 1500 && delta.includes(shared));
  assert.match(delta, /"ajouter"/);
  const cur = ['Vit à Thiès', { text: 'Sa sœur Awa', cat: 'proches', at: 'x' }];
  const turns = [{ role: 'user', content: 'salut' }];
  assert.equal(memoryUserPayload(cur, turns, false), JSON.stringify({ notes_actuelles: [{ t: 'Vit à Thiès', c: 'vie' }, { t: 'Sa sœur Awa', c: 'proches' }], echanges_recents: turns }));
  assert.deepEqual(JSON.parse(memoryUserPayload(cur, turns, true)).notes_actuelles.map((n) => n.id), [1, 2]);
});

test('A2 : les changements sont appliqués au carnet actuel (ajout, modification, retrait, dates gardées)', () => {
  const { applyMemoryDelta, MAX_NOTES } = require('../_drloMemory');
  const now = new Date('2026-11-10T10:00:00Z');
  const cur = [
    { text: 'Vit à Thiès', cat: 'vie', at: '2026-10-01T00:00:00Z' },
    { text: 'Entretien jeudi', cat: 'suivre', at: '2026-10-02T00:00:00Z' },
    { text: 'Doit régulariser ses papiers', cat: 'vie', at: '2026-10-03T00:00:00Z' },
    'Aime le foot',
  ];
  const raw = 'Voici : {"ajouter":[{"t":"Son père est fier de lui","c":"proches"},{"t":"Vit à Thiès","c":"vie"}],"modifier":[{"id":2,"t":"A obtenu le poste, commence le 1er décembre","c":"vie"},{"id":99,"t":"x","c":"vie"}],"retirer":[3,"x"]}';
  const out = applyMemoryDelta(raw, cur, now);
  assert.deepEqual(out.map((n) => [n.text, n.cat]), [
    ['Vit à Thiès', 'vie'], ['A obtenu le poste, commence le 1er décembre', 'vie'], ['Aime le foot', 'vie'], ['Son père est fier de lui', 'proches'],
  ]);
  assert.equal(out[0].at, '2026-10-01T00:00:00Z');
  assert.equal(out[1].at, now.toISOString());
  // Rien ne change → le même carnet
  assert.deepEqual(applyMemoryDelta('{"ajouter":[],"modifier":[],"retirer":[]}', cur, now).map((n) => n.text), ['Vit à Thiès', 'Entretien jeudi', 'Doit régulariser ses papiers', 'Aime le foot']);
  // L'intime reste dans « intime », même si l'IA choisit un autre thème
  assert.equal(applyMemoryDelta('{"ajouter":[{"t":"Parle de difficultés d\'érection","c":"pese"}]}', [], now)[0].cat, 'intime');
  // Ancien format (carnet entier) accepté ; réponse illisible → null (l'ancien carnet est gardé)
  assert.deepEqual(applyMemoryDelta('[{"t":"Vit à Dakar","c":"vie"}]', cur, now).map((n) => n.text), ['Vit à Dakar']);
  assert.equal(applyMemoryDelta('pas de json', cur, now), null);
  assert.equal(applyMemoryDelta('{"ajouter": [', cur, now), null);
  // Plafond
  const many = JSON.stringify({ ajouter: Array.from({ length: 40 }, (_, i) => ({ t: `note ${i}`, c: 'vie' })) });
  assert.equal(applyMemoryDelta(many, cur, now).length, MAX_NOTES);
});

test('carnet : mode complet par défaut, mode changements par variable', () => {
  const { memoryDeltaMode } = require('../_drloMemory');
  assert.equal(memoryDeltaMode({}), false);
  assert.equal(memoryDeltaMode({ DRLO_MEMORY_MODE: 'complet' }), false);
  assert.equal(memoryDeltaMode({ DRLO_MEMORY_MODE: 'n\'importe' }), false);
  assert.equal(memoryDeltaMode({ DRLO_MEMORY_MODE: ' changements ' }), true);
  assert.equal(memoryDeltaMode({ DRLO_MEMORY_MODE: 'delta' }), true);
  const fs = require('node:fs');
  const src = fs.readFileSync(require('node:path').join(__dirname, '..', 'drlo-memory.js'), 'utf8');
  assert.match(src, /const delta = memoryDeltaMode\(\)/);
  assert.match(src, /delta \? applyMemoryDelta\(raw, current\) : cleanNotes\(raw, current\)/);
  assert.match(src, /delta \? buildMemoryDeltaPrompt\(\) : buildMemoryPrompt\(\)/);
});
