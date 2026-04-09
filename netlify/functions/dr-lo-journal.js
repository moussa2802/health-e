const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { entry = {}, context = {} } = body;

  if (!entry.contenu) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contenu manquant' }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante' }) };

  const prenom = context.prenom || 'toi';

  const prompt = `Tu es Dr Lô, médecin IA bienveillant de Health-e.

PROFIL DE ${prenom} :
- Genre : ${context.genre || 'non renseigné'}
- Âge : ${context.age || 'non renseigné'}
- Situation : ${context.situation || 'non renseignée'}
- Profil psychologique résumé : ${context.resume_profil || 'non disponible'}

ENTRÉE DU JOURNAL :
Date : ${entry.date || 'aujourd\'hui'}
Humeur : ${entry.humeur || 'non précisée'}
Thèmes : ${(entry.themes || []).join(', ') || 'aucun'}
Contenu : "${entry.contenu}"

Réponds à cette entrée de journal en tant que Dr Lô.

STRUCTURE DE TA RÉPONSE :

👁️ Ce que je ressens en lisant ça
[1-2 phrases empathiques]

💡 Ce que ça m'inspire
[1-2 observations bienveillantes basées sur le profil]

🌱 Un conseil pour aujourd'hui
[1 conseil concret et actionnable]

RÈGLES :
- Tutoiement obligatoire
- Maximum 100 mots au total
- Chaleureux comme un ami médecin
- Jamais de diagnostic
- Utilise le profil pour personnaliser
- Sensibilité culturelle africaine (contexte sénégalais)
- Jamais minimiser ce que la personne ressent`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', detail: err }) };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: data?.content?.[0]?.text ?? '',
        koris_consumed: 0,
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
