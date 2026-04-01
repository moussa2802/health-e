exports.handler = async (event) => {

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Body manquant' })
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'JSON invalide' })
    }
  }

  const {
    prenom = 'toi',
    age = '',
    genre = '',
    situation_relationnelle = '',
    items_completes = [],
    items_restants = [],
    nombre_items_faits = 0,
    nombre_items_total = 24,
    bloc = 'mental',
    bonus_completes = []
  } = payload

  if (!items_completes || items_completes.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'items_completes vide' })
    }
  }

  const itemsText = items_completes.map(item => {
    const score = item.totalScore ?? item.score ?? ''
    const label = item.label ?? item.niveau ?? ''
    const nom = item.scaleName ?? item.nom ?? ''
    const alerte = (item.alertLevel > 1) ? '⚠️ ALERTE' : ''
    return `- ${nom} : ${label} (score ${score}) ${alerte}`
  }).join('\n')

  const bonusText = bonus_completes.length > 0
    ? `\nTests bonus complétés par ${prenom} :\n${bonus_completes.map(t => `- ${t.nom} : ${t.niveau} (score ${t.score})`).join('\n')}\n\nIntègre ces résultats naturellement dans ton analyse si pertinent. Ne les liste pas mécaniquement — fais des liens avec les résultats principaux quand c'est cohérent.`
    : ''

  const prompt = bloc === 'sexual'
    ? `Tu es le Dr Lo, médecin IA spécialisé en santé sexuelle sur la plateforme Health-e, sensible au contexte africain francophone.
RÈGLE ABSOLUE : tu parles EXCLUSIVEMENT de santé sexuelle dans ce message. Ne mentionne JAMAIS l'anxiété, la dépression, l'humeur, le stress, la résilience, la santé mentale ou émotionnelle. Ces sujets n'existent pas dans ce message.
Tu tutoies toujours. Maximum 6 phrases. Tu signes "— Dr Lo 🩺". Tu ne poses jamais de diagnostic explicite. Ton ton est chaleureux, bienveillant, sans jugement.
${genre ? `Genre : ${genre}.` : ''} ${age ? `Âge : ${age}.` : ''} ${situation_relationnelle ? `Situation : ${situation_relationnelle}.` : ''}

${prenom} a complété ${nombre_items_faits} évaluation(s) de santé sexuelle :
${itemsText}
${bonusText}
Génère une synthèse qui :
1. Commence par une accroche personnalisée avec le prénom
2. Fait une lecture croisée des résultats de santé sexuelle uniquement (désir, satisfaction, fonctionnement, identité sexuelle)
3. Identifie 1-2 points forts sur le plan sexuel
4. Mentionne 1 zone d'attention si applicable
5. Si alerte : oriente vers professionnel avec douceur
6. Donne envie de continuer les évaluations
7. Signe avec "— Dr Lo 🩺"`
    : `Tu es le Dr Lo, médecin IA spécialisé en santé mentale sur la plateforme Health-e, sensible au contexte africain francophone.
RÈGLE ABSOLUE : tu parles EXCLUSIVEMENT de santé mentale et émotionnelle dans ce message. Ne mentionne JAMAIS la vie sexuelle, l'intimité, le désir, la satisfaction sexuelle ou tout sujet d'ordre sexuel. Ces sujets n'existent pas dans ce message.
Tu tutoies toujours. Maximum 6 phrases. Tu signes "— Dr Lo 🩺". Tu ne poses jamais de diagnostic explicite. Ton ton est chaleureux, bienveillant.
${genre ? `Genre : ${genre}.` : ''} ${age ? `Âge : ${age}.` : ''} ${situation_relationnelle ? `Situation : ${situation_relationnelle}.` : ''}

${prenom} a complété ${nombre_items_faits} évaluation(s) de santé mentale :
${itemsText}
${bonusText}
Génère une synthèse qui :
1. Commence par une accroche personnalisée avec le prénom
2. Fait une lecture croisée des résultats de santé mentale uniquement (anxiété, humeur, personnalité, attachement, estime de soi, résilience)
3. Identifie 1-2 points forts psychologiques
4. Mentionne 1 zone d'attention si applicable
5. Si alerte : oriente vers professionnel avec douceur
6. Donne envie de continuer les évaluations
7. Signe avec "— Dr Lo 🩺"`

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Clé API manquante' })
    }
  }

  try {
    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur Anthropic:', errText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur API Anthropic',
          detail: errText
        })
      }
    }

    const data = await response.json()
    const analysis = data.content[0].text

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis })
    }

  } catch (e) {
    console.error('Erreur fetch:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    }
  }
}
