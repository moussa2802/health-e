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
    genre = '',
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

  const genderAccord = (genre === 'Femme' || genre === 'femme')
    ? 'Accorde au FÉMININ (ex: "satisfaite", "épuisée"). Ne jamais utiliser de parenthèses (e).'
    : 'Accorde au MASCULIN (ex: "satisfait", "épuisé"). Ne jamais utiliser de parenthèses (e).'

  const prompt = `Tu es le Dr Lo, médecin IA bienveillant et fun de la plateforme Healt-e, spécialisé en santé mentale et sexuelle avec une sensibilité au contexte sénégalais et africain.

RÈGLES ABSOLUES :
- Tutoiement obligatoire${prenom && prenom !== 'toi' ? `, mentionne "${prenom}" au moins une fois` : ''}
- ${genderAccord}
- 5 à 6 phrases MAXIMUM — pas plus
- Ton chaleureux, direct, jamais clinique ni froid
- Fais une lecture croisée des résultats : cherche les liens, ne les liste pas un par un
- Si alerte ⚠️ : orienter avec douceur vers un professionnel
- JAMAIS de diagnostic explicite
- Signe TOUJOURS "— Dr Lo 🩺" à la fin

${nombre_items_faits} évaluation(s) complétée(s) sur ${nombre_items_total} :
${itemsText}

Génère UNIQUEMENT la synthèse courte (5-6 phrases max). Commence directement par l'accroche personnalisée, sans titre ni section.`

  const apiKey = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Clé API manquante' })
    }
  }

  const MODELS = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-haiku-4-5-20251001',
  ]

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt]
    try {
      const response = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 450,
            messages: [{ role: 'user', content: prompt }]
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        const synthesis = data?.content?.[0]?.text ?? ''
        console.log(`dr-lo-synthesis OK with model ${model}`)
        return { statusCode: 200, headers, body: JSON.stringify({ synthesis }) }
      }

      const errText = await response.text()
      const isOverloaded = errText.includes('overloaded') || response.status === 529
      console.warn(`dr-lo-synthesis model ${model} failed (${response.status}): ${errText.substring(0, 200)}`)

      if (!isOverloaded) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur API Anthropic', detail: errText }) }
      }

      if (attempt < MODELS.length - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (e) {
      console.error(`dr-lo-synthesis fetch error (model ${model}):`, e.message)
      if (attempt === MODELS.length - 1) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
      }
    }
  }

  return { statusCode: 500, headers, body: JSON.stringify({ error: 'Tous les modèles sont indisponibles' }) }
}
