import type { ScaleResult } from '../types/assessment';
import { resolveSubscaleScores } from './bigFiveProfile';
import { resolveGender } from './gender';

export type TotemAnimal =
  | 'lion' | 'aigle' | 'cheval' | 'loup' | 'dauphin' | 'elephant'
  | 'cerf' | 'hibou' | 'panthere' | 'renard' | 'tortue' | 'ours';

export interface TotemSignature {
  animal: TotemAnimal;
  label: string;
  meaning: string;
  vector: number[];
}

export const TOTEM_REQUIRED_SCALES = [
  'big_five', 'rses', 'ecr_r', 'brs', 'gad7', 'pss10', 'phq9',
] as const;

/**
 * Recalibrage de novembre 2026 (voir docs/agents/rapports/2026-11-12-animal-recalibrage.md).
 *
 * Chaque personne est placée sur 7 axes **par rapport à la communauté** (écart à la moyenne, en écarts-types) :
 * extraversion, ouverture, agréabilité, conscienciosité, instabilité émotionnelle, sécurité d'attachement, résilience.
 * L'animal est celui dont le profil type est le plus proche. Les profils types sont construits à partir de ce que dit la
 * psychologie des traits (Big Five, attachement, résilience) et du symbole de chaque animal, puis calés sur les 732 premiers
 * profils complets pour qu'aucun animal ne soit rare ni envahissant (de 4 % à 14 % chacun).
 *
 * Avant : la résilience valait toujours 0 (le BRS est une moyenne de 1 à 5, le code la divisait par 6) et les profils types étaient
 * des valeurs absolues : le Cerf recevait 66 % des gens.
 */
export const TOTEM_ALGO_VERSION = 2;

/** Moyenne et écart-type de la communauté, axe par axe (valeurs 0 à 1) : extraversion, ouverture, agréabilité, conscienciosité, instabilité, attachement, résilience. */
export const COMMUNITY = {
  mean: [0.367, 0.677, 0.626, 0.536, 0.667, 0.487, 0.542],
  sd: [0.285, 0.212, 0.210, 0.226, 0.271, 0.159, 0.209],
};

// Instabilité, attachement et résilience sont liés entre eux (corrélations de -0,53 à +0,39) : on évite de les compter trois fois pleins.
const DIM_WEIGHTS = [1.0, 1.0, 1.0, 1.0, 0.7, 0.7, 0.7];

// vector = [extraversion, ouverture, agréabilité, conscienciosité, instabilité émotionnelle, sécurité d'attachement, résilience], en écarts à la communauté
const SIGNATURES: TotemSignature[] = [
  { animal: 'lion',     label: 'Lion',     meaning: 'Meneur confiant — tu inspires et rassures naturellement.',
    vector: [1.13, 0.28, -0.05, 0.44, -0.82, 0.90, 1.10] },
  { animal: 'aigle',    label: 'Aigle',    meaning: 'Visionnaire indépendant — tu vois loin et traces ta route.',
    vector: [0.00, 0.88, -0.70, 0.59, -0.27, -0.36, 0.54] },
  { animal: 'cheval',   label: 'Cheval',   meaning: 'Libre et fougueux — ton énergie et ta curiosité t\'emportent.',
    vector: [0.80, 0.73, -0.10, -0.94, 0.58, 0.06, 0.18] },
  { animal: 'loup',     label: 'Loup',     meaning: 'Fidèle relationnel — la loyauté et les liens sont ton moteur.',
    vector: [0.09, -0.05, 0.69, 0.30, 0.27, 0.24, -0.15] },
  { animal: 'dauphin',  label: 'Dauphin',  meaning: 'Sociable optimiste — ta joie et ton écoute rayonnent.',
    vector: [1.21, 0.14, 0.64, -0.14, -0.78, 0.85, 0.54] },
  { animal: 'elephant', label: 'Éléphant', meaning: 'Protecteur bienveillant — ta force est au service des autres.',
    vector: [-0.29, -0.08, 1.00, 0.78, -0.80, 0.77, 0.80] },
  { animal: 'cerf',     label: 'Cerf',     meaning: 'Sensible délicat — ta finesse perçoit ce que d\'autres ignorent.',
    vector: [-0.72, 0.75, 0.55, -0.33, 0.95, -0.31, -0.43] },
  { animal: 'hibou',    label: 'Hibou',    meaning: 'Introspectif profond — tu réfléchis en profondeur avant d\'agir.',
    vector: [-0.87, 0.94, 0.00, 0.47, 0.26, -0.07, 0.10] },
  { animal: 'panthere', label: 'Panthère', meaning: 'Maître de soi — tu avances avec calme et assurance.',
    vector: [-0.50, -0.12, -0.45, 0.90, -0.90, 0.30, 0.94] },
  { animal: 'renard',   label: 'Renard',   meaning: 'Malin stratège — tu t\'adaptes et trouves toujours un chemin.',
    vector: [0.20, 0.80, -0.40, 0.32, -0.10, -0.20, 0.40] },
  { animal: 'tortue',   label: 'Tortue',   meaning: 'Sage résilient — ta constance et ta paix intérieure impressionnent.',
    vector: [-0.42, 0.27, 0.30, 0.83, -0.70, 0.20, 1.08] },
  { animal: 'ours',     label: 'Ours',     meaning: 'Protecteur solitaire — ta force tranquille rassure ceux que tu aimes.',
    vector: [-1.26, -0.77, 0.10, 0.12, -0.51, 0.14, 0.50] },
];

export function getTotemSignature(animal: TotemAnimal): TotemSignature {
  return SIGNATURES.find(s => s.animal === animal)!;
}

export function getTotemProgress(profileResults: Record<string, ScaleResult>): {
  completed: number;
  total: number;
  missing: string[];
} {
  const missing = TOTEM_REQUIRED_SCALES.filter(id => !profileResults[id]);
  return {
    completed: TOTEM_REQUIRED_SCALES.length - missing.length,
    total: TOTEM_REQUIRED_SCALES.length,
    missing: [...missing],
  };
}

function normalizeProfile(profileResults: Record<string, ScaleResult>): number[] | null {
  const bigFive = profileResults['big_five'];
  const ecr = profileResults['ecr_r'];
  const brs = profileResults['brs'];

  if (!bigFive?.subscaleScores || !ecr?.subscaleScores) return null;

  const resolved = resolveSubscaleScores(bigFive) ?? bigFive.subscaleScores;
  const ext = (resolved['extraversion'] ?? 6);
  const opn = (resolved['openness'] ?? 6);
  const agr = (resolved['agreeableness'] ?? 6);
  const con = (resolved['conscientiousness'] ?? 6);
  const ems = (resolved['emotional_stability'] ?? 6);

  const nExtraversion = clamp((ext - 2) / 8);
  const nOpenness     = clamp((opn - 2) / 8);
  const nAgreeableness = clamp((agr - 2) / 8);
  const nConscientiousness = clamp((con - 2) / 8);
  const nNeuroticism  = clamp(1 - (ems - 2) / 8);

  const anxMean = ecr.subscaleScores['anxiety'] ?? 3.5;
  const avoMean = ecr.subscaleScores['avoidance'] ?? 3.5;
  const nAttachment = clamp(1 - ((anxMean + avoMean) / 2 - 1) / 6);

  // Le BRS est enregistré en moyenne (1 à 5). Un total de 6 à 30 (anciens enregistrements éventuels) est ramené à la moyenne.
  const brsRaw = brs ? brs.totalScore : 3;
  const brsMean = brsRaw > 5 ? brsRaw / 6 : brsRaw;
  const nResilience = clamp((brsMean - 1) / 4);

  const raw = [
    nExtraversion,      // dim 0
    nOpenness,          // dim 1
    nAgreeableness,     // dim 2
    nConscientiousness, // dim 3
    nNeuroticism,       // dim 4
    nAttachment,        // dim 5
    nResilience,        // dim 6
  ];
  // Position par rapport à la communauté
  return raw.map((v, i) => (v - COMMUNITY.mean[i]) / COMMUNITY.sd[i]);
}

/** Le profil d'une personne sur les 7 axes, en écarts à la communauté (null si les tests ne sont pas faits). Sert aux tests. */
export function totemVector(profileResults: Record<string, ScaleResult>): number[] | null {
  if (getTotemProgress(profileResults).missing.length > 0) return null;
  return normalizeProfile(profileResults);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function weightedDistance(a: number[], b: number[], w: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += w[i] * d * d;
  }
  return Math.sqrt(sum);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Forces & zones à grandir
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TotemDomain {
  scaleId: string;
  label: string;
  forceLabel: string;
  forceDescription: string;
  growLabel: string;
  growDescription: string;
}

const TOTEM_DOMAINS: TotemDomain[] = [
  {
    scaleId: 'gad7',
    label: 'Anxiété',
    forceLabel: 'Sérénité intérieure',
    forceDescription: 'Tu gardes ton calme face aux situations stressantes — une vraie ancre.',
    growLabel: 'Ton calme intérieur',
    growDescription: 'L\'anxiété prend de la place, mais elle peut s\'apprivoiser avec les bons outils.',
  },
  {
    scaleId: 'phq9',
    label: 'Humeur',
    forceLabel: 'Moral solide',
    forceDescription: 'Ton énergie et ta motivation sont au rendez-vous — c\'est un vrai moteur.',
    growLabel: 'Ta lumière intérieure',
    growDescription: 'Ton moral traverse une zone d\'ombre — et c\'est un terrain qu\'on peut éclairer.',
  },
  {
    scaleId: 'pss10',
    label: 'Stress',
    forceLabel: 'Gestion du stress',
    forceDescription: 'Tu sais gérer la pression sans te laisser submerger — belle maîtrise.',
    growLabel: 'Ton rapport à la pression',
    growDescription: 'Le stress pèse sur tes épaules — apprendre à le déposer est un chemin possible.',
  },
  {
    scaleId: 'rses',
    label: 'Estime de soi',
    forceLabel: 'Estime solide',
    forceDescription: 'Tu portes un regard bienveillant sur toi-même — c\'est une fondation précieuse.',
    growLabel: 'Ton regard sur toi',
    growDescription: 'Tu mérites un regard plus doux sur toi-même — et ça se construit, pas à pas.',
  },
  {
    scaleId: 'brs',
    label: 'Résilience',
    forceLabel: 'Capacité à rebondir',
    forceDescription: 'Tu te relèves après les épreuves — ton ressort intérieur est solide.',
    growLabel: 'Ta capacité à rebondir',
    growDescription: 'Les coups durs te touchent fort — renforcer ta résilience est à ta portée.',
  },
  {
    scaleId: 'ecr_r',
    label: 'Attachement',
    forceLabel: 'Liens sécures',
    forceDescription: 'Tu es à l\'aise dans tes relations, avec confiance et proximité — un vrai atout.',
    growLabel: 'Tes liens affectifs',
    growDescription: 'Tes relations peuvent devenir un espace plus serein — avec le bon accompagnement.',
  },
  {
    scaleId: 'big_five',
    label: 'Personnalité',
    forceLabel: 'Profil ouvert et stable',
    forceDescription: 'Tu es {{ouvert, adaptable et équilibré|ouverte, adaptable et équilibrée}} — une personnalité riche.',
    growLabel: 'Ton équilibre intérieur',
    growDescription: 'Ta sensibilité est une richesse — apprendre à la canaliser peut tout changer.',
  },
];

export function getTotemDomain(scaleId: string): TotemDomain | undefined {
  return TOTEM_DOMAINS.find(d => d.scaleId === scaleId);
}

type DomainClassification = 'force' | 'grow' | 'neutral';

const FORCE_SEVERITIES = new Set(['positive', 'none', 'minimal']);
const GROW_SEVERITIES = new Set(['moderate', 'severe', 'alert']);

export function classifyDomain(result: ScaleResult): DomainClassification {
  const sev = result.interpretation.severity;
  if (FORCE_SEVERITIES.has(sev)) return 'force';
  if (GROW_SEVERITIES.has(sev)) return 'grow';
  return 'neutral';
}

export interface ClassifiedDomain {
  domain: TotemDomain;
  classification: DomainClassification;
  result: ScaleResult;
}

export function classifyTotemDomains(
  profileResults: Record<string, ScaleResult>,
): { forces: ClassifiedDomain[]; grows: ClassifiedDomain[] } {
  const forces: ClassifiedDomain[] = [];
  const grows: ClassifiedDomain[] = [];

  for (const domain of TOTEM_DOMAINS) {
    const result = profileResults[domain.scaleId];
    if (!result) continue;
    const cls = classifyDomain(result);
    const item = { domain, classification: cls, result };
    if (cls === 'force') forces.push(item);
    else if (cls === 'grow') grows.push(item);
  }

  return { forces, grows };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dimension gauges
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DimensionGauge {
  scaleId: string;
  label: string;
  fillPercent: number;
  classification: DomainClassification;
  forceDescription: string;
  growDescription: string;
}

interface GaugeDef {
  scaleId: string;
  label: string;
  inverted: boolean;
  scoreRange: [number, number];
  subscaleKey?: string;
}

const GAUGE_DEFS: GaugeDef[] = [
  { scaleId: 'gad7',  label: 'Sérénité',            inverted: true,  scoreRange: [0, 21] },
  { scaleId: 'phq9',  label: 'Moral',               inverted: true,  scoreRange: [0, 27] },
  { scaleId: 'pss10', label: 'Calme',               inverted: true,  scoreRange: [0, 40] },
  { scaleId: 'rses',  label: 'Estime de soi',       inverted: false, scoreRange: [10, 40] },
  { scaleId: 'brs',   label: 'Résilience',          inverted: false, scoreRange: [1, 5] },
  { scaleId: 'ecr_r', label: 'Sécurité affective',  inverted: true,  scoreRange: [1, 7], subscaleKey: 'ecr_mean' },
  { scaleId: 'big_five', label: 'Stabilité émotionnelle', inverted: false, scoreRange: [2, 10], subscaleKey: 'emotional_stability' },
];

function computeGaugeFill(def: GaugeDef, result: ScaleResult): number {
  let raw: number;
  if (def.subscaleKey === 'ecr_mean') {
    const anx = result.subscaleScores?.['anxiety'] ?? 3.5;
    const avo = result.subscaleScores?.['avoidance'] ?? 3.5;
    raw = (anx + avo) / 2;
  } else if (def.subscaleKey) {
    const scores = def.scaleId === 'big_five' ? resolveSubscaleScores(result) : result.subscaleScores;
    raw = scores?.[def.subscaleKey] ?? result.totalScore;
  } else {
    raw = result.totalScore;
  }

  const [min, max] = def.scoreRange;
  const normalized = Math.max(0, Math.min(1, (raw - min) / (max - min)));
  return Math.round((def.inverted ? 1 - normalized : normalized) * 100);
}

export function computeDimensionGauges(profileResults: Record<string, ScaleResult>): DimensionGauge[] {
  const gauges: DimensionGauge[] = [];

  for (const def of GAUGE_DEFS) {
    const result = profileResults[def.scaleId];
    if (!result) continue;

    const domain = TOTEM_DOMAINS.find(d => d.scaleId === def.scaleId);
    if (!domain) continue;

    const fillPercent = computeGaugeFill(def, result);
    const cls = classifyDomain(result);

    gauges.push({
      scaleId: def.scaleId,
      label: def.label,
      fillPercent,
      classification: cls,
      forceDescription: domain.forceDescription,
      growDescription: domain.growDescription,
    });
  }

  return gauges;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Radiance level (état de rayonnement)
   ═══════════════════════════════════════════════════════════════════════════ */

export type RadianceLevel = 'fragile' | 'intermediate' | 'blooming' | 'fully_blooming';

export interface RadianceState {
  level: RadianceLevel;
  forceCount: number;
  growCount: number;
  totalClassified: number;
}

export function getRadianceLevel(forces: ClassifiedDomain[], grows: ClassifiedDomain[]): RadianceState {
  const forceCount = forces.length;
  const growCount = grows.length;
  const totalClassified = forceCount + growCount;

  let level: RadianceLevel;
  if (forceCount === 7) {
    level = 'fully_blooming';
  } else if (forceCount >= 5 && growCount === 0) {
    level = 'blooming';
  } else if (growCount >= 4 || forceCount <= 1) {
    level = 'fragile';
  } else {
    level = 'intermediate';
  }

  return { level, forceCount, growCount, totalClassified };
}

export const RADIANCE_COLORS: Record<RadianceLevel, { primary: string; secondary: string; glow: string }> = {
  fragile:        { primary: 'rgba(200, 230, 225, 0.30)', secondary: 'rgba(255, 248, 235, 0.15)', glow: 'rgba(200, 230, 225, 0.18)' },
  intermediate:   { primary: 'rgba(212, 190, 120, 0.45)', secondary: 'rgba(180, 215, 210, 0.25)', glow: 'rgba(200, 195, 150, 0.30)' },
  blooming:       { primary: 'rgba(212, 173, 90, 0.55)',  secondary: 'rgba(255, 220, 120, 0.30)', glow: 'rgba(212, 173, 90, 0.40)' },
  fully_blooming: { primary: 'rgba(230, 195, 80, 0.60)',  secondary: 'rgba(255, 230, 150, 0.40)', glow: 'rgba(255, 215, 100, 0.50)' },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Dr Lô message — composed from fragments
   ═══════════════════════════════════════════════════════════════════════════ */

const ANIMAL_HOOKS: Record<TotemAnimal, string> = {
  lion: 'Ton animal intérieur le Lion rayonne par sa confiance et son leadership.',
  aigle: 'Ton animal intérieur l\'Aigle brille par sa vision et son indépendance.',
  cheval: 'Ton animal intérieur le Cheval vibre par son énergie et sa liberté.',
  loup: 'Ton animal intérieur le Loup rayonne par sa loyauté et son intuition.',
  dauphin: 'Ton animal intérieur le Dauphin illumine par sa joie et son empathie.',
  elephant: 'Ton animal intérieur l\'Éléphant impressionne par sa bienveillance et sa solidité.',
  cerf: 'Ton animal intérieur le Cerf touche par sa sensibilité et sa finesse.',
  hibou: 'Ton animal intérieur le Hibou inspire par sa profondeur et sa sagesse.',
  panthere: 'Ton animal intérieur la Panthère force le respect par sa maîtrise et son calme.',
  renard: 'Ton animal intérieur le Renard séduit par son intelligence et son adaptabilité.',
  tortue: 'Ton animal intérieur la Tortue rassure par sa constance et sa résilience.',
  ours: 'Ton animal intérieur l\'Ours protège par sa force tranquille et sa solidité.',
};

export function composeDrLoMessage(
  animal: TotemAnimal,
  forces: ClassifiedDomain[],
  grows: ClassifiedDomain[],
  radiance?: RadianceLevel,
): string {
  if (radiance === 'fully_blooming') {
    return `${ANIMAL_HOOKS[animal]} Et quel chemin parcouru ! Tous tes domaines rayonnent — ton animal intérieur brille de toute sa lumière. Tu as atteint un bel équilibre, et c'est un vrai cadeau que tu te fais. Continue à prendre soin de toi, je suis là.`;
  }

  const parts: string[] = [ANIMAL_HOOKS[animal]];

  if (forces.length > 0) {
    const forceNames = forces.map(f => f.domain.forceLabel.toLowerCase());
    if (forceNames.length === 1) {
      parts.push(`Côté forces, ${forceNames[0]} est un vrai pilier.`);
    } else {
      const last = forceNames.pop()!;
      parts.push(`Côté forces, ${forceNames.join(', ')} et ${last} sont de vrais piliers.`);
    }
  }

  if (grows.length > 0) {
    const growNames = grows.map(g => g.domain.growLabel.toLowerCase());
    if (growNames.length === 1) {
      parts.push(`${capitalize(growNames[0])} est un terrain qu'on peut faire grandir ensemble.`);
    } else {
      const last = growNames.pop()!;
      parts.push(`${capitalize(growNames.join(', '))} et ${last} sont des terrains qu'on peut faire grandir ensemble.`);
    }
  }

  parts.push('Je suis là pour t\'accompagner.');
  return parts.join(' ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Extended description per animal (for profile page)
   ═══════════════════════════════════════════════════════════════════════════ */

const ANIMAL_DESCRIPTIONS: Record<TotemAnimal, string> = {
  lion: 'Tu es {{guidé|guidée}} par la confiance et le courage. Tu inspires naturellement ceux qui t\'entourent, et ta présence rassure. Quand tu crois en quelque chose, tu avances — et les autres suivent.',
  aigle: 'Tu vois plus loin que la plupart des gens. Ton esprit indépendant et ta capacité à prendre de la hauteur te permettent de tracer ta route avec clarté, même quand le chemin est flou pour les autres.',
  cheval: 'Tu es {{porté|portée}} par une énergie vive et une curiosité insatiable. Ta soif de liberté et ton ouverture au monde font de toi quelqu\'un d\'entraînant — tu vis pleinement et ça se sent.',
  loup: 'Tu es {{guidé|guidée}} par la loyauté et l\'intuition. Tu ressens profondément les liens qui t\'unissent aux autres, et tu protèges ceux que tu aimes avec une fidélité rare.',
  dauphin: 'Tu illumines les espaces que tu traverses. Ta joie communicative et ton empathie naturelle créent des ponts entre les gens — tu sais écouter, rassurer, et donner le sourire.',
  elephant: 'Tu portes une force tranquille au service des autres. Ta bienveillance, ta fiabilité et ton sens des responsabilités font de toi un pilier — quelqu\'un sur qui on peut compter, toujours.',
  cerf: 'Tu perçois ce que d\'autres ignorent. Ta sensibilité est un don qui te connecte profondément au monde — tu ressens les atmosphères, les émotions, les non-dits avec une finesse rare.',
  hibou: 'Tu réfléchis avant d\'agir, et ta profondeur d\'analyse est un atout précieux. Ton monde intérieur est riche, et ta sagesse vient de cette capacité à observer et comprendre en silence.',
  panthere: 'Tu avances avec une maîtrise impressionnante. Là où d\'autres s\'agitent, tu restes calme et {{centré|centrée}}. Ta force n\'est pas dans le bruit — elle est dans la précision et l\'assurance de chacun de tes pas.',
  renard: 'Tu t\'adaptes à tout. Ton intelligence vive et ton sens stratégique te permettent de naviguer les situations complexes avec une aisance naturelle — tu trouves toujours un chemin.',
  tortue: 'Ta paix intérieure est une force rare. Là où le monde s\'agite, tu avances à ton rythme — {{constant, résilient, ancré|constante, résiliente, ancrée}}. Ta sagesse vient de cette capacité à rester solide quoi qu\'il arrive.',
  ours: 'Ta force est tranquille et profonde. Tu n\'as pas besoin de beaucoup de monde — mais ceux que tu laisses entrer dans ton cercle trouvent en toi une protection et une solidité inébranlables.',
};

export function getAnimalDescription(animal: TotemAnimal, genre: 'homme' | 'femme' = 'homme'): string {
  return resolveGender(ANIMAL_DESCRIPTIONS[animal], genre);
}

/* ═══════════════════════════════════════════════════════════════════════════
   computeTotem
   ═══════════════════════════════════════════════════════════════════════════ */

export function computeTotem(profileResults: Record<string, ScaleResult>): TotemAnimal | null {
  const progress = getTotemProgress(profileResults);
  if (progress.missing.length > 0) return null;

  const profile = normalizeProfile(profileResults);
  if (!profile) return null;

  const scored = SIGNATURES.map(sig => ({
    animal: sig.animal,
    distance: weightedDistance(profile, sig.vector, DIM_WEIGHTS),
  }));

  // Pas de départage spécial : la répartition et la cohérence ont été validées telles quelles sur les profils réels
  scored.sort((a, b) => a.distance - b.distance);

  return scored[0].animal;
}

/**
 * Après de nouveaux tests : l'animal ne change que si le nouveau est nettement plus proche que l'actuel
 * (au moins 10 % de distance en moins). Évite qu'une personne près d'une frontière change d'animal à chaque retest.
 */
export function computeTotemKeeping(profileResults: Record<string, ScaleResult>, current: string | null | undefined): TotemAnimal | null {
  const next = computeTotem(profileResults);
  if (!next || !current || next === current) return next;
  const cur = SIGNATURES.find(x => x.animal === current);
  const profile = normalizeProfile(profileResults);
  if (!cur || !profile) return next;
  const nxt = SIGNATURES.find(x => x.animal === next)!;
  const dCur = weightedDistance(profile, cur.vector, DIM_WEIGHTS);
  const dNxt = weightedDistance(profile, nxt.vector, DIM_WEIGHTS);
  return dNxt < dCur * 0.9 ? next : (current as TotemAnimal);
}

/** Les totems qui te ressemblent le plus (même tempérament sur beaucoup de plans). */
export function nearestTotems(animal: TotemAnimal, n = 2): TotemAnimal[] {
  const me = getTotemSignature(animal);
  return SIGNATURES
    .filter(s => s.animal !== animal)
    .map(s => ({ a: s.animal, d: weightedDistance(me.vector, s.vector, DIM_WEIGHTS) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, n)
    .map(x => x.a);
}

/* ═══════════════════════════════════════════════════════════════════════════
   En amour : avec quels totems ça s'accorde le mieux (repère, pas une vérité)
   Vecteur : [extraversion, ouverture, agréabilité, conscience, névrosisme, sécurité d'attachement, résilience]
   Ce qui compte le plus dans un couple : valeurs et façon de vivre proches (ouverture, douceur,
   sérieux), sécurité affective, stabilité émotionnelle ; une énergie sociale pas trop éloignée.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LoveMatch { animal: TotemAnimal; score: number; reasons: string[] }

function loveScore(a: number[], b: number[]): number {
  const sim = 1 - (Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3])) / 3;
  const secure = (a[5] + b[5]) / 2;
  const stable = 1 - (a[4] + b[4]) / 2;
  const warm = (a[2] + b[2]) / 2;
  const energy = 1 - Math.abs(a[0] - b[0]);
  return 0.35 * sim + 0.25 * secure + 0.2 * stable + 0.1 * warm + 0.1 * energy;
}

/** Raisons d'un bon accord, chacune avec deux façons de le dire (pour ne pas répéter la même phrase sur les deux totems). */
function goodReasons(a: number[], b: number[]): [string, string][] {
  const r: [string, string][] = [];
  if (Math.abs(a[2] - b[2]) <= 0.15 && b[2] >= 0.55) r.push(['la même douceur avec les autres', 'vous prenez soin l\'un de l\'autre']);
  if (Math.abs(a[3] - b[3]) <= 0.15) r.push(['le même sérieux dans les engagements', 'quand vous promettez, vous tenez parole']);
  if (Math.abs(a[1] - b[1]) <= 0.15) r.push(['la même curiosité pour la vie', 'vous aimez découvrir des choses ensemble']);
  if (b[5] >= 0.75) r.push(['sa sécurité affective t\'apaise', 'à ses côtés, tu te sens en sécurité']);
  if (b[4] <= 0.2 && a[4] >= 0.4) r.push(['son calme équilibre tes émotions', 'quand tu t\'agites, sa sérénité te pose']);
  if (Math.abs(a[0] - b[0]) >= 0.4) r.push(['l\'un ouvre au monde, l\'autre ramène au calme', 'vous vous équilibrez : sortir et se poser']);
  if (a[0] >= 0.7 && b[0] >= 0.7) r.push(['la même énergie, le même goût de l\'action', 'à deux, vous ne tenez pas en place']);
  if (Math.abs(a[0] - b[0]) <= 0.15 && a[0] < 0.7) r.push(['le même besoin de calme et d\'intimité', 'vous aimez les moments simples, juste à deux']);
  if (!r.length) r.push(['vos forces se complètent', 'ce qui manque à l\'un, l\'autre l\'apporte']);
  return r;
}

/** Deux raisons au plus ; pour le 2e totem, une phrase déjà dite au 1er passe à sa variante. */
function pickReasons(list: [string, string][], used: Set<string>): string[] {
  return list.slice(0, 2).map(([x, y]) => (used.has(x) ? y : x));
}

function effortReasons(a: number[], b: number[]): string[] {
  const r: string[] = [];
  if (a[4] + b[4] >= 0.9) r.push('vos émotions peuvent s\'emballer en même temps');
  if (Math.abs(a[0] - b[0]) >= 0.5) r.push('l\'un veut sortir quand l\'autre veut rester');
  if (Math.abs(a[3] - b[3]) >= 0.35) r.push('vos rythmes de vie sont très différents');
  if (Math.abs(a[2] - b[2]) >= 0.35) r.push('vous ne gérez pas les conflits de la même façon');
  if ((a[5] + b[5]) / 2 <= 0.55) r.push('chacun peut se protéger en prenant de la distance');
  if (!r.length) r.push('vous voyez souvent les choses différemment');
  return r.slice(0, 2);
}

/** Les 2 totems avec qui l'amour coule le plus, et celui qui demande le plus d'efforts. */
export function loveMatches(animal: TotemAnimal): { best: LoveMatch[]; effort: LoveMatch } {
  const me = getTotemSignature(animal).vector;
  // Un totem « facile » (très sécure, très calme) plairait à tout le monde : on corrige par sa
  // moyenne, pour garder ce qui est propre au DUO.
  const avgOf = (v: number[]) => {
    const others = SIGNATURES.filter(x => x.vector !== v);
    return others.reduce((n, x) => n + loveScore(x.vector, v), 0) / others.length;
  };
  const all = SIGNATURES.filter(s => s.animal !== animal)
    .map(s => ({ animal: s.animal, score: loveScore(me, s.vector) - 0.7 * avgOf(s.vector), v: s.vector }))
    .sort((x, y) => y.score - x.score);
  const used = new Set<string>();
  const best = all.slice(0, 2).map(x => {
    const reasons = pickReasons(goodReasons(me, x.v), used);
    reasons.forEach(t => used.add(t));
    return { animal: x.animal, score: x.score, reasons };
  });
  const low = all[all.length - 1];
  return { best, effort: { animal: low.animal, score: low.score, reasons: effortReasons(me, low.v) } };
}

/** Les bons articles : « la Panthère », « de l'Aigle », « ta tortue », « une Panthère ». */
export function totemWords(animal: TotemAnimal): { le: string; du: string; ton: string; un: string } {
  const label = getTotemSignature(animal).label;
  const fem = animal === 'tortue' || animal === 'panthere';
  const vowel = /^[AEÉIOU]/.test(label);
  const low = label.toLowerCase();
  return {
    le: fem ? `la ${label}` : vowel ? `l'${label}` : `le ${label}`,
    du: fem ? `de la ${label}` : vowel ? `de l'${label}` : `du ${label}`,
    ton: fem ? `ta ${low}` : `ton ${low}`,
    un: fem ? `une ${label}` : `un ${label}`,
  };
}

/** La phrase-signature accordée au genre (« Maîtresse de soi », « Protectrice bienveillante »…). */
const MEANING_G: Record<TotemAnimal, string> = {
  lion: '{{Meneur confiant|Meneuse confiante}} — tu inspires et rassures naturellement.',
  aigle: 'Visionnaire {{indépendant|indépendante}} — tu vois loin et traces ta route.',
  cheval: 'Libre et {{fougueux|fougueuse}} — ton énergie et ta curiosité t\'emportent.',
  loup: '{{Fidèle relationnel|Fidèle relationnelle}} — la loyauté et les liens sont ton moteur.',
  dauphin: 'Sociable optimiste — ta joie et ton écoute rayonnent.',
  elephant: '{{Protecteur bienveillant|Protectrice bienveillante}} — ta force est au service des autres.',
  cerf: 'Sensible {{délicat|délicate}} — ta finesse perçoit ce que d\'autres ignorent.',
  hibou: '{{Introspectif profond|Introspective profonde}} — tu réfléchis en profondeur avant d\'agir.',
  panthere: '{{Maître|Maîtresse}} de soi — tu avances avec calme et assurance.',
  renard: '{{Malin|Maligne}} stratège — tu t\'adaptes et trouves toujours un chemin.',
  tortue: 'Sage {{résilient|résiliente}} — ta constance et ta paix intérieure impressionnent.',
  ours: '{{Protecteur|Protectrice}} solitaire — ta force tranquille rassure ceux que tu aimes.',
};

export function totemMeaning(animal: TotemAnimal, genre: 'homme' | 'femme' = 'homme'): string {
  return resolveGender(MEANING_G[animal], genre);
}
