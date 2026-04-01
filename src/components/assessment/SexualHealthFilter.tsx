import React, { useState } from 'react';
import type { SexualHealthFilter, SexualExperienceProfile } from '../../types/onboarding';
import { saveSexualHealthFilter } from '../../utils/sexualHealthFilter';

interface Props {
  onComplete: (filter: SexualHealthFilter) => void;
}

interface Choice { value: string; label: string; emoji: string; }

const Q1_OPTIONS: Choice[] = [
  { value: 'no_experience',      label: "Je n'ai jamais eu de relations sexuelles",              emoji: '🌱' },
  { value: 'partial_experience', label: "J'ai eu des expériences sans pénétration (caresses, masturbation...)", emoji: '🌿' },
  { value: 'full_experience',    label: "J'ai eu des rapports avec pénétration",                emoji: '🌸' },
  { value: 'prefer_not_answer',  label: "Je préfère ne pas répondre",                           emoji: '🤐' },
];

const Q2_OPTIONS: Choice[] = [
  { value: 'choice',       label: "C'est mon choix et je m'y sens bien",                   emoji: '✨' },
  { value: 'religion',     label: "C'est lié à ma religion ou mes valeurs",                emoji: '🙏' },
  { value: 'circumstance', label: "Ce n'est pas vraiment un choix, c'est juste comme ça", emoji: '🌊' },
  { value: 'prefer_not',   label: "Je préfère ne pas répondre",                            emoji: '🤐' },
];

const Q3_OPTIONS: Choice[] = [
  { value: 'regularly', label: "Oui, régulièrement",        emoji: '🔥' },
  { value: 'sometimes', label: "Parfois",                    emoji: '✨' },
  { value: 'rarely',    label: "Rarement ou jamais",         emoji: '🌿' },
  { value: 'unknown',   label: "Je ne sais pas vraiment",    emoji: '🤔' },
];

const SexualHealthFilterWizard: React.FC<Props> = ({ onComplete }) => {
  // step: 0=Q1, 1=Q2(conditional), 2=Q3, 3=done
  const [step, setStep] = useState(0);
  const [experienceProfile, setExperienceProfile] = useState<SexualExperienceProfile | null>(null);
  const [reasonForAbsence, setReasonForAbsence] = useState<string | null>(null);
  const [feelDesire, setFeelDesire] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const needsQ2 = experienceProfile === 'no_experience' || experienceProfile === 'partial_experience';

  const advance = (delay = 320) => {
    setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setStep(s => s + 1);
        setAnimating(false);
      }, 180);
    }, delay);
  };

  const handleQ1 = (val: string) => {
    const profile = val as SexualExperienceProfile;
    setExperienceProfile(profile);
    const skip2 = profile === 'full_experience' || profile === 'prefer_not_answer';
    if (skip2) {
      advance();
    } else {
      advance();
    }
  };

  const handleQ2 = (val: string) => {
    setReasonForAbsence(val);
    advance();
  };

  const handleQ3 = (val: string) => {
    setFeelDesire(val);
    // Build and save filter
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

  // Determine which step to show (accounting for Q2 skip)
  const effectiveStep = step === 1 && !needsQ2 ? 2 : step;

  const getTitle = () => {
    if (effectiveStep === 0) return "Adaptons les questions\nà ta réalité";
    if (effectiveStep === 1) return "Une question\nde plus…";
    if (effectiveStep === 2) return "Dernière question 😊";
    return "C'est noté !";
  };

  const totalVisibleSteps = needsQ2 ? 3 : 2;
  const currentVisible = effectiveStep >= 2 ? (needsQ2 ? 2 : 1) : effectiveStep;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFF',
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(18px)',
          border: '1.5px solid rgba(255,255,255,0.7)',
          borderRadius: 24,
          padding: '32px 28px',
          boxShadow: '0 8px 40px rgba(59,130,246,0.10)',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {step === 3 ? (
          // Completion screen
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#0A2342' }}>
              Parfait, c'est noté !
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              Les évaluations ont été adaptées à ta réalité.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg,#EC4899,#F97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                boxShadow: '0 2px 10px rgba(236,72,153,0.3)',
              }}>
                💋
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Santé sexuelle — Étape {currentVisible + 1}/{totalVisibleSteps}
                </p>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A2342', whiteSpace: 'pre-line' }}>
                  {getTitle()}
                </h2>
              </div>
            </div>

            {/* Q1 */}
            {effectiveStep === 0 && (
              <>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                  Pour mieux adapter les questions à ta réalité, dis-nous où tu en es avec ta vie sexuelle aujourd'hui — <strong>pas de jugement</strong>, juste pour qu'on te pose les bonnes questions 😊
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Q1_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleQ1(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(236,72,153,0.15)',
                        background: '#FFFFFF', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontWeight: 500, color: '#0A2342',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = '#FDF2F8'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Q2 */}
            {effectiveStep === 1 && needsQ2 && (
              <>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                  Est-ce que c'est un choix personnel, une situation liée à ta culture ou religion, ou simplement les circonstances de la vie ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Q2_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleQ2(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(236,72,153,0.15)',
                        background: '#FFFFFF', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontWeight: 500, color: '#0A2342',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = '#FDF2F8'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Q3 */}
            {effectiveStep === 2 && (
              <>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                  Est-ce que tu ressens du désir sexuel — des envies, de l'attirance, des fantasmes — <strong>même sans avoir de rapports</strong> ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Q3_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleQ3(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(236,72,153,0.15)',
                        background: '#FFFFFF', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontWeight: 500, color: '#0A2342',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = '#FDF2F8'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(236,72,153,0.15)'; (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
              {Array.from({ length: totalVisibleSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    width: i === currentVisible ? 22 : 6,
                    borderRadius: 99,
                    background: i === currentVisible
                      ? 'linear-gradient(90deg,#EC4899,#F97316)'
                      : '#E2E8F0',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{ marginTop: 20, fontSize: 11, color: '#94A3B8', textAlign: 'center', maxWidth: 340 }}>
        Tes réponses restent privées et ne sont jamais partagées.
        Elles servent uniquement à adapter les questions à ta réalité.
      </p>
    </div>
  );
};

export default SexualHealthFilterWizard;
