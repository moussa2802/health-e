/**
 * « Écrire à Dr Lô » — logique pure (testable avec node --test).
 *  - Paliers : Découverte (totem révélé) → Régulière (5 jours notés : humeur ou journal)
 *    → Cercle (un défi ou une compatibilité). Les trois débloquent une question gratuite.
 *  - Capacité : Dr Lô répond à WEEKLY_CAP questions par semaine (≈ 10 h). Au-delà, file d'attente
 *    par vagues (chaque lundi). Inviter 3 proches qui font leur premier test fait passer devant.
 *  - Une question à la fois, et au plus une gratuite tous les FREE_EVERY_DAYS jours.
 */
const WEEKLY_CAP = 40;
const FREE_EVERY_DAYS = 30;
const REGULAR_DAYS = 5;
const REFERRALS_FOR_PRIORITY = 3;
const MAX_QUESTION_CHARS = 1500;

const DAY = 86400000;

/** Lundi 00:00 UTC (= heure de Dakar) de la semaine de `t`. */
function weekStart(t) {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // 0 = lundi
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * DAY;
}
const nextMonday = (t) => weekStart(t) + 7 * DAY;

function computePaliers({ totemRevealed, notedDays, circle }) {
  const steps = [
    { key: 'decouverte', label: 'Découverte', detail: 'Portrait · totem révélé', done: !!totemRevealed },
    { key: 'reguliere', label: 'Régulière', detail: `${REGULAR_DAYS} jours notés (humeur ou journal)`, done: notedDays >= REGULAR_DAYS, progress: Math.min(notedDays, REGULAR_DAYS), goal: REGULAR_DAYS },
    { key: 'cercle', label: 'Cercle', detail: 'Lance un défi ou une compatibilité', done: !!circle },
  ];
  return { steps, remaining: steps.filter((s) => !s.done).length, unlocked: steps.every((s) => s.done) };
}

/** Ordre de la file : les prioritaires (3 proches invités) d'abord, puis par ancienneté. */
function sortQueue(entries) {
  return [...entries].sort((a, b) => (Number(!!b.priority) - Number(!!a.priority)) || (a.joinedAt - b.joinedAt));
}

/**
 * Peut-on envoyer maintenant ?
 * Places de la semaine = cap - questions déjà reçues. Elles vont d'abord aux premiers de la file.
 */
function admission({ uid, usedThisWeek, cap = WEEKLY_CAP, queue, now }) {
  const free = Math.max(0, cap - usedThisWeek);
  const ordered = sortQueue(queue);
  const idx = ordered.findIndex((e) => e.uid === uid);
  if (idx >= 0) {
    return { canSubmit: idx < free, inQueue: true, position: idx + 1, nextWave: nextMonday(now) };
  }
  return { canSubmit: ordered.length < free, inQueue: false, position: null, nextWave: nextMonday(now) };
}

/** Une question à la fois ; une gratuite tous les 30 jours. */
function askState(myQuestions, now) {
  const pending = myQuestions.find((q) => q.status === 'pending');
  if (pending) return { ok: false, reason: 'pending' };
  const last = myQuestions.reduce((m, q) => Math.max(m, q.createdAt || 0), 0);
  if (last && now - last < FREE_EVERY_DAYS * DAY) return { ok: false, reason: 'wait', nextAt: last + FREE_EVERY_DAYS * DAY };
  return { ok: true };
}

const INTIME = ['nsss', 'sdi2', 'sis_ses', 'fsfi', 'iief', 'griss_base', 'pair', 'sise', 'tsi_base', 'social_pressure_sex'];

/**
 * Ce que Dr Lô voit, selon les choix de la personne (rien par défaut, intime et journal exclus par défaut).
 * share : 'none' | 'totem' | 'results'
 */
function buildSnapshot({ profile, share, includeIntime, includeJournal, journal, anonymous }) {
  const snap = { share, includeIntime: !!includeIntime, includeJournal: !!includeJournal };
  const ob = (profile && profile.onboardingProfile) || {};
  if (!anonymous) snap.prenom = ob.prenom || null;
  if (share === 'none') return snap;
  snap.genre = ob.genre || null;
  snap.age = ob.age || null;
  const totem = profile && profile.totem;
  if (totem && totem.animal && totem.revealedAt) snap.totem = totem.animal;
  if (share === 'results') {
    const res = {};
    for (const [id, r] of Object.entries((profile && profile.scaleResults) || {})) {
      if (!includeIntime && INTIME.includes(id)) continue;
      const it = (r && r.interpretation) || {};
      res[id] = { label: it.label || '', severity: it.severity || 'none', subscaleScores: r.subscaleScores || null };
    }
    snap.results = res;
  }
  if (includeJournal && Array.isArray(journal)) {
    snap.journal = journal.slice(0, 5).map((e) => ({ date: e.date || null, text: String(e.contenu || '').slice(0, 800) }));
  }
  return snap;
}

function validQuestion(text) {
  const t = String(text || '').trim();
  if (t.length < 10) return { ok: false, error: 'Écris un peu plus (10 caractères au moins).' };
  if (t.length > MAX_QUESTION_CHARS) return { ok: false, error: `Ta question est trop longue (${MAX_QUESTION_CHARS} caractères au plus).` };
  return { ok: true, text: t };
}

function makeReferralCode(rand = Math.random) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(rand() * A.length)];
  return s;
}

module.exports = {
  WEEKLY_CAP, FREE_EVERY_DAYS, REGULAR_DAYS, REFERRALS_FOR_PRIORITY, MAX_QUESTION_CHARS,
  weekStart, nextMonday, computePaliers, sortQueue, admission, askState, buildSnapshot, validQuestion, makeReferralCode,
};
