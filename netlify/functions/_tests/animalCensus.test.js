const test = require('node:test');
const assert = require('node:assert');
const C = require('../_animalCensus');

const NOW = Date.UTC(2026, 10, 12, 10, 0, 0);
const at = (daysAgo, h = 12) => Date.UTC(2026, 10, 12 - daysAgo, h, 0, 0);

test('recensement : totaux par animal, aujourd\'hui, hier', () => {
  const rows = [
    { animal: 'cerf', revealedAtMs: at(0, 8) }, { animal: 'cerf', revealedAtMs: at(0, 9) }, { animal: 'lion', revealedAtMs: at(0, 7) },
    { animal: 'cerf', revealedAtMs: at(1, 23) }, { animal: 'lion', revealedAtMs: at(5) }, { animal: 'ours', revealedAtMs: at(40) },
  ];
  const c = C.census(rows, NOW);
  assert.strictEqual(c.total, 6);
  assert.strictEqual(c.byAnimal.cerf, 3); assert.strictEqual(c.byAnimal.lion, 2); assert.strictEqual(c.byAnimal.ours, 1);
  assert.strictEqual(c.today.cerf, 2); assert.strictEqual(c.today.lion, 1); assert.strictEqual(c.todayTotal, 3);
  assert.strictEqual(c.yesterday.cerf, 1); assert.strictEqual(c.yesterdayTotal, 1);
});
test('recensement : on ne compte que les animaux révélés et connus', () => {
  const c = C.census([
    { animal: 'cerf', revealedAtMs: 0 }, // calculé mais pas encore révélé
    { animal: 'dragon', revealedAtMs: at(0) }, // animal inconnu
    { animal: undefined, revealedAtMs: at(0) }, null,
    { animal: 'loup', revealedAtMs: at(2) },
  ], NOW);
  assert.strictEqual(c.total, 1); assert.strictEqual(c.byAnimal.loup, 1); assert.strictEqual(c.byAnimal.cerf, 0);
});
test('recensement : 14 jours pour la courbe, tous les animaux présents même à zéro', () => {
  const c = C.census([{ animal: 'aigle', revealedAtMs: at(3) }], NOW);
  assert.strictEqual(c.days.length, 14);
  assert.strictEqual(c.days[c.days.length - 1].d, '2026-11-12');
  assert.strictEqual(c.days.find((d) => d.d === '2026-11-09').n, 1);
  assert.strictEqual(Object.keys(c.byAnimal).length, 12);
});
test('recensement : à refaire au bout de 30 minutes, pas avant ; jamais fait → à faire', () => {
  assert.ok(C.isStale(null, NOW));
  assert.ok(!C.isStale({ computedAt: NOW - 10 * 60000 }, NOW));
  assert.ok(C.isStale({ computedAt: NOW - 31 * 60000 }, NOW));
  assert.ok(C.isStale({ computedAt: NOW + 5000 }, NOW)); // horloge incohérente : on recalcule
});
test('recensement : le résultat ne contient aucun identifiant de personne', () => {
  const c = C.census([{ animal: 'cerf', revealedAtMs: at(0), uid: 'SECRET' }], NOW);
  assert.ok(!JSON.stringify(c).includes('SECRET'));
});
