/**
 * _openBox — la boîte à questions : des questions anonymes, sans compte, sans promesse de réponse.
 * Dr Lô les lit dans son espace ; certaines reçoivent une réponse écrite sur le site, d'autres une vidéo.
 * Rien ici ne garde d'identité : ni compte, ni adresse IP (seulement une empreinte du jour pour limiter les envois).
 */
const crypto = require('crypto');
const C = require('./_drloComments');

const MIN = 8;
const MAX = 500;
const MAX_ANSWER = 1500;
const PER_DAY = 3; // questions par appareil et par jour
const GLOBAL_PER_DAY = 300;
const STATUSES = ['new', 'site', 'video', 'skipped'];

const oneSpace = (s) => String(s || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || 0);

/** { text, crisis } ou { error }. La détresse est gardée (Dr Lô la voit) mais la personne reçoit les numéros d'urgence. */
function cleanQuestion(raw) {
  const text = oneSpace(raw);
  if (text.length < MIN) return { error: 'Écris au moins une phrase.' };
  if (text.length > MAX) return { error: `Maximum ${MAX} caractères.` };
  const m = C.moderate(text);
  if (!m.ok && m.reason === 'crisis') return { text, crisis: true };
  if (!m.ok) return { error: C.REASON_TEXT[m.reason] || 'Ce message ne peut pas être envoyé.' };
  return { text, crisis: false };
}

/** Empreinte du jour : sert seulement à compter, change chaque jour, ne permet pas de retrouver l'adresse. */
function dayKey(now = Date.now()) { return new Date(now).toISOString().slice(0, 10); }
function fingerprint(ip, ua, day, secret = process.env.OPENBOX_SALT || 'health-e-box') {
  return crypto.createHash('sha256').update(`${secret}|${day}|${ip || ''}|${ua || ''}`).digest('hex').slice(0, 32);
}

/** Décision du compteur : { ok } ou { ok:false, reason:'device'|'global' }. */
function allow(deviceCount, globalCount) {
  if (globalCount >= GLOBAL_PER_DAY) return { ok: false, reason: 'global' };
  if (deviceCount >= PER_DAY) return { ok: false, reason: 'device' };
  return { ok: true };
}

/** Ce que Dr Lô décide : { status, publicText?, answer?, note? } ou { error }. */
function cleanDecision(body) {
  const status = String(body && body.status);
  if (!STATUSES.includes(status)) return { error: 'Statut inconnu.' };
  if (status !== 'site') return { status, note: oneSpace(body.note).slice(0, 200) };
  const publicText = oneSpace(body.publicText);
  const answer = String(body.answer || '').replace(/\n{3,}/g, '\n\n').trim();
  if (publicText.length < MIN || publicText.length > MAX) return { error: 'La question affichée doit faire entre 8 et 500 caractères.' };
  if (answer.length < 2 || answer.length > MAX_ANSWER) return { error: `La réponse doit faire entre 2 et ${MAX_ANSWER} caractères.` };
  const m = C.moderate(`${publicText} ${answer}`);
  if (!m.ok && m.reason !== 'crisis') return { error: 'Retire les numéros, liens ou mots blessants avant de publier.' };
  return { status, publicText, answer, note: oneSpace(body.note).slice(0, 200) };
}

/** Les réponses publiées sur le site, les plus récentes d'abord. */
function publicAnswers(rows, limit = 20) {
  return rows
    .filter((r) => r && r.status === 'site' && r.publicText && r.answer)
    .map((r) => ({ id: r.id, question: r.publicText, answer: r.answer, at: ms(r.answeredAt) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

module.exports = { MIN, MAX, MAX_ANSWER, PER_DAY, GLOBAL_PER_DAY, STATUSES, cleanQuestion, dayKey, fingerprint, allow, cleanDecision, publicAnswers };
