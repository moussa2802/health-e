/**
 * _drloResult.js — Dr Lô commente le résultat d'un test, juste après qu'on l'ait fini : quelques phrases
 * sur la PERSONNE (« Tu es quelqu'un qui… »), pas sur le score. Pur et testable (aucun appel réseau ici).
 * Jamais utilisé pour une alerte, un résultat sévère ou une orientation : ces cas gardent les messages validés.
 */
const { VOICE } = require('./_drloVoice');

const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

/** Données utiles seulement, tronquées : rien d'intime au-delà du test qui vient d'être fait. */
function sanitizeInput(body) {
  const b = body && typeof body === 'object' ? body : {};
  const subs = b.subscales && typeof b.subscales === 'object' ? Object.entries(b.subscales).slice(0, 12) : [];
  return {
    scaleId: /^[a-z0-9_]{2,40}$/i.test(String(b.scaleId)) ? String(b.scaleId) : '',
    scaleLabel: clip(b.scaleLabel, 60),
    resultLabel: clip(b.resultLabel, 80),
    severity: clip(b.severity, 20),
    description: clip(b.description, 400),
    subscales: subs.map(([k, v]) => `${clip(k, 40)} : ${typeof v === 'number' ? Math.round(v * 10) / 10 : clip(v, 20)}`),
    prenom: clip(b.prenom, 30),
    genre: b.genre === 'femme' || b.genre === 'homme' ? b.genre : '',
    guest: !!b.guest,
    alertLevel: Number(b.alertLevel) || 0,
    referralRequired: !!b.referralRequired,
  };
}

/** Faut-il se passer de l'IA (crise, orientation, résultat lourd) ? Les messages validés prennent le relais. */
function mustUseTemplate(i) {
  return i.alertLevel >= 2 || i.referralRequired || ['severe', 'alert'].includes(i.severity);
}

function buildSystemPrompt() {
  return `${VOICE}

TA TÂCHE
La personne vient de terminer un test d'auto-évaluation bien-être. Tu lui parles de ELLE à partir de son résultat, comme un médecin proche qui la connaît.
- ${'3 à 4 phrases'} courtes, 70 mots maximum au total. Commence par ce qu'elle est ou vit (« Tu es quelqu'un qui… », « Tu portes… », « Ça se voit que… »), de façon concrète et juste.
- Pas de nom de test, pas de score, pas de sigle, pas de pourcentage. Pas de liste, pas de titre, pas de gras.
- Une seule petite piste simple et réalisable à la fin (une phrase), sans leçon.
- AUCUNE question. Aucun diagnostic, aucun médicament. Si le résultat est difficile, reste doux et dis qu'en parler à quelqu'un peut aider.
- Bien-être uniquement. Ce n'est pas un avis médical.
Réponds uniquement par le texte à afficher.`;
}

function buildUserPrompt(i) {
  const who = i.prenom ? `Prénom : ${i.prenom}.` : 'Prénom inconnu.';
  const g = i.genre ? `Genre : ${i.genre === 'femme' ? 'femme' : 'homme'} (accorde en conséquence).` : 'Genre inconnu : formule neutre, sans « (e) ».';
  return [
    who, g,
    `Thème du test : ${i.scaleLabel}.`,
    `Son résultat : « ${i.resultLabel} ».`,
    i.description ? `Ce que cela veut dire : ${i.description}` : '',
    i.subscales.length ? `Détail (pour nuancer, sans le citer) : ${i.subscales.join(' ; ')}.` : '',
    i.guest ? 'Elle n\'a pas de compte : reste court (3 phrases).' : '',
  ].filter(Boolean).join('\n');
}

const SIGLES = /\b(GAD|PHQ|PSS|RSES|BRS|ECR|ACE|PCL|NSSS|HSP|ASRS)\b|\bscore\b|\d+\s?\/\s?\d+|\d+\s?%/i;

/** Nettoie la sortie ; null si elle ne respecte pas les règles (le navigateur garde alors le texte par défaut). */
function cleanOutput(raw) {
  let t = String(raw ?? '').replace(/\*\*|__|^#+\s*/gm, '').replace(/\s*\n+\s*/g, ' ').trim();
  t = t.replace(/\(e\)|·e\b|\(rice\)/g, '');
  if (t.length < 40 || t.length > 650) return null;
  if (SIGLES.test(t)) return null;
  if (/\?/.test(t)) return null;
  return t;
}

module.exports = { sanitizeInput, mustUseTemplate, buildSystemPrompt, buildUserPrompt, cleanOutput };
