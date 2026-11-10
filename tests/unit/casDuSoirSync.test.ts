// Lancer : node --test --experimental-strip-types tests/unit/casDuSoirSync.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexA } from '../../src/utils/casDuSoirSync.ts';

test('texte surligné et images : la phrase et l\'image en cours selon le temps de l\'audio (minutage réel de l\'épisode 1)', () => {
  const src = readFileSync(new URL('../../netlify/functions/_casDuSoirMinutages.js', import.meta.url), 'utf8');
  const m = JSON.parse(src.slice(src.indexOf('{', src.indexOf('module.exports')), src.lastIndexOf('}') + 1))['vu-de-minuit-ep1'];
  const L = m.lignes; const I = m.images;
  assert.equal(indexA(L, 0, (x: { t0: number }) => x.t0), -1); // avant la première phrase
  assert.equal(indexA(L, L[0].t0, (x: { t0: number }) => x.t0), 0);
  assert.equal(indexA(L, L[3].t0 + 0.5, (x: { t0: number }) => x.t0), 3);
  assert.equal(indexA(L, m.duree, (x: { t0: number }) => x.t0), L.length - 1);
  assert.equal(indexA(I, 0, (x: { t: number }) => x.t), 0);
  assert.equal(indexA(I, I[1].t + 1, (x: { t: number }) => x.t), 1);
  assert.equal(indexA(I, m.duree, (x: { t: number }) => x.t), I.length - 1);
  // Les phrases sont dans l'ordre et ne se chevauchent pas trop (sinon le surlignage sauterait)
  for (let k = 1; k < L.length; k += 1) assert.ok(L[k].t0 >= L[k - 1].t0, `phrase ${k}`);
});
