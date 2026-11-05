/**
 * _channelChat — règles pures de la discussion entre membres d'une chaîne (sans Firebase, donc testables).
 * Mêmes garde-fous que les commentaires : ni numéro, ni lien, ni insulte ; un mot de détresse n'est jamais publié.
 */
const C = require('./_drloComments');

const MAX_CHAT = 500;
const MIN_GAP_MS = 3000; // 3 s entre deux messages
const PER_HOUR = 120; // messages par personne et par heure, par chaîne
const KEEP = 500; // messages gardés par chaîne ; les plus anciens sont supprimés au-delà
const SLACK = 50; // on ne nettoie que par paquets (à KEEP + SLACK), pas à chaque envoi
const SHOWN = 80; // derniers messages affichés

/** { text, name, mode, crisis } | { error } */
function prepare(rawText, mode, { prenom, pseudo, seed } = {}) {
  const v = C.validateComment(rawText, MAX_CHAT);
  if (v.error) return { error: v.error };
  const idt = C.resolveIdentity(mode, { prenom, pseudo, seed });
  if (idt.error) return { error: idt.error };
  const mod = C.moderate(v.text);
  if (!mod.ok && mod.reason === 'crisis') return { text: v.text, name: idt.name, mode: idt.mode, crisis: true };
  if (!mod.ok) return { error: C.REASON_TEXT[mod.reason] || 'Message non accepté.' };
  return { text: v.text, name: idt.name, mode: idt.mode, crisis: false };
}

/** member = { lastChatAt, chatHour, chatCount } → { ok, next } | { ok:false, error } */
function rate(member, now) {
  const m = member || {};
  if (now - (Number(m.lastChatAt) || 0) < MIN_GAP_MS) return { ok: false, error: 'Doucement : attends quelques secondes entre deux messages.' };
  const hour = Math.floor(now / 3600000);
  const count = m.chatHour === hour ? Number(m.chatCount) || 0 : 0;
  if (count >= PER_HOUR) return { ok: false, error: 'Tu as beaucoup écrit : reviens dans un moment.' };
  return { ok: true, next: { lastChatAt: now, chatHour: hour, chatCount: count + 1 } };
}

/** Combien de plus anciens messages supprimer quand la chaîne en compte `count` (0 tant qu'on n'a pas atteint KEEP + SLACK). */
const toTrim = (count) => (Number(count) >= KEEP + SLACK ? Number(count) - KEEP : 0);

const shown = (m) => !m.hidden && !(Number(m.reports) >= C.REPORTS_TO_HIDE);

module.exports = { MAX_CHAT, MIN_GAP_MS, PER_HOUR, KEEP, SLACK, toTrim, SHOWN, prepare, rate, shown };
