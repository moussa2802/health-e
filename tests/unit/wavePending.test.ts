// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
} as Storage;

const W = await import('../../src/utils/wavePending.ts');

test('paiement Wave lancé : retrouvé au retour, puis oublié une fois le solde monté', () => {
  const t0 = 1_800_000_000_000;
  W.markWavePending(10, 25, t0);
  const p = W.readWavePending(t0 + 60_000);
  assert.deepEqual(p, { at: t0, balanceBefore: 10, koris: 25 });
  assert.equal(W.wavePaid(p, 10), false); // pas encore crédité
  assert.equal(W.wavePaid(p, 35), true);
  W.clearWavePending();
  assert.equal(W.readWavePending(t0), null);
});

test('paiement Wave lancé il y a trop longtemps : oublié', () => {
  const t0 = 1_800_000_000_000;
  W.markWavePending(0, 25, t0);
  assert.equal(W.readWavePending(t0 + W.WAVE_PENDING_MAX_MS + 1), null);
  assert.equal(mem.size, 0);
});

test('donnée abîmée : ignorée sans erreur', () => {
  mem.set('he_wave_pending', 'pas du json');
  assert.equal(W.readWavePending(), null);
  assert.equal(W.wavePaid(null, 100), false);
});
