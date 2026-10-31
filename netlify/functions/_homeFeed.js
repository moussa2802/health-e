/**
 * _homeFeed — ce que l'accueil montre à tout le monde (visiteurs compris) : le test à la une choisi par Dr Lô,
 * les chaînes (nom, thèmes, photo), les derniers contenus en aperçu et les derniers outils publiés.
 * Rien de privé ici : jamais de membres, jamais une publication réservée aux membres.
 */
const CH = require('./_drloChannels');

const SCALE_ID = /^[a-z0-9_]{2,40}$/;
const MAX_LABEL = 60;
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const oneLine = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** { scaleId, label } venant de l'espace Dr Lô. scaleId vide ou null = on retire le test à la une. */
function cleanFeatured(body) {
  const raw = body && body.scaleId;
  if (raw === null || raw === undefined || raw === '') return { featured: null };
  const scaleId = String(raw).trim();
  if (!SCALE_ID.test(scaleId)) return { error: 'Test inconnu.' };
  const label = oneLine(body.label, MAX_LABEL + 1);
  if (label.length > MAX_LABEL) return { error: `L'accroche est trop longue (${MAX_LABEL} caractères au plus).` };
  return { featured: { scaleId, label } };
}

/** Le texte court d'un contenu : son titre, sinon le début du texte. */
function teaser(p) {
  const t = oneLine(p.title, 80);
  if (t) return t;
  return oneLine(p.text, 80);
}

/** Les contenus ouverts à tous (« aperçu »), publiés, les plus récents d'abord. */
function latestPosts(posts, channelsById, limit = 6) {
  return posts
    .filter((p) => p && p.status === 'published' && p.preview === true && channelsById[p.channelId])
    .map((p) => ({
      kind: 'post', id: p.id, channelId: p.channelId, channelName: channelsById[p.channelId].name,
      title: teaser(p), hasAudio: !!p.audio, audioSec: p.audio ? Number(p.audio.durationSec) || 0 : 0, at: ms(p.createdAt),
    }))
    .filter((p) => p.title)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** Les chaînes ouvertes (pas archivées) : le nom et les thèmes, sans les conditions d'entrée. */
function publicChannels(rows) {
  return rows
    .filter((r) => r.c && r.c.status !== 'archived' && r.c.name)
    .map((r) => ({
      id: r.id, name: String(r.c.name), categories: CH.sanitizeCategories(r.c.categories), memberCount: Number(r.c.memberCount) || 0,
      imageUrl: r.c.photoPath ? `/.netlify/functions/channel-share?id=${encodeURIComponent(r.id)}&img=1` : null, at: ms(r.c.createdAt),
    }))
    .sort((a, b) => b.memberCount - a.memberCount || b.at - a.at);
}

/** Les outils (pratiques) publiés, du plus récent au plus ancien. */
function latestTools(rows, limit = 4) {
  return rows
    .filter((r) => r.p && r.p.status === 'published' && r.p.title)
    .map((r) => ({ kind: 'tool', id: r.id, title: oneLine(r.p.title, 80), minutes: Number(r.p.minutes) || 0, at: ms(r.p.createdAt) || ms(r.p.updatedAt) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

module.exports = { cleanFeatured, teaser, latestPosts, publicChannels, latestTools, MAX_LABEL };
