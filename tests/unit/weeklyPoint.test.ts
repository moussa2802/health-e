import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyPoint, weekKey, severityWord } from '../../src/utils/weeklyPoint.ts';

const labelOf = (id: string) => ({ pss10: 'Stress', phq9: 'Humeur & Dépression', gad7: 'Anxiété' } as Record<string, string>)[id] ?? id;

test('la semaine commence le lundi', () => {
  assert.equal(weekKey('2026-11-04'), '2026-11-02'); // mercredi → lundi
  assert.equal(weekKey('2026-11-08'), '2026-11-02'); // dimanche → lundi
  assert.equal(weekKey('2026-11-09'), '2026-11-09');
});

test('des mots, jamais des notes', () => {
  assert.equal(severityWord('minimal').word, 'Ça tient');
  assert.equal(severityWord('moderate').word, 'À surveiller');
  assert.equal(severityWord(undefined).tone, 'neutre');
});

test('une semaine ordinaire : humeur, ce qui a bougé, 3 propositions au plus', () => {
  const moods = { '2026-10-29': { mood: 'plutot_bien' }, '2026-10-30': { mood: 'bof' }, '2026-10-31': { mood: 'tres_bien' }, '2026-11-02': { mood: 'pas_bien' }, '2026-11-04': { mood: 'bof' } };
  const p = buildWeeklyPoint({ today: '2026-11-04', moods, labelOf,
    results: { pss10: { severity: 'moderate', completedAt: new Date('2026-04-01') }, phq9: { severity: 'minimal', completedAt: new Date('2026-11-03') } },
    suggestion: { id: 'pss10', short: 'Refaire « Stress »' }, penc: { id: 'p1', title: 'La veillée du jeudi', when: 'Jeudi 21 h' } });
  assert.equal(p.range, 'du 29 oct. au 4 nov.');
  assert.equal(p.days.length, 7);
  assert.deepEqual(p.states.map(s => s.label), ['Humeur', 'Stress', 'Moral']);
  assert.equal(p.states[0].word, 'Variable');
  assert.ok(p.changes[0].includes('5 jours sur 7'));
  assert.ok(p.changes.some(c => c.includes('meilleure journée : samedi')));
  assert.ok(p.changes.some(c => c.includes('« Humeur & Dépression »')));
  assert.ok(p.todos.length <= 3);
  assert.equal(p.todos[0].kind, 'test');
  assert.equal(p.care, false);
});

test('un signal sérieux : il oriente vers une vraie personne en premier', () => {
  const p = buildWeeklyPoint({ today: '2026-11-04', moods: {}, labelOf, results: { phq9: { severity: 'severe', completedAt: new Date('2026-11-01') } } });
  assert.equal(p.care, true);
  assert.equal(p.todos[0].kind, 'help');
  assert.equal(p.states[0].word, 'Pas assez notée');
});

test('un ancien résultat difficile n\'alarme pas chaque semaine', () => {
  const p = buildWeeklyPoint({ today: '2026-11-04', moods: {}, labelOf, results: { phq9: { severity: 'severe', completedAt: new Date('2026-04-01') }, bonus_tdah: { severity: 'moderate', alertLevel: 2, completedAt: new Date('2026-05-01') } } });
  assert.equal(p.care, false);
});
