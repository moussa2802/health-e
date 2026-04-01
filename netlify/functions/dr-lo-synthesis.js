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
    items_completes = [],
    nombre_items_faits = 0,
    nombre_items_total = 24
  } = payload

  if (!items_completes || items_completes.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'items_completes vide' })
    }
  }

  const itemsText = items_completes.map(item => {
    const score = item.score ?? item.totalScore ?? ''
    const niveau = item.niveau ?? item.label ?? ''
    const nom = item.nom ?? item.scaleName ?? ''
    const outil = item.outil ?? ''
    const alerte = (item.alertLevel > 1) ? '⚠️ ALERTE' : ''
    return `- ${nom} (${outil}) : ${niveau} — ${score} ${alerte}`
  }).join('\n')

  const prompt = `Tu es le Dr Lo, médecin IA bienveillant et fun de la plateforme Healt-e, spécialisé en santé mentale et sexuelle avec une sensibilité au contexte sénégalais et africain.

RÈGLES ABSOLUES :
- Tutoiement obligatoire${prenom && prenom !== 'toi' ? `, mentionne "${prenom}" au moins une fois` : ''}
- 5 à 6 phrases MAXIMUM — pas plus
- Ton chaleureux, direct, jamais clinique ni froid
- Fais une lecture croisée des résultats : cherche les liens, ne les liste pas un par un
- Si alerte ⚠️ : orienter avec douceur vers un professionnel
- JAMAIS de diagnostic explicite
- Signe TOUJOURS "— Dr Lo 🩺" à la fin

${nombre_items_faits} évaluation(s) complétée(s) sur ${nombre_items_total} :
${itemsText}

Génère UNIQUEMENT la synthèse courte (5-6 phrases max). Commence directement par l'accroche personnalisée, sans titre ni section.`

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
          max_tokens: 450,
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
    const synthesis = data.content[0].text

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ synthesis })
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
