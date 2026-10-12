const { SCALE_DEFS } = require("./scaleDefinitions");

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

// ── Question definitions ─────────────────────────────────────────────────────

const QUESTION_DEFS = [
  // ── Big Five (5 subscales) ──
  {
    scaleId: 'big_five', subscaleKey: 'extraversion',
    questionTemplate: "D'après toi, {prenom} est plutôt…",
    options: {
      bas:   "{{Réservé|Réservée}} et {{discret|discrète}} — préfère les petits comités",
      moyen: "Sociable en groupe, mais recharge ses batteries {{seul|seule}}",
      haut:  "{{Extraverti|Extravertie}} et sociable — adore être {{entouré|entourée}}",
    },
  },
  {
    scaleId: 'big_five', subscaleKey: 'agreeableness',
    questionTemplate: "Dans ses relations, {prenom} c'est plutôt…",
    options: {
      bas:   "{{Direct|Directe}} et {{franc|franche}} — dit ce qu'{{il|elle}} pense",
      moyen: "Diplomate — sait doser franchise et douceur",
      haut:  "{{Doux|Douce}} et {{conciliant|conciliante}} — cherche toujours l'harmonie",
    },
  },
  {
    scaleId: 'big_five', subscaleKey: 'conscientiousness',
    questionTemplate: "Au quotidien, {prenom} est plutôt…",
    options: {
      bas:   "{{Spontané|Spontanée}} et flexible — va où le vent {{le|la}} mène",
      moyen: "Fiable sur l'essentiel, {{décontracté|décontractée}} sur le reste",
      haut:  "{{Organisé|Organisée}} et {{rigoureux|rigoureuse}} — tout est carré",
    },
  },
  {
    scaleId: 'big_five', subscaleKey: 'emotional_stability',
    questionTemplate: "Face au stress, {prenom} est plutôt…",
    options: {
      bas:   "{{Réactif|Réactive}} — ça {{le|la}} touche vite et fort",
      moyen: "Encaisse bien au quotidien, mais craque sur les gros coups",
      haut:  "Zen et {{détendu|détendue}} — gère bien la pression",
    },
  },
  {
    scaleId: 'big_five', subscaleKey: 'openness',
    questionTemplate: "Côté curiosité, {prenom} c'est plutôt…",
    options: {
      bas:   "Terre à terre et {{concret|concrète}} — préfère le pratique",
      moyen: "{{Ouvert|Ouverte}} aux idées nouvelles, mais garde les pieds sur terre",
      haut:  "{{Créatif|Créative}} et {{curieux|curieuse}} — toujours en exploration",
    },
  },

  // ── ECR-R (2 subscales) ──
  {
    scaleId: 'ecr_r', subscaleKey: 'anxiety',
    questionTemplate: "En amour ou en amitié proche, {prenom} est plutôt…",
    options: {
      bas:   "{{Serein|Sereine}} — fait confiance naturellement",
      moyen: "{{Confiant|Confiante}}, mais aime être {{rassuré|rassurée}} aux moments clés",
      haut:  "A besoin d'être {{rassuré|rassurée}} — la distance l'inquiète",
    },
  },
  {
    scaleId: 'ecr_r', subscaleKey: 'avoidance',
    questionTemplate: "Dans ses relations proches, {prenom} c'est plutôt…",
    options: {
      bas:   "Aime la proximité — à l'aise avec l'intimité",
      moyen: "Proche de ceux qu'{{il|elle}} aime, mais garde son jardin secret",
      haut:  "{{Indépendant|Indépendante}} — préfère garder ses distances",
    },
  },

  // ── BRS (3 ranges) ──
  {
    scaleId: 'brs',
    questionTemplate: "Quand {prenom} traverse un coup dur, {{il|elle}} est plutôt…",
    options: {
      bas:   "Encaisse fort — met du temps à remonter la pente",
      moyen: "Se relève, mais a besoin de digérer d'abord",
      haut:  "Un vrai ressort — {{il|elle}} rebondit toujours",
    },
  },

  // ── Bonus TDAH ──
  {
    scaleId: 'bonus_tdah',
    questionTemplate: "D'après toi, {prenom} c'est plutôt…",
    options: {
      bas:   "{{Concentré|Concentrée}} et {{posé|posée}} — focus quand il faut",
      moyen: "Capable de se concentrer, mais papillonne dès que ça dure",
      haut:  "Tête en l'air — {{il|elle}} papillonne, mais c'est son charme",
    },
  },

  // ── Bonus HSP ──
  {
    scaleId: 'bonus_hsp',
    questionTemplate: "Côté sensibilité, {prenom} c'est plutôt…",
    options: {
      bas:   "Solide — pas facilement {{touché|touchée}} par les ambiances",
      moyen: "Capte les ambiances et non-dits, sans se submerger",
      haut:  "Ressent tout intensément — une vraie éponge émotionnelle",
    },
  },

  // ── Bonus HPI ──
  {
    scaleId: 'bonus_hpi',
    questionTemplate: "Au niveau du cerveau, {prenom} c'est plutôt…",
    options: {
      bas:   "Pragmatique — va droit au but",
      moyen: "{{Curieux|Curieuse}} — aime comprendre comment ça marche",
      haut:  "Cerveau à 200 à l'heure — pense à mille choses à la fois",
    },
  },

  // ── Bonus Jalousie ──
  {
    scaleId: 'bonus_jalousie',
    questionTemplate: "En matière de jalousie, {prenom} c'est plutôt…",
    options: {
      bas:   "Pas du tout {{jaloux|jalouse}} — confiance totale",
      moyen: "Un petit côté {{jaloux|jalouse}} qui se voit de temps en temps",
      haut:  "{{Jaloux|Jalouse}} en secret — même si {{il|elle}} ne le montre pas toujours",
    },
  },

  // ── Bonus EQ ──
  {
    scaleId: 'bonus_eq',
    questionTemplate: "Avec les émotions des autres, {prenom} c'est plutôt…",
    options: {
      bas:   "Plutôt {{cérébral|cérébrale}} — plus dans la tête que dans le cœur",
      moyen: "Capte les émotions des autres et sait quand intervenir",
      haut:  "Très à l'écoute — {{il|elle}} ressent ce que les autres ressentent",
    },
  },

  // ── Bonus Confiance ──
  {
    scaleId: 'bonus_confiance',
    questionTemplate: "Niveau confiance en soi, {prenom} c'est plutôt…",
    options: {
      bas:   "{{Prudent|Prudente}} — aime être {{sûr|sûre}} avant de se lancer",
      moyen: "{{Confiant|Confiante}} sur l'essentiel",
      haut:  "Fonce sans hésiter — {{sûr|sûre}} de ses capacités",
    },
  },

  // ── Bonus Narcissisme ──
  {
    scaleId: 'bonus_narcissisme',
    questionTemplate: "D'après toi, {prenom} c'est plutôt quelqu'un qui…",
    options: {
      bas:   "Reste {{discret|discrète}} et humble",
      moyen: "Assume ses qualités sans en faire un spectacle",
      haut:  "Aime briller — et assume totalement !",
    },
  },

  // ── Bonus Manipulation ──
  {
    scaleId: 'bonus_manipulation',
    questionTemplate: "Dans sa façon de fonctionner, {prenom} c'est plutôt…",
    options: {
      bas:   "{{Spontané|Spontanée}} et {{transparent|transparente}} — zéro calcul",
      moyen: "Sait jouer ses cartes quand l'enjeu le vaut",
      haut:  "Stratège — {{il|elle}} a toujours un coup d'avance",
    },
  },

  // ── GAD-7 / Anxiété (optin) ──
  {
    scaleId: 'gad7',
    questionTemplate: "Au quotidien, {prenom} est plutôt…",
    options: {
      bas:   "Zen et {{détendu|détendue}} — pas du genre à stresser",
      moyen: "Gère bien la routine, mais les imprévus {{le|la}} crispent",
      haut:  "Plutôt {{anxieux|anxieuse}} — {{il|elle}} se fait facilement du souci",
    },
  },

  // ── RSES / Estime de soi (optin) ──
  {
    scaleId: 'rses',
    questionTemplate: "Dans son rapport à soi, {prenom} c'est plutôt…",
    options: {
      bas:   "Très {{exigeant|exigeante}} avec soi-même — ne se fait pas de cadeau",
      moyen: "Connaît ses forces, mais doute encore sur certains terrains",
      haut:  "Bien dans sa peau — sait ce qu'{{il|elle}} vaut",
    },
  },

  // ── PSS-10 / Stress (optin) ──
  {
    scaleId: 'pss10',
    questionTemplate: "Face aux imprévus, {prenom} est plutôt…",
    options: {
      bas:   "Cool — gère sans trop se prendre la tête",
      moyen: "Garde le cap au quotidien, mais les galères {{le|la}} secouent",
      haut:  "Plutôt {{stressé|stressée}} — les imprévus lui pèsent",
    },
  },

  // ── Pression sociale (optin) ──
  {
    scaleId: 'social_pressure',
    questionTemplate: "Face au regard des autres, {prenom} c'est plutôt…",
    options: {
      bas:   "Libre — se fiche du qu'en-dira-t-on",
      moyen: "{{Attentif|Attentive}} au regard des proches, pas des inconnus",
      haut:  "Le regard des autres pèse dans ses choix",
    },
  },

  // ── Bonus Burnout (optin) ──
  {
    scaleId: 'bonus_burnout',
    questionTemplate: "Niveau énergie au travail/études, {prenom} c'est plutôt…",
    options: {
      bas:   "Plein d'énergie — pas du genre à s'épuiser",
      moyen: "Tient le rythme, mais rentre vidé le soir",
      haut:  "{{Épuisé|Épuisée}} — a vraiment besoin de souffler",
    },
  },

  // ── Bonus Dépendance affective (optin) ──
  {
    scaleId: 'bonus_dependance',
    questionTemplate: "Dans ses relations, {prenom} a plutôt tendance à…",
    options: {
      bas:   "Être {{indépendant|indépendante}} — bien dans ses baskets même {{seul|seule}}",
      moyen: "Aime être {{entouré|entourée}}, mais sait rester {{seul|seule}} sans angoisse",
      haut:  "S'attacher fort — a du mal à être {{seul|seule}}",
    },
  },
];

const DEFS_BY_KEY = {};
for (const d of QUESTION_DEFS) {
  const key = d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId;
  DEFS_BY_KEY[key] = d;
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

function selectQuestions(eligibleResults, genre, prenom, mode = 'public', totemAnimal, defiBands) {
  const TARGET = 8;
  const MIN = 6;

  const allDims = collectDimensions(eligibleResults, mode);
  if (allDims.length === 0) {
    return { error: 'no_eligible_scales', questions: [], truths: [] };
  }

  const autoDims = allDims.filter(d => d.level === 'auto');
  const bigFiveDims = autoDims.filter(d => d.isBigFive);
  const otherAutoDims = autoDims.filter(d => !d.isBigFive);

  let selected = [];
  const usedScales = new Set();

  const shuffledBF = shuffleArray(bigFiveDims);
  for (const dim of shuffledBF) {
    if (selected.filter(d => d.isBigFive).length >= 3) break;
    selected.push(dim);
  }

  const shuffledOther = shuffleArray(otherAutoDims);
  for (const dim of shuffledOther) {
    if (usedScales.has(dim.scaleId) && !dim.isBigFive) continue;
    selected.push(dim);
    usedScales.add(dim.scaleId);
  }

  if (selected.length < TARGET) {
    const remainingBF = shuffledBF.filter(d => !selected.includes(d));
    for (const dim of remainingBF) {
      if (selected.length >= TARGET) break;
      selected.push(dim);
    }
  }

  if (selected.length < TARGET) {
    const remainingEcr = allDims.filter(d => d.scaleId === 'ecr_r' && !selected.includes(d));
    for (const dim of remainingEcr) {
      if (selected.length >= TARGET) break;
      selected.push(dim);
    }
  }

  if (selected.length < MIN) {
    return { error: 'not_enough_scales', questions: [], truths: [] };
  }

  selected = selected.slice(0, TARGET);

  const questions = [];
  const truths = [];

  for (const dim of shuffleArray(selected)) {
    const key = dim.subscaleKey ? `${dim.scaleId}.${dim.subscaleKey}` : dim.scaleId;
    const def = DEFS_BY_KEY[key];
    if (!def) continue;

    const band = computeBand(dim.scaleId, dim.score, dim.subscaleKey, defiBands);
    if (!band) continue;

    const rc = dim.subscaleKey ? 3 : rangeCount(dim.scaleId);
    const is2Range = rc === 2;

    const availableBands = is2Range ? ['bas', 'haut'] : ['bas', 'moyen', 'haut'];
    const optionEntries = availableBands
      .filter(b => def.options[b])
      .map(b => ({
        id: generateOpaqueId(),
        label: resolveGender(def.options[b], genre),
        _band: b,
      }));

    const shuffledOptions = shuffleArray(optionEntries);
    const correctId = shuffledOptions.find(o => o._band === band).id;

    questions.push({
      source: 'scale',
      scaleId: dim.scaleId,
      subscaleKey: dim.subscaleKey || null,
      text: resolveGender(def.questionTemplate.replace(/\{prenom\}/g, prenom), genre),
      options: shuffledOptions.map(({ id, label }) => ({ id, label })),
    });

    truths.push({
      source: 'scale',
      scaleId: dim.scaleId,
      subscaleKey: dim.subscaleKey || null,
      correctOptionId: correctId,
      band,
      optionBands: Object.fromEntries(shuffledOptions.map(o => [o.id, o._band])),
      is2Range,
    });
  }

  if (totemAnimal) {
    const totem = buildTotemQuestion(totemAnimal, prenom, genre);
    questions.push(totem.question);
    truths.push(totem.truth);
  }

  return { error: null, questions, truths };
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

    if (truth.source === 'totem') {
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
  scoreResponse,
  buildTotemQuestion,
  resolveGender,
  generateSlug,
  TOTEM_POINTS,
  _QUESTION_DEFS: QUESTION_DEFS,
  _DEFS_BY_KEY: DEFS_BY_KEY,
  DEFI_SCALE_CONFIG,
  _collectDimensions: collectDimensions,
  _getBandIndex: getBandIndex,
  _neutralSuffix: neutralSuffix,
  _normalizeGenre: normalizeGenre,
};
