import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, bilanDue, dayNumber, hardStreak, improved, moodImproving, newProgramme, pause, planFor,
  programmeSignals, remainingToday, resume, retestInfo, toggleCheck, weekDots, withResult, bilanSummary,
  type Programme,
} from '../../src/utils/programme.ts';
import { EXERCISES, LEARNINGS } from '../../src/data/programmeLibrary.ts';

const base = (o: Partial<Programme> = {}): Programme => ({
  ...newProgramme({ axis: 'stress', today: '2026-10-01', light: false, intro: 'x', order1: ['SA4', 'SA1', 'ZZ9'] }),
  ...o,
});

test('bibliothèque : 60 exercices (5 ou 6 par semaine) et 17 apprentissages', () => {
  const all = Object.values(EXERCISES).flat();
  assert.equal(all.length, 60);
  assert.equal(new Set(all.map(e => e.id)).size, 60);
  assert.equal(LEARNINGS.length, 17);
  for (const list of Object.values(EXERCISES)) for (const w of [1, 2, 3, 4]) assert.ok(list.filter(e => e.week === w).length >= 4);
});

test('l\'ordre de la semaine 1 vient de Dr Lô, sans exercice inventé', () => {
  const p = base();
  assert.deepEqual(p.order1, ['SA4', 'SA1']);
  assert.equal(planFor(p, 1)[1].refId, 'SA4');
  assert.equal(planFor(p, 2)[1].refId, 'SA1');
  assert.equal(planFor(p, 3)[1].refId, 'SA2');
  assert.equal(planFor(p, 8)[1].refId, 'SA6'); // semaine 2
  assert.equal(planFor(p, 40)[1].refId, planFor(p, 28)[1].refId); // au-delà de 28 : on reste en semaine 4
});

test('3 engagements par jour ; version légère = respiration un jour sur deux', () => {
  const p = base({ light: true });
  assert.deepEqual(planFor(p, 1).map(e => e.key), ['mood', 'action', 'learn']);
  assert.equal(planFor(p, 2)[1].kind, 'breath');
  assert.equal(planFor(p, 3)[1].kind, 'exercise');
  // apprentissages : ceux du stress puis ceux pour tous, puis « à relire »
  assert.equal(planFor(p, 1)[2].refId, 'AP1');
  assert.equal(planFor(p, 6)[2].refId, 'AP16');
  assert.equal(planFor(p, 8)[2].reread, true);
  assert.equal(planFor({ ...p, axis: 'sommeil' }, 1)[0].title, 'Mon humeur et ma nuit');
});

test('cocher, reste à faire, semaine active', () => {
  let p = base();
  const today = '2026-10-03'; // jour 3
  assert.equal(dayNumber(p, today), 3);
  assert.equal(remainingToday(p, today, {}), 3);
  p = toggleCheck(p, today, 'action');
  assert.equal(remainingToday(p, today, { [today]: { mood: 'bof' } }), 1);
  p = toggleCheck(p, today, 'action');
  assert.equal(remainingToday(p, today, {}), 3);
  const w = weekDots(toggleCheck(p, '2026-10-01', 'learn'), today, {});
  assert.deepEqual(w.dots, ['done', 'missed', 'today', 'future', 'future', 'future', 'future']);
  assert.equal(w.active, 1);
});

test('la pause gèle le compteur, la reprise le décale', () => {
  let p = base();
  p = pause(p, '2026-10-05'); // jour 5
  assert.equal(dayNumber(p, '2026-10-20'), 5);
  p = resume(p, '2026-10-10');
  assert.equal(dayNumber(p, '2026-10-10'), 5);
  assert.equal(dayNumber(p, '2026-10-11'), 6);
});

test('bilan proposé aux jours 7, 14, 21, 28, une fois par semaine', () => {
  const p = base();
  assert.equal(bilanDue(p, '2026-10-06'), null); // jour 6
  assert.equal(bilanDue(p, '2026-10-07'), 1);
  assert.equal(bilanDue({ ...p, bilans: [{ week: 1, text: 't', at: 'x' }] }, '2026-10-10'), null);
  assert.equal(bilanDue(p, '2026-10-14'), 2);
});

test('nouveau test : jour 28, ou 21 si l\'humeur remonte, jamais avant 14 jours', () => {
  const p = base({ baseline: { scaleId: 'gad7', score: 12, label: 'Stress bien présent', at: '2026-09-30T10:00:00Z' } });
  assert.equal(retestInfo(p, '2026-10-21', {})!.available, false); // jour 21, pas d'amélioration
  assert.equal(retestInfo(p, '2026-10-28', {})!.available, true);
  const moods: Record<string, { mood: string }> = {};
  for (let i = 0; i < 21; i += 1) moods[addDays('2026-10-01', i)] = { mood: i < 7 ? 'pas_bien' : i < 14 ? 'bof' : 'plutot_bien' };
  assert.equal(moodImproving(moods, '2026-10-21'), true);
  assert.equal(retestInfo(p, '2026-10-21', moods)!.available, true);
  // test de départ trop récent
  const late = { ...p, baseline: { ...p.baseline!, at: '2026-10-20T10:00:00Z' } };
  assert.equal(retestInfo(late, '2026-10-28', {})!.available, false);
});

test('avant / après : le SCI se lit à l\'envers', () => {
  const p = base({ baseline: { scaleId: 'gad7', score: 12, label: 'a', at: '2026-09-30' } });
  const done = withResult(p, { totalScore: 6, label: 'b', at: '2026-10-29' });
  assert.equal(done.status, 'done');
  assert.equal(improved(done.result!), 'mieux');
  assert.equal(improved({ scaleId: 'bonus_sommeil', before: 12, after: 20, beforeLabel: '', afterLabel: '', at: '' }), 'mieux');
});

test('signaux : humeur, stress, sommeil ; fragile si sévère ou item 9', () => {
  const s = programmeSignals({
    gad7: { totalScore: 8, interpretation: { severity: 'mild', label: 'Anxiété légère' } },
    pss10: { totalScore: 20, interpretation: { severity: 'moderate', label: 'm' } },
    phq9: { totalScore: 7, alertLevel: 3, interpretation: { severity: 'mild', label: 'p' } },
    bonus_sommeil: { totalScore: 20, interpretation: { severity: 'mild', label: 's' } },
  });
  assert.deepEqual(s.map(x => x.axis), ['stress', 'humeur']);
  assert.equal(s[0].scaleId, 'pss10');
  assert.equal(s[1].fragile, true);
  assert.deepEqual(programmeSignals({ gad7: { totalScore: 2, interpretation: { severity: 'minimal' } } }), []);
  assert.equal(programmeSignals({ bonus_sommeil: { totalScore: 6 } })[0].rank, 3);
});

test('fragile → version légère imposée', () => {
  const p = newProgramme({ axis: 'humeur', today: '2026-10-01', light: false, intro: '', order1: [], signal: { axis: 'humeur', scaleId: 'phq9', score: 16, label: 'x', rank: 3, fragile: true, at: '2026-10-01' } });
  assert.equal(p.light, true);
  assert.equal(p.fragile, true);
});

test('jours très durs d\'affilée', () => {
  const m = { '2026-10-01': { mood: 'tres_dur' }, '2026-10-02': { mood: 'tres_dur' }, '2026-10-03': { mood: 'tres_dur' } };
  assert.equal(hardStreak(m, '2026-10-03'), 3);
  assert.equal(hardStreak(m, '2026-10-04'), 3);
  assert.equal(hardStreak(m, '2026-10-05'), 0);
});

test('résumé du bilan : des comptes, jamais de texte libre', () => {
  let p = base();
  p = toggleCheck(p, '2026-10-07', 'action');
  const s = bilanSummary(p, '2026-10-07', { '2026-10-07': { mood: 'bof' } });
  assert.equal(s.day, 7);
  assert.equal(s.activeDays, 1);
  assert.deepEqual(s.counts, { mood: 1, action: 1, learn: 0 });
  assert.equal(s.actionsDone.length, 1);
});
