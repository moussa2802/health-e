const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.URL || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    console.error('[DR-LO] ANTHROPIC_API_KEY manquante');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration serveur incorrecte' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
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
  } = body;

  if (!items_completes || items_completes.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'items_completes est vide ou manquant' }) };
  }

  try {
    const prompt = buildDrLoPrompt({
      prenom, age, genre, situation_relationnelle,
      items_completes, items_restants,
      nombre_items_faits, nombre_items_total,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };
  } catch (err) {
    console.error('[DR-LO] Erreur API:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur lors de la génération de l'analyse" }),
    };
  }
};

function buildSystemPrompt() {
  return `Tu es Dr. Lô — psychologue clinicien et sexologue expert sur la plateforme Healt-e, spécialisé dans le contexte culturel sénégalais et africain francophone.

TON IDENTITÉ :
- Tu parles directement à la personne, au tutoiement naturel et chaleureux
- Expert, bienveillant, fun et accessible — jamais l'impression d'un formulaire ou d'un cabinet froid
- Métaphores simples et imagées, emojis pertinents mais pas excessifs
- Tu adaptes ton ton selon le nombre d'évaluations complétées :
  • 1 évaluation : curieux, encourageant, "premier aperçu" — tu vois le début d'un tableau
  • 2-4 évaluations : tu commences à tisser des liens entre les dimensions
  • 5-9 évaluations : le profil prend vraiment forme, analyse plus riche et nuancée
  • 10+ évaluations : synthèse complète, vision d'ensemble, tu connais cette personne

RÈGLES ABSOLUES :
- JAMAIS de diagnostic explicite posé
- JAMAIS "Selon vos résultats..." ou ton administratif/froid
- TOUJOURS mentionner le prénom si disponible
- Commencer par un point positif avant les zones difficiles
- Si alertes critiques (🚨) : orienter clairement et avec douceur vers un professionnel
- Ne jamais minimiser les souffrances
- Terminer TOUJOURS par la signature "— Dr Lo 🩺"

CONTEXTE CULTUREL SÉNÉGALAIS :
- Reconnaître la pression familiale et sociale comme réalité importante
- La spiritualité (Islam, Christianisme, pratiques traditionnelles) peut être une ressource
- Normaliser le fait de chercher de l'aide — c'est un acte de courage
- Pour la santé sexuelle : aborder avec tact, sans jugement`;
}

function buildDrLoPrompt({
  prenom, age, genre, situation_relationnelle,
  items_completes, items_restants,
  nombre_items_faits, nombre_items_total,
}) {
  const prenomText = prenom || '';
  const alertesCritiques = items_completes.filter(i => (i.alertLevel || 0) >= 3);
  const alertesModérees = items_completes.filter(i => (i.alertLevel || 0) >= 2 && (i.alertLevel || 0) < 3);
  const hasAlertes = alertesCritiques.length > 0 || alertesModérees.length > 0;

  const completedText = items_completes
    .map(item => {
      const alert = (item.alertLevel || 0) >= 3 ? ' 🚨' : (item.alertLevel || 0) >= 2 ? ' ⚠️' : '';
      return `• ${item.scaleName} : ${item.totalScore} — ${item.label}${alert}`;
    })
    .join('\n');

  const restantsText = items_restants && items_restants.length > 0
    ? `\nÉvaluations restantes : ${items_restants.join(', ')}`
    : '\n(Profil complet — toutes les évaluations ont été réalisées)';

  const phaseText = nombre_items_faits === 1
    ? "C'est le tout premier item complété — ton analyse est un premier aperçu, le tableau commence à peine."
    : nombre_items_faits <= 4
    ? `${nombre_items_faits} évaluations complétées — les liens commencent à se former.`
    : nombre_items_faits <= 9
    ? `${nombre_items_faits} évaluations complétées — le profil prend vraiment forme.`
    : `Profil complet (${nombre_items_faits}/${nombre_items_total}) — vision d'ensemble disponible.`;

  const contextLine = [
    prenomText && `Prénom : ${prenomText}`,
    age && `Âge : ${age}`,
    genre && genre !== 'non_specifie' && `Genre : ${genre}`,
    situation_relationnelle && `Situation : ${situation_relationnelle.replace(/_/g, ' ')}`,
  ].filter(Boolean).join(' | ');

  return `${contextLine ? `Contexte : ${contextLine}\n` : ''}${phaseText}

Évaluations complétées :
${completedText}${restantsText}
${alertesCritiques.length > 0 ? '\n🚨 ALERTES CRITIQUES DÉTECTÉES — orientation professionnelle urgente nécessaire.' : ''}
${alertesModérees.length > 0 && alertesCritiques.length === 0 ? "\n⚠️ Signaux d'alerte détectés — suivi professionnel recommandé." : ''}
Génère une analyse évolutive de Dr. Lô, structurée EXACTEMENT ainsi (respecte les titres en gras avec **) :

**Analyse de Dr Lô**
(1-2 phrases d'accroche chaleureuses${prenomText ? `, en tutoyant ${prenomText}` : ''})

**Mon analyse de toi**
(Texte narratif, 150-200 mots, tisse les liens entre les résultats, métaphores, sans jargon clinique — pas de listes ici, du texte fluide)

✅ **Ce qui va bien**
(2-3 points forts, bullet points avec •)

⚠️ **Ce à quoi faire attention**
(1-2 zones de vigilance, bullet points avec •, formulées avec douceur)

💡 **Mes conseils**
(3 conseils concrets et actionnables, adaptés au contexte culturel sénégalais, bullet points avec •)

👨‍⚕️ **Mon avis professionnel**
${alertesCritiques.length > 0
  ? '(OBLIGATOIRE : mentionner clairement et avec douceur la nécessité urgente de consulter un professionnel — psychologue, psychiatre ou médecin. Donner une raison concrète basée sur les résultats. 2-3 phrases.)'
  : alertesModérees.length > 0
  ? '(Recommander clairement de consulter un professionnel de santé mentale ou un sexologue selon les résultats. Expliquer pourquoi en 1-2 phrases. Préciser que ce n\'est pas obligatoire mais fortement conseillé.)'
  : '(Donner un avis honnête et nuancé : si tout va bien, le dire clairement — "Pour l\'instant, tes résultats ne nécessitent pas de consultation professionnelle urgente". Si des zones méritent attention, suggérer une consultation préventive. 1-2 phrases. TOUJOURS conclure par la disponibilité des professionnels sur Healt-e.)'
}

— Dr Lo 🩺`;
}
