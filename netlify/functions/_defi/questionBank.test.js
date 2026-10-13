const {
  computeBand,
  selectQuestions,
  selectDimensions,
  buildQuestionsFromKeys,
  getQuestionText,
  scoreResponse,
  buildTotemQuestion,
  resolveGender,
  TOTEM_POINTS,
  _QUESTION_DEFS,
  _DEFS_BY_KEY,
  _collectDimensions,
  _getBandIndex,
  _neutralSuffix,
  _normalizeGenre,
} = require("./questionBank");
const { SCALE_DEFS } = require("./scaleDefinitions");

// ── Helpers ──────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`FAIL: ${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

// ── computeBand ──────────────────────────────────────────────────────────────

console.log("\n── computeBand ──");

test("brs (3 ranges): low score → bas", () => {
  assertEq(computeBand("brs", 1.5), "bas", "brs 1.5");
});

test("brs (3 ranges): mid score → moyen", () => {
  assertEq(computeBand("brs", 3.5), "moyen", "brs 3.5");
});

test("brs (3 ranges): high score → haut", () => {
  assertEq(computeBand("brs", 4.5), "haut", "brs 4.5");
});

test("bonus_jalousie (4 ranges): range 0 → bas", () => {
  assertEq(computeBand("bonus_jalousie", 10), "bas", "jalousie 10");
});

test("bonus_jalousie (4 ranges): range 1 → moyen", () => {
  assertEq(computeBand("bonus_jalousie", 25), "moyen", "jalousie 25");
});

test("bonus_jalousie (4 ranges): range 2 → moyen", () => {
  assertEq(computeBand("bonus_jalousie", 35), "moyen", "jalousie 35");
});

test("bonus_jalousie (4 ranges): range 3 → haut", () => {
  assertEq(computeBand("bonus_jalousie", 50), "haut", "jalousie 50");
});

test("pss10 (3 ranges): boundary → correct band", () => {
  assertEq(computeBand("pss10", 13), "bas", "pss10 13");
  assertEq(computeBand("pss10", 14), "moyen", "pss10 14");
  assertEq(computeBand("pss10", 27), "haut", "pss10 27");
});

test("big_five subscale: low normalized → bas", () => {
  assertEq(computeBand("big_five", 3, "extraversion"), "bas", "bf.ext 3");
});

test("big_five subscale: mid normalized → moyen", () => {
  assertEq(computeBand("big_five", 6, "extraversion"), "moyen", "bf.ext 6");
});

test("big_five subscale: high normalized → haut", () => {
  assertEq(computeBand("big_five", 9, "extraversion"), "haut", "bf.ext 9");
});

test("ecr_r subscale: anxiety (mean 1-7)", () => {
  assertEq(computeBand("ecr_r", 2, "anxiety"), "bas", "ecr.anx 2");
  assertEq(computeBand("ecr_r", 4, "anxiety"), "moyen", "ecr.anx 4");
  assertEq(computeBand("ecr_r", 6, "anxiety"), "haut", "ecr.anx 6");
});

test("unknown scale → null", () => {
  assertEq(computeBand("nonexistent", 5), null, "unknown");
});

test("computeBand with defiBands optimal cuts (n>=50)", () => {
  const defiBands = { brs: { c1: 2.5, c2: 4.0, n: 100 } };
  assertEq(computeBand("brs", 2.0, undefined, defiBands), "bas", "below c1");
  assertEq(computeBand("brs", 2.5, undefined, defiBands), "bas", "equal c1 → bas");
  assertEq(computeBand("brs", 3.0, undefined, defiBands), "moyen", "between c1-c2");
  assertEq(computeBand("brs", 4.0, undefined, defiBands), "moyen", "equal c2 → moyen");
  assertEq(computeBand("brs", 4.5, undefined, defiBands), "haut", "above c2");
});

test("computeBand with defiBands n<50 → falls back to clinical ranges", () => {
  const defiBands = { brs: { c1: 2.5, c2: 4.0, n: 30 } };
  assertEq(computeBand("brs", 1.5, undefined, defiBands), "bas", "fallback clinical");
  assertEq(computeBand("brs", 3.5, undefined, defiBands), "moyen", "fallback clinical mid");
});

test("computeBand convention: bas ≤ c1, moyen ≤ c2, haut > c2 (tie-heavy)", () => {
  const defiBands = { brs: { c1: 3, c2: 4, n: 100 } };
  assertEq(computeBand("brs", 3, undefined, defiBands), "bas", "score=c1 → bas");
  assertEq(computeBand("brs", 4, undefined, defiBands), "moyen", "score=c2 → moyen");
  assertEq(computeBand("brs", 5, undefined, defiBands), "haut", "score>c2 → haut");
});

// ── resolveGender ────────────────────────────────────────────────────────────

console.log("\n── resolveGender ──");

test("gender M", () => {
  assertEq(resolveGender("{{Réservé|Réservée}}", "M"), "Réservé", "M");
});

test("gender F", () => {
  assertEq(resolveGender("{{Réservé|Réservée}}", "F"), "Réservée", "F");
});

test("gender null → neutral form", () => {
  const result = resolveGender("{{Réservé|Réservée}}", null);
  assert(result.includes("·"), `neutral should use · : got "${result}"`);
});

test("multiple gender markers", () => {
  const result = resolveGender("{{il|elle}} est {{content|contente}}", "F");
  assertEq(result, "elle est contente", "multi F");
});

test("French elision: si il → s'il, que il → qu'il, de elle → d'elle", () => {
  assertEq(resolveGender("même si {{il|elle}} le dit", "M"), "même s'il le dit", "si il → s'il");
  assertEq(resolveGender("même si {{il|elle}} le dit", "F"), "même si elle le dit", "si elle stays");
  assertEq(resolveGender("parce que {{il|elle}} sait", "M"), "parce qu'il sait", "que il → qu'il");
  assertEq(resolveGender("parce que {{il|elle}} sait", "F"), "parce qu'elle sait", "que elle → qu'elle");
  assertEq(resolveGender("loin de {{il|elle}}", "M"), "loin d'il", "de il → d'il");
  assertEq(resolveGender("loin de {{il|elle}}", "F"), "loin d'elle", "de elle → d'elle");
});

test("no elision violations in resolved question texts", () => {
  const ELISION_PATTERNS = [
    { re: /\bsi il\b/i, fix: "s'il" },
    { re: /\bque il\b/i, fix: "qu'il" },
    { re: /\bque elle\b/i, fix: "qu'elle" },
    { re: /\bde il\b/i, fix: "d'il" },
    { re: /\bde elle\b/i, fix: "d'elle" },
  ];
  const violations = [];
  for (const def of _QUESTION_DEFS) {
    for (const [band, text] of Object.entries(def.options)) {
      for (const g of ['M', 'F', null]) {
        const resolved = resolveGender(text, g);
        for (const { re, fix } of ELISION_PATTERNS) {
          if (re.test(resolved)) {
            const key = def.subscaleKey ? `${def.scaleId}.${def.subscaleKey}` : def.scaleId;
            violations.push(`${key} [${band}] (${g ?? 'null'}): "${resolved}" — should use "${fix}"`);
          }
        }
      }
    }
  }
  assert(violations.length === 0, `elision violations:\n    ${violations.join('\n    ')}`);
});

// ── normalizeGenre ──────────────────────────────────────────────────────────

console.log("\n── normalizeGenre ──");

test("normalizeGenre: 'homme' → M", () => assertEq(_normalizeGenre('homme'), 'M', "homme"));
test("normalizeGenre: 'femme' → F", () => assertEq(_normalizeGenre('femme'), 'F', "femme"));
test("normalizeGenre: 'masculin' → M", () => assertEq(_normalizeGenre('masculin'), 'M', "masculin"));
test("normalizeGenre: 'feminin' → F", () => assertEq(_normalizeGenre('feminin'), 'F', "feminin"));
test("normalizeGenre: 'féminin' → F", () => assertEq(_normalizeGenre('féminin'), 'F', "féminin"));
test("normalizeGenre: 'M' → M", () => assertEq(_normalizeGenre('M'), 'M', "M legacy"));
test("normalizeGenre: 'F' → F", () => assertEq(_normalizeGenre('F'), 'F', "F legacy"));
test("normalizeGenre: null → null", () => assertEq(_normalizeGenre(null), null, "null"));
test("normalizeGenre: undefined → null", () => assertEq(_normalizeGenre(undefined), null, "undef"));

// ── neutralSuffix ──────────────────────────────────────────────────────────

console.log("\n── neutralSuffix ──");

test("Spontané|Spontanée → ·e", () => assertEq(_neutralSuffix("Spontané", "Spontanée"), "e", "Spontané"));
test("Extraverti|Extravertie → ·e", () => assertEq(_neutralSuffix("Extraverti", "Extravertie"), "e", "Extraverti"));
test("Réservé|Réservée → ·e", () => assertEq(_neutralSuffix("Réservé", "Réservée"), "e", "Réservé"));
test("Confiant|Confiante → ·e", () => assertEq(_neutralSuffix("Confiant", "Confiante"), "e", "Confiant"));
test("Serein|Sereine → ·e", () => assertEq(_neutralSuffix("Serein", "Sereine"), "e", "Serein"));
test("Curieux|Curieuse → ·se", () => assertEq(_neutralSuffix("Curieux", "Curieuse"), "se", "Curieux"));
test("Doux|Douce → ·ce", () => assertEq(_neutralSuffix("Doux", "Douce"), "ce", "Doux"));
test("Ouvert|Ouverte → ·e", () => assertEq(_neutralSuffix("Ouvert", "Ouverte"), "e", "Ouvert"));
test("Créatif|Créative → ·ve", () => assertEq(_neutralSuffix("Créatif", "Créative"), "ve", "Créatif"));
test("Direct|Directe → ·e", () => assertEq(_neutralSuffix("Direct", "Directe"), "e", "Direct"));
test("il|elle → ·elle", () => assertEq(_neutralSuffix("il", "elle"), "elle", "il/elle"));
test("franc|franche → ·he", () => assertEq(_neutralSuffix("franc", "franche"), "he", "franc"));
test("jaloux|jalouse → ·se", () => assertEq(_neutralSuffix("jaloux", "jalouse"), "se", "jaloux"));
test("anxieux|anxieuse → ·se", () => assertEq(_neutralSuffix("anxieux", "anxieuse"), "se", "anxieux"));

// ── resolveGender with real profile values ──────────────────────────────────

console.log("\n── resolveGender with real profile values ──");

test("gender 'femme' (real profile value) → feminine form", () => {
  assertEq(resolveGender("{{Réservé|Réservée}}", "femme"), "Réservée", "femme");
});

test("gender 'homme' (real profile value) → masculine form", () => {
  assertEq(resolveGender("{{Réservé|Réservée}}", "homme"), "Réservé", "homme");
});

test("gender 'feminin' → feminine form", () => {
  assertEq(resolveGender("{{Spontané|Spontanée}}", "feminin"), "Spontanée", "feminin");
});

test("neutral: Spontané·e (not ·pontanée)", () => {
  assertEq(resolveGender("{{Spontané|Spontanée}}", null), "Spontané·e", "neutral Spontané");
});

test("neutral: Créatif·ve (not ·réative)", () => {
  assertEq(resolveGender("{{Créatif|Créative}}", null), "Créatif·ve", "neutral Créatif");
});

test("neutral: Doux·ce (not ·ouce)", () => {
  assertEq(resolveGender("{{Doux|Douce}}", null), "Doux·ce", "neutral Doux");
});

test("neutral: Curieux·se (not ·urieuse)", () => {
  assertEq(resolveGender("{{Curieux|Curieuse}}", null), "Curieux·se", "neutral Curieux");
});

test("neutral: Direct·e (not ·irecte)", () => {
  assertEq(resolveGender("{{Direct|Directe}}", null), "Direct·e", "neutral Direct");
});

test("neutral: Serein·e (not ·ereine)", () => {
  assertEq(resolveGender("{{Serein|Sereine}}", null), "Serein·e", "neutral Serein");
});

test("neutral: Extraverti·e (not ·xtravertie)", () => {
  assertEq(resolveGender("{{Extraverti|Extravertie}}", null), "Extraverti·e", "neutral Extraverti");
});

test("neutral: Ouvert·e (not ·uverte)", () => {
  assertEq(resolveGender("{{Ouvert|Ouverte}}", null), "Ouvert·e", "neutral Ouvert");
});

test("neutral: Confiant·e (not ·onfiante)", () => {
  assertEq(resolveGender("{{Confiant|Confiante}}", null), "Confiant·e", "neutral Confiant");
});

test("neutral: Réservé·e (not ·éservée)", () => {
  assertEq(resolveGender("{{Réservé|Réservée}}", null), "Réservé·e", "neutral Réservé");
});

// ── Gender agreement in QUESTION_DEFS ────────────────────────────────────────

console.log("\n── Gender agreement ──");

test("no unaccorded adjectives in options (all gendered words use placeholders)", () => {
  const ACCORDABLES = [
    ['discret', 'discrète'], ['extraverti', 'extravertie'], ['entouré', 'entourée'],
    ['stressé', 'stressée'], ['rassuré', 'rassurée'], ['seul', 'seule'],
    ['vif', 'vive'], ['réservé', 'réservée'], ['spontané', 'spontanée'],
    ['organisé', 'organisée'], ['concentré', 'concentrée'], ['épuisé', 'épuisée'],
    ['indépendant', 'indépendante'], ['jaloux', 'jalouse'], ['confiant', 'confiante'],
    ['prudent', 'prudente'], ['exigeant', 'exigeante'], ['anxieux', 'anxieuse'],
    ['sûr', 'sûre'], ['touché', 'touchée'], ['posé', 'posée'],
  ];

  function stripPlaceholders(s) {
    return s.replace(/\{\{[^}]+\}\}/g, '');
  }

  const violations = [];
  for (const def of _QUESTION_DEFS) {
    for (const [band, text] of Object.entries(def.options)) {
      const stripped = stripPlaceholders(text).toLowerCase();
      for (const [masc, fem] of ACCORDABLES) {
        if (stripped.includes(masc) || stripped.includes(fem)) {
          violations.push(`${def.scaleId}${def.subscaleKey ? '.' + def.subscaleKey : ''} [${band}]: bare "${masc}/${fem}" outside placeholder in "${text}"`);
        }
      }
    }
  }
  assert(violations.length === 0, `unaccorded adjectives found:\n    ${violations.join('\n    ')}`);
});

test("no useless same-form gender placeholders ({{x|x}})", () => {
  const uselessPattern = /\{\{(\w+)\|\1\}\}/;
  const violations = [];
  for (const def of _QUESTION_DEFS) {
    for (const [band, text] of Object.entries(def.options)) {
      const match = uselessPattern.exec(text);
      if (match) {
        violations.push(`${def.scaleId}${def.subscaleKey ? '.' + def.subscaleKey : ''} [${band}]: useless {{${match[1]}|${match[1]}}}`);
      }
    }
    const qMatch = uselessPattern.exec(def.questionTemplate);
    if (qMatch) {
      violations.push(`${def.scaleId} question: useless {{${qMatch[1]}|${qMatch[1]}}}`);
    }
  }
  assert(violations.length === 0, `useless placeholders:\n    ${violations.join('\n    ')}`);
});

test("all options ≤ 60 characters after gender resolution", () => {
  const violations = [];
  for (const def of _QUESTION_DEFS) {
    for (const [band, text] of Object.entries(def.options)) {
      for (const g of ['M', 'F']) {
        const resolved = resolveGender(text, g);
        if (resolved.length > 60) {
          const key = def.subscaleKey ? `${def.scaleId}.${def.subscaleKey}` : def.scaleId;
          violations.push(`${key} [${band}] (${g}): ${resolved.length} chars → "${resolved}"`);
        }
      }
    }
  }
  assert(violations.length === 0, `options too long:\n    ${violations.join('\n    ')}`);
});

// ── selectQuestions ──────────────────────────────────────────────────────────

console.log("\n── selectQuestions ──");

function makeTotemOnlyResults() {
  return [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'rses', totalScore: 28, alertLevel: 0 },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
    { scaleId: 'gad7', totalScore: 6, alertLevel: 1 },
    { scaleId: 'pss10', totalScore: 15, alertLevel: 0 },
    { scaleId: 'phq9', totalScore: 8, alertLevel: 1 },
  ];
}

test("CRITICAL: totem-only profile (7 scales) → at least 8+1 questions in public", () => {
  const results = makeTotemOnlyResults();
  const { error, questions, truths } = selectQuestions(results, 'M', 'Moussa', 'public', 'lion');
  assertEq(error, null, "no error");
  assert(questions.length >= 9, `expected >= 9 questions (8+totem), got ${questions.length}`);
  assertEq(questions[questions.length - 1].source, 'totem', "last question is totem");
});

test("totem-only profile: no optin scales auto-added", () => {
  const results = makeTotemOnlyResults();
  const { questions } = selectQuestions(results, 'M', 'Moussa', 'public', 'lion');
  const scaleQuestions = questions.filter(q => q.source === 'scale');
  for (const q of scaleQuestions) {
    assert(
      ['big_five', 'ecr_r', 'brs'].includes(q.scaleId),
      `optin scale "${q.scaleId}" should not be auto-added`
    );
  }
});

test("rich profile: max 3 Big Five initially, up to 5 if needed", () => {
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
    { scaleId: 'bonus_hsp', totalScore: 30, alertLevel: 0 },
    { scaleId: 'bonus_narcissisme', totalScore: 6, alertLevel: 0 },
    { scaleId: 'bonus_jalousie', totalScore: 20, alertLevel: 0 },
    { scaleId: 'bonus_confiance', totalScore: 32, alertLevel: 0 },
    { scaleId: 'bonus_manipulation', totalScore: 25, alertLevel: 0 },
    { scaleId: 'bonus_hpi', totalScore: 35, alertLevel: 0 },
    { scaleId: 'bonus_tdah', totalScore: 20, alertLevel: 0 },
    { scaleId: 'bonus_eq', totalScore: 70, alertLevel: 0 },
  ];
  const { error, questions } = selectQuestions(results, 'F', 'Aminata', 'public', 'dauphin');
  assertEq(error, null, "no error");
  assertEq(questions.length, 9, "8 scale + 1 totem");
});

test("alert level 3 → scale excluded", () => {
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 3,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { questions } = selectQuestions(results, 'M', 'Test', 'public', 'lion');
  const bfQ = questions.filter(q => q.scaleId === 'big_five');
  assertEq(bfQ.length, 0, "big_five excluded");
});

test("phq9 interdit in public mode", () => {
  const results = [
    { scaleId: 'phq9', totalScore: 5, alertLevel: 0 },
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { questions } = selectQuestions(results, 'M', 'Test', 'public', 'lion');
  const phqQ = questions.filter(q => q.scaleId === 'phq9');
  assertEq(phqQ.length, 0, "phq9 excluded in public");
});

test("bonus_personnalite interdit in public mode", () => {
  const results = [
    { scaleId: 'bonus_personnalite', totalScore: 5, alertLevel: 0 },
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { questions } = selectQuestions(results, 'M', 'Test', 'public', 'lion');
  const pdqQ = questions.filter(q => q.scaleId === 'bonus_personnalite');
  assertEq(pdqQ.length, 0, "bonus_personnalite excluded in public");
});

test("not enough scales → error", () => {
  const results = [
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { error } = selectQuestions(results, 'M', 'Test', 'public', 'lion');
  assertEq(error, 'not_enough_scales', "should error");
});

test("options have opaque IDs", () => {
  const results = makeTotemOnlyResults();
  const { questions, truths } = selectQuestions(results, 'M', 'Moussa', 'public', 'lion');
  for (const q of questions) {
    for (const opt of q.options) {
      assert(opt.id.startsWith('o_'), `option id should start with o_: ${opt.id}`);
      assert(!opt._band, "option should not expose _band");
      assert(!opt._animal, "option should not expose _animal");
    }
  }
});

test("truths store option→band mapping", () => {
  const results = makeTotemOnlyResults();
  const { truths } = selectQuestions(results, 'M', 'Moussa', 'public', 'lion');
  for (const t of truths) {
    if (t.source === 'scale') {
      assert(t.correctOptionId, "should have correctOptionId");
      assert(t.optionBands, "should have optionBands");
      assert(t.band, "should have band");
    }
  }
});

// ── scoreResponse ────────────────────────────────────────────────────────────

console.log("\n── scoreResponse ──");

test("exact match → bonne (1 point)", () => {
  const truths = [{
    source: 'scale', correctOptionId: 'o_abc', band: 'moyen',
    optionBands: { o_abc: 'moyen', o_def: 'bas', o_ghi: 'haut' },
    is2Range: false,
  }];
  const responses = [{ optionId: 'o_abc' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 1, "bonnes");
  assertEq(result.presque, 0, "presque");
  assertEq(result.mauvaises, 0, "mauvaises");
  assertEq(result.score, 100, "score");
});

test("adjacent band → presque (0.5 point)", () => {
  const truths = [{
    source: 'scale', correctOptionId: 'o_abc', band: 'haut',
    optionBands: { o_abc: 'haut', o_def: 'moyen', o_ghi: 'bas' },
    is2Range: false,
  }];
  const responses = [{ optionId: 'o_def' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 0, "bonnes");
  assertEq(result.presque, 1, "presque");
  assertEq(result.mauvaises, 0, "mauvaises");
  assertEq(result.score, 50, "score");
});

test("opposite band → mauvaise (0 point)", () => {
  const truths = [{
    source: 'scale', correctOptionId: 'o_abc', band: 'haut',
    optionBands: { o_abc: 'haut', o_def: 'moyen', o_ghi: 'bas' },
    is2Range: false,
  }];
  const responses = [{ optionId: 'o_ghi' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 0, "bonnes");
  assertEq(result.presque, 0, "presque");
  assertEq(result.mauvaises, 1, "mauvaises");
  assertEq(result.score, 0, "score");
});

test("2-range scale: wrong → mauvaise, no presque", () => {
  const truths = [{
    source: 'scale', correctOptionId: 'o_abc', band: 'bas',
    optionBands: { o_abc: 'bas', o_def: 'haut' },
    is2Range: true,
  }];
  const responses = [{ optionId: 'o_def' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 0, "bonnes");
  assertEq(result.presque, 0, "presque");
  assertEq(result.mauvaises, 1, "mauvaises");
});

test("timeout (no response) → mauvaise", () => {
  const truths = [{
    source: 'scale', correctOptionId: 'o_abc', band: 'moyen',
    optionBands: { o_abc: 'moyen', o_def: 'bas', o_ghi: 'haut' },
    is2Range: false,
  }];
  const responses = [null];
  const result = scoreResponse(truths, responses);
  assertEq(result.mauvaises, 1, "mauvaises");
});

test("totem: exact → bonne (×2 points)", () => {
  const truths = [{ source: 'totem', correctOptionId: 'o_lion', points: TOTEM_POINTS }];
  const responses = [{ optionId: 'o_lion' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 1, "bonnes");
  assertEq(result.score, 100, "score should be 100%");
});

test("totem: wrong → mauvaise, no presque (×2 weight)", () => {
  const truths = [{ source: 'totem', correctOptionId: 'o_lion', points: TOTEM_POINTS }];
  const responses = [{ optionId: 'o_aigle' }];
  const result = scoreResponse(truths, responses);
  assertEq(result.mauvaises, 1, "mauvaises");
  assertEq(result.presque, 0, "no presque for totem");
  assertEq(result.score, 0, "score 0");
});

test("totem ×2 mixed scoring: 1 scale bonne + totem wrong → weighted", () => {
  const truths = [
    { source: 'scale', correctOptionId: 'a', band: 'haut',
      optionBands: { a: 'haut', b: 'moyen', c: 'bas' }, is2Range: false },
    { source: 'totem', correctOptionId: 'z', points: TOTEM_POINTS },
  ];
  const responses = [
    { optionId: 'a' },
    { optionId: 'x' },
  ];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 1, "1 bonne (scale)");
  assertEq(result.mauvaises, 1, "1 mauvaise (totem)");
  // maxPoints = 1 + 2 = 3, totalPoints = 1, score = round(1/3*100) = 33
  assertEq(result.score, 33, "weighted score 1/3");
});

test("mixed scoring: 2 bonnes + 1 presque + totem wrong (×2)", () => {
  const truths = [
    { source: 'scale', correctOptionId: 'a', band: 'haut',
      optionBands: { a: 'haut', b: 'moyen', c: 'bas' }, is2Range: false },
    { source: 'scale', correctOptionId: 'd', band: 'bas',
      optionBands: { d: 'bas', e: 'moyen', f: 'haut' }, is2Range: false },
    { source: 'scale', correctOptionId: 'g', band: 'haut',
      optionBands: { g: 'haut', h: 'moyen', i: 'bas' }, is2Range: false },
    { source: 'totem', correctOptionId: 'z', points: TOTEM_POINTS },
  ];
  const responses = [
    { optionId: 'a' },  // exact → 1
    { optionId: 'd' },  // exact → 1
    { optionId: 'h' },  // adjacent → 0.5
    { optionId: 'x' },  // wrong totem → 0
  ];
  const result = scoreResponse(truths, responses);
  assertEq(result.bonnes, 2, "bonnes");
  assertEq(result.presque, 1, "presque");
  assertEq(result.mauvaises, 1, "mauvaises");
  // maxPoints = 1+1+1+2=5, totalPoints = 1+1+0.5+0=2.5, score = round(2.5/5*100) = 50
  assertEq(result.score, 50, "score = 2.5/5 * 100 = 50");
});

// ── buildTotemQuestion ───────────────────────────────────────────────────────

console.log("\n── buildTotemQuestion ──");

test("totem question has 4 options including real animal", () => {
  const { question, truth } = buildTotemQuestion('lion', 'Moussa', 'M');
  assertEq(question.options.length, 4, "4 options");
  assert(question.options.some(o => o.label === 'Lion'), "includes Lion");
  assert(truth.correctOptionId, "has correctOptionId");
  const correctOpt = question.options.find(o => o.id === truth.correctOptionId);
  assertEq(correctOpt.label, 'Lion', "correct option is Lion");
});

test("totem question options have opaque IDs", () => {
  const { question } = buildTotemQuestion('dauphin', 'Aminata', 'F');
  for (const opt of question.options) {
    assert(opt.id.startsWith('o_'), `id ${opt.id} should start with o_`);
    assert(!opt._animal, "should not expose _animal");
  }
});

test("totem question displays ×2 bonus", () => {
  const { question, truth } = buildTotemQuestion('lion', 'Moussa', 'M');
  assert(question.text.includes('×2'), "question text should mention ×2");
  assert(question.bonus === TOTEM_POINTS, `bonus should be ${TOTEM_POINTS}`);
  assertEq(truth.points, TOTEM_POINTS, "truth.points = TOTEM_POINTS");
});

// ── Question coverage ────────────────────────────────────────────────────────

console.log("\n── Question coverage ──");

test("every auto+optin public scale has a question definition (except interdit)", () => {
  const publicEligible = [
    'big_five', 'ecr_r', 'brs', 'bonus_tdah', 'bonus_hsp', 'bonus_hpi',
    'bonus_jalousie', 'bonus_eq', 'bonus_confiance',
    'bonus_narcissisme', 'bonus_manipulation',
    'gad7', 'rses', 'pss10', 'social_pressure', 'bonus_burnout', 'bonus_dependance',
  ];

  const subscaleScales = {
    big_five: ['extraversion', 'agreeableness', 'conscientiousness', 'emotional_stability', 'openness'],
    ecr_r: ['anxiety', 'avoidance'],
  };

  for (const scaleId of publicEligible) {
    if (subscaleScales[scaleId]) {
      for (const sk of subscaleScales[scaleId]) {
        const key = `${scaleId}.${sk}`;
        assert(_DEFS_BY_KEY[key], `missing question def for ${key}`);
      }
    } else {
      assert(_DEFS_BY_KEY[scaleId], `missing question def for ${scaleId}`);
    }
  }
});

test("bonus_personnalite is interdit in public → no question def needed", () => {
  assert(!_DEFS_BY_KEY['bonus_personnalite'], "bonus_personnalite should NOT have a question def (interdit in public)");
});

test("every question def has options matching its band structure", () => {
  for (const def of _QUESTION_DEFS) {
    const rc = def.subscaleKey ? 3 : (SCALE_DEFS[def.scaleId]?.ranges?.length ?? 3);
    if (rc === 2) {
      assert(def.options.bas, `${def.scaleId}: missing bas option`);
      assert(def.options.haut, `${def.scaleId}: missing haut option`);
    } else {
      assert(def.options.bas, `${def.scaleId}: missing bas option`);
      assert(def.options.moyen, `${def.scaleId}: missing moyen option`);
      assert(def.options.haut, `${def.scaleId}: missing haut option`);
    }
  }
});

// ── Scale definitions sync test ──────────────────────────────────────────────

console.log("\n── Scale definitions sync ──");

test("scaleDefinitions covers all defiConfig keys", () => {
  const expected = [
    'big_five','ecr_r','brs','bonus_tdah','bonus_hsp','bonus_hpi',
    'bonus_jalousie','bonus_eq','bonus_confiance','bonus_personnalite',
    'bonus_narcissisme','bonus_manipulation',
    'gad7','rses','pss10','social_pressure','bonus_burnout','bonus_dependance',
    'phq9','ace','pcl5','pg13','ceca_q','religious_cultural','economic_stress',
    'nsss','sdi2','sis_ses','fsfi','iief','tsi_base','pair','sise',
    'social_pressure_sex','griss_base',
  ];
  for (const id of expected) {
    assert(SCALE_DEFS[id], `SCALE_DEFS missing "${id}"`);
  }
});

// ── Revue doc sync ──────────────────────────────────────────────────────────

console.log("\n── Revue doc sync ──");

test("docs/defi-questions-revue.md is up to date with code", () => {
  const { execSync } = require("child_process");
  const fs = require("fs");
  const path = require("path");
  const docPath = path.resolve(__dirname, "../../../docs/defi-questions-revue.md");
  const currentContent = fs.readFileSync(docPath, "utf-8");
  execSync("node scripts/generateRevue.cjs", {
    cwd: path.resolve(__dirname, "../../.."),
    stdio: "pipe",
  });
  const freshContent = fs.readFileSync(docPath, "utf-8");
  fs.writeFileSync(docPath, currentContent, "utf-8");
  assert(currentContent === freshContent, "docs/defi-questions-revue.md is OUT OF SYNC. Run: npm run defi:revue");
});

// ── selectDimensions ────────────────────────────────────────────────────────

console.log("\n── selectDimensions ──");

test("selectDimensions returns selected + available", () => {
  const results = makeTotemOnlyResults();
  const { error, selected, available } = selectDimensions(results, 'public');
  assertEq(error, null, "no error");
  assert(selected.length >= 6 && selected.length <= 8, `selected count 6-8: got ${selected.length}`);
  assert(Array.isArray(available), "available is array");
});

test("selectDimensions: selected and available don't overlap", () => {
  const results = makeTotemOnlyResults();
  const { selected, available } = selectDimensions(results, 'public');
  const selectedKeys = new Set(selected.map(d => d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId));
  for (const d of available) {
    const key = d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId;
    assert(!selectedKeys.has(key), `available dim ${key} should not be in selected`);
  }
});

test("selectDimensions: available only includes dims with question defs", () => {
  const results = makeTotemOnlyResults();
  const { available } = selectDimensions(results, 'public');
  for (const d of available) {
    const key = d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId;
    assert(_DEFS_BY_KEY[key], `available dim ${key} must have a question def`);
  }
});

test("selectDimensions: empty results → error", () => {
  const { error } = selectDimensions([], 'public');
  assertEq(error, 'no_eligible_scales', "should error");
});

test("selectDimensions: not enough scales → error", () => {
  const { error } = selectDimensions([{ scaleId: 'brs', totalScore: 3.5, alertLevel: 0 }], 'public');
  assertEq(error, 'not_enough_scales', "should error");
});

test("selectDimensions: rich profile → max 3 BF initially", () => {
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
    { scaleId: 'bonus_hsp', totalScore: 30, alertLevel: 0 },
    { scaleId: 'bonus_narcissisme', totalScore: 6, alertLevel: 0 },
    { scaleId: 'bonus_jalousie', totalScore: 20, alertLevel: 0 },
    { scaleId: 'bonus_confiance', totalScore: 32, alertLevel: 0 },
    { scaleId: 'bonus_manipulation', totalScore: 25, alertLevel: 0 },
  ];
  const { selected } = selectDimensions(results, 'public');
  const bfCount = selected.filter(d => d.isBigFive).length;
  assert(bfCount <= 3, `rich profile should have <=3 BF initially: got ${bfCount}`);
});

// ── buildQuestionsFromKeys ─────────────────────────────────────────────────

console.log("\n── buildQuestionsFromKeys ──");

test("buildQuestionsFromKeys: valid keys → questions + truths", () => {
  const results = makeTotemOnlyResults();
  const { selected } = selectDimensions(results, 'public');
  const keys = selected.map(d => d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId);
  const { error, questions, truths } = buildQuestionsFromKeys(keys, results, 'M', 'Moussa', 'public', 'lion');
  assertEq(error, null, "no error");
  assertEq(questions.length, keys.length + 1, "scale questions + totem");
  assertEq(truths.length, questions.length, "truths match questions");
  assertEq(questions[questions.length - 1].source, 'totem', "last is totem");
});

test("buildQuestionsFromKeys: not an array → error", () => {
  const { error } = buildQuestionsFromKeys("not_array", [], 'M', 'Test');
  assertEq(error, 'invalid_keys', "should reject non-array");
});

test("buildQuestionsFromKeys: too few keys → error", () => {
  const { error } = buildQuestionsFromKeys(['brs', 'big_five.extraversion'], makeTotemOnlyResults(), 'M', 'Test');
  assertEq(error, 'invalid_key_count', "should reject < 6 keys");
});

test("buildQuestionsFromKeys: too many keys → error", () => {
  const keys = ['brs', 'big_five.extraversion', 'big_five.agreeableness', 'big_five.conscientiousness',
    'big_five.emotional_stability', 'big_five.openness', 'ecr_r.anxiety', 'ecr_r.avoidance', 'bonus_hsp'];
  const results = [...makeTotemOnlyResults(), { scaleId: 'bonus_hsp', totalScore: 30, alertLevel: 0 }];
  const { error } = buildQuestionsFromKeys(keys, results, 'M', 'Test');
  assertEq(error, 'invalid_key_count', "should reject > 8 keys");
});

test("buildQuestionsFromKeys: duplicate keys → error", () => {
  const keys = ['brs', 'brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety'];
  const { error } = buildQuestionsFromKeys(keys, makeTotemOnlyResults(), 'M', 'Test');
  assertEq(error, 'duplicate_keys', "should reject duplicates");
});

test("buildQuestionsFromKeys: totem key rejected", () => {
  const keys = ['__totem__', 'brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety'];
  const { error } = buildQuestionsFromKeys(keys, makeTotemOnlyResults(), 'M', 'Test');
  assertEq(error, 'totem_in_keys', "totem must not be in keys");
});

test("buildQuestionsFromKeys: unknown key → error", () => {
  const keys = ['brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety', 'fake_scale'];
  const { error, detail } = buildQuestionsFromKeys(keys, makeTotemOnlyResults(), 'M', 'Test');
  assertEq(error, 'unknown_key', "should reject unknown");
  assertEq(detail, 'fake_scale', "should name the bad key");
});

test("buildQuestionsFromKeys: forbidden scale with no question def → unknown_key", () => {
  const keys = ['brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety', 'phq9'];
  const results = [...makeTotemOnlyResults()];
  const { error } = buildQuestionsFromKeys(keys, results, 'M', 'Test', 'public');
  assertEq(error, 'unknown_key', "phq9 has no question def");
});

test("buildQuestionsFromKeys: optin scale not in eligible results → ineligible_key", () => {
  const keys = ['brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety', 'gad7'];
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { error, detail } = buildQuestionsFromKeys(keys, results, 'M', 'Test', 'public');
  assertEq(error, 'ineligible_key', "gad7 not in eligible results");
  assertEq(detail, 'gad7', "should name gad7");
});

test("buildQuestionsFromKeys: ineligible key (alertLevel >= 3) → error", () => {
  const keys = ['brs', 'big_five.extraversion', 'big_five.agreeableness',
    'big_five.conscientiousness', 'ecr_r.anxiety', 'ecr_r.avoidance'];
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 3,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
  ];
  const { error } = buildQuestionsFromKeys(keys, results, 'M', 'Test', 'public');
  assertEq(error, 'ineligible_key', "alertLevel 3 should reject");
});

test("buildQuestionsFromKeys: >3 BF with rich pool → error", () => {
  const results = [
    { scaleId: 'big_five', totalScore: 30, alertLevel: 0,
      subscaleScores: { extraversion: 6, agreeableness: 5, conscientiousness: 7, emotional_stability: 4, openness: 8 } },
    { scaleId: 'ecr_r', totalScore: 100, alertLevel: 0,
      subscaleScores: { anxiety: 3, avoidance: 4 } },
    { scaleId: 'brs', totalScore: 3.5, alertLevel: 0 },
    { scaleId: 'bonus_hsp', totalScore: 30, alertLevel: 0 },
    { scaleId: 'bonus_narcissisme', totalScore: 6, alertLevel: 0 },
    { scaleId: 'bonus_jalousie', totalScore: 20, alertLevel: 0 },
  ];
  const keys = ['big_five.extraversion', 'big_five.agreeableness', 'big_five.conscientiousness',
    'big_five.emotional_stability', 'ecr_r.anxiety', 'brs'];
  const { error } = buildQuestionsFromKeys(keys, results, 'M', 'Test', 'public');
  assertEq(error, 'too_many_big_five', "4 BF with rich pool should reject");
});

test("buildQuestionsFromKeys: >3 BF with small pool → allowed", () => {
  const results = makeTotemOnlyResults();
  const keys = ['big_five.extraversion', 'big_five.agreeableness', 'big_five.conscientiousness',
    'big_five.emotional_stability', 'big_five.openness', 'ecr_r.anxiety', 'ecr_r.avoidance', 'brs'];
  const { error } = buildQuestionsFromKeys(keys, results, 'M', 'Test', 'public', 'lion');
  assertEq(error, null, "5 BF with small pool should be allowed");
});

test("buildQuestionsFromKeys: no totem → no totem question", () => {
  const results = makeTotemOnlyResults();
  const { selected } = selectDimensions(results, 'public');
  const keys = selected.map(d => d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId);
  const { questions } = buildQuestionsFromKeys(keys, results, 'M', 'Moussa', 'public', null);
  assertEq(questions.length, keys.length, "no totem appended");
  assert(questions.every(q => q.source === 'scale'), "all scale questions");
});

test("buildQuestionsFromKeys: options have opaque IDs, no _band exposed", () => {
  const results = makeTotemOnlyResults();
  const { selected } = selectDimensions(results, 'public');
  const keys = selected.map(d => d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId);
  const { questions } = buildQuestionsFromKeys(keys, results, 'M', 'Moussa', 'public', 'lion');
  for (const q of questions) {
    for (const opt of q.options) {
      assert(opt.id.startsWith('o_'), `option id should start with o_: ${opt.id}`);
      assert(!opt._band, "option should not expose _band");
    }
  }
});

// ── getQuestionText ─────────────────────────────────────────────────────────

console.log("\n── getQuestionText ──");

test("getQuestionText: known key → resolved text", () => {
  const text = getQuestionText('big_five.extraversion', 'M', 'Moussa');
  assert(typeof text === 'string', "should return string");
  assert(text.includes('Moussa'), "should include prenom");
  assert(!text.includes('{prenom}'), "should resolve {prenom}");
  assert(!text.includes('{{'), "should resolve gender markers");
});

test("getQuestionText: feminine resolution", () => {
  const text = getQuestionText('big_five.extraversion', 'F', 'Aminata');
  assert(text.includes('Aminata'), "should include prenom");
});

test("getQuestionText: unknown key → null", () => {
  const text = getQuestionText('nonexistent_scale', 'M', 'Test');
  assertEq(text, null, "should return null");
});

test("getQuestionText: returns text only, no options/truths/bands", () => {
  const text = getQuestionText('brs', 'M', 'Moussa');
  assert(typeof text === 'string', "should be string");
  assert(text.length > 0, "should not be empty");
});

test("getQuestionText: every selected dim key returns valid text", () => {
  const results = makeTotemOnlyResults();
  const { selected } = selectDimensions(results, 'public');
  for (const d of selected) {
    const key = d.subscaleKey ? `${d.scaleId}.${d.subscaleKey}` : d.scaleId;
    const text = getQuestionText(key, 'M', 'Test');
    assert(text && text.length > 0, `getQuestionText should return text for ${key}`);
  }
});

// ── selectQuestions backward compat ──────────────────────────────────────────

console.log("\n── selectQuestions backward compat ──");

test("selectQuestions still works as wrapper (same API contract)", () => {
  const results = makeTotemOnlyResults();
  const { error, questions, truths } = selectQuestions(results, 'M', 'Moussa', 'public', 'lion');
  assertEq(error, null, "no error");
  assert(questions.length >= 7, `at least 7 questions: got ${questions.length}`);
  assertEq(questions[questions.length - 1].source, 'totem', "last is totem");
  assertEq(questions.length, truths.length, "truths match questions");
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
