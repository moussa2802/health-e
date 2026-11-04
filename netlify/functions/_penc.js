/**
 * _penc — règles pures de « Pénc mi » (salons de discussion en direct), sans Firebase : testables.
 * Un Pénc : { title, description, startAt (ms), durationMin, access: 'all'|'channel'|'paid', channelId?, price?, testScaleId?,
 *             status: 'scheduled'|'live'|'ended'|'cancelled', hostUid, hostName, hostTitle, hostPro, ownerUid, summary? }
 */
const DURATIONS = [15, 30, 45, 60, 90, 120];
const ACCESS = ['all', 'channel', 'paid'];
const MAX_AHEAD_MS = 60 * 86400000; // programmer au plus 60 jours à l'avance
const REMIND_BEFORE_MS = 10 * 60000; // rappel 10 minutes avant
const SCALE_ID = /^[a-zA-Z0-9_-]{1,60}$/;
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** { data } | { error }. partial : modification (seuls les champs envoyés). */
function validatePenc(b, now = Date.now(), { partial = false } = {}) {
  const d = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has('title')) {
    const t = clean(b.title, 120);
    if (t.length < 6 || t.length > 90) return { error: 'Le sujet doit faire entre 6 et 90 caractères.' };
    d.title = t;
  }
  if (has('description')) {
    const t = String(b.description || '').replace(/\n{3,}/g, '\n\n').trim();
    if (t.length > 500) return { error: 'La présentation fait 500 caractères au plus.' };
    d.description = t;
  }
  if (has('startAt')) {
    const s = Number(b.startAt);
    if (!Number.isFinite(s) || s < now - 5 * 60000) return { error: 'Choisis une date et une heure à venir.' };
    if (s > now + MAX_AHEAD_MS) return { error: 'On programme au plus 60 jours à l\'avance.' };
    d.startAt = Math.round(s);
  }
  if (has('durationMin')) {
    const m = Number(b.durationMin);
    if (!DURATIONS.includes(m)) return { error: 'Choisis une durée.' };
    d.durationMin = m;
  }
  if (has('access')) {
    if (!ACCESS.includes(b.access)) return { error: 'Choisis qui peut entrer.' };
    d.access = b.access;
    d.channelId = b.access === 'channel' ? clean(b.channelId, 60) : null;
    if (b.access === 'channel' && !d.channelId) return { error: 'Choisis la chaîne dont les membres pourront entrer.' };
    if (b.access === 'paid') {
      const p = Math.round(Number(b.price));
      if (!Number.isFinite(p) || p < 1 || p > 500) return { error: 'Le prix va de 1 à 500 étincelles.' };
      d.price = p;
    } else d.price = 0;
  }
  if (has('testScaleId')) {
    const t = clean(b.testScaleId, 60);
    if (t && !SCALE_ID.test(t)) return { error: 'Test inconnu.' };
    d.testScaleId = t || null;
  }
  if (has('repeatWeekly')) d.repeatWeekly = b.repeatWeekly === true;
  return { data: d };
}

/** Les 3 idées à retenir écrites par l'hôte à la fin. */
function cleanSummary(list) {
  if (!Array.isArray(list)) return [];
  return list.map((x) => clean(x, 200)).filter((x) => x.length >= 3).slice(0, 3);
}

/** Fin prévue (ms). */
const endsAt = (p) => Number(p.startAt) + Number(p.durationMin || 60) * 60000;

/** Dans l'agenda : à venir ou en direct (et pas fini depuis longtemps), ou terminé depuis moins de 14 jours (avec son résumé). */
function agendaBucket(p, now = Date.now()) {
  if (p.status === 'cancelled') return null;
  if (p.status === 'live') return 'live';
  if (p.status === 'ended') return now - Number(p.endedAt || endsAt(p)) < 14 * 86400000 ? 'past' : null;
  // programmé : on le garde jusqu'à 2 h après l'heure prévue (l'hôte peut être en retard)
  return now < Number(p.startAt) + 2 * 3600000 ? 'upcoming' : null;
}

/** Faut-il envoyer le rappel « dans 10 minutes » ? */
const remindDue = (p, now = Date.now()) => p.status === 'scheduled' && !p.remindSent && Number(p.startAt) - now <= REMIND_BEFORE_MS && Number(p.startAt) - now > -5 * 60000;

const WEEK_MS = 7 * 86400000;
/**
 * Pénc « chaque semaine » : dès que l'heure d'une séance est passée (commencée, finie ou annulée),
 * la séance suivante (même jour, même heure, + 7 jours) est créée. → startAt de la suivante, ou null.
 */
function nextWeekly(p, now = Date.now()) {
  if (!p || p.repeatWeekly !== true || p.nextCreated) return null;
  if (now < Number(p.startAt)) return null;
  let next = Number(p.startAt) + WEEK_MS;
  while (next <= now) next += WEEK_MS; // la tâche a été arrêtée longtemps : on ne crée pas de séance dans le passé
  return next;
}

module.exports = { DURATIONS, ACCESS, REMIND_BEFORE_MS, WEEK_MS, nextWeekly, validatePenc, cleanSummary, endsAt, agendaBucket, remindDue };
