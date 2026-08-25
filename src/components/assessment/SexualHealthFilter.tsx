import React, { useState } from 'react';
import { Heart, Loader2, Check } from 'lucide-react';
import type { SexualHealthFilter, SexualExperienceProfile } from '../../types/onboarding';
import { saveSexualHealthFilter } from '../../utils/sexualHealthFilter';

interface Props {
  onComplete: (filter: SexualHealthFilter) => void;
}

interface Choice { value: string; label: string; }

const Q1_OPTIONS: Choice[] = [
  { value: 'no_experience',      label: "Je n'ai jamais eu de relations sexuelles" },
  { value: 'partial_experience', label: "J'ai eu des expériences sans pénétration (caresses, masturbation...)" },
  { value: 'full_experience',    label: "J'ai eu des rapports avec pénétration" },
  { value: 'prefer_not_answer',  label: "Je préfère ne pas répondre" },
];

const Q2_OPTIONS: Choice[] = [
  { value: 'choice',       label: "C'est mon choix et je m'y sens bien" },
  { value: 'religion',     label: "C'est lié à ma religion ou mes valeurs" },
  { value: 'circumstance', label: "Ce n'est pas vraiment un choix, c'est juste comme ça" },
  { value: 'prefer_not',   label: "Je préfère ne pas répondre" },
];

const Q3_OPTIONS: Choice[] = [
  { value: 'regularly', label: "Oui, régulièrement" },
  { value: 'sometimes', label: "Parfois" },
  { value: 'rarely',    label: "Rarement ou jamais" },
  { value: 'unknown',   label: "Je ne sais pas vraiment" },
];

const SexualHealthFilterWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [experienceProfile, setExperienceProfile] = useState<SexualExperienceProfile | null>(null);
  const [reasonForAbsence, setReasonForAbsence] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const needsQ2 = experienceProfile === 'no_experience' || experienceProfile === 'partial_experience';

  const advance = (delay = 320) => {
    setTimeout(() => {
      setAnimating(true);
      setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 180);
    }, delay);
  };

  const handleQ1 = (val: string) => {
    setExperienceProfile(val as SexualExperienceProfile);
    advance();
  };

  const handleQ2 = (val: string) => {
    setReasonForAbsence(val);
    advance();
  };

  const handleQ3 = (val: string) => {
    const filter: SexualHealthFilter = {
      experienceProfile: experienceProfile!,
      reasonForAbsence: reasonForAbsence as SexualHealthFilter['reasonForAbsence'] ?? undefined,
      feelDesire: val as SexualHealthFilter['feelDesire'],
      completedAt: new Date().toISOString(),
    };
    saveSexualHealthFilter(filter);
    setStep(3);
    setTimeout(() => onComplete(filter), 800);
  };

  const effectiveStep = step === 1 && !needsQ2 ? 2 : step;

  const getTitle = () => {
    if (effectiveStep === 0) return "Adaptons les questions\nà ta réalité";
    if (effectiveStep === 1) return "Une question\nde plus…";
    if (effectiveStep === 2) return "Dernière question";
    return "C'est noté !";
  };

  const totalVisibleSteps = needsQ2 ? 3 : 2;
  const currentVisible = effectiveStep >= 2 ? (needsQ2 ? 2 : 1) : effectiveStep;

  const OptionBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-line bg-card text-left text-[13px] font-medium text-ink transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft cursor-pointer"
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-6">
      <div
        className="w-full max-w-[480px] bg-card rounded-block border border-line p-7 shadow-soft"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {step === 3 ? (
          <div className="text-center py-3">
            <div className="w-16 h-16 rounded-full bg-sage-soft flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-sage" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink mb-2">Parfait, c'est noté !</h2>
            <p className="text-sm text-muted leading-relaxed">Les évaluations ont été adaptées à ta réalité.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-soft">
                <Heart size={18} color="white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-0.5">
                  Vie intime — Étape {currentVisible + 1}/{totalVisibleSteps}
                </p>
                <h2 className="font-display text-[17px] font-bold text-ink whitespace-pre-line">{getTitle()}</h2>
              </div>
            </div>

            {effectiveStep === 0 && (
              <>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                  Pour mieux adapter les questions à ta réalité, dis-nous où tu en es avec ta vie sexuelle aujourd'hui — <strong>pas de jugement</strong>, juste pour qu'on te pose les bonnes questions.
                </p>
                <div className="flex flex-col gap-2.5">
                  {Q1_OPTIONS.map(opt => <OptionBtn key={opt.value} label={opt.label} onClick={() => handleQ1(opt.value)} />)}
                </div>
              </>
            )}

            {effectiveStep === 1 && needsQ2 && (
              <>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                  Est-ce que c'est un choix personnel, une situation liée à ta culture ou religion, ou simplement les circonstances de la vie ?
                </p>
                <div className="flex flex-col gap-2.5">
                  {Q2_OPTIONS.map(opt => <OptionBtn key={opt.value} label={opt.label} onClick={() => handleQ2(opt.value)} />)}
                </div>
              </>
            )}

            {effectiveStep === 2 && (
              <>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                  Est-ce que tu ressens du désir sexuel — des envies, de l'attirance, des fantasmes — <strong>même sans avoir de rapports</strong> ?
                </p>
                <div className="flex flex-col gap-2.5">
                  {Q3_OPTIONS.map(opt => <OptionBtn key={opt.value} label={opt.label} onClick={() => handleQ3(opt.value)} />)}
                </div>
              </>
            )}

            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: totalVisibleSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentVisible ? 'w-6 bg-accent' : 'w-1.5 bg-line'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <p className="mt-5 text-[11px] text-muted text-center max-w-[340px]">
        Tes réponses restent privées et ne sont jamais partagées.
        Elles servent uniquement à adapter les questions à ta réalité.
      </p>
    </div>
  );
};

export default SexualHealthFilterWizard;
