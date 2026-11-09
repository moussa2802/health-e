// Lancer : node --test netlify/functions/_tests/aiModel.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { modelFrom, HAIKU_5_5, HAIKU_4_5 } = require('../_aiModel');

test('modèle : Haiku 5.5 par défaut, réglable par variable d\'environnement', () => {
  assert.equal(HAIKU_5_5, 'claude-haiku-5-5');
  assert.equal(modelFrom('DRLO_MEMORY_MODEL', undefined, {}), HAIKU_5_5);
  assert.equal(modelFrom('DRLO_MEMORY_MODEL', undefined, { DRLO_MEMORY_MODEL: '' }), HAIKU_5_5);
  // Retour en arrière : l'ancien identifiant dans la variable suffit
  assert.equal(modelFrom('DRLO_MEMORY_MODEL', undefined, { DRLO_MEMORY_MODEL: ' claude-haiku-4-5-20251001 ' }), HAIKU_4_5);
  assert.equal(modelFrom('MOT_DU_JOUR_MODEL', undefined, { MOT_DU_JOUR_MODEL: HAIKU_4_5, DRLO_MEMORY_MODEL: 'claude-x-y' }), HAIKU_4_5);
  // Valeur mal écrite → défaut (pas d'appel avec un identifiant farfelu)
  assert.equal(modelFrom('MOT_DU_JOUR_MODEL', undefined, { MOT_DU_JOUR_MODEL: 'gpt-4o' }), HAIKU_5_5);
  assert.equal(modelFrom('MOT_DU_JOUR_MODEL', undefined, { MOT_DU_JOUR_MODEL: 'claude haiku' }), HAIKU_5_5);
});

test('réponse lue par type de bloc, réflexion coupée', () => {
  const { textOf, NO_THINKING } = require('../_aiModel');
  assert.deepEqual(NO_THINKING, { type: 'disabled' });
  assert.equal(textOf({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Bonjour' }] }), 'Bonjour');
  assert.equal(textOf({ content: [{ type: 'thinking', thinking: '' }] }), '');
  assert.equal(textOf(null), '');
  const dir = path.join(__dirname, '..');
  for (const f of ['drlo-memory.js', 'mot-du-jour.js']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(src, /thinking: NO_THINKING/);
    assert.match(src, /textOf\(data\)/);
    assert.ok(!/content\??\.?\[0\]/.test(src), `${f} ne doit plus lire content[0]`);
  }
});

test('carnet et mot du jour lisent chacun leur variable (plus d\'identifiant écrit en dur)', () => {
  const dir = path.join(__dirname, '..');
  const mem = fs.readFileSync(path.join(dir, 'drlo-memory.js'), 'utf8');
  const mot = fs.readFileSync(path.join(dir, 'mot-du-jour.js'), 'utf8');
  assert.match(mem, /model: modelFrom\('DRLO_MEMORY_MODEL'\)/);
  assert.match(mot, /model: modelFrom\('MOT_DU_JOUR_MODEL'\)/);
  assert.ok(!/model: 'claude-/.test(mem) && !/model: 'claude-/.test(mot));
});
