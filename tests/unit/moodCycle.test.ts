// Lancer : node --test tests/unit/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleDay, markFor, nextPeriod, newPeriodStart, addDays, validLength } from '../../src/utils/cycleCalc.ts';
import { monthCells, trend, weekdayAverages, remark, cycleRemark, weekdayIndex, series } from '../../src/utils/moodInsights.ts';
import type { MoodId, MoodMap } from '../../src/utils/moodLog.ts';

const map = (entries: [string, MoodId][]): MoodMap => Object.fromEntries(entries.map(([d, m]) => [d, { mood: m, at: 0 }]));
const range = (from: string, n: number, f: (i: number, d: string) => MoodId | null): MoodMap => {
  const out: MoodMap = {};
  for (let i = 0; i < n; i++) { const d = addDays(from, i); const m = f(i, d); if (m) out[d] = { mood: m, at: 0 }; }
  return out;
};

test('cycle : jour, marques, prochaines règles', () => {
  const c = { startDate: '2026-10-01', length: 28 };
  assert.equal(cycleDay(c, '2026-10-01'), 1);
  assert.equal(cycleDay(c, '2026-10-29'), 1);
  assert.equal(cycleDay(c, '2026-09-30'), null);
  assert.equal(markFor(c, '2026-10-03', '2026-10-22'), 'period');
  assert.equal(markFor(c, '2026-10-10', '2026-10-22'), null);
  assert.equal(markFor(c, '2026-10-27', '2026-10-22'), 'sensitive_predicted');
  assert.equal(markFor(c, '2026-10-30', '2026-10-22'), 'period_predicted');
  assert.equal(nextPeriod(c, '2026-10-22'), '2026-10-29');
  assert.equal(nextPeriod(c, '2026-10-29'), '2026-10-29');
  assert.equal(validLength(60), 28);
});

test('« mes règles ont commencé » : longueur ajustée si plausible', () => {
  assert.deepEqual(newPeriodStart(null, '2026-10-01'), { startDate: '2026-10-01', length: 28 });
  assert.deepEqual(newPeriodStart({ startDate: '2026-09-01', length: 28 }, '2026-10-03'), { startDate: '2026-10-03', length: 30 });
  assert.deepEqual(newPeriodStart({ startDate: '2026-09-01', length: 28 }, '2026-09-05'), { startDate: '2026-09-05', length: 28 });
});

test('grille du mois : commence le lundi, aujourd\'hui, futur', () => {
  const cells = monthCells(2026, 9, map([['2026-10-05', 'bof']]), '2026-10-22', null); // octobre 2026 : le 1er est un jeudi
  assert.equal(weekdayIndex('2026-10-01'), 3);
  assert.equal(cells.filter(c => c.day === null).length, 3);
  assert.equal(cells.find(c => c.day === '2026-10-05')!.mood, 'bof');
  assert.equal(cells.find(c => c.day === '2026-10-22')!.isToday, true);
  assert.equal(cells.find(c => c.day === '2026-10-23')!.isFuture, true);
});

test('tendance et jours de la semaine', () => {
  const up = range('2026-10-09', 14, i => (i < 7 ? 'pas_bien' : 'plutot_bien'));
  assert.equal(trend(up, '2026-10-22'), 'up');
  assert.equal(trend(map([['2026-10-22', 'bof']]), '2026-10-22'), null);
  const sundays = range('2026-08-01', 83, (_, d) => (weekdayIndex(d) === 6 ? 'pas_bien' : 'plutot_bien'));
  const wd = weekdayAverages(sundays, '2026-10-22');
  assert.equal(wd[6].avg, 2);
  assert.match(remark(sundays, '2026-10-22').text, /dimanches sont souvent plus lourds/);
  assert.equal(series(up, '2026-10-22', 30).length, 30);
});

test('remarque : période difficile → orientation humaine ; peu de données → encouragement', () => {
  const hard = range('2026-10-09', 14, i => (i % 2 ? 'tres_dur' : 'pas_bien'));
  const r = remark(hard, '2026-10-22', 'Awa', 'femme');
  assert.equal(r.tone, 'care');
  assert.match(r.text, /^Awa, ces deux dernières semaines.*seule.*1515/);
  assert.doesNotMatch(r.text, /dépression|diagnostic/i);
  assert.match(remark(map([['2026-10-22', 'bof']]), '2026-10-22').text, /quelques jours de plus/);
});

test('humeur et cycle : lien seulement avec assez de données', () => {
  const c = { startDate: '2026-10-01', length: 28 };
  const few = cycleRemark(map([['2026-10-20', 'bof']]), c, '2026-10-22');
  assert.equal(few.enoughData, false);
  assert.equal(few.next, '2026-10-29');
  assert.equal(few.sensitiveFrom, '2026-10-26');
  // 3 cycles : humeur basse les 3 jours avant les règles
  const data = range('2026-07-08', 106, (_, d) => {
    const cd = (((Math.round((Date.parse(d) - Date.parse('2026-10-01')) / 86400000) % 28) + 28) % 28) + 1;
    return cd > 25 ? 'pas_bien' : 'plutot_bien';
  });
  const r = cycleRemark(data, c, '2026-10-22');
  assert.equal(r.enoughData, true);
  assert.match(r.link!, /baisse un peu dans les jours qui précèdent/);
});
