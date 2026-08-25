export type InputVariant = 'segmented' | 'frequency-strip' | 'agreement-scale' | 'forced-choice' | 'binary';

export type ResultVariant = 'score' | 'dimensions' | 'statement';
export type ExperienceTone = 'normal' | 'sober' | 'playful';

export interface ResultCardConfig {
  variant: ResultVariant;
  shareable: boolean;
}

export interface IntroScreen {
  title: string;
  subtitle: string;
  duration: string;
  tip?: string;
}

export interface FinalScreen {
  title: string;
  subtitle: string;
}

export interface ChapterDef {
  title: string;
  itemCount: number;
  transition?: string;
}

export interface ScaleExperience {
  input: InputVariant;
  inputByItemType?: Partial<Record<import('./assessment').AnswerType, InputVariant>>;
  answerPrompt?: string;
  introScreen?: IntroScreen;
  finalScreen?: FinalScreen;
  tone?: ExperienceTone;
  resultCard?: ResultCardConfig;
  chapters?: ChapterDef[];
  milestones?: Record<number, string>;
}
