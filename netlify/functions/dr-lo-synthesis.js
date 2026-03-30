const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.URL || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration serveur incorrecte' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const { prenom, items_completes, nombre_items_faits, nombre_items_total } = body;

  if (!items_completes || items_completes.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun item complété' }) };
  }

  try {
    const prompt = buildSynthesisPrompt({ prenom, items_completes, nombre_items_faits, nombre_items_total });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 450,
      messages: [{ role: 'user', content: prompt }],
    });

    const synthesis = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ synthesis }),
    };
  } catch (err) {
    console.error('[DR-LO-SYNTHESIS] Erreur:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur lors de la génération' }),
    };
  }
};

function buildSynthesisPrompt({ prenom, items_completes, nombre_items_faits, nombre_items_total }) {
  const alertesCritiques = items_completes.filter(i => (i.alertLevel || 0) >= 3);
  const alertesModerees  = items_completes.filter(i => (i.alertLevel || 0) >= 2 && (i.alertLevel || 0) < 3);

  const contextItems = items_completes
    .map(i => {
      const alert = (i.alertLevel || 0) >= 3 ? ' 🚨' : (i.alertLevel || 0) >= 2 ? ' ⚠️' : '';
      return `• ${i.nom} (${i.outil}) : ${i.score} — niveau ${i.niveau} [${i.severity}]${alert}`;
    })
    .join('\n');

  const phaseInstruction = nombre_items_faits === 1
    ? "C'est le tout premier résultat — ton accroche est encourageante, tu vois \"le début d'un tableau\"."
    : nombre_items_faits <= 3
    ? `${nombre_items_faits} évaluations complétées — commence à tisser des liens entre les résultats.`
    : nombre_items_faits <= 7
    ? `${nombre_items_faits} évaluations complétées — profil qui prend vraiment forme, analyse croisée riche.`
    : `Profil avancé (${nombre_items_faits}/${nombre_items_total}) — synthèse complète et nuancée.`;

  return `Tu es Dr. Lô — psychologue clinicien et sexologue sur Healt-e, spécialisé dans le contexte culturel sénégalais et africain francophone.

RÈGLES ABSOLUES :
- Tutoiement obligatoire${prenom ? `, mentionne "${prenom}" au moins une fois` : ''}
- 5 à 6 phrases MAXIMUM — pas plus
- Ton chaleureux, direct, jamais clinique ni froid
- Fais une VRAIE lecture croisée des résultats : cherche les LIENS entre les différentes évaluations, ne les liste pas un par un
- Identifie 1-2 points forts et 1 zone d'attention si applicable
- Termine par une phrase qui donne envie de continuer les évaluations (cite ce que les prochains items permettront de comprendre en plus)
- Si alerte critique 🚨 : ton doux et orienter clairement mais avec bienveillance vers un professionnel
- JAMAIS de diagnostic explicite
- Signe TOUJOURS "— Dr Lo 🩺" à la fin

${phaseInstruction}

Évaluations complétées :
${contextItems}
${alertesCritiques.length > 0 ? '\n🚨 ALERTE CRITIQUE DÉTECTÉE — orienter vers professionnel avec douceur.' : ''}
${alertesModerees.length > 0 && alertesCritiques.length === 0 ? "\n⚠️ Signaux d'alerte — mentionner l'utilité d'un suivi professionnel." : ''}

Génère UNIQUEMENT la synthèse courte (5-6 phrases max). Commence directement par l'accroche personnalisée, sans titre ni section.`;
}
