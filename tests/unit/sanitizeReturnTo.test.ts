// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReturnTo } from '../../src/utils/sanitizeReturnTo.ts';

test('retour après connexion : les pages du site qui demandent une connexion sont gardées', () => {
  for (const p of ['/espace-pro/rejoindre', '/mes-informations', '/chaines', '/chaines/abc123', '/outils', '/routine', '/boite-a-outils', '/pratique/p1', '/compagnon', '/espace']) {
    assert.equal(sanitizeReturnTo(p), p);
  }
});

test('retour après connexion : adresses externes ou inconnues refusées', () => {
  for (const p of ['//evil.com', 'https://evil.com', '/\\evil', '/admin', '/espace-pro-evil', null, '']) {
    assert.equal(sanitizeReturnTo(p), '/assessment');
  }
});
