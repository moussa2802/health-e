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

/** Les grands thèmes de la boîte : de quoi on parle, pour s'y retrouver quand il y a beaucoup de réponses. */
const TOPICS = [
  { id: 'amour', label: 'Amour & couple', words: ['amour', 'amoureu', 'couple', 'mariage', 'marier', 'rupture', 'quitt', 'sentiments', 'declarer', 'jalou', 'ex ', 'epoux', 'fiance', 'relation'] },
  { id: 'souffrance', label: 'Mal-être & deuil', words: ['suicide', 'depress', 'deuil', 'deces', 'trauma', 'blessure', 'aucun sens', 'plus vivre', 'tristesse', 'souvenirs', 'agression', 'viol'] },
  { id: 'famille', label: 'Famille', words: ['mere', 'pere', 'famille', 'familial', 'parents', 'frere', 'soeur', 'belle-famille', 'maison'] },
  { id: 'anxiete', label: 'Anxiété & stress', words: ['anxi', 'stress', 'angoisse', 'panique', 'inquiet', 'inquiete', 'peur', 'coeur', 'palpitation', 'dormir', 'sommeil'] },
  { id: 'corps', label: 'Corps & sexualité', words: ['sexe', 'sexuel', 'desir', 'pulsion', 'fausse couche', 'fauche couche', 'gyneco', 'regles', 'rapports', 'erection', 'libido'] },
  { id: 'soi', label: 'Confiance en soi & solitude', words: ['seule', 'seul ', 'solitude', 'confiance', 'dependance affective', 'estime', 'valeur', 'rabaiss', 'complexe'] },
];
const OTHER_TOPIC = { id: 'autre', label: 'Autres questions' };
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/\s+/g, ' ');

/** Thème d'une réponse : celui de Dr Lô s'il l'a choisi, sinon le plus proche des mots de la question (comptés triple) et de la réponse. */
function classifyTopic(row) {
  const forced = row && row.topic && [...TOPICS, OTHER_TOPIC].find((t) => t.id === row.topic);
  if (forced) return forced.id;
  const q = ` ${norm(row && (row.publicText || row.question))} `;
  const a = ` ${norm(row && row.answer)} `;
  let best = null; let bestScore = 0;
  for (const t of TOPICS) {
    let score = 0;
    for (const w of t.words) { if (q.includes(w)) score += 3; if (a.includes(w)) score += 1; }
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return best ? best.id : OTHER_TOPIC.id;
}

/** Les réponses publiées sur le site, les plus récentes d'abord, avec leur thème. */
function publicAnswers(rows, limit = 100) {
  return rows
    .filter((r) => r && r.status === 'site' && r.publicText && r.answer)
    .map((r) => ({ id: r.id, question: r.publicText, answer: r.answer, at: ms(r.answeredAt), topic: classifyTopic(r) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** « Mes questions » : l'état de chaque question déposée depuis cet appareil. On ne rend que l'état, et la réponse si elle est publiée. */
const ID_RE = /^[A-Za-z0-9]{10,40}$/;
function cleanIds(raw, max = 10) {
  return [...new Set((Array.isArray(raw) ? raw : []).map(String).filter((i) => ID_RE.test(i)))].slice(0, max);
}
function mineView(id, row) {
  if (!row) return { id, state: 'gone' };
  if (row.status === 'site' && row.publicText && row.answer) return { id, state: 'answered', question: row.publicText, answer: row.answer, at: ms(row.answeredAt), topic: classifyTopic(row) };
  if (row.status === 'video') return { id, state: 'video' };
  if (row.status === 'skipped') return { id, state: 'closed' };
  return { id, state: 'waiting' };
}

module.exports = { TOPICS, OTHER_TOPIC, classifyTopic, cleanIds, mineView, MIN, MAX, MAX_ANSWER, PER_DAY, GLOBAL_PER_DAY, STATUSES, cleanQuestion, dayKey, fingerprint, allow, cleanDecision, publicAnswers };
