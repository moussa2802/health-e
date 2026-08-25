// Types partagés du companion app. Le profil (CompanionData) vit dans le
// champ `companion` du document patients/{uid} existant ; les check-ins vivent
// dans la sous-collection patients/{uid}/checkins/{date}.

export type Situation =
  | "cycling"
  | "menopause"
  | "contraception"
  | "no_tracking";

export type ReadingGrid = "cyclical" | "emotional" | "menopause";

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type MoodType =
  | "serene"
  | "joyful"
  | "irritable"
  | "sad"
  | "anxious"
  | "tired";

export interface CompanionData {
  onboardingDone: boolean;
  situation: Situation | null;
  // Cycle (rempli seulement si situation === 'cycling' et cycleKnown === true)
  cycleStartDate: string | null;
  cycleLength: number; // défaut 28
  cycleKnown: boolean;
  // Suivi
  lastCheckinDate: string | null; // "2026-04-17"
  checkinStreak: number;
}

export const DEFAULT_COMPANION_DATA: CompanionData = {
  onboardingDone: false,
  situation: null,
  cycleStartDate: null,
  cycleLength: 28,
  cycleKnown: false,
  lastCheckinDate: null,
  checkinStreak: 0,
};

export interface Checkin {
  id: string; // = date, "2026-04-17"
  date: string;
  mood: MoodType;
  energy: number; // 1-5
  note?: string;
  readingGrid: ReadingGrid;
  cyclePhase?: CyclePhase;
  cycleDay?: number;
  vigilanceFlag: boolean;
  createdAt: string; // ISO
}
