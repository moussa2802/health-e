#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const {
  _QUESTION_DEFS, resolveGender, TOTEM_POINTS,
  QUESTION_DEFS_V4, AUDIENCE_EXCLUSIONS, DIMENSION_THEMES, RESULT_TITLES, PERSO_QUESTIONS,
} = require('../netlify/functions/_defi/questionBank');
const { SCALE_DEFS } = require('../netlify/functions/_defi/scaleDefinitions');

const DEFI_SCALE_CONFIG = {
  big_five:           { public: 'auto',     intime: 'auto' },
  ecr_r:              { public: 'auto',     intime: 'auto' },
  brs:                { public: 'auto',     intime: 'auto' },
  bonus_tdah:         { public: 'auto',     intime: 'auto' },
  bonus_hsp:          { public: 'auto',     intime: 'auto' },
  bonus_hpi:          { public: 'auto',     intime: 'auto' },
  bonus_jalousie:     { public: 'auto',     intime: 'auto' },
  bonus_eq:           { public: 'auto',     intime: 'auto' },
  bonus_confiance:    { public: 'auto',     intime: 'auto' },
  bonus_personnalite: { public: 'interdit', intime: 'optin' },
  bonus_narcissisme:  { public: 'auto',     intime: 'auto' },
  bonus_manipulation: { public: 'auto',     intime: 'auto' },
  gad7:               { public: 'optin',    intime: 'optin' },
  rses:               { public: 'optin',    intime: 'optin' },
  pss10:              { public: 'optin',    intime: 'optin' },
  social_pressure:    { public: 'optin',    intime: 'optin' },
  bonus_burnout:      { public: 'optin',    intime: 'optin' },
  bonus_dependance:   { public: 'optin',    intime: 'optin' },
};

const SCALE_NAMES = {
  'big_five.extraversion': 'Big Five — Extraversion (subscale)',
  'big_five.agreeableness': 'Big Five — Agréabilité (subscale)',
  'big_five.conscientiousness': 'Big Five — Conscienciosité (subscale)',
  'big_five.emotional_stability': 'Big Five — Stabilité émotionnelle (subscale)',
  'big_five.openness': 'Big Five — Ouverture (subscale)',
  'ecr_r.anxiety': 'ECR-R — Anxiété d\'attachement (subscale)',
  'ecr_r.avoidance': 'ECR-R — Évitement (subscale)',
  brs: 'BRS — Résilience',
  bonus_tdah: 'TDAH (bonus)',
  bonus_hsp: 'HSP — Hypersensibilité (bonus)',
  bonus_hpi: 'HPI (bonus)',
  bonus_jalousie: 'Jalousie (bonus)',
  bonus_eq: 'EQ — Intelligence émotionnelle (bonus)',
  bonus_confiance: 'Confiance en soi (bonus)',
  bonus_narcissisme: 'Narcissisme (bonus)',
  bonus_manipulation: 'Manipulation (bonus)',
  gad7: 'GAD-7 — Anxiété',
  rses: 'RSES — Estime de soi',
  pss10: 'PSS-10 — Stress perçu',
  social_pressure: 'Pression sociale',
  bonus_burnout: 'Burnout (bonus)',
  bonus_dependance: 'Dépendance affective (bonus)',
};

const SCORE_SENS = {
  'big_five.extraversion': '↑ haut = extraverti',
  'big_five.agreeableness': '↑ haut = agréable',
  'big_five.conscientiousness': '↑ haut = consciencieux',
  'big_five.emotional_stability': '↑ haut = stable',
  'big_five.openness': '↑ haut = ouvert',
  'ecr_r.anxiety': '↑ haut = anxieux',
  'ecr_r.avoidance': '↑ haut = évitant',
  brs: '↑ haut = résilient',
  bonus_tdah: '↑ haut = symptômes TDAH',
  bonus_hsp: '↑ haut = hypersensible',
  bonus_hpi: '↑ haut = haut potentiel',
  bonus_jalousie: '↑ haut = jaloux',
  bonus_eq: '↑ haut = EQ élevé',
  bonus_confiance: '↑ haut = confiant',
  bonus_narcissisme: '↑ haut = narcissique',
  bonus_manipulation: '↑ haut = manipulateur',
  gad7: '↑ haut = anxieux',
  rses: '↑ haut = bonne estime',
  pss10: '↑ haut = stressé',
  social_pressure: '↑ haut = sensible au regard social',
  bonus_burnout: '↑ haut = épuisé',
  bonus_dependance: '↑ haut = dépendant',
};

function getLevelEmoji(scaleId) {
  const cfg = DEFI_SCALE_CONFIG[scaleId];
  if (!cfg) return '';
  if (cfg.public === 'auto') return '🟢 auto';
  if (cfg.public === 'optin') return '🟡 optin';
  return '⛔ interdit';
}

function getRangesText(scaleId, subscaleKey) {
  const def = SCALE_DEFS[scaleId];
  if (!def) return { scoreRange: '?', rangesDetail: '', nRanges: 0 };

  if (subscaleKey && def.subscales) {
    const sub = def.subscales.find(s => s.key === subscaleKey);
    if (sub) {
      const min = sub.range.min;
      const max = sub.range.max;
      const span = max - min;
      const t1 = +(min + span * 0.33).toFixed(1);
      const t2 = +(min + span * 0.67).toFixed(1);
      return {
        scoreRange: `${min}–${max} (${def.scoringMode || 'mean'} subscale)`,
        rangesDetail: `bas: ${min} – ${t1} · moyen: ${+(t1+0.1).toFixed(1)} – ${t2} · haut: ${+(t2+0.1).toFixed(1)} – ${max}`,
        nRanges: 3,
        bands: [
          { band: 'bas', range: `${min} – ${t1}` },
          { band: 'moyen', range: `${+(t1+0.1).toFixed(1)} – ${t2}` },
          { band: 'haut', range: `${+(t2+0.1).toFixed(1)} – ${max}` },
        ],
      };
    }
  }

  const ranges = def.ranges || [];
  const sr = def.scoreRange || {};
  const nRanges = ranges.length;

  const bands = [];
  if (nRanges === 2) {
    bands.push({ band: 'bas', range: `${ranges[0].min} – ${ranges[0].max}` });
    bands.push({ band: 'haut', range: `${ranges[1].min} – ${ranges[1].max}` });
  } else if (nRanges === 3) {
    bands.push({ band: 'bas', range: `${ranges[0].min} – ${ranges[0].max}` });
    bands.push({ band: 'moyen', range: `${ranges[1].min} – ${ranges[1].max}` });
    bands.push({ band: 'haut', range: `${ranges[2].min} – ${ranges[2].max}` });
  } else if (nRanges === 4) {
    bands.push({ band: 'bas', range: `${ranges[0].min} – ${ranges[0].max}` });
    bands.push({ band: 'moyen', range: `${ranges[1].min} – ${ranges[2].max}` });
    bands.push({ band: 'haut', range: `${ranges[3].min} – ${ranges[3].max}` });
  }

  return {
    scoreRange: `${sr.min ?? '?'}–${sr.max ?? '?'}`,
    rangesDetail: bands.map(b => `${b.band}: ${b.range}`).join(' · '),
    nRanges,
    bands,
  };
}

function generate() {
  const lines = [];
  const now = new Date().toISOString().slice(0, 10);

  lines.push('# Banque de questions — Revue v4 (générée par code)');
  lines.push('');
  lines.push(`> Généré le ${now} par \`npm run defi:revue\``);
  lines.push('> Source : `questionBank.js` + `questionVariants.js` + `scaleDefinitions.js`');
  lines.push('> **Aucune plage écrite à la main** — tout est extrait des fichiers sources.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Légende');
  lines.push('');
  lines.push('| Symbole | Signification |');
  lines.push('|---------|---------------|');
  lines.push('| 🟢 auto | Proposée et cochée par défaut |');
  lines.push('| 🟡 optin | Proposée mais décochée |');
  lines.push('| ⛔ interdit | Indisponible en mode public |');
  lines.push('');
  lines.push('---');
  lines.push('');

  let num = 0;
  let totalVariants = 0;

  for (const def of _QUESTION_DEFS) {
    num++;
    const key = def.subscaleKey ? `${def.scaleId}.${def.subscaleKey}` : def.scaleId;
    const name = SCALE_NAMES[key] || key;
    const rootScale = def.scaleId;
    const level = getLevelEmoji(rootScale);
    const sens = SCORE_SENS[key] || '';
    const theme = DIMENSION_THEMES[key] || '';
    const { scoreRange, nRanges, bands } = getRangesText(def.scaleId, def.subscaleKey);

    const v4entry = QUESTION_DEFS_V4[key];
    const variants = v4entry ? v4entry.variants : [];
    totalVariants += variants.length;

    lines.push(`### ${num}. ${name} ${level}`);
    lines.push('');
    lines.push(`**Thème :** ${theme} · **Plage :** ${scoreRange} · **Sens :** ${sens}`);
    lines.push(`**Plages cliniques :** ${nRanges} ranges${nRanges === 4 ? ' → bas/moyen/moyen/haut' : ''}`);
    lines.push(`**Bandes population :** tertiles p33/p66 si n ≥ 50 (sinon cliniques)`);
    lines.push(`**Variantes v4 :** ${variants.length}`);
    lines.push('');

    // Audience exclusions
    const excludedBy = [];
    for (const [aud, set] of Object.entries(AUDIENCE_EXCLUSIONS)) {
      if (set.has(key)) excludedBy.push(aud);
    }
    if (excludedBy.length > 0) {
      lines.push(`**Exclue pour :** ${excludedBy.join(', ')}`);
      lines.push('');
    }

    // V4 variants
    if (variants.length > 0) {
      for (const v of variants) {
        lines.push(`#### Variante \`${v.id}\` — audiences: ${v.audiences.join(', ')}`);
        lines.push('');
        lines.push(`**Stem :** ${v.stem}`);
        lines.push('');
        lines.push('| Bande | Option |');
        lines.push('|-------|--------|');
        for (const b of ['bas', 'moyen', 'haut']) {
          if (v.options[b]) {
            lines.push(`| ${b} | ${resolveGender(v.options[b], 'M')} |`);
          }
        }
        lines.push('');
      }
    } else {
      lines.push(`**Question (legacy) :** ${def.questionTemplate}`);
      lines.push('');
      lines.push('| Bande | Option (genre M) | Plage clinique |');
      lines.push('|-------|-------------------|----------------|');
      const availableBands = nRanges === 2 ? ['bas', 'haut'] : ['bas', 'moyen', 'haut'];
      for (const b of availableBands) {
        const optText = def.options[b] || '';
        const resolved = resolveGender(optText, 'M');
        const bandRange = bands?.find(x => x.band === b)?.range || '—';
        lines.push(`| ${b} | ${resolved} | ${bandRange} |`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // PDQ section
  lines.push('### ⛔ PDQ — Traits de personnalité (bonus_personnalite)');
  lines.push('');
  lines.push('**Statut :** interdit en public, optin en intime (décision Dr Lô).');
  lines.push('Aucune question définie pour le mode public.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Perso questions
  lines.push('## Questions perso (Layer B)');
  lines.push('');
  lines.push('Le créateur choisit 0 à 3 questions perso et y répond. Ses proches devinent sa réponse.');
  lines.push('Scoring : exact = 1pt, mauvaise = 0pt (pas de « presque »).');
  lines.push('');

  for (const [aud, questions] of Object.entries(PERSO_QUESTIONS)) {
    if (!questions || questions.length === 0) continue;
    lines.push(`### Audience : ${aud} (${questions.length} questions)`);
    lines.push('');
    lines.push('| ID | Question | Options |');
    lines.push('|----|----------|---------|');
    for (const q of questions) {
      lines.push(`| ${q.id} | ${q.stem} | ${q.options.join(' / ')} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Totem section
  lines.push('## Question Totem 🐾');
  lines.push('');
  lines.push(`**Poids :** ×${TOTEM_POINTS} points (affiché "Question bonus ×${TOTEM_POINTS} 🐾")`);
  lines.push(`**Scoring :** exact = ${TOTEM_POINTS} points, faux = 0 point (pas de "presque")`);
  lines.push('**Format :** 4 options (1 vrai animal + 3 distracteurs aléatoires)');
  lines.push("**Question :** D'après toi, c'est quoi le totem de {prenom} ?");
  lines.push('');
  lines.push('---');
  lines.push('');

  // Result titles
  lines.push('## Titres de résultat (section 7.1)');
  lines.push('');
  lines.push('| Score | Titre | Sous-titre |');
  lines.push('|-------|-------|------------|');
  for (const r of RESULT_TITLES) {
    lines.push(`| ${r.min}–${r.max} % | ${r.title} | ${r.subtitle} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Scoring section
  lines.push('## Scoring');
  lines.push('');
  lines.push('| Résultat | Points |');
  lines.push('|----------|--------|');
  lines.push('| Bonne (exact match) | 1 × poids |');
  lines.push('| Presque (bande adjacente, 3 options) | 0.5 × poids |');
  lines.push('| Mauvaise (opposé ou 2 options) | 0 |');
  lines.push(`| Totem bonne | ${TOTEM_POINTS} |`);
  lines.push('| Totem mauvaise | 0 |');
  lines.push('| Perso exacte | 1 |');
  lines.push('| Perso mauvaise | 0 |');
  lines.push('| **Score final** | round(totalPoints / maxPoints × 100) % |');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Audience exclusions
  lines.push('## Exclusions par audience');
  lines.push('');
  for (const [aud, set] of Object.entries(AUDIENCE_EXCLUSIONS)) {
    const dims = [...set];
    if (dims.length === 0) {
      lines.push(`- **${aud}** : aucune exclusion`);
    } else {
      lines.push(`- **${aud}** : ${dims.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Bands section
  lines.push('## Bandes population (tertiles)');
  lines.push('');
  lines.push('**Statut :** Netlify Function `defi-compute-bands` créée.');
  lines.push('');
  lines.push('```');
  lines.push('POST /.netlify/functions/defi-compute-bands');
  lines.push('Authorization: Bearer <token>');
  lines.push('Body: {}                          ← dry run (par défaut)');
  lines.push('Body: { "dryRun": false }         ← écriture dans config/defiBands');
  lines.push('```');
  lines.push('');
  lines.push('Les dimensions avec n < 50 conservent les plages cliniques.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Gender section
  lines.push('## Marqueurs de genre');
  lines.push('');
  lines.push('Format `{{masculin|féminin}}` :');
  lines.push('- Genre M → forme masculine');
  lines.push('- Genre F → forme féminine');
  lines.push('- Genre null → forme neutre avec point médian');
  lines.push('');
  lines.push('Test automatisé : aucun adjectif accordable hors placeholder, aucune option > 60 chars.');

  const content = lines.join('\n') + '\n';
  const outPath = path.resolve(__dirname, '..', 'docs', 'defi-questions-revue.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`✓ docs/defi-questions-revue.md generated (${_QUESTION_DEFS.length} dimensions, ${totalVariants} variants)`);
}

generate();
