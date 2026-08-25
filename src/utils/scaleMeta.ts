import {
  Brain, CloudRain, Dna, Link2, ScanFace, Shield, Zap,
  Baby, Bomb, HeartCrack, Users, Gem, Church, Wallet,
  Heart, Flame, Scale, Flower2, Pill, Puzzle, HandHeart,
  Eye, MessageCircleOff, Sparkles,
  Theater, Wind, Ribbon, Waves, BrainCircuit, RefreshCw,
  Drama, Gauge, Angry, Lightbulb, Crown,
  type LucideIcon,
} from 'lucide-react';

export type ScaleCategory = 'mental' | 'sexual' | 'bonus';

export interface ScaleMeta {
  icon: LucideIcon;
  label: string;
  description: string;
  category: ScaleCategory;
}

export const CATEGORY_COLORS: Record<ScaleCategory, { bg: string; text: string; border: string; accent: string }> = {
  mental: { bg: 'bg-sage/10',   text: 'text-sage',   border: 'border-sage/20',   accent: '#4A5D57' },
  sexual: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20', accent: '#B5522F' },
  bonus:  { bg: 'bg-gold/10',   text: 'text-gold',   border: 'border-gold/20',   accent: '#8F6A1F' },
};

export const SCALE_META: Record<string, ScaleMeta> = {
  // ── Mental ──
  gad7:               { icon: Brain,          label: 'Anxiété',                       description: 'Découvre ton niveau d\'anxiété au quotidien et comment ton cerveau réagit face au stress.', category: 'mental' },
  phq9:               { icon: CloudRain,      label: 'Humeur & Dépression',            description: 'Évalue ton humeur générale et détecte les signaux que ton cerveau t\'envoie.', category: 'mental' },
  big_five:           { icon: Dna,            label: 'Personnalité',                   description: 'Explore les 5 grandes dimensions de ta personnalité — ce qui te rend unique.', category: 'mental' },
  ecr_r:              { icon: Link2,          label: 'Style d\'attachement',           description: 'Découvre comment tu vis tes relations et pourquoi tu réagis comme tu réagis avec les autres.', category: 'mental' },
  rses:               { icon: ScanFace,         label: 'Estime de soi',                  description: 'Mesure comment tu te perçois — tes forces, tes doutes et la relation à toi-même.', category: 'mental' },
  brs:                { icon: Shield,         label: 'Résilience',                     description: 'Évalue ta capacité à rebondir face aux épreuves de la vie.', category: 'mental' },
  pss10:              { icon: Zap,            label: 'Stress',                         description: 'Mesure ton niveau de stress perçu et comment il impacte ton quotidien.', category: 'mental' },
  ace:                { icon: Baby,           label: 'Traumas d\'enfance',             description: 'Explore les expériences difficiles de l\'enfance et leur influence possible sur ta santé.', category: 'mental' },
  pcl5:               { icon: Bomb,           label: 'Stress post-traumatique',        description: 'Évalue les symptômes liés à un événement traumatique que tu as peut-être vécu.', category: 'mental' },
  pg13:               { icon: HeartCrack,     label: 'Deuil & Pertes',                 description: 'Mesure comment tu traverses le deuil et les pertes importantes dans ta vie.', category: 'mental' },
  ceca_q:             { icon: Users,          label: 'Carences affectives',            description: 'Explore les carences émotionnelles de l\'enfance et leur impact à l\'âge adulte.', category: 'mental' },
  social_pressure:    { icon: Gem,            label: 'Pression sociale & Mariage',    description: 'Évalue la pression familiale et sociale autour du mariage et des attentes relationnelles.', category: 'mental' },
  religious_cultural: { icon: Church,         label: 'Impact religieux & Culturel',   description: 'Explore comment tes croyances et ta culture influencent ton profil psychologique.', category: 'mental' },
  economic_stress:    { icon: Wallet,         label: 'Stress économique',              description: 'Mesure l\'impact du stress financier sur ton bien-être psychologique.', category: 'mental' },

  // ── Sexuel / Intime ──
  nsss:               { icon: Heart,          label: 'Satisfaction sexuelle',          description: 'Évalue ta satisfaction globale dans ta vie intime et affective.', category: 'sexual' },
  sdi2:               { icon: Flame,          label: 'Désir sexuel',                   description: 'Mesure ton niveau de désir et ce qui l\'influence au quotidien.', category: 'sexual' },
  sis_ses:            { icon: Scale,          label: 'Inhibition & Excitation',        description: 'Explore les mécanismes qui activent ou freinent ton excitation sexuelle.', category: 'sexual' },
  fsfi:               { icon: Flower2,        label: 'Fonction sexuelle féminine',     description: 'Évalue les différentes dimensions de ta fonction sexuelle.', category: 'sexual' },
  iief:               { icon: Pill,           label: 'Fonction érectile',              description: 'Mesure la santé de ta fonction érectile et son impact sur ta vie.', category: 'sexual' },
  tsi_base:           { icon: Puzzle,         label: 'Trauma & Sexualité',             description: 'Explore comment des expériences traumatiques peuvent influencer ta vie intime.', category: 'sexual' },
  pair:               { icon: HandHeart,      label: 'Intimité de couple',             description: 'Évalue la qualité de ton intimité émotionnelle et physique avec ton partenaire.', category: 'sexual' },
  sise:               { icon: Eye,            label: 'Image corporelle & Sexualité',   description: 'Explore la relation entre ton image de toi-même et ton bien-être intime.', category: 'sexual' },
  social_pressure_sex:{ icon: MessageCircleOff, label: 'Pression sociale & Sexualité',  description: 'Mesure l\'impact des normes sociales et familiales sur ta vie sexuelle.', category: 'sexual' },
  griss_base:         { icon: Sparkles,       label: 'Satisfaction de couple',         description: 'Évalue la satisfaction globale dans ta relation de couple.', category: 'sexual' },

  // ── Bonus ──
  bonus_narcissisme:  { icon: Theater,        label: 'Traits narcissiques',             description: 'Es-tu vraiment toxique ou juste incompris(e) ?', category: 'bonus' },
  bonus_personnalite: { icon: Wind,           label: 'Traits de personnalité',          description: 'Est-ce que ton caractère cache quelque chose ?', category: 'bonus' },
  bonus_dependance:   { icon: Ribbon,         label: 'Dépendance affective',             description: 'Aimes-tu trop ou juste assez ?', category: 'bonus' },
  bonus_hsp:          { icon: Waves,          label: 'Hypersensibilité (HSP)',           description: 'Ressens-tu plus que les autres ?', category: 'bonus' },
  bonus_hpi:          { icon: BrainCircuit,   label: 'Haut Potentiel Intellectuel',      description: 'Ton cerveau tourne-t-il à une vitesse différente ?', category: 'bonus' },
  bonus_tdah:         { icon: RefreshCw,      label: 'TDAH Adulte',                      description: 'Ton cerveau est-il toujours en mode turbo ?', category: 'bonus' },
  bonus_manipulation: { icon: Drama,          label: 'Manipulation & Toxicité',          description: 'Es-tu plus manipulateur(rice) que tu ne le crois ?', category: 'bonus' },
  bonus_burnout:      { icon: Gauge,          label: 'Burnout professionnel',            description: 'Ton corps te dit-il d\'arrêter ?', category: 'bonus' },
  bonus_jalousie:     { icon: Angry,          label: 'Jalousie',                         description: 'La jalousie te contrôle-t-elle ?', category: 'bonus' },
  bonus_eq:           { icon: Lightbulb,      label: 'Intelligence émotionnelle',        description: 'Quel est ton vrai QE émotionnel ?', category: 'bonus' },
  bonus_confiance:    { icon: Crown,          label: 'Confiance en soi',                 description: 'À quel point crois-tu vraiment en toi ?', category: 'bonus' },
};

export function getScaleMeta(scaleId: string): ScaleMeta {
  return SCALE_META[scaleId] ?? { icon: Puzzle, label: scaleId, description: '', category: 'mental' as ScaleCategory };
}

export function getScaleCategory(scaleId: string): ScaleCategory {
  return SCALE_META[scaleId]?.category ?? 'mental';
}

export function getCategoryColor(category: ScaleCategory) {
  return CATEGORY_COLORS[category];
}

const SCALE_EMOJI: Record<string, string> = {
  gad7: '😰', phq9: '🌑', big_five: '🧬', ecr_r: '🔗', rses: '🪞',
  brs: '🛡️', pss10: '⚡', ace: '🧒', pcl5: '💥', pg13: '😢',
  ceca_q: '👶', social_pressure: '💍', religious_cultural: '🕌', economic_stress: '💸',
  nsss: '❤️', sdi2: '🔥', sis_ses: '⚖️', fsfi: '🌸', iief: '💙',
  tsi_base: '🧩', pair: '🫂', sise: '🪞', social_pressure_sex: '🤐', griss_base: '💑',
  bonus_narcissisme: '🎭', bonus_personnalite: '🌪️', bonus_dependance: '💔',
  bonus_hsp: '🌊', bonus_hpi: '⚡', bonus_tdah: '🔄', bonus_manipulation: '🎭',
  bonus_burnout: '🔥', bonus_jalousie: '😤', bonus_eq: '💚', bonus_confiance: '🦁',
};

export function getScaleEmoji(scaleId: string): string {
  return SCALE_EMOJI[scaleId] ?? '📋';
}
