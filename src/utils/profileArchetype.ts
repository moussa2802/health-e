import { getScaleById } from '../data/scales';
import { getScaleMeta } from './scaleMeta';
import type { ScaleResult } from '../types/assessment';
import { getBigFiveProfile, BAND_LABEL, type Band } from './bigFiveProfile';

export interface KeyDimension {
  scaleId: string;
  name: string;
  label: string;
  severity: string;
  pct: number;
  color: string;
}

export interface Archetype {
  title: string;
  subtitle: string;
  traits: string[];
}

const SEVERITY_COLORS: Record<string, string> = {
  positive: '#7FA98F',
  none: '#7FA98F',
  minimal: '#7FA98F',
  mild: '#D9B26A',
  moderate: '#E9A88C',
  severe: '#C9603F',
  alert: '#C9603F',
};

const MENTAL_DIMENSION_ORDER = [
  'rses', 'brs', 'big_five', 'bonus_eq', 'gad7', 'pss10',
  'bonus_confiance', 'bonus_hsp', 'bonus_hpi',
  'ecr_r', 'phq9',
];

const SEXUAL_DIMENSION_ORDER = [
  'sdi2', 'nsss', 'sis_ses', 'pair', 'sise',
  'griss_base', 'fsfi', 'iief',
];

const BIG_FIVE_BAND_COLORS: Record<Band, string> = {
  high: '#7FA98F',
  mid:  '#D9B26A',
  low:  '#E9A88C',
};

export function getKeyDimensions(
  scaleResults: Record<string, ScaleResult>,
  bloc: 'mental' | 'sexual',
  max = 5,
): KeyDimension[] {
  const order = bloc === 'mental' ? MENTAL_DIMENSION_ORDER : SEXUAL_DIMENSION_ORDER;
  const dims: KeyDimension[] = [];

  for (const id of order) {
    if (dims.length >= max) break;
    const result = scaleResults[id];
    if (!result) continue;

    if (id === 'big_five') {
      const profile = getBigFiveProfile(result);
      for (const dim of profile) {
        if (dims.length >= max) break;
        const pct = Math.round(((dim.score - 2) / 8) * 100);
        dims.push({
          scaleId: `big_five.${dim.key}`,
          name: dim.label,
          label: BAND_LABEL[dim.band],
          severity: dim.band === 'high' ? 'positive' : dim.band === 'mid' ? 'minimal' : 'mild',
          pct: Math.min(100, Math.max(0, pct)),
          color: BIG_FIVE_BAND_COLORS[dim.band],
        });
      }
      continue;
    }

    const scale = getScaleById(id);
    const meta = getScaleMeta(id);
    if (!scale) continue;

    const range = scale.scoreRange.max - scale.scoreRange.min;
    const pct = range > 0
      ? Math.round(((result.totalScore - scale.scoreRange.min) / range) * 100)
      : 0;
    const severity = result.interpretation?.severity ?? 'none';

    dims.push({
      scaleId: id,
      name: meta.label,
      label: result.interpretation?.label ?? '',
      severity,
      pct: Math.min(100, Math.max(0, pct)),
      color: SEVERITY_COLORS[severity] ?? '#D9B26A',
    });
  }

  return dims;
}

type SevLevel = 'low' | 'mid' | 'high';

function sevLevel(result: ScaleResult | undefined): SevLevel {
  if (!result) return 'low';
  const s = result.interpretation?.severity ?? 'none';
  if (s === 'severe' || s === 'alert') return 'high';
  if (s === 'moderate' || s === 'mild') return 'mid';
  return 'low';
}

function isPositive(result: ScaleResult | undefined): boolean {
  if (!result) return false;
  const s = result.interpretation?.severity ?? 'none';
  return s === 'positive' || s === 'none' || s === 'minimal';
}

export function getArchetype(scaleResults: Record<string, ScaleResult>): Archetype {
  const hpi = scaleResults['bonus_hpi'];
  const hsp = scaleResults['bonus_hsp'];
  const eq = scaleResults['bonus_eq'];
  const ecr = scaleResults['ecr_r'];
  const brs = scaleResults['brs'];
  const rses = scaleResults['rses'];
  const gad = scaleResults['gad7'];
  const pss = scaleResults['pss10'];
  const confiance = scaleResults['bonus_confiance'];

  const hpiHigh = isPositive(hpi) || sevLevel(hpi) === 'high';
  const hspHigh = isPositive(hsp) || sevLevel(hsp) === 'high';
  const eqHigh = isPositive(eq);
  const attachSecure = isPositive(ecr);
  const resilHigh = isPositive(brs);
  const estimeHigh = isPositive(rses);
  const anxHigh = sevLevel(gad) === 'high' || sevLevel(gad) === 'mid';
  const stressHigh = sevLevel(pss) === 'high' || sevLevel(pss) === 'mid';
  const confianceHigh = isPositive(confiance);

  const traits: string[] = [];

  if (hpiHigh) traits.push('Haut potentiel');
  if (hspHigh) traits.push('Hypersensible');
  if (eqHigh) traits.push('Empathique');
  if (resilHigh) traits.push('Résilient');
  if (estimeHigh || confianceHigh) traits.push('Confiant');
  if (attachSecure) traits.push('Attachement sécure');

  if (traits.length < 3) {
    if (!traits.includes('Résilient') && brs) traits.push('Résilient');
    if (!traits.includes('Empathique') && eq) traits.push('Sensible');
  }

  if (hpiHigh && hspHigh) {
    return { title: 'Le Sensible', subtitle: 'Lucide', traits: traits.slice(0, 4) };
  }

  if (eqHigh && attachSecure) {
    return { title: "L'Empathique", subtitle: 'Ancré', traits: traits.slice(0, 4) };
  }

  if (resilHigh && estimeHigh) {
    return { title: 'Le Roc', subtitle: 'Serein', traits: traits.slice(0, 4) };
  }

  if ((anxHigh || stressHigh) && hspHigh) {
    return { title: "L'Intense", subtitle: 'Vibrant', traits: traits.slice(0, 4) };
  }

  if (confianceHigh && resilHigh) {
    return { title: 'Le Solide', subtitle: 'Équilibré', traits: traits.slice(0, 4) };
  }

  if (anxHigh && stressHigh) {
    return { title: 'Le Combatif', subtitle: 'en Éveil', traits: traits.slice(0, 4) };
  }

  return {
    title: "L'Explorateur",
    subtitle: 'Singulier',
    traits: traits.length > 0 ? traits.slice(0, 4) : ['Curieux', 'En chemin'],
  };
}

const GREETING_RE = /^(mon\s+fr[èe]re|ma\s+s[oœ]ur|salut|bonjour|cher|ch[èe]re|hey)\b/i;

function isFluffSentence(s: string, nameTokens: string[]): boolean {
  const trimmed = s.trim();
  if (GREETING_RE.test(trimmed)) return true;
  if (nameTokens.some(t => trimmed.toLowerCase().includes(t))) return true;
  if (trimmed.length < 60 && trimmed.endsWith('!')) return true;
  return false;
}

export function getShortQuote(
  text: string | null,
  max = 160,
  prenom = '',
): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return '';

  const nameTokens = prenom
    .trim()
    .split(/\s+/)
    .filter(t => t.length >= 2)
    .map(t => t.toLowerCase());

  const useful = sentences.filter(s => !isFluffSentence(s, nameTokens));
  if (useful.length === 0) return '';

  let quote = '';
  for (const s of useful) {
    if (quote.length + s.length > max && quote.length > 0) break;
    quote += s;
  }

  const result = quote.trim();
  if (nameTokens.some(t => result.toLowerCase().includes(t))) return '';
  return result;
}

export function getIntimateTraits(scaleResults: Record<string, ScaleResult>): string[] {
  const traits: string[] = [];
  const sdi = scaleResults['sdi2'];
  const sis = scaleResults['sis_ses'];
  const pair = scaleResults['pair'];
  const nsss = scaleResults['nsss'];

  if (sdi) {
    const l = sdi.interpretation?.label?.toLowerCase() ?? '';
    if (l.includes('élev') || l.includes('fort')) traits.push('Désir élevé');
    else if (l.includes('modér')) traits.push('Désir modéré');
    else traits.push('Désir bas');
  }
  if (sis) {
    const l = sis.interpretation?.label?.toLowerCase() ?? '';
    if (l.includes('fort') || l.includes('élev')) traits.push('Excitabilité forte');
    else traits.push('Excitabilité modérée');
  }
  if (pair && isPositive(pair)) traits.push('Intimité profonde');
  if (nsss && isPositive(nsss)) traits.push('Satisfait');

  return traits.slice(0, 3);
}
