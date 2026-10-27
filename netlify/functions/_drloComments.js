/**
 * _drloComments.js — commentaires sous les messages de Dr Lô (logique pure, testée dans _tests/drloComments.test.js).
 * Règles : visibles par tous les destinataires du message ; identité au choix (Anonyme, prénom, pseudo) ;
 * ni numéro de téléphone, ni lien, ni insulte ; un signe de détresse n'est JAMAIS publié :
 * la personne reçoit en privé un message de soutien (SAMU 1515, CHU Fann) et Dr Lô est prévenu.
 */
const MAX_COMMENT = 400;
const MAX_REPLY = 600;
const REPORTS_TO_HIDE = 3;
const PER_MESSAGE_LIMIT = 3; // commentaires par personne et par message
const MAX_THREAD = 40; // messages échangés dans une discussion, après le commentaire de départ

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const INSULTS = ['connard', 'connasse', 'salope', 'pute', 'merde', 'encule', 'putain', 'batard', 'fdp', 'ntm', 'nique', 'idiot', 'imbecile', 'debile', 'abruti', 'stupide', 'tapette', 'pede', 'goorgoorlu', 'ku ñaaw', 'xaat', 'tuñ', 'sa ndey'];
const CRISIS = [
  'suicid', 'me tuer', 'me suicider', 'en finir', 'mettre fin a mes jours', 'envie de mourir', 'veux mourir', 'veux pas vivre', 'plus envie de vivre',
  'a quoi bon vivre', 'me faire du mal', 'me faire mal', 'me couper', 'me pendre', 'disparaitre pour toujours', 'mieux sans moi',
  'dama bëgg dee', 'dama beug dee', 'bëgg dee', 'beug dee', 'rey sama bopp', 'rey sama bop', 'xaru',
];

function hasPhone(t) {
  const digits = t.replace(/[\s.\-()]/g, '');
  return /(\+?\d){8,}/.test(digits) || /\+221/.test(digits);
}
function hasLink(t) {
  return /https?:\/\//i.test(t) || /\bwww\./i.test(t) || /[a-z0-9-]+\.(com|sn|fr|net|org|io|me|tv|ly)\b/i.test(t) || /\S+@\S+\.\S+/.test(t) || /wa\.me|t\.me|bit\.ly/i.test(t);
}
const hasWord = (list, t) => { const f = fold(t); return list.some((w) => f.includes(fold(w))); };

/** { ok:true } | { ok:false, reason:'crisis'|'phone'|'link'|'insult' } — la détresse passe avant tout. */
function moderate(text) {
  const t = String(text || '');
  if (hasWord(CRISIS, t)) return { ok: false, reason: 'crisis' };
  if (hasPhone(t)) return { ok: false, reason: 'phone' };
  if (hasLink(t)) return { ok: false, reason: 'link' };
  if (hasWord(INSULTS, t)) return { ok: false, reason: 'insult' };
  return { ok: true };
}

const REASON_TEXT = {
  phone: 'Pour ta sécurité, on ne publie pas de numéro de téléphone.',
  link: 'Les liens et adresses ne sont pas acceptés ici.',
  insult: 'Ce message contient des mots qui peuvent blesser. Reformule-le avec bienveillance.',
};

/** Texte du commentaire : 2 à 400 caractères. */
function validateComment(text, max = MAX_COMMENT) {
  const t = String(text || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length < 2) return { error: 'Écris au moins quelques mots.' };
  if (t.length > max) return { error: `Maximum ${max} caractères.` };
  return { text: t };
}

/** Identité affichée : { name } ou { error }. mode : 'anon' | 'prenom' | 'pseudo'. */
function resolveIdentity(mode, { prenom, pseudo } = {}) {
  if (mode === 'prenom') {
    const p = String(prenom || '').trim().slice(0, 20);
    if (!p) return { name: 'Anonyme', mode: 'anon' };
    return { name: p, mode: 'prenom' };
  }
  if (mode === 'pseudo') {
    const ps = String(pseudo || '').trim();
    if (ps.length < 2 || ps.length > 20 || !/^[\p{L}\p{N}_ .'-]+$/u.test(ps)) return { error: 'Choisis un pseudo de 2 à 20 caractères (lettres et chiffres).' };
    if (!moderate(ps).ok) return { error: 'Ce pseudo n\'est pas accepté. Choisis-en un autre.' };
    return { name: ps, mode: 'pseudo' };
  }
  return { name: 'Anonyme', mode: 'anon' };
}

/** Message privé envoyé à la personne dont le commentaire montre une détresse (jamais publié). */
const CRISIS_NOTIF = {
  kind: 'broadcast',
  title: 'Dr Lô',
  body: 'Dr Lô pense à toi. Ouvre ce message quand tu veux.',
  inboxTitle: 'Dr Lô pense à toi',
  inboxBody: 'Ce que tu as écrit compte. Si tu penses à te faire du mal ou si tu es en danger maintenant, appelle le SAMU au 1515 ou le CHU de Fann au +221 33 869 18 20. Parle à une vraie personne, tout de suite.',
  link: '/',
};

const visible = (c) => !c.hidden && c.status === 'public' && !(Number(c.reports) >= REPORTS_TO_HIDE);

/** Ordre d'affichage : épinglés, puis les plus récents. */
function sortComments(list) {
  return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
}

/**
 * Discussion sous un commentaire : les messages échangés APRÈS le commentaire de départ.
 * Entrée : { from:'user'|'drlo', text, at, editedAt?, audio?:{ path, mime, durationSec } }.
 * Les anciens commentaires n'ont qu'un champ `reply` : on le lit comme un premier message de Dr Lô.
 */
function threadOf(c) {
  if (Array.isArray(c.thread)) return c.thread;
  return c.reply && c.reply.text ? [{ from: 'drlo', text: c.reply.text, at: Number(c.reply.at) || 0 }] : [];
}
const entryTime = (e) => Number(e.editedAt) || Number(e.at) || 0;

/** Dernière nouveauté côté Dr Lô (réponse ou modification) : sert à prévenir la personne. */
function lastDrloAt(c) {
  return threadOf(c).reduce((m, e) => (e.from === 'drlo' ? Math.max(m, entryTime(e)) : m), 0);
}

/** La personne peut-elle écrire à nouveau ? Un message à la fois, tant que Dr Lô n'a pas clôturé. */
function userCanFollowUp(c) {
  const t = threadOf(c);
  if (c.closed) return { ok: false, error: 'Dr Lô a clôturé cette discussion.' };
  if (!t.some((e) => e.from === 'drlo')) return { ok: false, error: 'Dr Lô n\'a pas encore répondu.' };
  if (t[t.length - 1].from === 'user') return { ok: false, error: 'Dr Lô n\'a pas encore répondu à ton dernier message.' };
  if (t.length >= MAX_THREAD) return { ok: false, error: 'Cette discussion est déjà très longue.' };
  return { ok: true };
}

/** Texte d'une réponse de Dr Lô : facultatif quand il y a un vocal. */
function validateEntry(text, hasAudio, max = MAX_REPLY) {
  if (hasAudio && !String(text || '').trim()) return { text: '' };
  return validateComment(text, max);
}

/** Ce que voit la personne : « nouveau » ou « mis à jour » par rapport à sa dernière visite. */
function presentEntry(e, seenBefore) {
  const at = Number(e.at) || 0;
  const edited = Number(e.editedAt) || 0;
  const drlo = e.from === 'drlo';
  return {
    from: e.from, text: e.text || '', at, editedAt: edited || null,
    audioSec: e.audio ? Number(e.audio.durationSec) || 0 : 0,
    fresh: drlo && at > seenBefore,
    updated: drlo && edited > seenBefore && at <= seenBefore,
  };
}

module.exports = { MAX_THREAD, threadOf, entryTime, lastDrloAt, userCanFollowUp, validateEntry, presentEntry, MAX_COMMENT, MAX_REPLY, REPORTS_TO_HIDE, PER_MESSAGE_LIMIT, moderate, REASON_TEXT, validateComment, resolveIdentity, CRISIS_NOTIF, visible, sortComments };
