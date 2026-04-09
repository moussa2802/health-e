export interface ScaleMeta {
  icon: string;
  label: string;       // Nom naturel affiché à l'utilisateur
  description: string; // Description courte de ce que mesure l'évaluation
}

export const SCALE_META: Record<string, ScaleMeta> = {
  gad7:               { icon: '😰', label: 'Anxiété',                       description: 'Découvre ton niveau d\'anxiété au quotidien et comment ton cerveau réagit face au stress.' },
  phq9:               { icon: '🌑', label: 'Humeur & Dépression',            description: 'Évalue ton humeur générale et détecte les signaux que ton cerveau t\'envoie.' },
  big_five:           { icon: '🧬', label: 'Personnalité',                   description: 'Explore les 5 grandes dimensions de ta personnalité — ce qui te rend unique.' },
  ecr_r:              { icon: '🔗', label: 'Style d\'attachement',           description: 'Découvre comment tu vis tes relations et pourquoi tu réagis comme tu réagis avec les autres.' },
  rses:               { icon: '🪞', label: 'Estime de soi',                  description: 'Mesure comment tu te perçois — tes forces, tes doutes et la relation à toi-même.' },
  brs:                { icon: '🛡️', label: 'Résilience',                     description: 'Évalue ta capacité à rebondir face aux épreuves de la vie.' },
  pss10:              { icon: '⚡', label: 'Stress',                         description: 'Mesure ton niveau de stress perçu et comment il impacte ton quotidien.' },
  ace:                { icon: '🧒', label: 'Traumas d\'enfance',             description: 'Explore les expériences difficiles de l\'enfance et leur influence possible sur ta santé.' },
  pcl5:               { icon: '💥', label: 'Stress post-traumatique',        description: 'Évalue les symptômes liés à un événement traumatique que tu as peut-être vécu.' },
  pg13:               { icon: '😢', label: 'Deuil & Pertes',                 description: 'Mesure comment tu traverses le deuil et les pertes importantes dans ta vie.' },
  ceca_q:             { icon: '👶', label: 'Carences affectives',            description: 'Explore les carences émotionnelles de l\'enfance et leur impact à l\'âge adulte.' },
  social_pressure:    { icon: '💍', label: 'Pression sociale & Mariage',    description: 'Évalue la pression familiale et sociale autour du mariage et des attentes relationnelles.' },
  religious_cultural: { icon: '🕌', label: 'Impact religieux & Culturel',   description: 'Explore comment tes croyances et ta culture influencent ton profil psychologique.' },
  economic_stress:    { icon: '💸', label: 'Stress économique',              description: 'Mesure l\'impact du stress financier sur ton bien-être psychologique.' },
  nsss:               { icon: '❤️', label: 'Satisfaction sexuelle',          description: 'Évalue ta satisfaction globale dans ta vie intime et affective.' },
  sdi2:               { icon: '🔥', label: 'Désir sexuel',                   description: 'Mesure ton niveau de désir et ce qui l\'influence au quotidien.' },
  sis_ses:            { icon: '⚖️', label: 'Inhibition & Excitation',        description: 'Explore les mécanismes qui activent ou freinent ton excitation sexuelle.' },
  fsfi:               { icon: '🌸', label: 'Fonction sexuelle féminine',     description: 'Évalue les différentes dimensions de ta fonction sexuelle.' },
  iief:               { icon: '💙', label: 'Fonction érectile',              description: 'Mesure la santé de ta fonction érectile et son impact sur ta vie.' },
  tsi_base:           { icon: '🧩', label: 'Trauma & Sexualité',             description: 'Explore comment des expériences traumatiques peuvent influencer ta vie intime.' },
  pair:               { icon: '🫂', label: 'Intimité de couple',             description: 'Évalue la qualité de ton intimité émotionnelle et physique avec ton partenaire.' },
  sise:               { icon: '🪞', label: 'Image corporelle & Sexualité',   description: 'Explore la relation entre ton image de toi-même et ton bien-être intime.' },
  social_pressure_sex:{ icon: '🤐', label: 'Pression sociale & Sexualité',  description: 'Mesure l\'impact des normes sociales et familiales sur ta vie sexuelle.' },
  griss_base:         { icon: '💑', label: 'Satisfaction de couple',         description: 'Évalue la satisfaction globale dans ta relation de couple.' },

  // Bonus
  bonus_narcissisme:  { icon: '🎭', label: 'Traits narcissiques',             description: 'Es-tu vraiment toxique ou juste incompris(e) ?' },
  bonus_personnalite: { icon: '🌪️', label: 'Traits de personnalité',          description: 'Est-ce que ton caractère cache quelque chose ?' },
  bonus_dependance:   { icon: '💔', label: 'Dépendance affective',             description: 'Aimes-tu trop ou juste assez ?' },
  bonus_hsp:          { icon: '🌊', label: 'Hypersensibilité (HSP)',           description: 'Ressens-tu plus que les autres ?' },
  bonus_hpi:          { icon: '⚡', label: 'Haut Potentiel Intellectuel',      description: 'Ton cerveau tourne-t-il à une vitesse différente ?' },
  bonus_tdah:         { icon: '🔄', label: 'TDAH Adulte',                      description: 'Ton cerveau est-il toujours en mode turbo ?' },
  bonus_manipulation: { icon: '🎭', label: 'Manipulation & Toxicité',          description: 'Es-tu plus manipulateur(rice) que tu ne le crois ?' },
  bonus_burnout:      { icon: '🔥', label: 'Burnout professionnel',            description: 'Ton corps te dit-il d\'arrêter ?' },
  bonus_jalousie:     { icon: '😤', label: 'Jalousie',                         description: 'La jalousie te contrôle-t-elle ?' },
  bonus_eq:           { icon: '💚', label: 'Intelligence émotionnelle',        description: 'Quel est ton vrai QE émotionnel ?' },
  bonus_confiance:    { icon: '🦁', label: 'Confiance en soi',                 description: 'À quel point crois-tu vraiment en toi ?' },
};

export function getScaleMeta(scaleId: string): ScaleMeta {
  return SCALE_META[scaleId] ?? { icon: '📋', label: scaleId, description: '' };
}
