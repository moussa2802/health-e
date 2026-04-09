const SYSTEM_PROMPT = `Tu es Dr Lô, médecin IA de la plateforme Health-e, spécialisé en santé mentale et sexuelle avec une sensibilité au contexte sénégalais et africain.

Tu analyses la compatibilité entre deux personnes à partir de leurs profils psychologiques ou intimes réels.

Règles absolues :
- Tutoiement obligatoire, cite les deux prénoms
- 200-250 mots MAXIMUM
- Ton bienveillant, direct, jamais clinique ni froid
- Fais des observations CONCRÈTES basées sur les vrais scores — ne liste pas, relie les données entre elles
- Cite des noms de dimensions réels (ex : attachement, résilience, stress, désir...)
- Si tension : formule avec douceur, sans alarme
- JAMAIS de diagnostic explicite
- Signe TOUJOURS "— Dr Lô 🩺" à la fin

Structure obligatoire avec ces titres exacts :

💑 [Accroche personnalisée avec les deux prénoms et le type de lien]

👁️ Ce que je vois
[2-3 phrases sur les convergences et divergences réelles entre les deux profils]

💪 Vos points forts communs
• [force partagée ou complémentarité concrète 1]
• [force partagée ou complémentarité concrète 2]

⚠️ Points de vigilance
• [tension potentielle — jamais alarmiste, toujours constructif]

💡 Mes conseils pour vous deux
• [conseil concret adapté au type de relation 1]
• [conseil concret adapté au type de relation 2]

[Conclusion chaleureuse et encourageante]

— Dr Lô 🩺`

function formatProfile(prenom, scaleResults, bonusResults) {
  if (!scaleResults || Object.keys(scaleResults).length === 0) {
    return `${prenom} : aucun résultat disponible`
  }
  const lines = Object.entries(scaleResults).map(([id, r]) => {
    const label = r.interpretation?.label ?? r.interpretation?.severity ?? 'N/A'
    const score = r.totalScore != null ? `${r.totalScore}` : ''
    const alert = (r.alertLevel ?? 0) >= 2 ? ' ⚠️' : ''
    return `  - ${id} : ${label}${score ? ` (${score})` : ''}${alert}`
  })
  const bonusLines = bonusResults && bonusResults.length > 0
    ? bonusResults.map(b => `  - ${b.nom ?? b.id} : ${b.niveau ?? 'N/A'}`)
    : []
  return [
    `${prenom} :`,
    ...lines,
    ...(bonusLines.length > 0 ? ['  Bonus :', ...bonusLines] : [])
  ].join('\n')
}

function isTooLong(text) {
  return text.trim().split(/\s+/).filter(Boolean).length > 280
}

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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body manquant' }) }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }
  }

  const {
    prenom1 = 'Utilisateur 1',
    prenom2 = 'Utilisateur 2',
    codeType = 'mental',
    relationshipType = '',
    scaleResults1 = {},
    scaleResults2 = {},
    bonusResults1 = [],
    bonusResults2 = [],
    dimensionScores = {},
    globalScore = null
  } = payload

  if (Object.keys(scaleResults1).length === 0 && Object.keys(scaleResults2).length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun résultat de profil fourni' }) }
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_KEY
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API manquante' }) }
  }

  const typeLabel = codeType === 'sexual' ? 'vie intime' : 'profil psychologique'
  const dimensionLines = Object.entries(dimensionScores)
    .map(([dim, score]) => `  - ${dim} : ${score}/100`)
    .join('\n')

  const messageContent = [
    `Type de relation : ${relationshipType || 'non précisé'}`,
    `Type de profil analysé : ${typeLabel}`,
    globalScore != null ? `Score de compatibilité global : ${globalScore}/100` : null,
    '',
    `Scores par dimension :`,
    dimensionLines || '  (aucune dimension calculée)',
    '',
    'Profil de ' + prenom1 + ' :',
    formatProfile(prenom1, scaleResults1, bonusResults1),
    '',
    'Profil de ' + prenom2 + ' :',
    formatProfile(prenom2, scaleResults2, bonusResults2),
  ].filter(v => v !== null).join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 450,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur Anthropic compatibility-analysis:', errText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur API Anthropic', detail: errText })
      }
    }

    const data = await response.json()
    const narrative = data?.content?.[0]?.text ?? ''
    const finalNarrative = (!narrative || isTooLong(narrative)) ? '' : narrative

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ narrative: finalNarrative })
    }
  } catch (e) {
    console.error('Erreur fetch compatibility-analysis:', e.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    }
  }
}
