import type { Genre } from '../types/onboarding';
import type { AssessmentScale } from '../types/assessment';

export type UserGender = Genre; // 'homme' | 'femme'

/**
 * Résout les placeholders genrés dans un texte.
 * Format : {{masculin|féminin}}
 * Exemple : "Tu es {{satisfait|satisfaite}}" → "Tu es satisfait" (si homme)
 */
export function resolveGender(text: string, gender: UserGender): string {
  return text.replace(/\{\{([^|]+)\|([^}]+)\}\}/g, (_, male, female) =>
    gender === 'homme' ? male : female
  );
}

/**
 * Résout tous les champs textuels genrés d'une scale.
 */
export function resolveScaleGender(scale: AssessmentScale, gender: UserGender): AssessmentScale {
  const r = (t: string) => resolveGender(t, gender);
  return {
    ...scale,
    instructions: r(scale.instructions),
    warningMessage: r(scale.warningMessage),
    items: scale.items.map(item => ({
      ...item,
      text: r(item.text),
      options: item.options.map(opt => ({ ...opt, label: r(opt.label) })),
    })),
    interpretation: scale.interpretation.map(interp => ({
      ...interp,
      label: r(interp.label),
      description: r(interp.description),
      recommendation: r(interp.recommendation),
    })),
    ...(scale.resolvedInterpretation ? {
      resolvedInterpretation: scale.resolvedInterpretation.map(interp => ({
        ...interp,
        label: r(interp.label),
        description: r(interp.description),
        recommendation: r(interp.recommendation),
      })),
    } : {}),
    ...(scale.alertItems ? {
      alertItems: scale.alertItems.map(alert => ({ ...alert, message: r(alert.message) })),
    } : {}),
    ...(scale.contextQuestion ? {
      contextQuestion: {
        ...scale.contextQuestion,
        text: r(scale.contextQuestion.text),
        options: scale.contextQuestion.options.map(opt => ({ ...opt, label: r(opt.label) })),
      },
    } : {}),
  };
}
