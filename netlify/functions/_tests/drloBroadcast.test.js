const test = require('node:test');
const assert = require('node:assert');
const B = require('../_drloBroadcast');

const NOW = Date.parse('2026-10-27T12:00:00Z');
const day = (n) => new Date(NOW - n * 864e5).toISOString();
const prof = (o = {}) => ({ scaleResults: { gad7: { interpretation: { severity: 'moderate', label: 'x' } } }, totem: { animal: 'lion' }, createdAt: day(40), ...o });
const pat = (o = {}) => ({ createdAt: day(40), lastSeenAt: day(1), programme: { axis: 'stress', status: 'active' }, ...o });

test('un ciblage vide est refusé, « tout le monde » doit être explicite', () => {
  assert.ok(B.sanitizeAudience({}).error);
  assert.ok(B.sanitizeAudience(null).error);
  assert.deepEqual(B.sanitizeAudience({ all: true }).audience, { all: true });
});

test('nettoie les critères inconnus ou mal formés', () => {
  const r = B.sanitizeAudience({ test: { scaleId: 'gad7', levels: ['modere', 'inconnu'] }, totems: ['lion', 'dragon'], programmes: ['stress', 'x'], activity: 'jamais' });
  assert.deepEqual(r.audience, { test: { scaleId: 'gad7', levels: ['modere'] }, totems: ['lion'], programmes: ['stress'] });
  assert.ok(B.sanitizeAudience({ test: { scaleId: '../etc', levels: [] } }).error);
});

test('les critères se combinent (ET)', () => {
  const a = B.sanitizeAudience({ test: { scaleId: 'gad7', levels: ['modere'] }, totems: ['lion'] }).audience;
  assert.equal(B.matchesAudience(prof(), pat(), a, NOW), true);
  assert.equal(B.matchesAudience(prof({ totem: { animal: 'loup' } }), pat(), a, NOW), false);
  assert.equal(B.matchesAudience(prof({ scaleResults: { gad7: { interpretation: { severity: 'mild' } } } }), pat(), a, NOW), false);
  assert.equal(B.matchesAudience(prof({ scaleResults: {} }), pat(), a, NOW), false);
});

test('repères : « élevé » couvre sévère et alerte', () => {
  const a = B.sanitizeAudience({ test: { scaleId: 'gad7', levels: ['eleve'] } }).audience;
  assert.equal(B.matchesAudience(prof({ scaleResults: { gad7: { interpretation: { severity: 'alert' } } } }), pat(), a, NOW), true);
  assert.equal(B.matchesAudience(prof({ scaleResults: { gad7: { interpretation: { severity: 'severe' } } } }), pat(), a, NOW), true);
});

test('programme : seulement un programme actif sur l\'axe', () => {
  const a = B.sanitizeAudience({ programmes: ['sommeil'] }).audience;
  assert.equal(B.matchesAudience(prof(), pat({ programme: { axis: 'sommeil', status: 'active' } }), a, NOW), true);
  assert.equal(B.matchesAudience(prof(), pat({ programme: { axis: 'sommeil', status: 'paused' } }), a, NOW), false);
  assert.equal(B.matchesAudience(prof(), pat({ programme: null }), a, NOW), false);
});

test('activité : nouveaux de la semaine, absents depuis 7 jours', () => {
  const nouveaux = B.sanitizeAudience({ activity: 'nouveaux' }).audience;
  assert.equal(B.matchesAudience(prof({ createdAt: day(3) }), pat({ createdAt: day(3) }), nouveaux, NOW), true);
  assert.equal(B.matchesAudience(prof(), pat(), nouveaux, NOW), false);
  const absents = B.sanitizeAudience({ activity: 'absents' }).audience;
  assert.equal(B.matchesAudience(prof(), pat({ lastSeenAt: day(9) }), absents, NOW), true);
  assert.equal(B.matchesAudience(prof(), pat({ lastSeenAt: day(2) }), absents, NOW), false);
  // jamais revenu depuis l'inscription il y a 40 jours : absent
  assert.equal(B.matchesAudience(prof(), pat({ lastSeenAt: undefined }), absents, NOW), true);
});

test('ciblage fin : un minimum de personnes ; activité et « tout le monde » : non', () => {
  assert.equal(B.isFineTargeted({ test: { scaleId: 'gad7', levels: [] } }), true);
  assert.equal(B.isFineTargeted({ totems: ['lion'] }), true);
  assert.equal(B.isFineTargeted({ all: true }), false);
  assert.equal(B.isFineTargeted({ activity: 'absents' }), false);
  assert.equal(B.MIN_TARGETED, 5);
});

test('texte et réactions', () => {
  assert.ok(B.validateText(' ').error);
  assert.ok(B.validateText('x'.repeat(1300)).error);
  assert.equal(B.validateText('  Salut à tous  ').text, 'Salut à tous');
  assert.equal(B.cleanReaction('heart'), 'heart');
  assert.equal(B.cleanReaction('😈'), null);
  assert.equal(B.recipientId('b1', 'u1'), 'b1_u1');
});

test('texte facultatif seulement avec un vocal', () => {
  assert.ok(B.validateText('').error);
  assert.deepStrictEqual(B.validateText('', { optional: true }), { text: '' });
  assert.ok(B.validateText('x'.repeat(1300), { optional: true }).error);
});
test('vocal : format, durée et poids contrôlés', () => {
  const ok = { data: Buffer.alloc(5000, 1).toString('base64'), mime: 'audio/webm;codecs=opus', durationSec: 62.4 };
  const v = B.validateAudio(ok);
  assert.strictEqual(v.ext, 'webm'); assert.strictEqual(v.durationSec, 62);
  assert.ok(B.validateAudio({ ...ok, mime: 'video/mp4' }).error);
  assert.ok(B.validateAudio({ ...ok, durationSec: 200 }).error);
  assert.ok(B.validateAudio({ ...ok, durationSec: 0 }).error);
  assert.ok(B.validateAudio({ ...ok, data: Buffer.alloc(10).toString('base64') }).error);
  assert.ok(B.validateAudio({ ...ok, data: Buffer.alloc(B.MAX_AUDIO_BYTES + 1).toString('base64') }).error);
  assert.ok(B.validateAudio(null).error);
});
