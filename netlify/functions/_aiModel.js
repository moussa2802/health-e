/**
 * _aiModel.js — quel modèle Claude utilise une fonction (logique pure, testée dans _tests/aiModel.test.js).
 *
 * Le modèle se règle par une variable d'environnement Netlify (ex. DRLO_MEMORY_MODEL, MOT_DU_JOUR_MODEL).
 * Retour en arrière en une minute : mettre l'ancien identifiant dans la variable, sans toucher au code.
 * Variable absente, vide ou mal écrite → le modèle par défaut.
 */
const HAIKU_5_5 = 'claude-haiku-5-5';
const HAIKU_4_5 = 'claude-haiku-4-5-20251001';

const MODEL_RE = /^claude-[a-z0-9][a-z0-9.-]{2,60}$/;

function modelFrom(envName, fallback = HAIKU_5_5, env = process.env) {
  const v = String((env && env[envName]) || '').trim();
  return MODEL_RE.test(v) ? v : fallback;
}

// Haiku 5.5 « réfléchit » par défaut : sa réflexion compte dans max_tokens et peut ne laisser aucun texte.
// Pour ces réponses courtes, on la coupe (accepté par Haiku 4.5 et 5.5 à l'effort par défaut).
const NO_THINKING = { type: 'disabled' };

// Texte de la réponse, lu par type de bloc (la réponse peut commencer par un bloc de réflexion).
function textOf(data) {
  const blocks = Array.isArray(data && data.content) ? data.content : [];
  return blocks.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('');
}

module.exports = { HAIKU_5_5, HAIKU_4_5, NO_THINKING, modelFrom, textOf };
