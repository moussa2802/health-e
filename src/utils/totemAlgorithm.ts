import type { ScaleResult } from '../types/assessment';
import { resolveSubscaleScores } from './bigFiveProfile';

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

const DIM_WEIGHTS = [1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.6];

const SIGNATURES: TotemSignature[] = [
  { animal: 'lion',     label: 'Lion',     meaning: 'Meneur confiant — tu inspires et rassures naturellement.',
    vector: [0.85, 0.6, 0.5, 0.65, 0.2, 0.8, 0.8] },
  { animal: 'aigle',    label: 'Aigle',    meaning: 'Visionnaire indépendant — tu vois loin et traces ta route.',
    vector: [0.65, 0.9, 0.3, 0.5, 0.35, 0.5, 0.7] },
  { animal: 'cheval',   label: 'Cheval',   meaning: 'Libre et fougueux — ton énergie et ta curiosité t\'emportent.',
    vector: [0.85, 0.8, 0.35, 0.4, 0.45, 0.5, 0.65] },
  { animal: 'loup',     label: 'Loup',     meaning: 'Fidèle relationnel — la loyauté et les liens sont ton moteur.',
    vector: [0.55, 0.5, 0.85, 0.6, 0.4, 0.75, 0.6] },
  { animal: 'dauphin',  label: 'Dauphin',  meaning: 'Sociable optimiste — ta joie et ton écoute rayonnent.',
    vector: [0.9, 0.65, 0.85, 0.5, 0.15, 0.7, 0.75] },
  { animal: 'elephant', label: 'Éléphant', meaning: 'Protecteur bienveillant — ta force est au service des autres.',
    vector: [0.5, 0.55, 0.85, 0.8, 0.2, 0.85, 0.8] },
  { animal: 'cerf',     label: 'Cerf',     meaning: 'Sensible délicat — ta finesse perçoit ce que d\'autres ignorent.',
    vector: [0.3, 0.8, 0.8, 0.5, 0.65, 0.55, 0.45] },
  { animal: 'hibou',    label: 'Hibou',    meaning: 'Introspectif profond — tu réfléchis en profondeur avant d\'agir.',
    vector: [0.25, 0.85, 0.55, 0.8, 0.45, 0.5, 0.55] },
  { animal: 'panthere', label: 'Panthère', meaning: 'Maître de soi — tu avances avec calme et assurance.',
    vector: [0.3, 0.5, 0.45, 0.8, 0.15, 0.55, 0.75] },
  { animal: 'renard',   label: 'Renard',   meaning: 'Malin stratège — tu t\'adaptes et trouves toujours un chemin.',
    vector: [0.55, 0.8, 0.55, 0.75, 0.35, 0.55, 0.65] },
  { animal: 'tortue',   label: 'Tortue',   meaning: 'Sage résilient — ta constance et ta paix intérieure impressionnent.',
    vector: [0.4, 0.5, 0.6, 0.8, 0.15, 0.65, 0.9] },
  { animal: 'ours',     label: 'Ours',     meaning: 'Protecteur solitaire — ta force tranquille rassure ceux que tu aimes.',
    vector: [0.15, 0.45, 0.5, 0.55, 0.2, 0.45, 0.75] },
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

  const brsMean = brs ? brs.totalScore / 6 : 3;
  const nResilience = clamp((brsMean - 1) / 4);

  return [
    nExtraversion,      // dim 0
    nOpenness,          // dim 1
    nAgreeableness,     // dim 2
    nConscientiousness, // dim 3
    nNeuroticism,       // dim 4
    nAttachment,        // dim 5
    nResilience,        // dim 6
  ];
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
    forceDescription: 'Tu es ouvert, adaptable et équilibré — une personnalité riche.',
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
  lion: 'Ton totem le Lion rayonne par sa confiance et son leadership.',
  aigle: 'Ton totem l\'Aigle brille par sa vision et son indépendance.',
  cheval: 'Ton totem le Cheval vibre par son énergie et sa liberté.',
  loup: 'Ton totem le Loup rayonne par sa loyauté et son intuition.',
  dauphin: 'Ton totem le Dauphin illumine par sa joie et son empathie.',
  elephant: 'Ton totem l\'Éléphant impressionne par sa bienveillance et sa solidité.',
  cerf: 'Ton totem le Cerf touche par sa sensibilité et sa finesse.',
  hibou: 'Ton totem le Hibou inspire par sa profondeur et sa sagesse.',
  panthere: 'Ton totem la Panthère force le respect par sa maîtrise et son calme.',
  renard: 'Ton totem le Renard séduit par son intelligence et son adaptabilité.',
  tortue: 'Ton totem la Tortue rassure par sa constance et sa résilience.',
  ours: 'Ton totem l\'Ours protège par sa force tranquille et sa solidité.',
};

export function composeDrLoMessage(
  animal: TotemAnimal,
  forces: ClassifiedDomain[],
  grows: ClassifiedDomain[],
  radiance?: RadianceLevel,
): string {
  if (radiance === 'fully_blooming') {
    return `${ANIMAL_HOOKS[animal]} Et quel chemin parcouru ! Tous tes domaines rayonnent — ton totem brille de toute sa lumière. Tu as atteint un bel équilibre, et c'est un vrai cadeau que tu te fais. Continue à prendre soin de toi, je suis là.`;
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
  lion: 'Tu es guidé par la confiance et le courage. Tu inspires naturellement ceux qui t\'entourent, et ta présence rassure. Quand tu crois en quelque chose, tu avances — et les autres suivent.',
  aigle: 'Tu vois plus loin que la plupart des gens. Ton esprit indépendant et ta capacité à prendre de la hauteur te permettent de tracer ta route avec clarté, même quand le chemin est flou pour les autres.',
  cheval: 'Tu es porté par une énergie vive et une curiosité insatiable. Ta soif de liberté et ton ouverture au monde font de toi quelqu\'un d\'entraînant — tu vis pleinement et ça se sent.',
  loup: 'Tu es guidé par la loyauté et l\'intuition. Tu ressens profondément les liens qui t\'unissent aux autres, et tu protèges ceux que tu aimes avec une fidélité rare.',
  dauphin: 'Tu illumines les espaces que tu traverses. Ta joie communicative et ton empathie naturelle créent des ponts entre les gens — tu sais écouter, rassurer, et donner le sourire.',
  elephant: 'Tu portes une force tranquille au service des autres. Ta bienveillance, ta fiabilité et ton sens des responsabilités font de toi un pilier — quelqu\'un sur qui on peut compter, toujours.',
  cerf: 'Tu perçois ce que d\'autres ignorent. Ta sensibilité est un don qui te connecte profondément au monde — tu ressens les atmosphères, les émotions, les non-dits avec une finesse rare.',
  hibou: 'Tu réfléchis avant d\'agir, et ta profondeur d\'analyse est un atout précieux. Ton monde intérieur est riche, et ta sagesse vient de cette capacité à observer et comprendre en silence.',
  panthere: 'Tu avances avec une maîtrise impressionnante. Là où d\'autres s\'agitent, tu restes calme et centré. Ta force n\'est pas dans le bruit — elle est dans la précision et l\'assurance de chacun de tes pas.',
  renard: 'Tu t\'adaptes à tout. Ton intelligence vive et ton sens stratégique te permettent de naviguer les situations complexes avec une aisance naturelle — tu trouves toujours un chemin.',
  tortue: 'Ta paix intérieure est une force rare. Là où le monde s\'agite, tu avances à ton rythme — constant, résilient, ancré. Ta sagesse vient de cette capacité à rester solide quoi qu\'il arrive.',
  ours: 'Ta force est tranquille et profonde. Tu n\'as pas besoin de beaucoup de monde — mais ceux que tu laisses entrer dans ton cercle trouvent en toi une protection et une solidité inébranlables.',
};

export function getAnimalDescription(animal: TotemAnimal): string {
  return ANIMAL_DESCRIPTIONS[animal];
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

  scored.sort((a, b) => a.distance - b.distance);

  if (scored.length >= 2) {
    const gap = (scored[1].distance - scored[0].distance) / scored[0].distance;
    if (gap < 0.05) {
      const tieWeights = [...DIM_WEIGHTS];
      tieWeights[1] *= 2; // openness
      tieWeights[5] *= 2; // attachment

      const a = SIGNATURES.find(s => s.animal === scored[0].animal)!;
      const b = SIGNATURES.find(s => s.animal === scored[1].animal)!;
      const dA = weightedDistance(profile, a.vector, tieWeights);
      const dB = weightedDistance(profile, b.vector, tieWeights);
      return dA <= dB ? a.animal : b.animal;
    }
  }

  return scored[0].animal;
}
