import type { CyclePhase } from "../types";
import { toDateString } from "../utils";

// ⚠️ SEUILS MÉDICAUX — à valider/ajuster par le médecin. Cycle moyen 28 jours.
const PHASE_BOUNDARIES: Record<CyclePhase, { start: number; end: number }> = {
  menstrual: { start: 1, end: 5 },
  follicular: { start: 6, end: 11 },
  ovulatory: { start: 12, end: 16 },
  luteal: { start: 17, end: 28 },
};

export function calculateCyclePhase(
  cycleStartDate: string,
  cycleLength: number = 28,
  today: Date = new Date()
): { phase: CyclePhase; cycleDay: number } {
  const start = new Date(cycleStartDate);
  const daysSince = Math.floor(
    (today.getTime() - start.getTime()) / 86400000
  );
  // Modulo positif : évite un cycleDay négatif/incohérent si daysSince < 0.
  const cycleDay = ((daysSince % cycleLength) + cycleLength) % cycleLength + 1;

  let phase: CyclePhase;
  if (cycleDay <= PHASE_BOUNDARIES.menstrual.end) phase = "menstrual";
  else if (cycleDay <= PHASE_BOUNDARIES.follicular.end) phase = "follicular";
  else if (cycleDay <= PHASE_BOUNDARIES.ovulatory.end) phase = "ovulatory";
  else phase = "luteal";

  return { phase, cycleDay };
}

export const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: "Règles",
  follicular: "Phase folliculaire",
  ovulatory: "Ovulation",
  luteal: "Phase lutéale",
};

// ─── Estimation depuis l'onboarding (CycleEstimateScreen) ───────────────────
// ⚠️ Offsets à valider par le médecin — approximation du milieu de chaque
// tranche de temps proposée à l'utilisatrice.
export type CycleEstimateChoice =
  | "this_week"
  | "last_week"
  | "two_three_weeks_ago"
  | "unknown";

const ESTIMATE_OFFSET_DAYS: Record<
  Exclude<CycleEstimateChoice, "unknown">,
  number
> = {
  this_week: 3,
  last_week: 10,
  two_three_weeks_ago: 18,
};

/** "Je ne sais pas" -> null : l'app bascule alors sur la grille émotionnelle. */
export function estimateCycleStartDate(
  choice: CycleEstimateChoice,
  today: Date = new Date()
): string | null {
  if (choice === "unknown") return null;
  const date = new Date(today);
  date.setDate(date.getDate() - ESTIMATE_OFFSET_DAYS[choice]);
  return toDateString(date);
}
