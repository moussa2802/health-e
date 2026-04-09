// ── Welcome slides ────────────────────────────────────────────────────────────

export interface WelcomeSlide {
  id: string;
  illustration: string;
  titre: string;
  contenu?: string[];
  description: string;
  bouton: string;
}

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'welcome',
    illustration: '🌿',
    titre: 'Bienvenue sur Healt-e',
    description: 'Salut ! Je suis Dr Lô, ton médecin IA. Je suis là pour t\'accompagner dans ta connaissance de toi-même. Laisse-moi te montrer comment tout ça fonctionne 😊',
    bouton: 'Allons-y →',
  },
  {
    id: 'evaluations',
    illustration: '🧠',
    titre: 'Des évaluations scientifiques',
    contenu: [
      '🧠 14 évaluations en profil psychologique',
      '💋 10 évaluations en vie intime',
      '✨ 11 tests bonus très populaires',
    ],
    description: 'Chaque évaluation est basée sur des outils validés scientifiquement. Tu fais les tests à ton rythme — dans l\'ordre que tu veux. Plus tu en fais, plus ton profil sera précis 🎯',
    bouton: 'Continuer →',
  },
  {
    id: 'dr_lo',
    illustration: '🩺',
    titre: 'Je suis toujours là',
    contenu: [
      '📊 J\'analyse ton profil après chaque test',
      '💬 Tu peux me parler à tout moment',
      '📔 Ton journal intime t\'attend',
    ],
    description: 'Je lis tous tes résultats, ton journal, tes tests de compatibilité. Tu peux me poser n\'importe quelle question — je répondrai en tenant compte de tout ce que je sais sur toi 🤍',
    bouton: 'Continuer →',
  },
  {
    id: 'confidentialite',
    illustration: '🔒',
    titre: 'Tout est privé',
    contenu: [
      '🔒 Tes données ne sont jamais partagées',
      '🤐 Ton journal est uniquement pour toi',
      '💋 La section vie intime est protégée',
    ],
    description: 'Ce que tu partages ici reste ici. Jamais partagé, jamais vendu, jamais lu par qui que ce soit d\'autre que toi et moi 🔒',
    bouton: 'Commencer mon profil ✨',
  },
];

// ── Tooltip configs ───────────────────────────────────────────────────────────

export interface TooltipConfig {
  id: string;
  target: string;           // valeur du data-tooltip-id sur l'élément DOM
  position: 'top' | 'bottom' | 'left' | 'right';
  titre: string;
  texte: string;
  ordre: number;
}

export const TOOLTIPS: Record<string, TooltipConfig[]> = {

  home: [
    {
      id: 'home_mental',
      target: 'card-mental-health',
      position: 'bottom',
      titre: '🧠 Profil Psychologique',
      texte: 'Commence ici pour explorer ton profil mental — personnalité, émotions, attachement et plus. 14 évaluations t\'attendent !',
      ordre: 1,
    },
    {
      id: 'home_intimate',
      target: 'card-intimate-life',
      position: 'bottom',
      titre: '💋 Vie Intime',
      texte: 'Explore ta vie intime en toute confidentialité. Les résultats restent uniquement entre toi et Dr Lô.',
      ordre: 2,
    },
    {
      id: 'home_espace',
      target: 'btn-mon-espace',
      position: 'top',
      titre: '🌿 Mon Espace',
      texte: 'Ton journal intime et ta discussion privée avec Dr Lô — ton espace personnel pour tout ce que tu veux explorer.',
      ordre: 3,
    },
  ],

  mental: [
    {
      id: 'mental_item_card',
      target: 'first-item-card',
      position: 'bottom',
      titre: '▶️ Commencer un test',
      texte: 'Clique sur un test pour commencer. Chaque test prend entre 3 et 10 minutes, et les résultats sont immédiats.',
      ordre: 1,
    },
  ],

  sexual: [
    {
      id: 'sexual_item_card',
      target: 'first-item-card',
      position: 'bottom',
      titre: '💋 Tests vie intime',
      texte: 'Ces tests explorent ta vie intime de façon scientifique et confidentielle. Tes réponses restent privées.',
      ordre: 1,
    },
  ],

  profile: [
    {
      id: 'profil_dr_lo',
      target: 'dr-lo-bubble',
      position: 'bottom',
      titre: '🩺 Analyse Dr Lô',
      texte: 'Dr Lô analyse tous tes résultats et les met en lien entre eux. Son analyse s\'enrichit à chaque test que tu complètes !',
      ordre: 1,
    },
    {
      id: 'profil_code',
      target: 'compatibility-code',
      position: 'top',
      titre: '🔗 Code de compatibilité',
      texte: 'Ce code te permet de faire un test de compatibilité avec quelqu\'un d\'autre. Il se débloque après plusieurs évaluations.',
      ordre: 2,
    },
  ],

  compatibility: [
    {
      id: 'compat_type',
      target: 'relation-type-selector',
      position: 'bottom',
      titre: '❤️ Type de relation',
      texte: 'Choisis d\'abord avec qui tu fais ce test — couple, famille, amis ou collègue. L\'analyse s\'adapte selon le type.',
      ordre: 1,
    },
    {
      id: 'compat_code',
      target: 'partner-code-input',
      position: 'top',
      titre: '🔑 Code partenaire',
      texte: 'Demande à l\'autre personne son code de compatibilité depuis son profil et entre-le ici.',
      ordre: 2,
    },
  ],

  mon_espace: [
    {
      id: 'espace_journal',
      target: 'tab-journal',
      position: 'bottom',
      titre: '📔 Ton journal',
      texte: 'Écris ici ce que tu veux — tes pensées, tes émotions, ta journée. C\'est privé, jamais partagé.',
      ordre: 1,
    },
    {
      id: 'espace_chat',
      target: 'tab-dr-lo',
      position: 'bottom',
      titre: '💬 Chat avec Dr Lô',
      texte: 'Pose toutes tes questions à Dr Lô — il connaît tout ton profil et répond de façon personnalisée.',
      ordre: 2,
    },
  ],
};

// ── Path → pageKey mapping (pour HelpButton) ─────────────────────────────────

export function pathToPageKey(pathname: string): string | null {
  if (pathname === '/assessment') return 'home';
  if (pathname.includes('/assessment/mental_health')) return 'mental';
  if (pathname.includes('/assessment/sexual_health')) return 'sexual';
  if (pathname.includes('/assessment/profile') || pathname === '/assessment/profile') return 'profile';
  if (pathname.includes('/assessment/compatibility')) return 'compatibility';
  if (pathname.includes('/mon-espace')) return 'mon_espace';
  return null;
}
