export interface RelationshipSubType {
  id: string;
  emoji: string;
  label: string;
  description?: string;
  drLoContext: {
    angleAnalyse: string;
    ton: string;
    focus: string[];
    exempleIntroDrLo?: string;
  };
}

export interface RelationshipMainType {
  id: string;
  emoji: string;
  label: string;
  question: string;
  subTypes: RelationshipSubType[];
}

export const RELATIONSHIP_CATEGORIES: RelationshipMainType[] = [
  {
    id: 'amoureux',
    emoji: '❤️',
    label: 'Relation amoureuse',
    question: 'Où en êtes-vous dans votre relation ?',
    subTypes: [
      {
        id: 'crush',
        emoji: '💭',
        label: 'Crush / Attirance',
        description: "On se plaît mais ce n'est pas encore officiel",
        drLoContext: {
          angleAnalyse: "Analyser la compatibilité comme une potentialité — ce qui pourrait fonctionner si la relation se développe. Identifier les signaux positifs et les points de vigilance avant de s'engager davantage.",
          ton: "Léger, fun, un peu complice — comme un ami qui t'aide à voir clair sur quelqu'un qui te plaît",
          focus: ['Compatibilité de personnalité initiale', 'Styles de communication', 'Valeurs communes', 'Points de tension potentiels à surveiller'],
          exempleIntroDrLo: "Alors comme ça tu veux savoir si vous êtes faits l'un pour l'autre avant même que ça commence 😏 Bonne initiative. Voilà ce que vos profils me disent...",
        },
      },
      {
        id: 'debut_relation',
        emoji: '💬',
        label: 'Fréquentation / Début de relation',
        description: "On se voit, on apprend à se connaître — moins de 6 mois",
        drLoContext: {
          angleAnalyse: "Analyser la dynamique naissante. Identifier ce qui est prometteur et ce qui mérite attention avant que les habitudes se cristallisent.",
          ton: 'Encourageant et constructif',
          focus: ["Compatibilité émotionnelle", "Styles d'attachement — risque de dynamique toxique ?", "Communication et expression des besoins", "Valeurs fondamentales alignées ou non"],
          exempleIntroDrLo: "Vous êtes encore dans la belle période — et c'est exactement le bon moment pour regarder ça de près. Voilà ce que vos profils me révèlent...",
        },
      },
      {
        id: 'en_couple',
        emoji: '💑',
        label: 'En couple',
        description: 'Relation officielle — entre 6 mois et 2 ans',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique d'un couple en construction. Identifier les forces de la relation et les zones à consolider avant que les habitudes se figent.",
          ton: 'Chaleureux et nuancé',
          focus: ["Styles d'attachement", 'Communication des besoins', 'Gestion des conflits', 'Intimité émotionnelle naissante'],
          exempleIntroDrLo: "Vous construisez quelque chose ensemble — et vos profils m'en disent beaucoup sur la solidité de ces fondations...",
        },
      },
      {
        id: 'couple_etabli',
        emoji: '💍',
        label: 'Couple établi',
        description: 'Ensemble depuis plus de 2 ans',
        drLoContext: {
          angleAnalyse: "Analyser les dynamiques installées. Identifier les patterns relationnels, les zones d'usure et les ressources pour revitaliser la relation.",
          ton: 'Profond, honnête, orienté solutions',
          focus: ["Évolution des styles d'attachement", "Qualité de l'intimité émotionnelle et sexuelle", 'Gestion des conflits', 'Besoins non exprimés', 'Ressources communes de résilience'],
          exempleIntroDrLo: "Après tout ce temps ensemble, vos profils me racontent une histoire assez complète. Et il y a des choses très intéressantes à voir ici...",
        },
      },
      {
        id: 'maries_recent',
        emoji: '💒',
        label: 'Mariés depuis peu',
        description: 'Mariage de moins de 2 ans',
        drLoContext: {
          angleAnalyse: "Analyser la transition vers la vie conjugale. Identifier les attentes implicites, les rôles en construction et les ressources pour bâtir une union solide.",
          ton: 'Optimiste mais réaliste',
          focus: ['Attentes conjugales explicites et implicites', 'Rôles de genre et partage des responsabilités', 'Communication intime', 'Construction du projet de vie commun'],
          exempleIntroDrLo: "Le mariage c'est un nouveau chapitre — et les profils révèlent souvent des choses qu'on n'a pas encore eu le temps de se dire...",
        },
      },
      {
        id: 'maries_longtemps',
        emoji: '🏡',
        label: 'Mariés depuis longtemps',
        description: 'Mariage de plus de 2 ans',
        drLoContext: {
          angleAnalyse: "Analyser la profondeur du lien, les zones d'usure et les leviers pour renforcer ou rééquilibrer la relation. Tenir compte du contexte culturel sénégalais (polygamie, rôles de genre, pression familiale).",
          ton: 'Respectueux, mature, sensible aux réalités culturelles',
          focus: ["Intimité émotionnelle sur la durée", "Satisfaction sexuelle et évolution du désir", 'Communication des besoins profonds', 'Impact des rôles de genre sur la relation', 'Ressources pour se retrouver'],
          exempleIntroDrLo: "Une longue histoire commune — c'est riche et complexe à la fois. Vos profils m'en disent beaucoup sur ce qui vous unit et ce qui mérite votre attention aujourd'hui...",
        },
      },
      {
        id: 'ex_partenaire',
        emoji: '💔',
        label: 'Ex-partenaire',
        description: "Relation terminée — comprendre ce qui s'est passé",
        drLoContext: {
          angleAnalyse: "Analyser ce qui a fonctionné et ce qui a mené à la rupture. Comprendre les patterns pour ne pas les répéter dans une future relation. Pas pour rouvrir — pour comprendre.",
          ton: 'Doux, sans jugement, orienté apprentissage et guérison',
          focus: ['Incompatibilités fondamentales', 'Dynamiques toxiques identifiées', 'Ce que chacun peut apprendre de cette relation', 'Signaux à surveiller dans les prochaines relations'],
          exempleIntroDrLo: "Comprendre pourquoi ça n'a pas marché, c'est l'une des choses les plus utiles qu'on puisse faire. Voilà ce que vos profils m'apprennent sur votre histoire...",
        },
      },
    ],
  },
  {
    id: 'famille',
    emoji: '👨‍👩‍👧',
    label: 'Famille',
    question: "C'est quel membre de ta famille ?",
    subTypes: [
      {
        id: 'pere',
        emoji: '👨',
        label: 'Père',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique père-enfant adulte. Impact du style parental reçu sur l'attachement actuel. Tenir compte du rôle du père dans la culture sénégalaise (autorité, distance émotionnelle, figure de pouvoir).",
          ton: 'Sensible, profond, respectueux de la complexité des liens parentaux',
          focus: ["Style d'attachement formé par cette relation", 'Communication inter-générationnelle', 'Blessures non dites', 'Ressources pour améliorer le lien'],
          exempleIntroDrLo: "La relation avec son père, c'est souvent l'une des plus complexes qui soit. Vos profils m'éclairent sur beaucoup de choses ici...",
        },
      },
      {
        id: 'mere',
        emoji: '👩',
        label: 'Mère',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique mère-enfant. Lien entre le style maternel reçu et l'attachement adulte actuel. Tenir compte du rôle central de la mère dans la famille sénégalaise.",
          ton: 'Chaleureux, respectueux, attentif aux non-dits',
          focus: ["Sécurité affective reçue dans l'enfance", 'Dépendance vs autonomie', 'Communication émotionnelle', 'Impact sur les relations actuelles'],
        },
      },
      {
        id: 'frere',
        emoji: '👦',
        label: 'Frère',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique fraternelle. Rivalité, soutien, rôles dans la fratrie. Tenir compte du contexte familial africain où la solidarité familiale est centrale.",
          ton: "Direct et fun — la fratrie c'est souvent à la fois le meilleur et le pire 😄",
          focus: ['Dynamique de rivalité ou de soutien', 'Communication et expression des émotions', 'Rôles figés dans la famille', 'Ressources pour renforcer le lien'],
          exempleIntroDrLo: "La fratrie c'est souvent nos premières vraies relations — et elles façonnent beaucoup. Voilà ce que vos profils me disent...",
        },
      },
      {
        id: 'soeur',
        emoji: '👧',
        label: 'Sœur',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique fraternelle sœur. Rivalité, complicité, rôles dans la fratrie. Tenir compte du contexte familial africain.",
          ton: "Direct et fun — la fratrie c'est souvent à la fois le meilleur et le pire 😄",
          focus: ['Dynamique de rivalité ou de complicité', 'Communication et expression des émotions', 'Rôles figés dans la famille', 'Ressources pour renforcer le lien'],
          exempleIntroDrLo: "La fratrie c'est souvent nos premières vraies relations — et elles façonnent beaucoup. Voilà ce que vos profils me disent...",
        },
      },
      {
        id: 'grand_pere',
        emoji: '👴',
        label: 'Grand-père',
        drLoContext: {
          angleAnalyse: "Analyser la relation inter-générationnelle avec le grand-père. Identifier les transmissions culturelles, les valeurs partagées et les fossés générationnels.",
          ton: 'Respectueux, sage, attentif aux héritages culturels',
          focus: ['Transmission des valeurs', 'Communication inter-générationnelle', 'Rôle du patriarche dans la famille africaine'],
        },
      },
      {
        id: 'grand_mere',
        emoji: '👵',
        label: 'Grand-mère',
        drLoContext: {
          angleAnalyse: "Analyser la relation inter-générationnelle avec la grand-mère. Identifier les transmissions culturelles et affectives.",
          ton: 'Chaleureux, respectueux, attentif aux héritages',
          focus: ['Sécurité affective transmise', 'Transmission des valeurs et traditions', 'Communication inter-générationnelle'],
        },
      },
      {
        id: 'fils',
        emoji: '👨‍👦',
        label: 'Fils',
        drLoContext: {
          angleAnalyse: "Analyser la relation parent-fils adulte. Identifier les attentes parentales, l'autonomie du fils et la qualité du lien.",
          ton: 'Bienveillant et équilibré',
          focus: ['Autonomie vs dépendance', 'Communication parent-fils', 'Transmission des valeurs', 'Qualité du soutien mutuel'],
        },
      },
      {
        id: 'fille',
        emoji: '👩‍👦',
        label: 'Fille',
        drLoContext: {
          angleAnalyse: "Analyser la relation parent-fille adulte. Identifier les attentes parentales et l'autonomie de la fille dans le contexte culturel sénégalais.",
          ton: 'Bienveillant, sensible aux dynamiques de genre',
          focus: ['Autonomie vs attentes familiales', 'Communication parent-fille', 'Rôle de genre et liberté personnelle', 'Soutien émotionnel mutuel'],
        },
      },
      {
        id: 'oncle_tante',
        emoji: '👨‍👧‍👦',
        label: 'Oncle / Tante',
        drLoContext: {
          angleAnalyse: "Analyser la relation avec un oncle ou une tante. Identifier le rôle de ces figures dans l'éducation et le soutien familial africain.",
          ton: 'Respectueux, ancré dans la réalité familiale africaine',
          focus: ['Rôle dans la famille élargie', 'Influence et soutien', 'Communication inter-générationnelle'],
        },
      },
      {
        id: 'cousin_cousine',
        emoji: '🤝',
        label: 'Cousin / Cousine',
        drLoContext: {
          angleAnalyse: "Analyser la relation avec un cousin ou une cousine. Dans la culture africaine, les cousins jouent souvent un rôle proche de celui de frères et sœurs.",
          ton: 'Détendu et complice',
          focus: ['Proximité ou distance affective', 'Valeurs et styles de vie', 'Communication et réciprocité'],
        },
      },
      {
        id: 'beau_parent',
        emoji: '👨‍👩‍👧',
        label: 'Beau-père / Belle-mère',
        drLoContext: {
          angleAnalyse: "Analyser la relation avec les beaux-parents. Identifier les tensions, les zones de respect et les ressources pour une belle-famille harmonieuse dans le contexte sénégalais.",
          ton: 'Délicat, respectueux, sensible aux enjeux de pouvoir',
          focus: ['Respect mutuel et frontières', 'Gestion des attentes', 'Communication et clarté des rôles', 'Impact sur le couple'],
        },
      },
    ],
  },
  {
    id: 'amitie',
    emoji: '👫',
    label: 'Amitié',
    question: "C'est quel type d'amitié ?",
    subTypes: [
      {
        id: 'nouvelle_amitie',
        emoji: '⚡',
        label: 'Nouvelle amitié',
        description: 'On se connaît depuis moins de 6 mois',
        drLoContext: {
          angleAnalyse: "Analyser la compatibilité d'une amitié naissante. Identifier les bases communes et les potentiels points de friction à surveiller.",
          ton: 'Léger, curieux, enthousiaste',
          focus: ["Valeurs et centres d'intérêt communs", 'Styles de communication', 'Réciprocité dès le départ', 'Compatibilité de personnalité'],
          exempleIntroDrLo: "Une nouvelle connexion — toujours excitant ! Voilà ce que vos profils révèlent sur cette amitié naissante...",
        },
      },
      {
        id: 'ami_proche',
        emoji: '😊',
        label: 'Ami(e) proche',
        description: 'Une amitié solide de plus de 6 mois',
        drLoContext: {
          angleAnalyse: "Analyser la solidité d'une amitié bien installée. Identifier les ressources et les zones de friction possibles.",
          ton: 'Chaleureux et bienveillant',
          focus: ['Réciprocité émotionnelle', 'Communication dans les moments difficiles', 'Respect des différences', 'Soutien mutuel'],
        },
      },
      {
        id: 'meilleur_ami',
        emoji: '🏆',
        label: 'Meilleur(e) ami(e)',
        description: "Mon/ma best — on se connaît depuis des années",
        drLoContext: {
          angleAnalyse: "Analyser la profondeur et la solidité de ce lien fort. Identifier les ressources et les zones de friction possibles dans une amitié profonde.",
          ton: 'Complice et fun',
          focus: ['Compatibilité de valeurs', 'Réciprocité émotionnelle', 'Gestion des désaccords', 'Évolution parallèle ou divergente'],
          exempleIntroDrLo: "Tester la compatibilité avec son meilleur ami — bonne idée ou Pandore's box ? 😄 Voyons ça ensemble...",
        },
      },
      {
        id: 'ami_enfance',
        emoji: '🌍',
        label: "Ami(e) d'enfance",
        description: 'On se connaît depuis tout petits',
        drLoContext: {
          angleAnalyse: "Analyser une amitié de longue date forgée dans l'enfance. Identifier l'évolution des deux personnes et la solidité du lien dans le temps.",
          ton: 'Nostalgique et chaleureux',
          focus: ['Évolution personnelle et divergences', 'Ce qui unit encore', 'Communication actuelle vs passée', 'Renouvellement du lien'],
          exempleIntroDrLo: "Ces amitiés-là sont rares et précieuses. Voyons ce que vos profils disent de l'évolution de votre lien...",
        },
      },
      {
        id: 'ami_virtuel',
        emoji: '📱',
        label: 'Ami(e) virtuel(le)',
        description: 'Une relation surtout en ligne',
        drLoContext: {
          angleAnalyse: "Analyser une amitié principalement digitale. Identifier les forces de cette connexion virtuelle et les défis d'une relation à distance.",
          ton: 'Moderne, sans jugement',
          focus: ['Authenticité dans la communication digitale', 'Réciprocité malgré la distance', "Valeurs et centres d'intérêt communs"],
        },
      },
    ],
  },
  {
    id: 'professionnel',
    emoji: '💼',
    label: 'Collègue / Professionnel',
    question: "C'est quel type de relation professionnelle ?",
    subTypes: [
      {
        id: 'collegue_meme_niveau',
        emoji: '👔',
        label: 'Collègue de même niveau',
        description: 'On travaille ensemble au même rang',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique entre collègues de même niveau. Identifier les zones de collaboration et de friction potentielle.",
          ton: 'Professionnel mais accessible',
          focus: ['Styles de travail et de communication', 'Gestion du stress professionnel', 'Compatibilité de valeurs professionnelles', 'Compétition vs coopération'],
        },
      },
      {
        id: 'superieur',
        emoji: '📊',
        label: 'Supérieur hiérarchique',
        description: 'Cette personne est au-dessus de moi',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique de pouvoir et de communication dans une relation hiérarchique. Identifier les sources de tension et les leviers pour mieux collaborer.",
          ton: 'Professionnel mais accessible',
          focus: ["Styles de communication et d'autorité", 'Gestion du stress professionnel', 'Compatibilité de valeurs professionnelles', "Dynamique de pouvoir et d'influence"],
          exempleIntroDrLo: "Comprendre la dynamique avec son supérieur, c'est souvent la clé d'une carrière plus sereine. Voilà ce que vos profils révèlent...",
        },
      },
      {
        id: 'subordonné',
        emoji: '👥',
        label: 'Subordonné',
        description: 'Cette personne travaille sous ma direction',
        drLoContext: {
          angleAnalyse: "Analyser la dynamique manager-collaborateur. Identifier les zones de tension et les leviers pour un leadership plus efficace.",
          ton: 'Responsable et constructif',
          focus: ["Style de management et attentes du collaborateur", 'Communication et feedback', 'Motivation et engagement', 'Gestion des conflits hiérarchiques'],
        },
      },
      {
        id: 'partenaire_business',
        emoji: '🤝',
        label: 'Partenaire business',
        description: 'On collabore sur un projet commun',
        drLoContext: {
          angleAnalyse: "Analyser la compatibilité entre partenaires d'affaires. Identifier les forces complémentaires et les zones de friction potentielle.",
          ton: 'Stratégique et constructif',
          focus: ['Vision et valeurs business alignées', 'Styles de prise de décision', 'Communication et résolution de conflits', 'Complémentarité des compétences'],
          exempleIntroDrLo: "Un partenariat business, c'est presque comme un mariage — et vos profils me disent beaucoup sur vos chances de succès ensemble...",
        },
      },
      {
        id: 'mentor_mentore',
        emoji: '🎓',
        label: 'Mentor / Mentoré',
        description: "Une relation d'apprentissage et de guidance",
        drLoContext: {
          angleAnalyse: "Analyser la dynamique de mentorat. Identifier la compatibilité pédagogique et relationnelle pour une relation d'apprentissage efficace.",
          ton: 'Inspirant et bienveillant',
          focus: ['Compatibilité de valeurs et de vision', "Style de communication et d'apprentissage", 'Réciprocité et respect mutuel', 'Dynamique de pouvoir équilibrée'],
          exempleIntroDrLo: "Le mentorat c'est une relation particulière — pas tout à fait pro, pas tout à fait perso. Voyons ce que vos profils révèlent...",
        },
      },
    ],
  },
];

export function getRelationshipSubType(subTypeId: string) {
  for (const cat of RELATIONSHIP_CATEGORIES) {
    const sub = cat.subTypes.find(s => s.id === subTypeId);
    if (sub) return { category: cat, subType: sub };
  }
  return null;
}

export function getRelationshipLabel(subTypeId: string): string {
  const found = getRelationshipSubType(subTypeId);
  if (!found) return subTypeId;
  return `${found.subType.emoji} ${found.subType.label}`;
}
