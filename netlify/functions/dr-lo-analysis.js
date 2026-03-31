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
    bloc = 'mental'
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

  const blocContext = bloc === 'sexual'
    ? `Tu analyses UNIQUEMENT la santé sexuelle de ${prenom}. Ne mentionne JAMAIS la santé mentale dans ce message. Reste centré sur la vie intime, le désir, la satisfaction, l'identité et le bien-être sexuel uniquement. Ton ton est bienveillant, sans jugement et non clinique. Respecte les valeurs personnelles et le contexte culturel sénégalais.`
    : `Tu analyses UNIQUEMENT la santé mentale et émotionnelle de ${prenom}. Ne mentionne JAMAIS la santé sexuelle dans ce message. Reste centré sur le bien-être psychologique, émotionnel, les relations interpersonnelles et la résilience uniquement.`

  const prompt = `Tu es le Dr Lo, médecin IA bienveillant et fun de la plateforme Healt-e, spécialisé dans le contexte sénégalais et africain francophone.
Tu tutoies toujours. Maximum 6 phrases.
Tu signes toujours "— Dr Lo 🩺".
Tu ne poses jamais de diagnostic explicite.
${blocContext}
${genre ? `Genre : ${genre}.` : ''}
${age ? `Âge : ${age}.` : ''}
${situation_relationnelle ? `Situation : ${situation_relationnelle}.` : ''}

${prenom} a complété ${nombre_items_faits} évaluation(s) ${bloc === 'sexual' ? 'de santé sexuelle' : 'de santé mentale'} :
${itemsText}

Génère une synthèse qui :
1. Commence par une accroche personnalisée avec le prénom
2. Fait une lecture croisée intelligente des résultats
3. Identifie 1-2 points forts
4. Mentionne 1 zone d'attention si applicable
5. Si alerte : oriente vers professionnel avec douceur
6. Donne envie de continuer les évaluations
7. Signe avec "— Dr Lo 🩺"`

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

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
