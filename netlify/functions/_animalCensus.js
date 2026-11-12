/**
 * _animalCensus — combien de personnes ont découvert chaque animal intérieur, et combien viennent de le découvrir.
 * Des totaux seulement : jamais un compte, jamais un nom. Jours à l'heure de Dakar (= UTC).
 */
const ANIMALS = ['lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant', 'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours'];
const DAY = 86400000;
const REFRESH_MS = 30 * 60 * 1000; // le recensement est recalculé au plus toutes les 30 minutes
const CHART_DAYS = 14;

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/** rows = [{ animal, revealedAtMs }] : une ligne par profil. Seuls comptent les animaux révélés et connus. */
function census(rows, now = Date.now()) {
  const byAnimal = Object.fromEntries(ANIMALS.map((a) => [a, 0]));
  const today = Object.fromEntries(ANIMALS.map((a) => [a, 0]));
  const yesterday = Object.fromEntries(ANIMALS.map((a) => [a, 0]));
  const t = dayKey(now); const y = dayKey(now - DAY);
  const perDay = {};
  for (let i = CHART_DAYS - 1; i >= 0; i--) perDay[dayKey(now - i * DAY)] = 0;
  let total = 0;
  for (const r of rows) {
    if (!r || !ANIMALS.includes(r.animal) || !(Number(r.revealedAtMs) > 0)) continue;
    total += 1; byAnimal[r.animal] += 1;
    const d = dayKey(r.revealedAtMs);
    if (d === t) today[r.animal] += 1;
    else if (d === y) yesterday[r.animal] += 1;
    if (d in perDay) perDay[d] += 1;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    total, byAnimal, today, yesterday, todayTotal: sum(today), yesterdayTotal: sum(yesterday),
    days: Object.entries(perDay).map(([d, n]) => ({ d, n })),
    computedAt: now,
  };
}

/** Le recensement est-il à refaire ? */
const isStale = (doc, now = Date.now()) => !doc || !(doc.computedAt > 0) || now - doc.computedAt >= REFRESH_MS || now < doc.computedAt;

module.exports = { ANIMALS, REFRESH_MS, CHART_DAYS, census, isStale, dayKey };
