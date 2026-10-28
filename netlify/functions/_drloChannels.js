/**
 * _drloChannels.js — « Chaînes » de Dr Lô : logique pure (testée dans _tests/drloChannels.test.js).
 * Une chaîne = un espace thématique créé par Dr Lô seul. On y entre une fois (étincelles), sous conditions.
 *   rules : { tests:[{scaleId, levels?}], totems?:[…], minAge? }
 * L'admissibilité est toujours calculée côté serveur, à partir du profil. Le navigateur n'envoie rien de tel.
 */
const B = require('./_drloBroadcast');

const MAX_NAME = 60, MAX_DESC = 280, MAX_FRAMING = 2000, MAX_PRICE = 5000, MAX_TESTS = 6;
const AGE_RANGES = { '18-25': 18, '26-35': 26, '36-45': 36, '46-55': 46, '55+': 55 };
const MIN_AGES = [18, 26, 36, 46, 55];
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const STATUSES = ['active', 'archived'];
const SCALE_ID = /^[a-zA-Z0-9_-]{1,60}$/;

const clean = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);

/** Règles d'entrée venues du navigateur de Dr Lô → { rules } ou { error }. */
function sanitizeRules(r) {
  const x = r && typeof r === 'object' ? r : {};
  const out = {};
  const tests = (Array.isArray(x.tests) ? x.tests : []).slice(0, MAX_TESTS).map((t) => {
    const scaleId = clean(t && t.scaleId, 60);
    if (!SCALE_ID.test(scaleId)) return null;
    const levels = (Array.isArray(t.levels) ? t.levels : []).filter((l) => B.LEVELS[l]);
    return levels.length ? { scaleId, levels: [...new Set(levels)] } : { scaleId };
  }).filter(Boolean);
  if (tests.length) out.tests = tests;
  const totems = (Array.isArray(x.totems) ? x.totems : []).filter((t) => B.TOTEMS.includes(t));
  if (totems.length) out.totems = [...new Set(totems)];
  if (x.minAge !== undefined && x.minAge !== null && x.minAge !== '') {
    const a = Number(x.minAge);
    if (!MIN_AGES.includes(a)) return { error: `Âge minimum : choisis parmi ${MIN_AGES.join(', ')}.` };
    if (a > 18) out.minAge = a; // tous les comptes ont 18 ans ou plus
  }
  return { rules: out };
}

/** Données d'une chaîne (création : name obligatoire). → { data } ou { error } */
function validateChannel(b, { partial = false } = {}) {
  const d = {};
  if (!partial || b.name !== undefined) {
    d.name = clean(b.name, MAX_NAME);
    if (d.name.length < 3) return { error: 'Le nom de la chaîne est trop court.' };
  }
  if (!partial || b.description !== undefined) {
    d.description = clean(b.description, MAX_DESC);
    if (d.description.length < 10) return { error: 'La description est trop courte (10 caractères au moins).' };
  }
  if (!partial || b.price !== undefined) {
    const p = Number(b.price ?? 0);
    if (!Number.isInteger(p) || p < 0 || p > MAX_PRICE) return { error: `Le prix doit être un nombre entier d'étincelles entre 0 et ${MAX_PRICE}.` };
    d.price = p;
  }
  if (!partial || b.framingText !== undefined) {
    d.framingText = clean(b.framingText, MAX_FRAMING);
    if (b.framingText !== undefined && String(b.framingText).trim().length > MAX_FRAMING) return { error: `Le texte de cadrage est trop long (${MAX_FRAMING} caractères au plus).` };
  }
  if (!partial || b.requireFramingAck !== undefined) d.requireFramingAck = !!b.requireFramingAck && !!(d.framingText ?? b.framingText);
  if (!partial || b.rules !== undefined) {
    const s = sanitizeRules(b.rules);
    if (s.error) return { error: s.error };
    d.rules = s.rules;
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return { error: 'Statut inconnu.' };
    d.status = b.status;
  }
  return { data: d };
}

function validatePhoto(raw) {
  if (!raw || typeof raw.data !== 'string') return { error: 'Photo manquante.' };
  const ext = PHOTO_TYPES[raw.mime];
  if (!ext) return { error: 'Photo : formats acceptés JPEG, PNG ou WebP.' };
  const buffer = Buffer.from(raw.data.replace(/^data:[^,]+,/, ''), 'base64');
  if (!buffer.length) return { error: 'Photo vide.' };
  if (buffer.length > MAX_PHOTO_BYTES) return { error: 'Photo trop lourde (1,5 Mo au plus).' };
  return { buffer, mime: raw.mime, ext };
}

/** Borne basse de la tranche d'âge du profil (« 26-35 » → 26). null si inconnue. */
const ageLowerBound = (profile) => {
  const a = profile && profile.onboardingProfile && profile.onboardingProfile.age;
  return Object.prototype.hasOwnProperty.call(AGE_RANGES, a) ? AGE_RANGES[a] : null;
};

/**
 * Ce qui manque pour entrer. profile = userProfiles/{uid}, balance = étincelles (nombre).
 * → { eligible, missing:[{kind:'test',scaleId,levels?}|{kind:'totem',totems}|{kind:'age',minAge,known}|{kind:'balance',need,have}] }
 * Un test fait mais avec un autre niveau que demandé compte comme « niveau » (kind:'level').
 */
function eligibility(profile, balance, ch) {
  const p = profile || {};
  const rules = (ch && ch.rules) || {};
  const missing = [];
  for (const t of rules.tests || []) {
    const r = p.scaleResults && p.scaleResults[t.scaleId];
    if (!r) { missing.push({ kind: 'test', scaleId: t.scaleId, ...(t.levels ? { levels: t.levels } : {}) }); continue; }
    if (t.levels && t.levels.length) {
      const sev = r.interpretation && r.interpretation.severity;
      if (!t.levels.some((l) => (B.LEVELS[l] || []).includes(sev))) missing.push({ kind: 'level', scaleId: t.scaleId, levels: t.levels });
    }
  }
  if (rules.totems && rules.totems.length) {
    const animal = p.totem && p.totem.animal;
    if (!animal || !rules.totems.includes(animal)) missing.push({ kind: 'totem', totems: rules.totems, known: !!animal });
  }
  if (rules.minAge) {
    const lb = ageLowerBound(p);
    if (lb === null || lb < rules.minAge) missing.push({ kind: 'age', minAge: rules.minAge, known: lb !== null });
  }
  const price = Number(ch && ch.price) || 0;
  if (price > 0 && (Number(balance) || 0) < price) missing.push({ kind: 'balance', need: price, have: Number(balance) || 0 });
  return { eligible: missing.length === 0, missing };
}

module.exports = { MAX_NAME, MAX_DESC, MAX_FRAMING, MAX_PRICE, MIN_AGES, AGE_RANGES, PHOTO_TYPES, STATUSES, sanitizeRules, validateChannel, validatePhoto, ageLowerBound, eligibility };
