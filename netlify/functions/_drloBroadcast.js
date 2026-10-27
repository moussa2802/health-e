/**
 * _drloBroadcast.js — « Ma communauté » : les messages que Dr Lô laisse à ses abonnés (logique pure, testée).
 *
 * Ciblage (les critères se combinent : il faut TOUS les respecter) :
 *   all        : tout le monde
 *   test       : { scaleId, levels: ['bon'|'leger'|'modere'|'eleve'] } — a fait ce test, avec un de ces repères
 *   totems     : ['lion', …] — un de ces animaux-totems
 *   programmes : ['stress'|'humeur'|'sommeil'] — programme en cours sur un de ces axes
 *   activity   : 'nouveaux' (compte de moins de 7 jours) | 'absents' (pas venu depuis 7 jours)
 * Dr Lô ne voit JAMAIS les noms : seulement le nombre de personnes visées.
 * Un ciblage fin (test, totem, programme) exige au moins MIN_TARGETED personnes, pour que personne
 * ne puisse être reconnu derrière un critère.
 */

const MAX_TEXT = 1200;
const MIN_TARGETED = 5;
const REACTIONS = ['heart', 'pray', 'strong'];
const TOTEMS = ['lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant', 'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours'];
const AXES = ['stress', 'humeur', 'sommeil'];
const ACTIVITIES = ['nouveaux', 'absents'];
const LEVELS = {
  bon: ['positive', 'none', 'minimal'],
  leger: ['mild'],
  modere: ['moderate'],
  eleve: ['severe', 'alert'],
};
const DAY = 864e5;

const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);

/** Nettoie un ciblage venu du navigateur. Renvoie { audience } ou { error }. */
function sanitizeAudience(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  if (a.test && typeof a.test === 'object') {
    const scaleId = /^[a-z0-9_]{2,40}$/i.test(String(a.test.scaleId)) ? String(a.test.scaleId) : '';
    const levels = (Array.isArray(a.test.levels) ? a.test.levels : []).filter((l) => Object.prototype.hasOwnProperty.call(LEVELS, l));
    if (scaleId) out.test = { scaleId, levels: [...new Set(levels)] };
  }
  const totems = (Array.isArray(a.totems) ? a.totems : []).filter((t) => TOTEMS.includes(t));
  if (totems.length) out.totems = [...new Set(totems)];
  const programmes = (Array.isArray(a.programmes) ? a.programmes : []).filter((p) => AXES.includes(p));
  if (programmes.length) out.programmes = [...new Set(programmes)];
  if (ACTIVITIES.includes(a.activity)) out.activity = a.activity;
  if (Object.keys(out).length === 0) {
    if (a.all === true) return { audience: { all: true } };
    return { error: 'Choisis à qui tu écris : tout le monde, ou un critère.' };
  }
  return { audience: out };
}

/** Faut-il un nombre minimum de personnes (ciblage fin) ? */
const isFineTargeted = (aud) => !!(aud && (aud.test || aud.totems || aud.programmes));

function validateText(text, { optional = false } = {}) {
  const t = String(text ?? '').replace(/\r/g, '').trim();
  if (optional && t.length === 0) return { text: '' };
  if (t.length < 2) return { error: 'Le message est vide.' };
  if (t.length > MAX_TEXT) return { error: `Le message est trop long (${MAX_TEXT} caractères au plus).` };
  return { text: t };
}

/** Cette personne est-elle visée ? `profile` = userProfiles/{uid}, `patient` = patients/{uid}. */
function matchesAudience(profile, patient, aud, now = Date.now()) {
  const p = profile || {};
  const pa = patient || {};
  if (!aud) return false;
  if (aud.all) return true;
  if (aud.test) {
    const r = p.scaleResults && p.scaleResults[aud.test.scaleId];
    if (!r) return false;
    if (aud.test.levels && aud.test.levels.length) {
      const sev = r.interpretation && r.interpretation.severity;
      const ok = aud.test.levels.some((l) => (LEVELS[l] || []).includes(sev));
      if (!ok) return false;
    }
  }
  if (aud.totems && aud.totems.length) {
    const animal = p.totem && p.totem.animal;
    if (!animal || !aud.totems.includes(animal)) return false;
  }
  if (aud.programmes && aud.programmes.length) {
    const prog = pa.programme;
    if (!prog || prog.status !== 'active' || !aud.programmes.includes(prog.axis)) return false;
  }
  if (aud.activity) {
    const created = ms(pa.createdAt) || ms(p.createdAt);
    const seen = ms(pa.lastSeenAt) || ms(pa.lastActivityAt);
    if (aud.activity === 'nouveaux') {
      if (!created || now - created > 7 * DAY) return false;
    } else if (aud.activity === 'absents') {
      const last = Math.max(seen, 0) || created;
      if (!last || now - last < 7 * DAY) return false;
    }
  }
  return true;
}

/** Une réaction valide, ou null (annule). */
function cleanReaction(r) {
  return REACTIONS.includes(r) ? r : null;
}

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_AUDIO_SEC = 185; // 3 min + marge
const AUDIO_TYPES = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3' };

/** Message vocal : { audio:{ data (base64), mime, durationSec } } → { buffer, mime, ext, durationSec } ou { error }. */
function validateAudio(a) {
  if (!a || typeof a.data !== 'string') return { error: 'Vocal manquant.' };
  const mime = String(a.mime || '').split(';')[0].trim().toLowerCase();
  const ext = AUDIO_TYPES[mime];
  if (!ext) return { error: 'Format audio non accepté.' };
  const dur = Number(a.durationSec);
  if (!(dur > 0)) return { error: 'Durée du vocal invalide.' };
  if (dur > MAX_AUDIO_SEC) return { error: 'Le vocal dépasse 3 minutes.' };
  const buffer = Buffer.from(a.data.replace(/^data:[^,]*,/, ''), 'base64');
  if (buffer.length < 1000) return { error: 'Le vocal est vide.' };
  if (buffer.length > MAX_AUDIO_BYTES) return { error: 'Le vocal est trop lourd.' };
  return { buffer, mime, ext, durationSec: Math.round(dur) };
}

const recipientId = (broadcastId, uid) => `${broadcastId}_${uid}`;

module.exports = {
  MAX_TEXT, MIN_TARGETED, REACTIONS, TOTEMS, AXES, ACTIVITIES, LEVELS,
  sanitizeAudience, isFineTargeted, validateText, validateAudio, MAX_AUDIO_BYTES, MAX_AUDIO_SEC, matchesAudience, cleanReaction, recipientId,
};
