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

  const { sessionId, scores, selectedScaleIds, userId, requestType, demographique } = body;

  if (!sessionId || !scores || !selectedScaleIds) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants' }) };
  }

  try {
    let prompt;

    if (requestType === 'compatibility') {
      const { dimensionScores, globalScore, relationshipType } = body;
      prompt = buildCompatibilityPrompt(dimensionScores, globalScore, relationshipType, scores);
    } else {
      prompt = buildInterpretationPrompt(scores, selectedScaleIds, demographique);
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
  return `Tu es Dr. Lô — psychologue clinicien et sexologue expert sur la plateforme Healt-e, spécialisé dans le contexte culturel sénégalais et africain francophone.

TON IDENTITÉ ET TON TON :
- Expert, bienveillant, fun et accessible — jamais l'impression d'un cabinet médical ou d'un formulaire
- Tutoiement systématique, naturel et respectueux
- Humour subtil et bienveillant quand c'est approprié
- Chaleureux, direct, jamais condescendant, jamais protocolaire
- Utilise des métaphores simples et imagées
- Ajoute occasionnellement un emoji pertinent (pas excessif)
- Adapte le registre selon l'âge : si 18-25 ans → encore plus décontracté et dynamique
- Si trauma ou deuil détecté → ton plus doux, moins d'humour, plus de soutien

RÈGLES ABSOLUES :
- JAMAIS de diagnostic posé explicitement
- JAMAIS de phrases comme "Selon les résultats de votre évaluation..." ou "Il semblerait que vous présentez des symptômes de..."
- JAMAIS de ton froid ou administratif
- Rappelle toujours que ces résultats ne remplacent pas une consultation professionnelle
- Si signaux d'alerte détectés : orienter clairement et avec douceur vers un professionnel
- Ne jamais minimiser les souffrances exprimées
- Terminer TOUJOURS par un message d'encouragement sincère et personnalisé
- Mentionner le prénom de la personne dans l'analyse
- Commencer par un point positif avant les zones difficiles

CONTEXTE CULTUREL SÉNÉGALAIS :
- La santé mentale reste tabou dans beaucoup de familles — normalise le fait de chercher de l'aide
- La pression familiale et sociale est une réalité importante à reconnaître
- La spiritualité (Islam, Christianisme, pratiques traditionnelles) peut être une ressource
- Les notions de honte ("gëm sa bop"), de résilience communautaire et de solidarité sont importantes
- Pour la santé sexuelle : aborde avec tact, sans jugement, en respectant les valeurs personnelles

STYLE DE RÉPONSE :
- 300-400 mots pour une analyse individuelle
- Structure en sections claires avec des titres courts
- Intègre la lecture croisée mental/sexuel si les deux catégories sont présentes
- Exemple de ton cible : "Hey [Prénom] 👋 — D'abord, respect. T'as pris le temps de te poser et de vraiment te regarder en face. Ce que ton profil nous dit sur toi, c'est que t'es quelqu'un avec une vraie richesse intérieure..."`;
}

function buildInterpretationPrompt(scores, selectedScaleIds, demographique) {
  const mentalScales = [];
  const sexualScales = [];

  // Catégoriser les scores
  const scaleCategories = {
    gad7: 'mental', phq9: 'mental', pcl5: 'mental', ace: 'mental',
    rses: 'mental', pss10: 'mental', brs: 'mental', ecr_r: 'mental',
    big_five: 'mental', pg13: 'mental', isi: 'mental', mdq: 'mental',
    fsfi: 'sexual', iief: 'sexual', nsss: 'sexual', sdi2: 'sexual',
    sis_ses: 'sexual', griss: 'sexual', pair: 'sexual',
  };

  Object.entries(scores).forEach(([scaleId, result]) => {
    const category = scaleCategories[scaleId] || 'mental';
    const subscalesText = result.subscaleScores
      ? '\n' + Object.entries(result.subscaleScores).map(([k, v]) => {
          const vFormatted = typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v;
          return `    • ${k}: ${vFormatted}`;
        }).join('\n')
      : '';
    const alertText = result.alertLevel >= 3 ? ' ⚠️ ALERTE CRITIQUE' :
                      result.alertLevel >= 2 ? ' ⚠️ ALERTE' :
                      result.alertLevel >= 1 ? ' ⚡ VIGILANCE' : '';
    const entry = `**${scaleId.toUpperCase()}**${alertText}\nScore : ${result.totalScore} — ${result.interpretation?.label || 'N/A'} (sévérité : ${result.interpretation?.severity || 'N/A'})${subscalesText}`;

    if (category === 'sexual') sexualScales.push(entry);
    else mentalScales.push(entry);
  });

  const hasCritical = Object.values(scores).some(r => r.alertLevel >= 3);
  const hasAlert = Object.values(scores).some(r => r.alertLevel >= 2 || r.interpretation?.referralRequired);
  const hasBothCategories = mentalScales.length > 0 && sexualScales.length > 0;
  const prenom = demographique?.prenom || '';
  const demoText = demographique
    ? `\nContexte : ${prenom ? `Prénom : ${prenom} —` : ''} ${demographique.age ? `${demographique.age} ans` : ''} ${demographique.genre || ''} ${demographique.situation_relationnelle || ''}`.trim()
    : '';

  const scoresText = [
    mentalScales.length > 0 ? `## SANTÉ MENTALE\n${mentalScales.join('\n\n')}` : '',
    sexualScales.length > 0 ? `## SANTÉ SEXUELLE\n${sexualScales.join('\n\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return `Voici les résultats d'évaluation${prenom ? ` de ${prenom}` : ' de l\'utilisateur'} (${selectedScaleIds.length} évaluation${selectedScaleIds.length > 1 ? 's' : ''} complétée${selectedScaleIds.length > 1 ? 's' : ''}) :${demoText}

${scoresText}

${hasCritical ? '🚨 SIGNAUX CRITIQUES DÉTECTÉS (pensées suicidaires ou trauma sévère) — orientation professionnelle urgente requise.' : ''}
${hasAlert && !hasCritical ? '⚠️ DES SIGNAUX D\'ALERTE ONT ÉTÉ DÉTECTÉS — orientation professionnelle nécessaire.' : ''}

Génère une analyse personnalisée en français, au tutoiement${prenom ? `, en adressant la personne par son prénom "${prenom}"` : ''}, avec le ton chaleureux et fun de Dr. Lô. Structure ainsi :

**Hey${prenom ? ` ${prenom}` : ''} 👋**
(Accroche directe et chaleureuse — commence par reconnaître le courage d'être là)

**Ce que ton profil dit de toi**
(2-3 phrases synthétisant les forces et la richesse intérieure détectées)

**Ce qui mérite attention**
(2-3 zones de vulnérabilité formulées avec douceur, en utilisant des métaphores — pas de jargon clinique)

${hasBothCategories ? '**Lecture croisée**\n(Comment la santé mentale et la santé sexuelle s\'influencent dans ce profil)\n\n' : ''}**Ce que je te conseille**
(3 conseils concrets et actionnables, adaptés au contexte culturel sénégalais)

${hasAlert ? '**Un professionnel peut t\'aider**\n(Expliquer pourquoi et comment consulter, avec douceur. Rappel : demander de l\'aide est un acte de courage, pas de faiblesse.)\n\n' : ''}**Message pour toi**
(1 phrase d'encouragement sincère et personnalisée)`;
}

// ── Contextes Dr Lo par sous-type de relation ──────────────────────────────

const RELATION_CONTEXTS = {
  // Amoureux
  crush: {
    label: 'Crush / Attirance',
    angleAnalyse: "Analyser la compatibilité comme une potentialité — ce qui pourrait fonctionner si la relation se développe. Identifier les signaux positifs et les points de vigilance avant de s'engager davantage.",
    ton: "Léger, fun, un peu complice — comme un ami qui t'aide à voir clair sur quelqu'un qui te plaît",
    focus: ['Compatibilité de personnalité initiale', 'Styles de communication', 'Valeurs communes', 'Points de tension potentiels à surveiller'],
    intro: "Alors comme ça tu veux savoir si vous êtes faits l'un pour l'autre avant même que ça commence 😏 Bonne initiative. Voilà ce que vos profils me disent...",
  },
  debut_relation: {
    label: 'Fréquentation / Début de relation',
    angleAnalyse: "Analyser la dynamique naissante. Identifier ce qui est prometteur et ce qui mérite attention avant que les habitudes se cristallisent.",
    ton: 'Encourageant et constructif',
    focus: ["Compatibilité émotionnelle", "Styles d'attachement — risque de dynamique toxique ?", "Communication et expression des besoins", "Valeurs fondamentales alignées ou non"],
    intro: "Vous êtes encore dans la belle période — et c'est exactement le bon moment pour regarder ça de près. Voilà ce que vos profils me révèlent...",
  },
  en_couple: {
    label: 'En couple',
    angleAnalyse: "Analyser la dynamique d'un couple en construction. Identifier les forces de la relation et les zones à consolider avant que les habitudes se figent.",
    ton: 'Chaleureux et nuancé',
    focus: ["Styles d'attachement", 'Communication des besoins', 'Gestion des conflits', 'Intimité émotionnelle naissante'],
    intro: "Vous construisez quelque chose ensemble — et vos profils m'en disent beaucoup sur la solidité de ces fondations...",
  },
  couple_etabli: {
    label: 'Couple établi',
    angleAnalyse: "Analyser les dynamiques installées. Identifier les patterns relationnels, les zones d'usure et les ressources pour revitaliser la relation.",
    ton: 'Profond, honnête, orienté solutions',
    focus: ["Évolution des styles d'attachement", "Qualité de l'intimité émotionnelle et sexuelle", 'Gestion des conflits', 'Besoins non exprimés', 'Ressources communes de résilience'],
    intro: "Après tout ce temps ensemble, vos profils me racontent une histoire assez complète. Et il y a des choses très intéressantes à voir ici...",
  },
  maries_recent: {
    label: 'Mariés depuis peu',
    angleAnalyse: "Analyser la transition vers la vie conjugale. Identifier les attentes implicites, les rôles en construction et les ressources pour bâtir une union solide.",
    ton: 'Optimiste mais réaliste',
    focus: ['Attentes conjugales explicites et implicites', 'Rôles de genre et partage des responsabilités', 'Communication intime', 'Construction du projet de vie commun'],
    intro: "Le mariage c'est un nouveau chapitre — et les profils révèlent souvent des choses qu'on n'a pas encore eu le temps de se dire...",
  },
  maries_longtemps: {
    label: 'Mariés depuis longtemps',
    angleAnalyse: "Analyser la profondeur du lien, les zones d'usure et les leviers pour renforcer ou rééquilibrer la relation. Tenir compte du contexte culturel sénégalais (polygamie, rôles de genre, pression familiale).",
    ton: 'Respectueux, mature, sensible aux réalités culturelles',
    focus: ["Intimité émotionnelle sur la durée", "Satisfaction sexuelle et évolution du désir", 'Communication des besoins profonds', 'Impact des rôles de genre sur la relation', 'Ressources pour se retrouver'],
    intro: "Une longue histoire commune — c'est riche et complexe à la fois. Vos profils m'en disent beaucoup sur ce qui vous unit et ce qui mérite votre attention aujourd'hui...",
  },
  ex_partenaire: {
    label: 'Ex-partenaire',
    angleAnalyse: "Analyser ce qui a fonctionné et ce qui a mené à la rupture. Comprendre les patterns pour ne pas les répéter. Pas pour rouvrir — pour comprendre.",
    ton: 'Doux, sans jugement, orienté apprentissage et guérison',
    focus: ['Incompatibilités fondamentales', 'Dynamiques toxiques identifiées', 'Ce que chacun peut apprendre de cette relation', 'Signaux à surveiller dans les prochaines relations'],
    intro: "Comprendre pourquoi ça n'a pas marché, c'est l'une des choses les plus utiles qu'on puisse faire. Voilà ce que vos profils m'apprennent sur votre histoire...",
  },
  // Famille
  pere: {
    label: 'Père',
    angleAnalyse: "Analyser la dynamique père-enfant adulte. Impact du style parental reçu sur l'attachement actuel. Tenir compte du rôle du père dans la culture sénégalaise (autorité, distance émotionnelle, figure de pouvoir).",
    ton: 'Sensible, profond, respectueux de la complexité des liens parentaux',
    focus: ["Style d'attachement formé par cette relation", 'Communication inter-générationnelle', 'Blessures non dites', 'Ressources pour améliorer le lien'],
    intro: "La relation avec son père, c'est souvent l'une des plus complexes qui soit. Vos profils m'éclairent sur beaucoup de choses ici...",
  },
  mere: {
    label: 'Mère',
    angleAnalyse: "Analyser la dynamique mère-enfant. Lien entre le style maternel reçu et l'attachement adulte actuel. Tenir compte du rôle central de la mère dans la famille sénégalaise.",
    ton: 'Chaleureux, respectueux, attentif aux non-dits',
    focus: ["Sécurité affective reçue dans l'enfance", 'Dépendance vs autonomie', 'Communication émotionnelle', 'Impact sur les relations actuelles'],
  },
  frere: { label: 'Frère', angleAnalyse: "Analyser la dynamique fraternelle. Rivalité, soutien, rôles dans la fratrie dans le contexte africain.", ton: "Direct et fun", focus: ['Dynamique de rivalité ou de soutien', 'Rôles figés dans la famille', 'Ressources pour renforcer le lien'], intro: "La fratrie c'est souvent nos premières vraies relations — et elles façonnent beaucoup. Voilà ce que vos profils me disent..." },
  soeur: { label: 'Sœur', angleAnalyse: "Analyser la dynamique fraternelle sœur. Rivalité, complicité, rôles dans la fratrie dans le contexte africain.", ton: "Direct et fun", focus: ['Dynamique de rivalité ou de complicité', 'Rôles figés dans la famille', 'Ressources pour renforcer le lien'], intro: "La fratrie c'est souvent nos premières vraies relations — et elles façonnent beaucoup. Voilà ce que vos profils me disent..." },
  grand_pere: { label: 'Grand-père', angleAnalyse: "Analyser la relation inter-générationnelle avec le grand-père.", ton: 'Respectueux, sage', focus: ['Transmission des valeurs', 'Communication inter-générationnelle', 'Rôle du patriarche'] },
  grand_mere: { label: 'Grand-mère', angleAnalyse: "Analyser la relation inter-générationnelle avec la grand-mère.", ton: 'Chaleureux, respectueux', focus: ['Sécurité affective transmise', 'Transmission des valeurs'] },
  fils: { label: 'Fils', angleAnalyse: "Analyser la relation parent-fils adulte.", ton: 'Bienveillant et équilibré', focus: ['Autonomie vs dépendance', 'Communication parent-fils', 'Transmission des valeurs'] },
  fille: { label: 'Fille', angleAnalyse: "Analyser la relation parent-fille adulte dans le contexte culturel sénégalais.", ton: 'Bienveillant, sensible aux dynamiques de genre', focus: ['Autonomie vs attentes familiales', 'Communication parent-fille', 'Rôle de genre et liberté personnelle'] },
  oncle_tante: { label: 'Oncle / Tante', angleAnalyse: "Analyser la relation avec un oncle ou une tante dans la famille africaine.", ton: 'Respectueux, ancré dans la réalité familiale africaine', focus: ['Rôle dans la famille élargie', 'Influence et soutien'] },
  cousin_cousine: { label: 'Cousin / Cousine', angleAnalyse: "Analyser la relation avec un cousin ou une cousine.", ton: 'Détendu et complice', focus: ['Proximité ou distance affective', 'Valeurs et styles de vie'] },
  beau_parent: { label: 'Beau-père / Belle-mère', angleAnalyse: "Analyser la relation avec les beaux-parents dans le contexte sénégalais.", ton: 'Délicat, respectueux, sensible aux enjeux de pouvoir', focus: ['Respect mutuel et frontières', 'Gestion des attentes', 'Impact sur le couple'] },
  // Amitié
  nouvelle_amitie: {
    label: 'Nouvelle amitié',
    angleAnalyse: "Analyser la compatibilité d'une amitié naissante.",
    ton: 'Léger, curieux, enthousiaste',
    focus: ["Valeurs et centres d'intérêt communs", 'Styles de communication', 'Réciprocité dès le départ'],
    intro: "Une nouvelle connexion — toujours excitant ! Voilà ce que vos profils révèlent sur cette amitié naissante...",
  },
  ami_proche: { label: 'Ami(e) proche', angleAnalyse: "Analyser la solidité d'une amitié bien installée.", ton: 'Chaleureux et bienveillant', focus: ['Réciprocité émotionnelle', 'Communication dans les moments difficiles', 'Soutien mutuel'] },
  meilleur_ami: {
    label: 'Meilleur(e) ami(e)',
    angleAnalyse: "Analyser la profondeur et la solidité de ce lien fort.",
    ton: 'Complice et fun',
    focus: ['Compatibilité de valeurs', 'Réciprocité émotionnelle', 'Gestion des désaccords', 'Évolution parallèle ou divergente'],
    intro: "Tester la compatibilité avec son meilleur ami — bonne idée ou Pandore's box ? 😄 Voyons ça ensemble...",
  },
  ami_enfance: {
    label: "Ami(e) d'enfance",
    angleAnalyse: "Analyser une amitié de longue date forgée dans l'enfance.",
    ton: 'Nostalgique et chaleureux',
    focus: ['Évolution personnelle et divergences', 'Ce qui unit encore', 'Renouvellement du lien'],
    intro: "Ces amitiés-là sont rares et précieuses. Voyons ce que vos profils disent de l'évolution de votre lien...",
  },
  ami_virtuel: { label: 'Ami(e) virtuel(le)', angleAnalyse: "Analyser une amitié principalement digitale.", ton: 'Moderne, sans jugement', focus: ['Authenticité dans la communication digitale', 'Réciprocité malgré la distance'] },
  // Professionnel
  collegue_meme_niveau: { label: 'Collègue de même niveau', angleAnalyse: "Analyser la dynamique entre collègues de même niveau.", ton: 'Professionnel mais accessible', focus: ['Styles de travail et de communication', 'Compétition vs coopération', 'Compatibilité de valeurs professionnelles'] },
  superieur: {
    label: 'Supérieur hiérarchique',
    angleAnalyse: "Analyser la dynamique de pouvoir et de communication dans une relation hiérarchique.",
    ton: 'Professionnel mais accessible',
    focus: ["Styles de communication et d'autorité", 'Gestion du stress professionnel', "Dynamique de pouvoir et d'influence"],
    intro: "Comprendre la dynamique avec son supérieur, c'est souvent la clé d'une carrière plus sereine. Voilà ce que vos profils révèlent...",
  },
  'subordonné': { label: 'Subordonné', angleAnalyse: "Analyser la dynamique manager-collaborateur.", ton: 'Responsable et constructif', focus: ['Communication et feedback', 'Motivation et engagement', 'Gestion des conflits hiérarchiques'] },
  partenaire_business: {
    label: 'Partenaire business',
    angleAnalyse: "Analyser la compatibilité entre partenaires d'affaires.",
    ton: 'Stratégique et constructif',
    focus: ['Vision et valeurs business alignées', 'Styles de prise de décision', 'Complémentarité des compétences'],
    intro: "Un partenariat business, c'est presque comme un mariage — et vos profils me disent beaucoup sur vos chances de succès ensemble...",
  },
  mentor_mentore: {
    label: 'Mentor / Mentoré',
    angleAnalyse: "Analyser la dynamique de mentorat.",
    ton: 'Inspirant et bienveillant',
    focus: ['Compatibilité de valeurs et de vision', "Style de communication et d'apprentissage", 'Réciprocité et respect mutuel'],
    intro: "Le mentorat c'est une relation particulière — pas tout à fait pro, pas tout à fait perso. Voyons ce que vos profils révèlent...",
  },
};

function buildCompatibilityPrompt(dimensionScores, globalScore, relationshipType, scores) {
  const ctx = RELATION_CONTEXTS[relationshipType] || null;
  const relLabel = ctx ? ctx.label : (relationshipType || 'relation');

  const dimensionsText = Object.entries(dimensionScores)
    .map(([dim, score]) => `- ${dim}: ${score}/100`)
    .join('\n');

  const attachmentStyles = {};
  if (scores) {
    Object.entries(scores).forEach(([key, profile]) => {
      if (profile && profile.ecr_r) {
        const sub = profile.ecr_r.subscaleScores || {};
        const anxiety = sub.anxiety ?? 0;
        const avoidance = sub.avoidance ?? 0;
        attachmentStyles[key] = anxiety >= 3.5 && avoidance >= 3.5 ? 'Craintif' :
                                anxiety >= 3.5 ? 'Préoccupé' :
                                avoidance >= 3.5 ? 'Détaché' : 'Sécure';
      }
    });
  }

  const attachmentText = Object.keys(attachmentStyles).length > 0
    ? "\nStyles d'attachement : " + Object.entries(attachmentStyles).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '';

  const contextBlock = ctx ? `
CONTEXTE DE LA RELATION — ${relLabel.toUpperCase()}
- Angle d'analyse : ${ctx.angleAnalyse}
- Ton à adopter : ${ctx.ton}
- Points de focus prioritaires : ${ctx.focus.join(' | ')}
${ctx.intro ? `- Phrase d'intro suggérée (tu peux l'adapter) : "${ctx.intro}"` : ''}
` : '';

  return `Voici les résultats de compatibilité pour une relation de type **${relLabel}** :

Score global : **${globalScore}/100**${attachmentText}

Scores par dimension :
${dimensionsText}
${contextBlock}
Génère une analyse de compatibilité en français, au tutoiement, avec le ton du Dr Lô adapté au contexte ci-dessus. Structure ainsi :

**${ctx?.intro ? ctx.intro : `Analyse — ${relLabel}`}**

**Votre dynamique ensemble**
(Synthèse de la dynamique relationnelle spécifique à ce type de relation — honnête et nuancée, 3-4 phrases)

**Vos points forts**
(2-3 dimensions harmonieuses et leur impact concret)

**Ce qui mérite votre attention**
(2-3 zones de tension avec des pistes constructives adaptées à ce type de relation)

**Conseils du Dr Lo pour votre relation**
(4-5 recommandations concrètes, adaptées à la culture africaine/sénégalaise ET au contexte spécifique de cette relation)

**Message pour vous deux**
(1 phrase d'encouragement sincère)

Sois honnête mais constructif. Si des dynamiques toxiques sont détectées, nomme-les avec tact. Adapte absolument le ton et les recommandations au type de relation "${relLabel}".`;
}
