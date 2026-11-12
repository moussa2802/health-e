/**
 * Animal intérieur : l'algorithme (src/utils/totemAlgorithm.ts) est compilé à la volée puis testé.
 * Protège le recalibrage de novembre 2026 : bug de résilience (moyenne de 1 à 5, plus jamais divisée par 6), profils types atteignables.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const esbuild = require('esbuild');

const src = path.join(__dirname, '..', '..', '..', 'src', 'utils', 'totemAlgorithm.ts');
const out = esbuild.buildSync({ entryPoints: [src], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent' });
const mod = { exports: {} };
new Function('module', 'exports', 'require', out.outputFiles[0].text)(mod, mod.exports, require);
const T = mod.exports;

const ANIMALS = ['lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant', 'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours'];
const clamp = (v) => Math.max(0, Math.min(1, v));
const base = (x) => ({ subscaleScores: x });

/** Des résultats de tests qui donnent exactement ces valeurs sur les 7 axes (0 à 1). */
function resultsFor([E, O, A, C, N, S, R]) {
  return {
    big_five: base({ extraversion: 2 + 8 * E, openness: 2 + 8 * O, agreeableness: 2 + 8 * A, conscientiousness: 2 + 8 * C, emotional_stability: 2 + 8 * (1 - N) }),
    ecr_r: base({ anxiety: 1 + 6 * (1 - S), avoidance: 1 + 6 * (1 - S) }),
    brs: { totalScore: 1 + 4 * R, subscaleScores: {} }, // le BRS est enregistré en moyenne, de 1 à 5
    rses: { totalScore: 25 }, gad7: { totalScore: 5 }, pss10: { totalScore: 15 }, phq9: { totalScore: 5 },
  };
}
const rawOf = (z) => z.map((v, i) => clamp(v * T.COMMUNITY.sd[i] + T.COMMUNITY.mean[i]));

test('les 12 profils types mènent chacun à leur propre animal (aucun animal inatteignable)', () => {
  for (const a of ANIMALS) {
    const sig = T.getTotemSignature(a);
    assert.strictEqual(T.computeTotem(resultsFor(rawOf(sig.vector))), a, `profil type ${a}`);
  }
});

test('bug de résilience : le BRS (moyenne de 1 à 5) compte vraiment dans le résultat', () => {
  const lo = T.totemVector(resultsFor([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1]));
  const hi = T.totemVector(resultsFor([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.9]));
  assert.ok(hi[6] > lo[6] + 2, 'la résilience monte avec le BRS');
  // le même profil, avec une résilience basse puis haute, ne donne pas le même animal
  const base7 = [0.6, 0.55, 0.6, 0.6, 0.4, 0.55, 0.15];
  const a1 = T.computeTotem(resultsFor(base7)); const a2 = T.computeTotem(resultsFor([...base7.slice(0, 6), 0.95]));
  assert.notStrictEqual(a1, a2);
});

test('un ancien enregistrement en total (6 à 30) est ramené à la moyenne', () => {
  const r1 = resultsFor([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]); // BRS moyen 3
  const r2 = resultsFor([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]); r2.brs = { totalScore: 18, subscaleScores: {} }; // total 18 = moyenne 3
  assert.deepStrictEqual(T.totemVector(r1), T.totemVector(r2));
});

test('les tests ne sont pas tous faits : pas d\'animal', () => {
  const r = resultsFor([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]); delete r.phq9;
  assert.strictEqual(T.computeTotem(r), null);
  assert.strictEqual(T.totemVector(r), null);
});

test('le Cerf n\'est plus l\'animal de tous les profils sensibles', () => {
  // un profil très instable émotionnellement mais extraverti, peu consciencieux : le Cheval, pas le Cerf
  const z = [0.9, 0.7, -0.1, -0.9, 0.6, 0, 0.2];
  assert.strictEqual(T.computeTotem(resultsFor(rawOf(z))), 'cheval');
  // un profil instable, introverti, ouvert, agréable, peu résilient : le Cerf
  assert.strictEqual(T.computeTotem(resultsFor(rawOf([-0.7, 0.7, 0.5, -0.3, 0.95, -0.3, -0.4]))), 'cerf');
});

test('après de nouveaux tests : l\'animal ne change que s\'il est nettement dépassé', () => {
  const lion = T.getTotemSignature('lion').vector;
  const dauphin = T.getTotemSignature('dauphin').vector;
  // pile entre le Lion et le Dauphin, un peu plus près du Dauphin : on garde le Lion
  const mid = lion.map((v, i) => v * 0.48 + dauphin[i] * 0.52);
  const r = resultsFor(rawOf(mid));
  assert.strictEqual(T.computeTotem(r), 'dauphin');
  assert.strictEqual(T.computeTotemKeeping(r, 'lion'), 'lion');
  // sur le profil type du Dauphin : le changement est net
  assert.strictEqual(T.computeTotemKeeping(resultsFor(rawOf(dauphin)), 'lion'), 'dauphin');
  // pas d'animal actuel : le résultat tel quel
  assert.strictEqual(T.computeTotemKeeping(r, null), 'dauphin');
});

test('les totems voisins sont bien des animaux différents', () => {
  for (const a of ANIMALS) {
    const near = T.nearestTotems(a, 2);
    assert.strictEqual(near.length, 2); assert.ok(!near.includes(a));
  }
});
