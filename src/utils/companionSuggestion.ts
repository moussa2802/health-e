/**
 * companionSuggestion — « Ce que je te propose » : une seule proposition à la fois, partout
 * (discussion, point de la semaine). Même logique que « ta suite » de l'accueil.
 */
import { getTotemProgress } from './totemAlgorithm';
import { getScaleMeta } from './scaleMeta';
import { pickHomeNext, sinceLabel } from './homeNext';
import { toDate } from './drLoGuide';
import type { ScaleResult } from '../types/assessment';

export interface Suggestion { id: string; text: string; short: string; cta: string }

export function companionSuggestion(results: Record<string, ScaleResult> | null, totemRevealed: boolean, now = Date.now()): Suggestion | null {
  if (!results) return null;
  const prog = getTotemProgress(results);
  if (prog.missing.length > 0) {
    const id = prog.missing[0], n = prog.missing.length, label = getScaleMeta(id).label;
    return { id, text: `Plus que ${n} test${n > 1 ? 's' : ''} pour découvrir ton animal intérieur. Le prochain : « ${label} ».`, short: `Faire « ${label} » (plus que ${n} pour ton animal)`, cta: 'On le fait' };
  }
  if (!totemRevealed) return { id: '', text: 'Ton animal intérieur est prêt. Je te le montre ?', short: 'Découvrir ton animal intérieur', cta: 'Le découvrir' };
  const dates = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, toDate((r as { completedAt?: unknown }).completedAt)]));
  const more = pickHomeNext(dates, now);
  if (more?.kind === 'new') { const label = getScaleMeta(more.id).label; return { id: more.id, text: `Un test que tu n'as pas encore fait : « ${label} ». Et toi, tu es comment ?`, short: `Découvrir le test « ${label} »`, cta: 'On le fait' }; }
  if (more?.kind === 'retake') { const label = getScaleMeta(more.id).label; return { id: more.id, text: `Ton test « ${label} » date de ${sinceLabel(more.days)}. On refait le point ?`, short: `Refaire « ${label} » (il date de ${sinceLabel(more.days)})`, cta: 'On le refait' }; }
  return null;
}
