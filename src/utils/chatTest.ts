/**
 * chatTest.ts — Le test se fait dans la conversation avec Dr Lô.
 * Logique pure (testable avec node --test) : quelles questions, dans quel ordre,
 * où on en est, et ce que Dr Lô dit autour. Les questions, les réponses possibles
 * et le calcul du score sont EXACTEMENT ceux du test classique (mêmes échelles,
 * même enregistrement : voir services/chatTestRunner.ts).
 */
import type { AssessmentScale, ScaleItem } from '../types/assessment';

export type Answers = Record<number, number>;

/** Test en cours dans la conversation (sérialisable, gardé avec la conversation). */
export interface ActiveTest {
  scaleId: string;
  sessionId: string;
  guest: boolean;
  answers: Answers;
  /** Question actuellement posée (null = calculer la suivante). */
  askedItemId: number | null;
}

/** Même règle que la page de test : un item conditionnel n'apparaît que si sa condition est remplie. */
export function isVisible(item: ScaleItem, answers: Answers): boolean {
  if (!item.conditional) return true;
  return answers[item.conditional.itemId] === item.conditional.value;
}

export function visibleItems(scale: AssessmentScale, answers: Answers): ScaleItem[] {
  return scale.items.filter(i => isVisible(i, answers));
}

/** Prochaine question : la première visible sans réponse, dans l'ordre du test. */
export function nextItem(scale: AssessmentScale, answers: Answers): ScaleItem | null {
  return visibleItems(scale, answers).find(i => answers[i.id] === undefined) ?? null;
}

/** Question précédente (pour « revenir en arrière ») : la dernière visible déjà répondue avant `currentId`. */
export function previousItem(scale: AssessmentScale, answers: Answers, currentId: number | null): ScaleItem | null {
  const vis = visibleItems(scale, answers);
  const idx = currentId === null ? vis.length : vis.findIndex(i => i.id === currentId);
  for (let i = (idx < 0 ? vis.length : idx) - 1; i >= 0; i -= 1) {
    if (answers[vis[i].id] !== undefined) return vis[i];
  }
  return null;
}

export function progress(scale: AssessmentScale, answers: Answers): { done: number; total: number } {
  const vis = visibleItems(scale, answers);
  return { done: vis.filter(i => answers[i.id] !== undefined).length, total: vis.length };
}

/** Réponses utiles au calcul (on retire celles d'items devenus invisibles). */
export function cleanAnswers(scale: AssessmentScale, answers: Answers): Answers {
  const out: Answers = {};
  for (const i of visibleItems(scale, answers)) if (answers[i.id] !== undefined) out[i.id] = answers[i.id];
  return out;
}

export function introText(label: string, total: number, resumedAt: number): string {
  if (resumedAt > 0) {
    return `On reprend « ${label} » là où on en était : question ${resumedAt + 1} sur ${total}.`;
  }
  return `C'est parti pour « ${label} » : ${total} petites questions. Réponds à l'instinct, il n'y a pas de bonne ou de mauvaise réponse. Ce n'est pas un examen, et rien n'est un diagnostic.`;
}

/** Texte de la question, avec un mot d'encouragement aux bons moments. */
export function questionText(item: ScaleItem, done: number, total: number): string {
  const half = Math.floor(total / 2);
  let lead = '';
  if (total >= 8 && done === half) lead = 'On est à mi-chemin, tu te débrouilles bien. ';
  else if (total >= 6 && done === total - 1) lead = 'Dernière question. ';
  return `${lead}${item.text}`;
}

/** Alerte de niveau 3 (ex. idées noires) : même message que la page de test, accordé au genre. */
export function criticalAlert(scale: AssessmentScale, itemId: number, value: number, genre?: 'homme' | 'femme'): string | null {
  const a = scale.alertItems?.find(x => x.itemId === itemId && value >= x.minValue && x.alertLevel === 3);
  if (!a) return null;
  return a.message.replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, m, f) => (genre === 'femme' ? f : m));
}

/** Valeurs pour la « signature » du test (même calcul que la page de test). */
export function signatureFrom(scale: AssessmentScale, answers: Answers): { value: number; max: number }[] {
  return scale.items
    .filter(i => !i.noScore && answers[i.id] !== undefined)
    .map(i => ({ value: answers[i.id], max: Math.max(...i.options.map(o => o.value)) }));
}
