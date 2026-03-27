export type AssessmentCategory = 'mental_health' | 'sexual_health';

export type ItemSeverity = 'none' | 'minimal' | 'mild' | 'moderate' | 'severe' | 'positive' | 'alert';

export type AnswerType = 'likert' | 'frequency' | 'boolean' | 'multiple_choice' | 'numeric';

export interface AnswerOption {
  value: number;
  label: string;
}

export interface ScaleItem {
  id: number;
  text: string;
  type: AnswerType;
  options: AnswerOption[];
  reversed?: boolean;   // item à scorer inversé
  subscale?: string;
  conditional?: {       // afficher seulement si
    itemId: number;
    value: number | boolean;
  };
}

export interface Subscale {
  key: string;
  label: string;
  itemIds: number[];
  reverseIds?: number[];
  range: { min: number; max: number };
}

export interface InterpretationRange {
  min: number;
  max: number;
  label: string;
  severity: ItemSeverity;
  description: string;
  referralRequired: boolean;
  recommendation: string;
}

export interface AssessmentScale {
  id: string;                        // ex: 'gad7', 'phq9', 'big_five'
  name: string;                      // nom complet FR
  shortName: string;                 // ex: 'GAD-7'
  category: AssessmentCategory;
  description: string;
  instructions: string;
  timeEstimateMinutes: number;
  items: ScaleItem[];
  subscales?: Subscale[];
  reverseIds?: number[];             // ids d'items à inverser globalement
  scoreRange: { min: number; max: number };
  interpretation: InterpretationRange[];
  reference: string;                 // citation APA
  licenseNote: string;
  targetGender?: 'all' | 'female' | 'male';
  warningMessage: string;            // toujours affiché
}

// --- Session d'évaluation ---

export interface UserAssessmentSession {
  id: string;
  userId: string;
  selectedScaleIds: string[];        // 2 à 10 items choisis
  status: 'in_progress' | 'completed' | 'abandoned';
  currentScaleIndex: number;
  answers: Record<string, Record<number, number>>;  // scaleId -> itemId -> value
  scores: Record<string, ScaleResult>;
  compatibilityId?: string;          // ID partageable
  startedAt: Date;
  completedAt?: Date;
  claudeInterpretation?: string;
  alertDetected: boolean;
}

export interface ScaleResult {
  scaleId: string;
  totalScore: number;
  subscaleScores?: Record<string, number>;
  interpretation: InterpretationRange;
  completedAt: Date;
}

// --- Compatibilité ---

export interface CompatibilityRequest {
  id: string;
  initiatorUserId: string;
  partnerCompatibilityId: string;
  relationshipType: 'couple' | 'family' | 'friend' | 'colleague';
  status: 'pending' | 'completed';
  result?: CompatibilityResult;
  createdAt: Date;
}

export interface CompatibilityResult {
  globalScore: number;               // 0–100
  dimensionScores: Record<string, number>;
  strengths: string[];
  tensions: string[];
  recommendations: string[];
  claudeNarrative: string;
  computedAt: Date;
}

// --- Profil utilisateur enrichi ---

export interface UserProfile {
  uid: string;
  compatibilityId: string;           // ID unique partageable (ex: HE-2024-XXXX)
  displayName: string;
  assessmentHistory: string[];       // sessionIds
  lastAssessmentDate?: Date;
  profileSummary?: string;           // généré par Claude
  createdAt: Date;
  updatedAt: Date;
}
