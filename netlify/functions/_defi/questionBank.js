const { SCALE_DEFS } = require("./scaleDefinitions");
const {
  QUESTION_DEFS_V4,
  AUDIENCE_EXCLUSIONS,
  AUDIENCE_PRIORITIES,
  DIMENSION_THEMES,
  RESULT_TITLES,
  PERSO_QUESTIONS,
} = require('./questionVariants');

// ── Helpers ──────────────────────────────────────────────────────────────────

function neutralSuffix(m, f) {
  const ml = m.toLowerCase(), fl = f.toLowerCase();
  let i = 0;
  while (i < ml.length && i < fl.length && ml[i] === fl[i]) i++;
  const suffix = f.slice(i);
  return suffix || 'e';
}

function normalizeGenre(genre) {
  if (!genre) return null;
  const g = genre.toLowerCase();
  if (g === 'homme' || g === 'masculin' || g === 'm') return 'M';
  if (g === 'femme' || g === 'feminin' || g === 'féminin' || g === 'f') return 'F';
  return null;
}

function resolveGender(template, genre) {
  if (!template) return template;
  const g = normalizeGenre(genre);
  let result = template.replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => {
    if (g === 'M') return m;
    if (g === 'F') return f;
    return `${m}·${neutralSuffix(m, f)}`;
  });
  result = result.replace(/\bsi (ils?)\b/gi, (_, p) => `s'${p}`);
  result = result.replace(/\bque (il|elle|ils|elles)\b/gi, (_, p) => `qu'${p}`);
  result = result.replace(/\bde (il|elle|ils|elles)\b/gi, (_, p) => `d'${p}`);
  return result;
}

function generateOpaqueId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = 'o_';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generateSlug() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let i = 0; i < 10; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Band computation ─────────────────────────────────────────────────────────

function computeBand(scaleId, score, subscaleKey, defiBands) {
  const def = SCALE_DEFS[scaleId];
  if (!def) return null;

  const bandKey = subscaleKey ? `${scaleId}.${subscaleKey}` : scaleId;

  if (defiBands && defiBands[bandKey] && defiBands[bandKey].n >= 50) {
    const { c1, c2 } = defiBands[bandKey];
    if (score <= c1) return 'bas';
    if (score <= c2) return 'moyen';
    return 'haut';
  }

  if (subscaleKey && def.subscales) {
    const sub = def.subscales.find(s => s.key === subscaleKey);
    if (!sub) return null;
    const norm = (score - sub.range.min) / (sub.range.max - sub.range.min);
    if (norm <= 0.33) return 'bas';
    if (norm <= 0.66) return 'moyen';
    return 'haut';
  }

  const ranges = def.ranges;
  if (!ranges || ranges.length === 0) return null;

  let rangeIndex = 0;
  for (let i = 0; i < ranges.length; i++) {
    if (score >= ranges[i].min && score <= ranges[i].max) {
      rangeIndex = i;
      break;
    }
  }

  if (ranges.length === 2) {
    return rangeIndex === 0 ? 'bas' : 'haut';
  }
  if (ranges.length === 3) {
    return ['bas', 'moyen', 'haut'][rangeIndex];
  }
  if (rangeIndex === 0) return 'bas';
  if (rangeIndex === 3) return 'haut';
  return 'moyen';
}

function getBandIndex(band) {
  if (band === 'bas') return 0;
  if (band === 'moyen') return 1;
  if (band === 'haut') return 2;
  return -1;
}

function rangeCount(scaleId) {
  const def = SCALE_DEFS[scaleId];
  return def?.ranges?.length ?? 3;
}

// ── Backward-compat flat structures from v4 data ─────────────────────────────

const DEFS_BY_KEY = {};
const QUESTION_DEFS = [];

for (const [key, def] of Object.entries(QUESTION_DEFS_V4)) {
  const tousVariant = def.variants.find(v => v.audiences.includes('tous')) || def.variants[0];
  const flat = {
    scaleId: def.scaleId,
    subscaleKey: def.subscaleKey || undefined,
    questionTemplate: tousVariant.stem,
    options: tousVariant.options,
  };
  DEFS_BY_KEY[key] = flat;
  QUESTION_DEFS.push(flat);
}

// ── Variant selection ────────────────────────────────────────────────────────

function selectVariant(dimKey, audience, previousVariantIds = []) {
  const def = QUESTION_DEFS_V4[dimKey];
  if (!def) return null;

  const candidates = def.variants.filter(v =>
    v.audiences.includes(audience) || v.audiences.includes('tous')
  );
  if (candidates.length === 0) return null;

  const fresh = candidates.filter(v => !previousVariantIds.includes(v.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  const specific = pool.filter(v => v.audiences.includes(audience));
  if (specific.length > 0) return specific[Math.floor(Math.random() * specific.length)];

  return pool[Math.floor(Math.random() * pool.length)];
}

function parseDimKey(selectedKey) {
  const colonIdx = selectedKey.indexOf(':');
  if (colonIdx === -1) return { dimKey: selectedKey, variantId: null };
  return { dimKey: selectedKey.substring(0, colonIdx), variantId: selectedKey.substring(colonIdx + 1) };
}

// ── Totem ─────────────────────────────────────────────────────────────────────

const TOTEM_ANIMALS = [
  'lion', 'aigle', 'cheval', 'loup', 'dauphin', 'elephant',
  'cerf', 'hibou', 'panthere', 'renard', 'tortue', 'ours',
];

const TOTEM_LABELS = {
  lion: 'Lion', aigle: 'Aigle', cheval: 'Cheval', loup: 'Loup',
  dauphin: 'Dauphin', elephant: 'Éléphant', cerf: 'Cerf', hibou: 'Hibou',
  panthere: 'Panthère', renard: 'Renard', tortue: 'Tortue', ours: 'Ours',
};

const TOTEM_POINTS = 2;

function buildTotemQuestion(realAnimal, prenom, genre) {
  const distractors = shuffleArray(
    TOTEM_ANIMALS.filter(a => a !== realAnimal)
  ).slice(0, 3);

  const allAnimals = shuffleArray([realAnimal, ...distractors]);

  const options = allAnimals.map(a => ({
    id: generateOpaqueId(),
    label: TOTEM_LABELS[a],
    _animal: a,
  }));

  const correctId = options.find(o => o._animal === realAnimal).id;
  const publicOptions = options.map(({ id, label }) => ({ id, label }));

  return {
    question: {
      source: 'totem',
      bonus: TOTEM_POINTS,
      text: resolveGender(
        `Question bonus ×${TOTEM_POINTS} 🐾 D'après toi, c'est quoi le totem de ${prenom} ?`,
        genre
      ),
      options: publicOptions,
    },
    truth: {
      source: 'totem',
      correctOptionId: correctId,
      points: TOTEM_POINTS,
    },
  };
}

// ── Selection ────────────────────────────────────────────────────────────────

const { DEFI_SCALE_CONFIG } = require('./defiScaleConfig.generated');

function isScaleEligible(scaleResult, mode) {
  const config = DEFI_SCALE_CONFIG[scaleResult.scaleId];
  if (!config) return false;
  if (config[mode] === 'interdit') return false;
  if ((scaleResult.alertLevel ?? 0) >= 3) return false;
  return true;
}

function collectDimensions(eligibleResults, mode) {
  const dims = [];

  for (const result of eligibleResults) {
    if (!isScaleEligible(result, mode)) continue;

    const config = DEFI_SCALE_CONFIG[result.scaleId];
    const level = config[mode];

    if (result.scaleId === 'big_five' && result.subscaleScores) {
      for (const sk of ['extraversion', 'agreeableness', 'conscientiousness', 'emotional_stability', 'openness']) {
        if (result.subscaleScores[sk] != null) {
          dims.push({ scaleId: 'big_five', subscaleKey: sk, score: result.subscaleScores[sk], level, isBigFive: true });
        }
      }
    } else if (result.scaleId === 'ecr_r' && result.subscaleScores) {
      for (const sk of ['anxiety', 'avoidance']) {
        if (result.subscaleScores[sk] != null) {
          dims.push({ scaleId: 'ecr_r', subscaleKey: sk, score: result.subscaleScores[sk], level, isBigFive: false });
        }
      }
    } else {
      dims.push({ scaleId: result.scaleId, subscaleKey: null, score: result.totalScore, level, isBigFive: false });
    }
  }

  return dims;
}

function dimKey(dim) {
  return dim.subscaleKey ? `${dim.scaleId}.${dim.subscaleKey}` : dim.scaleId;
}

function selectDimensions(eligibleResults, mode = 'public', { audience, persoCount = 0 } = {}) {
  const traitTarget = Math.max(5, 8 - persoCount);
  const traitMin = persoCount > 0 ? 5 : 6;

  const allDims = collectDimensions(eligibleResults, mode);
  if (allDims.length === 0) {
    return { error: 'no_eligible_scales', selected: [], available: [] };
  }

  const excluded = audience && AUDIENCE_EXCLUSIONS[audience]
    ? AUDIENCE_EXCLUSIONS[audience]
    : new Set();

  const eligibleDims = allDims.filter(d => !excluded.has(dimKey(d)));

  const dimsWithVariant = audience
    ? eligibleDims.filter(d => {
        const dk = dimKey(d);
        const def = QUESTION_DEFS_V4[dk];
        if (!def) return false;
        return def.variants.some(v =>
          v.audiences.includes(audience) || v.audiences.includes('tous')
        );
      })
    : eligibleDims.filter(d => !!DEFS_BY_KEY[dimKey(d)]);

  if (dimsWithVariant.length === 0) {
    return { error: 'no_eligible_scales', selected: [], available: [] };
  }

  const priorities = (audience && AUDIENCE_PRIORITIES[audience]) || [];
  const prioSet = new Set(priorities);

  function priorityRank(dim) {
    const dk = dimKey(dim);
    const idx = priorities.indexOf(dk);
    return idx >= 0 ? idx : priorities.length;
  }

  const autoDims = dimsWithVariant.filter(d => d.level === 'auto');

  const prioBF = autoDims.filter(d => d.isBigFive && prioSet.has(dimKey(d)))
    .sort((a, b) => priorityRank(a) - priorityRank(b));
  const nonPrioBF = shuffleArray(autoDims.filter(d => d.isBigFive && !prioSet.has(dimKey(d))));
  const sortedBF = [...prioBF, ...nonPrioBF];

  const prioOther = autoDims.filter(d => !d.isBigFive && prioSet.has(dimKey(d)))
    .sort((a, b) => priorityRank(a) - priorityRank(b));
  const nonPrioOther = shuffleArray(autoDims.filter(d => !d.isBigFive && !prioSet.has(dimKey(d))));
  const sortedOther = [...prioOther, ...nonPrioOther];

  let selected = [];
  const usedScales = new Set();

  for (const dim of sortedBF) {
    if (selected.filter(d => d.isBigFive).length >= 3) break;
    selected.push(dim);
  }

  for (const dim of sortedOther) {
    if (usedScales.has(dim.scaleId) && !dim.isBigFive) continue;
    selected.push(dim);
    usedScales.add(dim.scaleId);
  }

  if (selected.length < traitTarget) {
    const remainingBF = sortedBF.filter(d => !selected.includes(d));
    for (const dim of remainingBF) {
      if (selected.length >= traitTarget) break;
      selected.push(dim);
    }
  }

  if (selected.length < traitTarget) {
    const remainingEcr = dimsWithVariant.filter(d => d.scaleId === 'ecr_r' && !selected.includes(d));
    for (const dim of remainingEcr) {
      if (selected.length >= traitTarget) break;
      selected.push(dim);
    }
  }

  if (selected.length < traitMin) {
    return { error: 'not_enough_scales', selected: [], available: [] };
  }

  // Trim to target: remove least-priority dims first (from the end)
  selected.sort((a, b) => priorityRank(a) - priorityRank(b));
  selected = selected.slice(0, traitTarget);

  const selectedKeySet = new Set(selected.map(d => dimKey(d)));
  const available = dimsWithVariant.filter(d => !selectedKeySet.has(dimKey(d)));

  return { error: null, selected, available };
}

// ── Interleaving ─────────────────────────────────────────────────────────────

function interleavePerso(traitQs, traitTs, persoQs, persoTs) {
  if (persoQs.length === 0) return { questions: [...traitQs], truths: [...traitTs] };
  if (traitQs.length === 0) return { questions: [...persoQs], truths: [...persoTs] };

  const questions = [];
  const truths = [];

  const gap = Math.ceil(traitQs.length / (persoQs.length + 1));
  let traitIdx = 0;
  let persoIdx = 0;

  while (traitIdx < traitQs.length || persoIdx < persoQs.length) {
    for (let g = 0; g < gap && traitIdx < traitQs.length; g++) {
      questions.push(traitQs[traitIdx]);
      truths.push(traitTs[traitIdx]);
      traitIdx++;
    }
    if (persoIdx < persoQs.length) {
      questions.push(persoQs[persoIdx]);
      truths.push(persoTs[persoIdx]);
      persoIdx++;
    }
  }

  return { questions, truths };
}

// ── Build questions ──────────────────────────────────────────────────────────

function buildQuestionsFromKeys(selectedKeys, eligibleResults, genre, prenom, mode = 'public', totemAnimal, defiBands, { audience, persoQuestions, persoBank, previousVariantIds } = {}) {
  if (!Array.isArray(selectedKeys)) {
    return { error: 'invalid_keys', questions: [], truths: [] };
  }

  const parsedKeys = selectedKeys.map(k => parseDimKey(k));
  const dimKeysOnly = parsedKeys.map(p => p.dimKey);
  const persoCount = persoQuestions ? persoQuestions.length : 0;
  const traitMin = persoCount > 0 ? 5 : 6;
  const traitMax = Math.max(5, 8 - persoCount);

  if (dimKeysOnly.length < traitMin || dimKeysOnly.length > traitMax) {
    return { error: 'invalid_key_count', questions: [], truths: [] };
  }

  if (new Set(dimKeysOnly).size !== dimKeysOnly.length) {
    return { error: 'duplicate_keys', questions: [], truths: [] };
  }

  if (dimKeysOnly.includes('__totem__')) {
    return { error: 'totem_in_keys', questions: [], truths: [] };
  }

  const allDims = collectDimensions(eligibleResults, mode);
  const dimsByKey = new Map();
  for (const d of allDims) {
    dimsByKey.set(dimKey(d), d);
  }

  const bigFiveCount = dimKeysOnly.filter(k => k.startsWith('big_five.')).length;
  const nonBfAutoAvailable = allDims.filter(d => !d.isBigFive && d.level === 'auto' && (QUESTION_DEFS_V4[dimKey(d)] || DEFS_BY_KEY[dimKey(d)])).length;
  if (bigFiveCount > 3 && nonBfAutoAvailable + 3 >= dimKeysOnly.length) {
    return { error: 'too_many_big_five', questions: [], truths: [] };
  }

  for (const pk of parsedKeys) {
    if (!QUESTION_DEFS_V4[pk.dimKey] && !DEFS_BY_KEY[pk.dimKey]) {
      return { error: 'unknown_key', detail: pk.dimKey, questions: [], truths: [] };
    }
    if (!dimsByKey.has(pk.dimKey)) {
      return { error: 'ineligible_key', detail: pk.dimKey, questions: [], truths: [] };
    }
  }

  const traitQuestions = [];
  const traitTruths = [];
  const variantIds = [];

  for (const pk of shuffleArray(parsedKeys)) {
    const dim = dimsByKey.get(pk.dimKey);
    const v4Def = QUESTION_DEFS_V4[pk.dimKey];

    let stem, options;

    if (v4Def && pk.variantId) {
      const variant = v4Def.variants.find(v => v.id === pk.variantId);
      if (variant) {
        stem = variant.stem;
        options = variant.options;
        variantIds.push(variant.id);
      } else {
        const fallback = v4Def.variants.find(v => v.audiences.includes('tous')) || v4Def.variants[0];
        stem = fallback.stem;
        options = fallback.options;
        variantIds.push(fallback.id);
      }
    } else if (v4Def && audience) {
      const variant = selectVariant(pk.dimKey, audience, previousVariantIds || []);
      if (variant) {
        stem = variant.stem;
        options = variant.options;
        variantIds.push(variant.id);
      } else {
        const fallback = v4Def.variants[0];
        stem = fallback.stem;
        options = fallback.options;
        variantIds.push(fallback.id);
      }
    } else if (v4Def) {
      const variant = v4Def.variants.find(v => v.audiences.includes('tous')) || v4Def.variants[0];
      stem = variant.stem;
      options = variant.options;
      variantIds.push(variant.id);
    } else {
      const oldDef = DEFS_BY_KEY[pk.dimKey];
      stem = oldDef.questionTemplate;
      options = oldDef.options;
    }

    const band = computeBand(dim.scaleId, dim.score, dim.subscaleKey, defiBands);
    if (!band) continue;

    const rc = dim.subscaleKey ? 3 : rangeCount(dim.scaleId);
    const is2Range = rc === 2;

    const availableBands = is2Range ? ['bas', 'haut'] : ['bas', 'moyen', 'haut'];
    const optionEntries = availableBands
      .filter(b => options[b])
      .map(b => ({
        id: generateOpaqueId(),
        label: resolveGender(options[b], genre),
        _band: b,
      }));

    const shuffledOptions = shuffleArray(optionEntries);
    const correctId = shuffledOptions.find(o => o._band === band).id;

    traitQuestions.push({
      source: 'scale',
      scaleId: dim.scaleId,
      subscaleKey: dim.subscaleKey || null,
      text: resolveGender(stem.replace(/\{prenom\}/g, prenom), genre),
      options: shuffledOptions.map(({ id, label }) => ({ id, label })),
    });

    traitTruths.push({
      source: 'scale',
      scaleId: dim.scaleId,
      subscaleKey: dim.subscaleKey || null,
      correctOptionId: correctId,
      band,
      optionBands: Object.fromEntries(shuffledOptions.map(o => [o.id, o._band])),
      is2Range,
    });
  }

  // Build perso questions
  const persoQs = [];
  const persoTs = [];

  if (persoQuestions && persoQuestions.length > 0) {
    const bank = persoBank || PERSO_QUESTIONS;
    const allPerso = [...(bank.tous || [])];
    if (audience && bank[audience]) {
      allPerso.push(...bank[audience]);
    }
    const persoById = new Map(allPerso.map(p => [p.id, p]));

    for (const pq of persoQuestions) {
      const pDef = persoById.get(pq.questionId);
      if (!pDef) continue;

      const optionEntries = pDef.options.map(opt => ({
        id: generateOpaqueId(),
        label: resolveGender(opt.replace(/\{prenom\}/g, prenom), genre),
        _value: opt,
      }));

      const shuffledOptions = shuffleArray(optionEntries);
      const correctId = shuffledOptions.find(o => o._value === pq.creatorAnswer)?.id;
      if (!correctId) continue;

      let persoText = resolveGender(pDef.stem.replace(/\{prenom\}/g, prenom), genre);
      if (!/[?!….]$/.test(persoText.trim())) persoText = persoText.trim() + ' ?';

      persoQs.push({
        source: 'perso',
        questionId: pq.questionId,
        text: persoText,
        options: shuffledOptions.map(({ id, label }) => ({ id, label })),
      });

      persoTs.push({
        source: 'perso',
        questionId: pq.questionId,
        correctOptionId: correctId,
      });
    }
  }

  // Interleave perso among traits, then append totem
  const merged = interleavePerso(traitQuestions, traitTruths, persoQs, persoTs);
  const questions = merged.questions;
  const truths = merged.truths;

  if (totemAnimal) {
    const totem = buildTotemQuestion(totemAnimal, prenom, genre);
    questions.push(totem.question);
    truths.push(totem.truth);
  }

  return { error: null, questions, truths, variantIds };
}

function getQuestionText(key, genre, prenom) {
  const { dimKey: dk, variantId } = parseDimKey(key);
  const v4Def = QUESTION_DEFS_V4[dk];

  if (v4Def && variantId) {
    const variant = v4Def.variants.find(v => v.id === variantId);
    if (variant) return resolveGender(variant.stem.replace(/\{prenom\}/g, prenom), genre);
  }

  if (v4Def) {
    const variant = v4Def.variants.find(v => v.audiences.includes('tous')) || v4Def.variants[0];
    return resolveGender(variant.stem.replace(/\{prenom\}/g, prenom), genre);
  }

  const def = DEFS_BY_KEY[dk];
  if (!def) return null;
  return resolveGender(def.questionTemplate.replace(/\{prenom\}/g, prenom), genre);
}

function selectQuestions(eligibleResults, genre, prenom, mode = 'public', totemAnimal, defiBands) {
  const { error, selected } = selectDimensions(eligibleResults, mode);
  if (error) {
    return { error, questions: [], truths: [] };
  }

  const keys = selected.map(d => dimKey(d));
  return buildQuestionsFromKeys(keys, eligibleResults, genre, prenom, mode, totemAnimal, defiBands);
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function scoreResponse(truths, responses) {
  let bonnes = 0;
  let presque = 0;
  let mauvaises = 0;
  let totalPoints = 0;
  let maxPoints = 0;

  for (let i = 0; i < truths.length; i++) {
    const truth = truths[i];
    const response = responses[i];
    const weight = truth.points || 1;
    maxPoints += weight;

    if (!response || !response.optionId) {
      mauvaises++;
      continue;
    }

    if (truth.source === 'totem' || truth.source === 'perso') {
      if (response.optionId === truth.correctOptionId) {
        bonnes++;
        totalPoints += weight;
      } else {
        mauvaises++;
      }
      continue;
    }

    if (response.optionId === truth.correctOptionId) {
      bonnes++;
      totalPoints += weight;
      continue;
    }

    if (truth.is2Range) {
      mauvaises++;
      continue;
    }

    const responseBand = truth.optionBands[response.optionId];
    if (!responseBand) {
      mauvaises++;
      continue;
    }

    const diff = Math.abs(getBandIndex(responseBand) - getBandIndex(truth.band));
    if (diff === 1) {
      presque++;
      totalPoints += weight * 0.5;
    } else {
      mauvaises++;
    }
  }

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return { score, bonnes, presque, mauvaises, total: truths.length };
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  computeBand,
  selectQuestions,
  selectDimensions,
  buildQuestionsFromKeys,
  getQuestionText,
  scoreResponse,
  buildTotemQuestion,
  resolveGender,
  generateSlug,
  selectVariant,
  parseDimKey,
  interleavePerso,
  TOTEM_POINTS,
  _QUESTION_DEFS: QUESTION_DEFS,
  _DEFS_BY_KEY: DEFS_BY_KEY,
  DEFI_SCALE_CONFIG,
  QUESTION_DEFS_V4,
  AUDIENCE_EXCLUSIONS,
  AUDIENCE_PRIORITIES,
  DIMENSION_THEMES,
  RESULT_TITLES,
  PERSO_QUESTIONS,
  _collectDimensions: collectDimensions,
  _getBandIndex: getBandIndex,
  _neutralSuffix: neutralSuffix,
  _normalizeGenre: normalizeGenre,
};
