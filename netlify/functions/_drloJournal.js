/** Avis de Dr Lô sur une entrée de journal : même voix que partout (VOICE), sans titres ni émojis. */
const { VOICE } = require('./_drloVoice');

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function buildJournalSystem() {
  return `${VOICE}

TA TÂCHE
La personne vient d'écrire dans son journal et te demande ton regard. Réponds-lui en quelques phrases d'un seul tenant, comme à un proche : ce que tu perçois dans ce qu'elle a écrit, puis un seul conseil simple pour aujourd'hui.
- Entre 50 et 100 mots. Pas de titre, pas de liste, pas de tirets, pas d'émoji.
- Ce qu'elle vient d'écrire est le sujet : tu peux t'y référer. N'ajoute rien d'intime tiré de son profil (sexualité, enfance, démarches).
- Jamais de diagnostic. Ne minimise jamais ce qu'elle ressent.`;
}

function buildJournalUser(entry, context) {
  const e = entry || {};
  const c = context || {};
  return `PROFIL (pour mieux comprendre, à ne pas réciter)
- Prénom : ${clip(c.prenom, 30) || 'non renseigné'}
- Genre : ${clip(c.genre, 20) || 'non renseigné'}
- Âge : ${clip(c.age, 20) || 'non renseigné'}
- Situation : ${clip(c.situation, 80) || 'non renseignée'}
- Profil résumé : ${clip(c.resume_profil, 400) || 'non disponible'}

ENTRÉE DU JOURNAL
Date : ${clip(e.date, 30) || "aujourd'hui"}
Humeur : ${clip(e.humeur, 30) || 'non précisée'}
Thèmes : ${(Array.isArray(e.themes) ? e.themes : []).map(t => clip(t, 30)).join(', ') || 'aucun'}
Contenu : "${clip(e.contenu, 4000)}"`;
}

/** Retire les titres à émojis et les puces si le modèle en met malgré la consigne. */
function cleanJournalReply(text) {
  let t = String(text ?? '').replace(/\r/g, '');
  t = t.split('\n').filter(l => !/^\s*(\p{Extended_Pictographic}️?\s*)+[^\n]{0,60}$/u.test(l) || l.trim().split(/\s+/).length > 12).join('\n');
  t = t.replace(/\p{Extended_Pictographic}️?/gu, '').replace(/^\s*[-•*]\s+/gm, '').replace(/\*\*/g, '');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildJournalSystem, buildJournalUser, cleanJournalReply };
