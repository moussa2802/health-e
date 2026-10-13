const FRENCH_BANNED = [
  'connard', 'connasse', 'salaud', 'salope', 'putain', 'pute', 'enculé', 'enculer',
  'nique', 'niquer', 'ntm', 'ftg', 'fdp', 'fils de pute', 'ta mère', 'ta mere',
  'bâtard', 'batard', 'pd', 'pédé', 'pede', 'gouine', 'tapette',
  'merde', 'bordel', 'enfoiré', 'enfoire', 'couille', 'bite', 'chier',
  'branleur', 'branleuse', 'bouffon', 'bouffonne', 'abruti', 'abrutie',
  'débile', 'debile', 'crétin', 'cretin', 'crétine', 'cretine',
  'nègre', 'negre', 'négresse', 'negresse', 'sale noir', 'sale arabe', 'sale blanc',
  'bougnoule', 'bamboula', 'macaque', 'singe',
  'suicid', 'tue-toi', 'tue toi', 'crève', 'creve',
];

const URL_RE = /https?:\/\/|www\.|\.com\b|\.fr\b|\.sn\b|\.org\b|\.net\b|\.io\b|\.co\b|\.dev\b/i;

const SOCIAL_RE = /(?:^|[\s@])(?:snap(?:chat)?|insta(?:gram)?|tiktok|twitter|telegram|whatsapp|facebook|fb)\s*[.:@]?\s*\S+/i;

function hasPhoneNumber(text) {
  const digitsOnly = text.replace(/[\s.\-+()]/g, '');
  return /\d{8,}/.test(digitsOnly);
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

let _firestoreCache = null;
let _firestoreCacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadFirestoreWords(db) {
  if (!db) return [];
  const now = Date.now();
  if (_firestoreCache && now - _firestoreCacheAt < CACHE_TTL) return _firestoreCache;
  try {
    const doc = await db.collection('config').doc('defiModeration').get();
    if (doc.exists && Array.isArray(doc.data().mots)) {
      _firestoreCache = doc.data().mots;
    } else {
      _firestoreCache = [];
    }
  } catch {
    _firestoreCache = _firestoreCache || [];
  }
  _firestoreCacheAt = now;
  return _firestoreCache;
}

function containsBannedWord(text, extraWords) {
  const normalized = normalize(text);
  const allWords = extraWords ? [...FRENCH_BANNED, ...extraWords] : FRENCH_BANNED;
  for (const word of allWords) {
    const nw = normalize(word);
    if (normalized.includes(nw)) return true;
  }
  return false;
}

async function moderateMessage(text, db) {
  if (typeof text !== 'string') return { ok: false, reason: 'invalid' };

  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 200) return { ok: false, reason: 'length' };

  if (URL_RE.test(trimmed)) return { ok: false, reason: 'url' };

  if (hasPhoneNumber(trimmed)) return { ok: false, reason: 'phone' };

  if (SOCIAL_RE.test(trimmed)) return { ok: false, reason: 'social' };

  const firestoreWords = await loadFirestoreWords(db);
  if (containsBannedWord(trimmed, firestoreWords)) return { ok: false, reason: 'banned_word' };

  return { ok: true };
}

function _resetCache() {
  _firestoreCache = null;
  _firestoreCacheAt = 0;
}

module.exports = { moderateMessage, _resetCache, _FRENCH_BANNED: FRENCH_BANNED };
