import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Brain,
  Check,
  CheckCircle2,
  Feather,
  Flame,
  HeartCrack,
  HelpCircle,
  Heart,
  PartyPopper,
  ShieldAlert,
  Sparkles,
  Sprout,
  TreeDeciduous,
  User,
  UserMinus,
  Users,
  UsersRound,
  Leaf,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { saveOnboardingProfile } from '../../utils/onboardingProfile';
import type { OnboardingProfile } from '../../types/onboarding';

interface Props {
  onComplete: (profile: OnboardingProfile) => void;
  defaultPrenom?: string;
}

// ── Question definitions ────────────────────────────────────────────────────

interface ChoiceOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface Question {
  key: keyof Omit<OnboardingProfile, 'completedAt'>;
  type: 'text' | 'choice';
  drLoSays: string;
  placeholder?: string;
  options?: ChoiceOption[];
}

const QUESTIONS: Question[] = [
  {
    key: 'prenom',
    type: 'text',
    drLoSays: "Avant tout — comment tu t'appelles ?",
    placeholder: "Ton prénom...",
  },
  {
    key: 'age',
    type: 'choice',
    drLoSays: "Tu as quel âge ?",
    options: [
      { value: '18-25', label: '18 – 25 ans', icon: Sprout },
      { value: '26-35', label: '26 – 35 ans', icon: Flame },
      { value: '36-45', label: '36 – 45 ans', icon: Sparkles },
      { value: '46-55', label: '46 – 55 ans', icon: Leaf },
      { value: '55+',   label: '55 ans et plus', icon: TreeDeciduous },
    ],
  },
  {
    key: 'genre',
    type: 'choice',
    drLoSays: 'Tu es ?',
    options: [
      { value: 'homme', label: 'Homme', icon: User },
      { value: 'femme', label: 'Femme', icon: User },
    ],
  },
  {
    key: 'situation_relationnelle',
    type: 'choice',
    drLoSays: "Et ta situation relationnelle en ce moment ?",
    options: [
      { value: 'celibataire',    label: 'Célibataire',                  icon: User },
      { value: 'en_couple',      label: 'En couple',                    icon: Users },
      { value: 'marie',          label: 'Marié(e)',                     icon: Heart },
      { value: 'polygamie',      label: 'En situation de polygamie',    icon: UsersRound },
      { value: 'separe_divorce', label: 'Séparé(e) / Divorcé(e)',       icon: UserMinus },
      { value: 'veuf',           label: 'Veuf(ve)',                     icon: Feather },
      { value: 'complique',      label: "C'est compliqué",              icon: HelpCircle },
    ],
  },
  {
    key: 'deuil',
    type: 'choice',
    drLoSays: "Est-ce que tu as vécu la perte d'un proche — un décès, une rupture douloureuse, un deuil important ?",
    options: [
      { value: 'recent', label: "Oui, et c'est encore récent (moins d'1 an)", icon: HeartCrack },
      { value: 'ancien', label: "Oui, mais c'était il y a longtemps",          icon: Heart },
      { value: 'non',    label: "Non, pas vraiment",                           icon: Check },
    ],
  },
  {
    key: 'evenement_traumatisant',
    type: 'choice',
    drLoSays: "Est-ce que tu as vécu un événement particulièrement difficile ou traumatisant dans ta vie ?",
    options: [
      { value: 'oui', label: 'Oui',                                             icon: ShieldAlert },
      { value: 'non', label: 'Non',                                             icon: Check },
      { value: 'np',  label: "Je préfère ne pas répondre pour l'instant",       icon: EyeOff },
    ],
  },
  {
    key: 'situation_mariage',
    type: 'choice',
    drLoSays: "As-tu déjà été marié(e) ou tu l'es actuellement ?",
    options: [
      { value: 'actuellement',    label: 'Oui, actuellement marié(e)', icon: Heart },
      { value: 'plus_maintenant', label: 'Oui, mais plus maintenant',  icon: UserMinus },
      { value: 'jamais',          label: 'Non, jamais',                icon: User },
    ],
  },
  {
    key: 'enfants',
    type: 'choice',
    drLoSays: "Est-ce que tu as des enfants ?",
    options: [
      { value: 'oui',   label: 'Oui',                     icon: Baby },
      { value: 'non',   label: 'Non',                     icon: Check },
      { value: 'perte', label: "J'ai perdu un enfant",     icon: HeartCrack },
    ],
  },
];

// ── Component ───────────────────────────────────────────────────────────────

const OnboardingProfile: React.FC<Props> = ({ onComplete, defaultPrenom }) => {
  // step 0 = welcome, step 1..8 = questions, step 9 = done
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingProfile>>({});
  const [textValue, setTextValue] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null); // for tap animation

  const totalQuestions = QUESTIONS.length; // 8
  const currentQ = step >= 1 && step <= totalQuestions ? QUESTIONS[step - 1] : null;
  const progress = step === 0 ? 0 : Math.round(((step - 1) / totalQuestions) * 100);

  // Pré-remplir le prénom avec le nom du compte si disponible
  useEffect(() => {
    if (defaultPrenom && step === 1 && currentQ?.key === 'prenom') {
      setTextValue(defaultPrenom);
    }
  }, [step, defaultPrenom, currentQ?.key]);

  // Reset text value when question changes
  useEffect(() => {
    if (!(step === 1 && defaultPrenom && currentQ?.key === 'prenom')) {
      setTextValue('');
    }
    setSelecting(null);
  }, [step]);

  const handleChoiceSelect = (q: Question, value: string) => {
    setSelecting(value);
    setTimeout(() => {
      const updated = { ...answers, [q.key]: value };
      setAnswers(updated);
      setSelecting(null);
      if (step < totalQuestions) {
        setStep(s => s + 1);
      } else {
        finalise(updated);
      }
    }, 320);
  };

  const handleTextNext = () => {
    if (!currentQ || !textValue.trim()) return;
    const updated = { ...answers, [currentQ.key]: textValue.trim() };
    setAnswers(updated);
    setStep(s => s + 1);
  };

  const finalise = (data: Partial<OnboardingProfile>) => {
    const profile: OnboardingProfile = {
      prenom: (data.prenom ?? '').trim() || 'Toi',
      age: data.age ?? '26-35',
      genre: data.genre ?? 'non_specifie',
      situation_relationnelle: data.situation_relationnelle ?? 'celibataire',
      deuil: data.deuil ?? 'non',
      evenement_traumatisant: data.evenement_traumatisant ?? 'np',
      situation_mariage: data.situation_mariage ?? 'jamais',
      enfants: data.enfants ?? 'non',
      completedAt: new Date().toISOString(),
    };
    saveOnboardingProfile(profile);
    setStep(9);
    setTimeout(() => onComplete(profile), 900);
  };

  const prenom = (answers.prenom ?? '').trim() || '';

  // ── Welcome screen ─────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[480px] bg-card border border-line rounded-block shadow-soft p-7 pb-6">
          {/* Dr. Lô avatar */}
          <div className="flex flex-col items-center mb-6">
            <DrLoAvatar size={96} />
          </div>

          <h1 className="font-display m-0 mb-2.5 text-2xl font-bold text-center text-ink">
            Avant de commencer...
          </h1>
          <p className="m-0 mb-6 text-sm leading-relaxed text-ink-soft text-center">
            On a besoin d'apprendre à te connaître un peu. Pas de panique — c'est rapide et ça va vraiment personnaliser ton expérience.
          </p>

          <div className="bg-sage-soft border border-sage/20 rounded-card px-4 py-3 mb-6">
            <ul className="m-0 p-0 list-none space-y-1.5">
              {[
                '8 questions rapides',
                'Tes réponses restent sur ton appareil',
                "Les évaluations s'adaptent à ton profil",
              ].map(line => (
                <li key={line} className="flex items-center gap-2 text-xs text-sage leading-relaxed">
                  <CheckCircle2 size={14} className="shrink-0" strokeWidth={2.5} />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold text-[15px] py-3.5 rounded-card shadow-soft hover:opacity-90 transition-opacity"
          >
            C'est parti !
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────

  if (step === 9) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[480px] bg-card border border-line rounded-block shadow-soft p-7 pb-6 text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
            <PartyPopper size={28} className="text-accent" />
          </div>
          <h2 className="font-display m-0 mb-2 text-2xl font-bold text-ink">
            Parfait{prenom ? `, ${prenom}` : ''} !
          </h2>
          <p className="m-0 text-sm text-muted leading-relaxed">
            Ton profil est prêt. Les évaluations sont maintenant personnalisées pour toi.
          </p>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────

  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-6">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-1 bg-line">
        <div
          className="h-full bg-accent transition-[width] duration-400 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="w-full max-w-[480px] bg-card border border-line rounded-block shadow-soft p-7 pb-6">
        {/* Step counter */}
        <div className="flex items-center justify-between mb-5">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted text-[13px] font-semibold p-0 hover:text-ink-soft transition-colors"
            >
              <ArrowLeft size={14} />
              Retour
            </button>
          )}
          <span className="ml-auto text-xs text-muted font-semibold">
            {step} / {totalQuestions}
          </span>
        </div>

        {/* Dr. Lô speech bubble */}
        <div className="flex items-start gap-3 mb-6">
          <DrLoAvatar size={48} />
          <div className="relative flex-1 bg-card border border-line rounded-[16px] rounded-bl-[4px] px-3.5 py-3 shadow-soft">
            <p className="m-0 text-sm font-semibold text-ink leading-relaxed">
              {currentQ.drLoSays}
            </p>
          </div>
        </div>

        {/* ── Text input ── */}
        {currentQ.type === 'text' && (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextNext()}
              placeholder={currentQ.placeholder}
              className="w-full px-4 py-3.5 text-base font-semibold rounded-card border border-line bg-paper text-ink outline-none focus:border-accent transition-colors box-border"
            />
            <button
              onClick={handleTextNext}
              disabled={!textValue.trim()}
              className={`flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-card border-none transition-colors ${
                textValue.trim()
                  ? 'bg-ink text-white cursor-pointer hover:opacity-90'
                  : 'bg-line text-muted cursor-not-allowed'
              }`}
            >
              Continuer
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Choice options ── */}
        {currentQ.type === 'choice' && currentQ.options && (
          <div className="flex flex-col gap-2">
            {currentQ.options.map(opt => {
              const isSelected = selecting === opt.value;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChoiceSelect(currentQ, opt.value)}
                  disabled={selecting !== null}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-card border text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-accent border-accent scale-[0.98]'
                      : 'bg-card border-line hover:border-accent/40'
                  }`}
                >
                  <OptIcon
                    size={20}
                    className={`shrink-0 ${isSelected ? 'text-white' : 'text-accent'}`}
                  />
                  <span className={`text-sm font-semibold leading-relaxed ${isSelected ? 'text-white' : 'text-ink'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check size={18} className="ml-auto text-white shrink-0" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 mt-5 z-[1]">
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const idx = i + 1;
          return (
            <div
              key={i}
              className={`h-[7px] rounded-full transition-all duration-300 ${
                idx === step ? 'w-5 bg-accent' : idx < step ? 'w-[7px] bg-accent/40' : 'w-[7px] bg-line'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const DrLoAvatar: React.FC<{ size: number }> = ({ size }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full bg-accent p-[3px]">
      <div className="rounded-full w-full h-full bg-card" />
    </div>
    <img
      src="/dr-lo.png"
      alt="Dr. Lô"
      className="absolute rounded-full object-cover"
      style={{
        inset: Math.round(size * 0.065),
        width: `calc(100% - ${Math.round(size * 0.13)}px)`,
        height: `calc(100% - ${Math.round(size * 0.13)}px)`,
        objectPosition: 'top center',
      }}
    />
    <div
      className="absolute flex items-center justify-center rounded-full bg-accent border-2 border-card"
      style={{
        bottom: size > 60 ? 4 : 1,
        right: size > 60 ? 4 : 1,
        width: size > 60 ? 26 : 16,
        height: size > 60 ? 26 : 16,
      }}
    >
      <Brain size={size > 60 ? 14 : 9} className="text-white" />
    </div>
  </div>
);

export default OnboardingProfile;
