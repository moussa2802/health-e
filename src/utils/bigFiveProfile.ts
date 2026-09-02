import type { ScaleResult } from '../types/assessment';

export type Band = 'low' | 'mid' | 'high';

export interface BigFiveDimension {
  key: string;
  label: string;
  hint: string;
  score: number;
  band: Band;
  description: string;
}

export interface BigFiveSummary {
  title: string;
  text: string;
}

const DIMENSION_META: Record<string, { label: string; hint: string }> = {
  openness:              { label: 'Ouverture',              hint: 'Curiosité, imagination' },
  conscientiousness:     { label: 'Conscienciosité',        hint: 'Organisation, fiabilité' },
  emotional_stability:   { label: 'Stabilité émotionnelle', hint: 'Gestion du stress' },
  agreeableness:         { label: 'Agréabilité',            hint: 'Rapport aux autres' },
  extraversion:          { label: 'Extraversion',           hint: 'Énergie sociale' },
};

const DESCRIPTIONS: Record<string, Record<Band, string>> = {
  openness: {
    low:  "Tu préfères le concret et le familier. Les cadres clairs te rassurent et tu avances mieux avec des repères stables.",
    mid:  "Tu apprécies la nouveauté quand elle a du sens, sans chercher le changement pour le changement.",
    high: "Tu es attiré par la nouveauté et les idées. Tu t'ennuies vite dans la routine et tu aimes explorer.",
  },
  conscientiousness: {
    low:  "Tu fonctionnes mieux dans la souplesse que dans la planification stricte. Les imprévus ne te déstabilisent pas.",
    mid:  "Tu sais t'organiser quand c'est nécessaire, tout en gardant une certaine flexibilité au quotidien.",
    high: "On peut compter sur toi. Tu finis ce que tu commences, même quand c'est ingrat.",
  },
  emotional_stability: {
    low:  "Tu ressens les choses intensément et certaines situations te touchent plus que la moyenne. C'est une sensibilité, pas une faiblesse.",
    mid:  "Tu encaisses correctement, mais certaines périodes te secouent plus que d'autres.",
    high: "Tu gardes ton calme même sous pression. Le stress glisse sur toi plus facilement que sur la plupart des gens.",
  },
  agreeableness: {
    low:  "Tu privilégies la franchise et l'indépendance. Tu n'hésites pas à défendre ton point de vue, même seul.",
    mid:  "Tu es attentif aux autres sans être complaisant — tu sais dire non quand il faut.",
    high: "Tu es naturellement tourné vers les autres. L'harmonie dans tes relations compte beaucoup pour toi.",
  },
  extraversion: {
    low:  "Tu te ressources dans le calme. Les grands groupes te fatiguent plus qu'ils ne te portent.",
    mid:  "Tu alternes facilement entre moments sociaux et temps pour toi, selon ton énergie du moment.",
    high: "Tu tires ton énergie des interactions. Les échanges et les rencontres te stimulent et te rechargent.",
  },
};

function getBand(score: number): Band {
  if (score <= 4) return 'low';
  if (score <= 7) return 'mid';
  return 'high';
}

function resolveSubscaleScores(result: ScaleResult): Record<string, number> | undefined {
  const scores = result.subscaleScores;
  if (!scores) return undefined;
  if (scores.emotional_stability !== undefined) return scores;
  if (scores.neuroticism !== undefined) {
    const patched = { ...scores, emotional_stability: 12 - scores.neuroticism };
    delete patched.neuroticism;
    return patched;
  }
  return scores;
}

export function getBigFiveProfile(result: ScaleResult): BigFiveDimension[] {
  const scores = resolveSubscaleScores(result);
  if (!scores) return [];

  const KEYS = ['openness', 'conscientiousness', 'emotional_stability', 'agreeableness', 'extraversion'];

  const dims: BigFiveDimension[] = KEYS
    .filter(key => scores[key] !== undefined)
    .map(key => {
      const score = scores[key];
      const band = getBand(score);
      const meta = DIMENSION_META[key];
      return {
        key,
        label: meta.label,
        hint: meta.hint,
        score,
        band,
        description: DESCRIPTIONS[key][band],
      };
    });

  dims.sort((a, b) => b.score - a.score);
  return dims;
}

const BAND_LABEL: Record<Band, string> = { high: 'Élevée', mid: 'Moyenne', low: 'Basse' };

const TITLE_ADJECTIVES: Record<string, Record<Band, string>> = {
  openness:              { high: 'curieux',        mid: 'ouvert',       low: 'pragmatique' },
  conscientiousness:     { high: 'fiable',         mid: 'organisé',     low: 'spontané' },
  emotional_stability:   { high: 'serein',         mid: 'stable',       low: 'sensible' },
  agreeableness:         { high: 'bienveillant',   mid: 'coopératif',   low: 'indépendant' },
  extraversion:          { high: 'sociable',       mid: 'adaptable',    low: 'réservé' },
};

export function getBigFiveSummary(dims: BigFiveDimension[]): BigFiveSummary {
  if (dims.length < 2) return { title: 'Ton profil', text: '' };

  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const top1 = sorted[0];
  const top2 = sorted[1];
  const lowest = sorted[sorted.length - 1];

  const adj1 = TITLE_ADJECTIVES[top1.key]?.[top1.band] ?? top1.label.toLowerCase();
  const adj2 = TITLE_ADJECTIVES[top2.key]?.[top2.band] ?? top2.label.toLowerCase();
  const adjLow = TITLE_ADJECTIVES[lowest.key]?.[lowest.band] ?? lowest.label.toLowerCase();

  const title = top1.key === lowest.key
    ? `${capitalize(adj1)} et ${adj2}.`
    : `${capitalize(adj1)} et ${adj2}, plutôt ${adjLow}.`;

  const text = buildSummaryText(top1, top2, lowest);

  return { title, text };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ARTICLE: Record<string, string> = {
  openness:              "l'ouverture",
  conscientiousness:     'la conscienciosité',
  emotional_stability:   'la stabilité émotionnelle',
  agreeableness:         "l'agréabilité",
  extraversion:          "l'extraversion",
};

function buildSummaryText(
  top1: BigFiveDimension,
  top2: BigFiveDimension,
  lowest: BigFiveDimension,
): string {
  const a1 = ARTICLE[top1.key] ?? top1.label.toLowerCase();
  const a2 = ARTICLE[top2.key] ?? top2.label.toLowerCase();

  if (top1.key === lowest.key) {
    return `Tes deux traits les plus marqués : ${a1} et ${a2}.`;
  }

  const qualifier = lowest.band === 'low' ? 'plus discrète' : 'dans la moyenne';

  return `Tes deux traits les plus marqués : ${a1} et ${a2}. Ton ${lowest.hint.toLowerCase()}, elle, est ${qualifier}.`;
}

export { BAND_LABEL, DIMENSION_META, resolveSubscaleScores };
