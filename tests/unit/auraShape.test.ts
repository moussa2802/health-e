import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseRadii, livePoints, smoothPath, shade, STILL_PATH, AURA_N } from '../../src/utils/auraShape.ts';

test('la goutte : plus haute que large, pointe en haut', () => {
  const r = baseRadii();
  assert.equal(r.length, AURA_N);
  const top = r[AURA_N / 4];      // angle -π/2
  const side = r[0];              // angle -π (gauche)
  assert.ok(top > side + 20);
});

test('contour fermé, dans le cadre 200×200, même en joie', () => {
  const pts = livePoints(baseRadii(), 1.3, { scale: 1.08 });
  for (const [x, y] of pts) { assert.ok(x > 0 && x < 200); assert.ok(y > 0 && y < 200); }
  const d = smoothPath(pts);
  assert.match(d, /^M[\d.]+ [\d.]+ C/);
  assert.ok(d.endsWith('Z'));
  assert.ok(STILL_PATH.length > 100);
});

test('teintes : éclaircir et assombrir une couleur', () => {
  assert.equal(shade('#000000', 1), '#ffffff');
  assert.equal(shade('#ffffff', -1), '#000000');
  assert.equal(shade('#F2B66D', 0), '#f2b66d');
  assert.equal(shade('pas une couleur', 0.5), 'pas une couleur');
});
