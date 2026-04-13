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

  const MODELS = [
    'claude-haiku-4-5-20251001',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
  ];

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt];
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 250, messages: [{ role: 'user', content: prompt }] }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`dr-lo-journal OK with model ${model}`);
        return { statusCode: 200, headers, body: JSON.stringify({ response: data?.content?.[0]?.text ?? '', koris_consumed: 0 }) };
      }

      const err = await response.text();
      const isOverloaded = err.includes('overloaded') || response.status === 529;
      console.warn(`dr-lo-journal model ${model} failed (${response.status}): ${err.substring(0, 200)}`);

      if (!isOverloaded) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur API Claude', detail: err }) };
      }

      if (attempt < MODELS.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`dr-lo-journal fetch error (model ${model}):`, e.message);
      if (attempt === MODELS.length - 1) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
      }
    }
  }

  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles' }) };
};
