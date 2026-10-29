/**
 * _practices.js — « Pratiques » de Dr Lô : logique pure (testée dans _tests/practices.test.js).
 * Une pratique = un exercice guidé (audio), une technique à apprendre (étapes) ou un carnet à remplir chaque jour.
 * Prix en étincelles fixé par Dr Lô, payé UNE fois (déblocage), puis refaite / remplie sans repayer.
 * Le script de l'audio n'est jamais envoyé aux personnes : il sert seulement à Dr Lô IA.
 */
const TYPES = ['guided', 'technique', 'carnet'];
const THEMES = ['stress', 'humeur', 'sommeil', 'emotions', 'estime', 'couple', 'sexualite', 'corps', 'autre'];
const STATUSES = ['draft', 'published', 'retired'];
const FIELD_KINDS = ['scale', 'check', 'text', 'choice'];
const FEELINGS = ['mieux', 'pareil', 'moins'];
const LIMITS = { title: 80, summary: 280, step: 300, steps: 12, fields: 10, label: 60, option: 30, options: 8, script: 12000, source: 300, cautions: 1000, price: 500, text: 280, minutes: 60 };

const clean = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const one = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function sanitizeFields(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > LIMITS.fields) return { error: `Un carnet a ${LIMITS.fields} champs au plus.` };
  const out = []; const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const f = list[i] || {};
    const label = one(f.label).slice(0, LIMITS.label);
    if (label.length < 2) return { error: `Le champ n° ${i + 1} n'a pas de nom.` };
    if (!FIELD_KINDS.includes(f.kind)) return { error: `Type de champ inconnu (champ « ${label} »).` };
    let id = one(f.id).replace(/[^a-z0-9_]/gi, '').slice(0, 24) || `f${i + 1}`;
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    const field = { id, kind: f.kind, label };
    if (f.kind === 'choice') {
      const opts = [...new Set((Array.isArray(f.options) ? f.options : []).map((o) => one(o).slice(0, LIMITS.option)).filter(Boolean))].slice(0, LIMITS.options);
      if (opts.length < 2) return { error: `Le champ « ${label} » doit proposer au moins 2 choix.` };
      field.options = opts;
    }
    if (f.kind === 'scale') { field.low = one(f.low).slice(0, 30) || null; field.high = one(f.high).slice(0, 30) || null; }
    out.push(field);
  }
  return { fields: out };
}

/** Données d'une pratique venues de la console de Dr Lô → { data } ou { error }. L'audio est traité à part. */
function validatePractice(b, { partial = false } = {}) {
  const d = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has('type')) { if (!TYPES.includes(b.type)) return { error: 'Choisis le type de pratique.' }; d.type = b.type; }
  if (has('title')) { d.title = one(b.title); if (d.title.length < 3) return { error: 'Le titre est trop court.' }; if (d.title.length > LIMITS.title) return { error: `Le titre est trop long (${LIMITS.title} caractères au plus).` }; }
  if (has('summary')) { d.summary = clean(b.summary, LIMITS.summary + 1); if (d.summary.length > LIMITS.summary) return { error: `La présentation est trop longue (${LIMITS.summary} caractères au plus).` }; }
  if (has('theme')) d.theme = THEMES.includes(b.theme) ? b.theme : 'autre';
  if (has('minutes')) { const m = Number(b.minutes); if (!Number.isInteger(m) || m < 1 || m > LIMITS.minutes) return { error: `La durée doit être entre 1 et ${LIMITS.minutes} minutes.` }; d.minutes = m; }
  if (has('price')) { const p = Number(b.price ?? 0); if (!Number.isInteger(p) || p < 0 || p > LIMITS.price) return { error: `Le prix doit être un nombre entier d'étincelles entre 0 et ${LIMITS.price}.` }; d.price = p; }
  if (has('freeForMembers')) d.freeForMembers = b.freeForMembers === true;
  if (has('steps')) {
    const steps = (Array.isArray(b.steps) ? b.steps : []).map((s) => clean(s, LIMITS.step + 1)).filter(Boolean);
    if (steps.length > LIMITS.steps) return { error: `${LIMITS.steps} étapes au plus.` };
    if (steps.some((s) => s.length > LIMITS.step)) return { error: `Une étape est trop longue (${LIMITS.step} caractères au plus).` };
    d.steps = steps;
  }
  if (has('fields')) { const f = sanitizeFields(b.fields); if (f.error) return f; d.fields = f.fields; }
  if (has('script')) { d.script = clean(b.script, LIMITS.script + 1); if (d.script.length > LIMITS.script) return { error: 'Le script est trop long.' }; }
  if (has('source')) { d.source = one(b.source); if (d.source.length < 3) return { error: 'Indique la source (méthode, auteur ou référence).' }; if (d.source.length > LIMITS.source) return { error: 'La source est trop longue.' }; }
  if (has('cautions')) { d.cautions = clean(b.cautions, LIMITS.cautions + 1); if (d.cautions.length > LIMITS.cautions) return { error: 'Les précautions sont trop longues.' }; }
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return { error: 'Statut inconnu.' }; d.status = b.status; }
  return { data: d };
}

/** Une pratique peut-elle être publiée ? (vérifié sur l'état final, audio compris) */
function publishProblem(p) {
  if (!p || p.status !== 'published') return null;
  if (p.type === 'guided' && !p.audio) return 'Un exercice guidé a besoin de son audio avant d\'être publié.';
  if (p.type === 'technique' && !p.audio && !(p.steps && p.steps.length)) return 'Une technique a besoin d\'étapes ou d\'un audio.';
  if (p.type === 'carnet' && !(p.fields && p.fields.length)) return 'Un carnet a besoin d\'au moins un champ à remplir.';
  return null;
}

/** Gratuite pour cette personne ? memberOf = ensemble des chaînes dont elle est membre. */
function isFreeFor(p, memberOf) {
  if (!(Number(p && p.price) > 0)) return true;
  if (!p.freeForMembers) return false;
  return (p.channelIds || []).some((c) => memberOf.has(c));
}

/** Ce que voit une personne. Jamais le script. Le contenu (étapes, champs, audio) seulement si débloquée. */
function publicPractice(id, p, { unlocked, free }) {
  const base = {
    id, type: p.type, title: p.title, summary: p.summary || '', theme: p.theme || 'autre', minutes: Number(p.minutes) || 1,
    price: Number(p.price) || 0, free: !!free, unlocked: !!unlocked, hasAudio: !!p.audio, source: p.source || '', cautions: p.cautions || '',
    stepCount: (p.steps || []).length,
  };
  if (!unlocked) return base;
  return { ...base, steps: p.steps || [], fields: p.type === 'carnet' ? (p.fields || []) : [] };
}

/** Valeurs d'un jour de carnet → { values } ou { error }. Au moins un champ rempli. */
function validateLog(fields, raw) {
  const v = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const f of fields || []) {
    const x = v[f.id];
    if (x === undefined || x === null || x === '') continue;
    if (f.kind === 'scale') { const n = Number(x); if (!Number.isInteger(n) || n < 0 || n > 10) return { error: `« ${f.label} » : une note de 0 à 10.` }; out[f.id] = n; }
    else if (f.kind === 'check') out[f.id] = x === true;
    else if (f.kind === 'text') { const t = clean(x, LIMITS.text + 1); if (t.length > LIMITS.text) return { error: `« ${f.label} » : ${LIMITS.text} caractères au plus.` }; if (t) out[f.id] = t; }
    else if (f.kind === 'choice') { if (!(f.options || []).includes(x)) return { error: `« ${f.label} » : choix inconnu.` }; out[f.id] = x; }
  }
  if (!Object.keys(out).length) return { error: 'Remplis au moins une ligne du carnet.' };
  return { values: out };
}

/** Jour du carnet « AAAA-MM-JJ » : aujourd'hui ou les 7 jours d'avant (on peut rattraper un oubli), jamais le futur. */
function validDay(day, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return false;
  const t = Date.parse(`${day}T12:00:00Z`);
  if (Number.isNaN(t)) return false;
  const diffDays = (now - t) / 86400000;
  return diffDays > -1.6 && diffDays < 8.6; // marge pour les fuseaux
}

/** Ce que Dr Lô IA sait des pratiques publiées (une ligne chacune, script résumé). */
function chatCatalog(list) {
  return list.filter((p) => p.status === 'published').slice(0, 30).map((p) => {
    const price = Number(p.price) > 0 ? `${p.price} étincelle${p.price > 1 ? 's' : ''}, une fois` : 'gratuite';
    const what = p.type === 'carnet' ? 'carnet à remplir chaque jour' : p.type === 'guided' ? 'exercice guidé audio' : 'technique';
    return `• [${p.id}] « ${p.title} » (${what}, ${p.minutes} min, ${price}) : ${String(p.summary || '').replace(/\s+/g, ' ').slice(0, 140)}${p.cautions ? ` — précautions : ${String(p.cautions).replace(/\s+/g, ' ').slice(0, 120)}` : ''}`;
  }).join('\n');
}

module.exports = { TYPES, THEMES, STATUSES, FIELD_KINDS, FEELINGS, LIMITS, sanitizeFields, validatePractice, publishProblem, isFreeFor, publicPractice, validateLog, validDay, chatCatalog };
