/**
 * _threadMerge — ne jamais perdre une discussion quand deux appareils l'ont fait évoluer chacun de leur côté
 * (logique pure, testée dans _tests/threadMerge.test.js).
 *
 * Avant : la copie la plus récente remplaçait l'autre. Un téléphone qui gardait une vieille copie
 * (et y ajoutait juste « Re-bonjour ») écrasait des jours de discussion faits ailleurs.
 * Maintenant : si la nouvelle copie ne prolonge pas celle du compte, on les réunit
 * (début commun, puis la fin de la plus ancienne, puis la fin de la nouvelle).
 */
const keyOf = (m) => `${m && m.from}|${m && typeof m.text === 'string' ? m.text : ''}|${m && m.card ? m.card.type || '' : ''}`;

/** Messages communs au début des deux listes. */
function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && keyOf(a[i]) === keyOf(b[i])) i += 1;
  return i;
}

/**
 * existing : la copie du compte (objet), incoming : la copie envoyée (objet).
 * → { state, merged } : la copie à garder, et si on a dû réunir les deux.
 */
function mergeThreads(existing, incoming) {
  const E = existing && Array.isArray(existing.messages) ? existing.messages : null;
  const I = incoming && Array.isArray(incoming.messages) ? incoming.messages : null;
  if (!E || !E.length || !I) return { state: incoming, merged: false };
  // La nouvelle copie prolonge celle du compte (cas normal) : on la garde telle quelle.
  // On tolère que le compte ait été coupé à 300 messages : on cherche sa fin dans la nouvelle copie.
  const tail = E.slice(-3).map(keyOf).join('\n');
  const keys = I.map(keyOf);
  for (let j = 0; j + 3 <= keys.length || (E.length < 3 && j < keys.length); j++) {
    if (keys.slice(j, j + Math.min(3, E.length)).join('\n') === tail) return { state: incoming, merged: false };
  }
  // La copie du compte contient déjà tout ce qui est envoyé (téléphone en retard) : on garde celle du compte.
  const p0 = commonPrefix(E, I);
  if (p0 === I.length) return { state: existing, merged: false };
  // Deux versions qui ont divergé : début commun + suite du compte + suite envoyée (sans doublon)
  const seen = new Set(E.map(keyOf));
  const extra = I.slice(p0).filter((m) => !seen.has(keyOf(m)) || m.from === 'user');
  if (!extra.length) return { state: existing, merged: false };
  const messages = [...E, ...extra].map((m, i) => ({ ...m, id: `m${i + 1}` }));
  const state = { ...incoming, messages, seq: Math.max(Number(incoming.seq) || 0, Number(existing.seq) || 0, messages.length + 1) };
  if (state.talk && typeof state.talk.start === 'number') state.talk = { ...state.talk, start: Math.max(0, E.length) };
  return { state, merged: true };
}

module.exports = { mergeThreads, keyOf };
