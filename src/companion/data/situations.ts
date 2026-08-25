import type { Situation, ReadingGrid } from "../types";

export interface SituationOption {
  id: Situation;
  label: string;
  subtitle: string;
  grid: ReadingGrid; // grille de lecture activée par cette situation
  asksCycle: boolean; // si true -> CycleEstimateScreen après le choix
}

// La situation détermine la grille de lecture ; le check-in et
// l'accompagnement du jour sont identiques pour toutes. Modifiable dans les
// réglages plus tard (hors MVP).
export const SITUATIONS: SituationOption[] = [
  {
    id: "cycling",
    label: "Je suis réglée",
    subtitle: "Je veux comprendre le lien avec mon cycle",
    grid: "cyclical",
    asksCycle: true,
  },
  {
    id: "menopause",
    label: "Je suis en préménopause ou ménopause",
    subtitle: "Cette transition change mes émotions",
    grid: "menopause",
    asksCycle: false,
  },
  {
    id: "contraception",
    label: "J'ai une contraception qui change mon cycle",
    subtitle: "Mon cycle n'est plus régulier",
    grid: "emotional",
    asksCycle: false,
  },
  {
    id: "no_tracking",
    label: "Je préfère ne pas suivre mon cycle",
    subtitle: "Je veux juste comprendre mes émotions",
    grid: "emotional",
    asksCycle: false,
  },
];

export function getSituationById(id: Situation): SituationOption | null {
  return SITUATIONS.find((s) => s.id === id) ?? null;
}
