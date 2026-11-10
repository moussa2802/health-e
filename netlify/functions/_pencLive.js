/**
 * _pencLive — règles pures du direct de Pénc mi (questions, commentaires, images), sans Firebase : testées dans _tests/pencLive.test.js.
 * Une question : pencs/{pid}/questions/{qid} = { text, name, uid, at, votes, voters:[uid], status:'open'|'answered'|'hidden' }.
 * Le Pénc garde : pinnedQ (qid | null), slides ([{ path, at }]), slideIndex (nombre | null).
 */
const C = require('./_drloComments');

const MAX_QUESTION = 300;
const MAX_CHAT = 200;
const MAX_OPEN_PER_PERSON = 3;
const MAX_SLIDES = 20;
const MAX_SLIDE_BYTES = 3 * 1024 * 1024;
const TEAM_NAME = 'Équipe Health-e';

/** Le nom de l'animateur : celui de la personne qui anime (ses contenus portent son nom), sinon l'équipe. */
function hostLabel(p) {
  const n = String((p && p.hostName) || '').trim();
  if (!n) return { name: TEAM_NAME, title: '' };
  return { name: n, title: String((p && p.hostTitle) || '') };
}

/** Texte d'une question ou d'un commentaire : { text } | { crisis:true } | { error }. */
function checkText(raw, max) {
  const v = C.validateComment(raw, max);
  if (v.error) return v;
  const m = C.moderate(v.text);
  if (!m.ok) return m.reason === 'crisis' ? { crisis: true } : { error: C.REASON_TEXT[m.reason] || 'Message refusé.' };
  return { text: v.text };
}

/** Questions visibles par tous : ouvertes d'abord (les plus demandées en tête), répondues ensuite. Jamais l'uid. */
function presentQuestions(rows, uid, pinnedId) {
  return rows
    .filter((r) => r.d.status !== 'hidden')
    .map((r) => ({
      id: r.id, text: r.d.text, name: r.d.name || 'Anonyme', votes: Number(r.d.votes) || 0, at: Number(r.d.at) || 0,
      status: r.d.status === 'answered' ? 'answered' : 'open', pinned: r.id === pinnedId,
      voted: Array.isArray(r.d.voters) && r.d.voters.includes(uid), mine: r.d.uid === uid,
      ...(r.d.animal ? { animal: String(r.d.animal) } : {}),
    }))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
      || (a.status === 'answered' ? 1 : 0) - (b.status === 'answered' ? 1 : 0)
      || b.votes - a.votes || a.at - b.at);
}

/** Image envoyée en base64 (data URL ou brut) : { buffer, mime, ext } | { error }. */
function decodeSlide(raw) {
  const s = String(raw || '');
  const m = s.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  const mime = m ? m[1] : 'image/jpeg';
  const b64 = m ? m[2] : s;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64.slice(0, 200))) return { error: 'Image illisible.' };
  const buffer = Buffer.from(b64, 'base64');
  if (buffer.length < 100) return { error: 'Image illisible.' };
  if (buffer.length > MAX_SLIDE_BYTES) return { error: 'Image trop lourde (3 Mo au plus).' };
  const sig = buffer.slice(0, 4).toString('hex');
  const real = sig.startsWith('ffd8') ? 'image/jpeg' : sig === '89504e47' ? 'image/png' : buffer.slice(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
  if (!real) return { error: 'Seules les images JPEG, PNG ou WebP sont acceptées.' };
  return { buffer, mime: real, ext: real === 'image/png' ? 'png' : real === 'image/webp' ? 'webp' : 'jpg', declared: mime };
}

/** Index d'image à montrer : un nombre valide, ou null (rien à l'écran). */
const cleanIndex = (i, n) => (i === null || i === undefined || i === '' ? null : Number.isInteger(Number(i)) && Number(i) >= 0 && Number(i) < n ? Number(i) : undefined);

module.exports = { MAX_QUESTION, MAX_CHAT, MAX_OPEN_PER_PERSON, MAX_SLIDES, TEAM_NAME, hostLabel, checkText, presentQuestions, decodeSlide, cleanIndex };
