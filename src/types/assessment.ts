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
  reversed?: boolean;   // item à scorer inversé (pour totalScore)
  subscale?: string;
  noScore?: boolean;    // item affiché mais exclu du calcul du score (ex: question fonctionnelle GAD-7)
  conditional?: {
    itemId: number;
    value: number | boolean;
  };
}

export interface Subscale {
  key: string;
  label: string;
  itemIds: number[];
  reverseIds?: number[];              // items inversés DANS ce sous-score
  range: { min: number; max: number };
  scoringMode?: 'sum' | 'mean';       // default 'sum'
}

export interface InterpretationRange {
  min: number;
  max: number;
  label: string;
  severity: ItemSeverity;
  description: string;
  referralRequired: boolean;
  recommendation: string;
  alertLevel?: 1 | 2 | 3;            // 1=vigilance, 2=alerte, 3=critique
}

export interface AlertItem {
  itemId: number;
  minValue: number;                   // déclenche si réponse >= minValue
  alertLevel: 1 | 2 | 3;
  message: string;
}

export interface AssessmentScale {
  id: string;
  name: string;
  shortName: string;
  category: AssessmentCategory;
  description: string;
  instructions: string;
  timeEstimateMinutes: number;
  items: ScaleItem[];
  subscales?: Subscale[];
  reverseIds?: number[];              // ids globaux inversés pour totalScore
  scoreRange: { min: number; max: number };
  scoringMode?: 'sum' | 'mean';       // default 'sum'
  interpretation: InterpretationRange[];
  alertItems?: AlertItem[];           // alertes déclenchées par un item spécifique
  reference: string;
  licenseNote: string;
  targetGender?: 'all' | 'female' | 'male';
  warningMessage: string;
}

// --- Session d'évaluation ---

export interface UserAssessmentSession {
  id: string;
  userId: string;
  selectedScaleIds: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  currentScaleIndex: number;
  answers: Record<string, Record<number, number>>;
  scores: Record<string, ScaleResult>;
  compatibilityId?: string;
  startedAt: Date;
  completedAt?: Date;
  claudeInterpretation?: string;
  alertDetected: boolean;
}

export interface TriggeredAlert {
  itemId: number;
  value: number;
  alertLevel: 1 | 2 | 3;
  message: string;
}

export interface ScaleResult {
  scaleId: string;
  totalScore: number;
  subscaleScores?: Record<string, number>;
  interpretation: InterpretationRange;
  completedAt: Date;
  alertLevel?: 1 | 2 | 3;            // niveau d'alerte le plus élevé détecté
  alertsTriggered?: TriggeredAlert[]; // alertes spécifiques déclenchées
}

// --- Compatibilité ---

export interface CompatibilityRequest {
  id: string;
  initiatorUserId: string;
  partnerCompatibilityId: string;
  /** Sub-type ID from relationshipTypes.ts (e.g. 'crush', 'couple_etabli', 'pere', 'meilleur_ami'…) */
  relationshipType: string;
  status: 'pending' | 'completed';
  result?: CompatibilityResult;
  createdAt: Date;
}

export interface CompatibilityResult {
  globalScore: number;
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
  /** @deprecated use compatibilityIdMental / compatibilityIdSexual */
  compatibilityId?: string | null;
  compatibilityIdMental: string | null;
  compatibilityIdSexual: string | null;
  displayName: string;
  assessmentHistory: string[];
  lastAssessmentDate?: Date;
  profileSummary?: string;
  scaleResults?: Record<string, ScaleResult>;
  createdAt: Date;
  updatedAt: Date;
}
