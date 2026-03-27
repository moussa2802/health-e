const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEDICAL_DISCLAIMER = `⚠️ Ces résultats sont fournis à titre informatif uniquement et ne constituent pas un diagnostic médical ou psychologique. Ils ne remplacent en aucun cas une consultation avec un professionnel de santé qualifié (médecin, psychologue, psychiatre ou sexologue).`;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.URL || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[CLAUDE] ANTHROPIC_API_KEY manquante');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration serveur incorrecte' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const { sessionId, scores, selectedScaleIds, userId, requestType } = body;

  if (!sessionId || !scores || !selectedScaleIds) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants' }) };
  }

  try {
    let prompt;

    if (requestType === 'compatibility') {
      const { dimensionScores, globalScore, relationshipType } = body;
      prompt = buildCompatibilityPrompt(dimensionScores, globalScore, relationshipType, scores);
    } else {
      prompt = buildInterpretationPrompt(scores, selectedScaleIds);
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      system: buildSystemPrompt(),
    });

    const interpretation = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        interpretation,
        disclaimer: MEDICAL_DISCLAIMER,
        sessionId,
      }),
    };
  } catch (err) {
    console.error('[CLAUDE] Erreur API:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur lors de la génération de l\'interprétation' }),
    };
  }
};

function buildSystemPrompt() {
  return `Tu es un assistant spécialisé en psychologie clinique et santé sexuelle, formé pour interpréter des résultats d'évaluations psychométriques validées. Tu travailles dans le contexte africain francophone (Sénégal), avec une sensibilité particulière aux réalités culturelles, religieuses et sociales de la région.

Tes interprétations doivent être :
- Empathiques et bienveillantes
- Accessibles (évite le jargon clinique inutile)
- Contextualisées culturellement
- Orientées vers l'action et le progrès
- Honnêtes sur les zones d'alerte sans être alarmistes

IMPORTANT : Toujours rappeler que ces résultats ne remplacent pas une consultation professionnelle. Si des signaux d'alerte sont détectés, orienter clairement vers un professionnel.`;
}

function buildInterpretationPrompt(scores, selectedScaleIds) {
  const scoresText = Object.entries(scores).map(([scaleId, result]) => {
    const subscalesText = result.subscaleScores
      ? Object.entries(result.subscaleScores).map(([k, v]) => `  - ${k}: ${v}`).join('\n')
      : '';
    return `**${scaleId.toUpperCase()}**
Score: ${result.totalScore} — ${result.interpretation?.label || 'N/A'}
Sévérité: ${result.interpretation?.severity || 'N/A'}
${subscalesText}`;
  }).join('\n\n');

  const hasAlerts = Object.values(scores).some(r => r.interpretation?.referralRequired);

  return `Voici les résultats d'évaluation psychologique et/ou sexuelle d'un utilisateur (${selectedScaleIds.length} évaluations complétées) :

${scoresText}

${hasAlerts ? '⚠️ DES SIGNAUX D\'ALERTE ONT ÉTÉ DÉTECTÉS — orienter vers un professionnel est nécessaire.' : ''}

Génère une interprétation personnalisée structurée en 3 sections :
1. **Vue d'ensemble** (2-3 phrases synthétisant le profil global)
2. **Points forts identifiés** (ce qui ressort positivement)
3. **Pistes de progression** (conseils concrets et bienveillants)
${hasAlerts ? '4. **Recommandation professionnelle** (expliquer pourquoi consulter est important)' : ''}

Rédige en français, de façon chaleureuse et personnelle. Tutoiement approprié.`;
}

function buildCompatibilityPrompt(dimensionScores, globalScore, relationshipType, scores) {
  const relTypes = {
    couple: 'couple romantique',
    family: 'relation familiale',
    friend: 'amitié',
    colleague: 'relation professionnelle',
  };

  const dimensionsText = Object.entries(dimensionScores)
    .map(([dim, score]) => `- ${dim}: ${score}/100`)
    .join('\n');

  return `Voici les résultats de compatibilité pour une relation de type **${relTypes[relationshipType] || relationshipType}** :

Score global : **${globalScore}/100**

Scores par dimension :
${dimensionsText}

Génère une analyse de compatibilité structurée en 4 sections :
1. **Analyse globale** (synthèse de la dynamique relationnelle)
2. **Points forts de la relation** (dimensions harmonieuses)
3. **Zones de tension potentielles** (à travailler ensemble)
4. **Conseils personnalisés** (actions concrètes pour renforcer la relation)

Rédige en français, de façon positive et constructive, avec une sensibilité culturelle africaine.`;
}
