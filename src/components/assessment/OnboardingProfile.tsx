import React, { useState, useEffect } from 'react';
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
  emoji: string;
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
    drLoSays: "Avant tout — comment tu t'appelles ? 😊",
    placeholder: "Ton prénom...",
  },
  {
    key: 'age',
    type: 'choice',
    drLoSays: "Tu as quel âge ?",
    options: [
      { value: '18-25', label: '18 – 25 ans', emoji: '🌱' },
      { value: '26-35', label: '26 – 35 ans', emoji: '🔥' },
      { value: '36-45', label: '36 – 45 ans', emoji: '💫' },
      { value: '46-55', label: '46 – 55 ans', emoji: '🌿' },
      { value: '55+',   label: '55 ans et plus', emoji: '🌳' },
    ],
  },
  {
    key: 'genre',
    type: 'choice',
    drLoSays: 'Tu es ?',
    options: [
      { value: 'homme', label: 'Homme', emoji: '👨' },
      { value: 'femme', label: 'Femme', emoji: '👩' },
    ],
  },
  {
    key: 'situation_relationnelle',
    type: 'choice',
    drLoSays: "Et ta situation relationnelle en ce moment ?",
    options: [
      { value: 'celibataire',    label: 'Célibataire',                  emoji: '🦋' },
      { value: 'en_couple',      label: 'En couple',                    emoji: '💑' },
      { value: 'marie',          label: 'Marié(e)',                     emoji: '💍' },
      { value: 'polygamie',      label: 'En situation de polygamie',    emoji: '🏡' },
      { value: 'separe_divorce', label: 'Séparé(e) / Divorcé(e)',       emoji: '🍃' },
      { value: 'veuf',           label: 'Veuf(ve)',                     emoji: '🕊️' },
      { value: 'complique',      label: "C'est compliqué 😅",           emoji: '🤔' },
    ],
  },
  {
    key: 'deuil',
    type: 'choice',
    drLoSays: "Est-ce que tu as vécu la perte d'un proche — un décès, une rupture douloureuse, un deuil important ?",
    options: [
      { value: 'recent', label: "Oui, et c'est encore récent (moins d'1 an)", emoji: '🤍' },
      { value: 'ancien', label: "Oui, mais c'était il y a longtemps",          emoji: '💙' },
      { value: 'non',    label: "Non, pas vraiment",                           emoji: '✅' },
    ],
  },
  {
    key: 'evenement_traumatisant',
    type: 'choice',
    drLoSays: "Est-ce que tu as vécu un événement particulièrement difficile ou traumatisant dans ta vie ?",
    options: [
      { value: 'oui', label: 'Oui',                                             emoji: '💪' },
      { value: 'non', label: 'Non',                                             emoji: '✅' },
      { value: 'np',  label: "Je préfère ne pas répondre pour l'instant",       emoji: '🤐' },
    ],
  },
  {
    key: 'situation_mariage',
    type: 'choice',
    drLoSays: "As-tu déjà été marié(e) ou tu l'es actuellement ?",
    options: [
      { value: 'actuellement',   label: 'Oui, actuellement marié(e)', emoji: '💍' },
      { value: 'plus_maintenant', label: 'Oui, mais plus maintenant', emoji: '🍃' },
      { value: 'jamais',          label: 'Non, jamais',               emoji: '🦋' },
    ],
  },
  {
    key: 'enfants',
    type: 'choice',
    drLoSays: "Est-ce que tu as des enfants ?",
    options: [
      { value: 'oui',   label: 'Oui',             emoji: '👨‍👩‍👦' },
      { value: 'non',   label: 'Non',             emoji: '✅' },
      { value: 'perte', label: "J'ai perdu un enfant 🤍", emoji: '🕊️' },
    ],
  },
];

// ── Styles ──────────────────────────────────────────────────────────────────

const PAGE_BG: React.CSSProperties = {
  minHeight: '100vh',
  background: '#F8FAFF',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
};

const CARD: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1.5px solid rgba(255,255,255,0.65)',
  borderRadius: 28,
  boxShadow: '0 8px 40px rgba(59,130,246,0.10), 0 2px 8px rgba(0,0,0,0.04)',
  padding: '28px 24px 24px',
  position: 'relative' as const,
  zIndex: 1,
};

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
      <div style={PAGE_BG}>
        <Blob1 /><Blob2 />
        <div style={CARD}>
          {/* Dr. Lô avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <DrLoAvatar size={96} />
          </div>

          <h1 style={{
            margin: '0 0 10px',
            fontSize: 22, fontWeight: 800, textAlign: 'center',
            background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Avant de commencer...
          </h1>
          <p style={{
            margin: '0 0 24px',
            fontSize: 14, lineHeight: 1.65, color: '#475569', textAlign: 'center',
          }}>
            On a besoin d'apprendre à te connaître un peu. Pas de panique — c'est rapide et ça va vraiment personnaliser ton expérience 😊
          </p>

          <div style={{
            background: 'rgba(59,130,246,0.06)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 24,
            border: '1px solid rgba(59,130,246,0.12)',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              ✅ 8 questions rapides<br />
              ✅ Tes réponses restent sur ton appareil<br />
              ✅ Les évaluations s'adaptent à ton profil
            </p>
          </div>

          <button
            onClick={() => setStep(1)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
              color: 'white', fontWeight: 700, fontSize: 15,
              padding: '14px 0', border: 'none',
              borderRadius: 16, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(59,130,246,0.28)',
            }}
          >
            C'est parti ! →
          </button>
        </div>
      </div>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────

  if (step === 9) {
    return (
      <div style={PAGE_BG}>
        <Blob1 /><Blob2 />
        <div style={{ ...CARD, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h2 style={{
            margin: '0 0 8px', fontSize: 22, fontWeight: 800,
            background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Parfait{prenom ? `, ${prenom}` : ''} !
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            Ton profil est prêt. Les évaluations sont maintenant personnalisées pour toi 🧠
          </p>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────

  if (!currentQ) return null;

  return (
    <div style={PAGE_BG}>
      <Blob1 /><Blob2 />

      {/* Progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        height: 4, background: '#E2E8F0',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg,#3B82F6,#2DD4BF)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={CARD}>
        {/* Step counter */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18,
        }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94A3B8', fontSize: 13, fontWeight: 600, padding: 0,
              }}
            >
              ← Retour
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
            {step} / {totalQuestions}
          </span>
        </div>

        {/* Dr. Lô speech bubble */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
          <DrLoAvatar size={48} />
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.95)',
            border: '1.5px solid rgba(59,130,246,0.18)',
            borderRadius: '16px 16px 16px 4px',
            padding: '12px 14px',
            boxShadow: '0 3px 14px rgba(59,130,246,0.10)',
            position: 'relative',
          }}>
            {/* Tail */}
            <span style={{
              position: 'absolute', top: 16, left: -8,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '9px solid rgba(255,255,255,0.95)',
            }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0A2342', lineHeight: 1.55 }}>
              {currentQ.drLoSays}
            </p>
          </div>
        </div>

        {/* ── Text input ── */}
        {currentQ.type === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              autoFocus
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextNext()}
              placeholder={currentQ.placeholder}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 16, fontWeight: 600,
                borderRadius: 14,
                border: '1.5px solid rgba(59,130,246,0.25)',
                background: 'rgba(255,255,255,0.7)',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0A2342',
              }}
            />
            <button
              onClick={handleTextNext}
              disabled={!textValue.trim()}
              style={{
                background: textValue.trim()
                  ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
                  : '#E2E8F0',
                color: textValue.trim() ? 'white' : '#94A3B8',
                fontWeight: 700, fontSize: 14,
                padding: '13px 0', border: 'none',
                borderRadius: 14, cursor: textValue.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── Choice options ── */}
        {currentQ.type === 'choice' && currentQ.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentQ.options.map(opt => {
              const isSelected = selecting === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChoiceSelect(currentQ, opt.value)}
                  disabled={selecting !== null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    border: isSelected
                      ? '1.5px solid #3B82F6'
                      : '1.5px solid rgba(59,130,246,0.15)',
                    borderRadius: 14,
                    background: isSelected
                      ? 'linear-gradient(135deg,rgba(59,130,246,0.10),rgba(45,212,191,0.08))'
                      : 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                    transition: 'all 0.18s ease',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{opt.emoji}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: isSelected ? '#2563EB' : '#0A2342',
                    lineHeight: 1.4,
                  }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span style={{ marginLeft: 'auto', fontSize: 16 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 20, zIndex: 1 }}>
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const idx = i + 1;
          return (
            <div key={i} style={{
              width: idx === step ? 20 : 7,
              height: 7,
              borderRadius: 4,
              background: idx < step
                ? 'rgba(59,130,246,0.4)'
                : idx === step
                ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
                : 'rgba(0,0,0,0.10)',
              transition: 'all 0.3s ease',
            }} />
          );
        })}
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const DrLoAvatar: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%', padding: 3,
      background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
    }}>
      <div style={{ borderRadius: '50%', width: '100%', height: '100%', background: 'white' }} />
    </div>
    <img
      src="/dr-lo.png"
      alt="Dr. Lô"
      style={{
        position: 'absolute', inset: Math.round(size * 0.065),
        width: `calc(100% - ${Math.round(size * 0.13)}px)`,
        height: `calc(100% - ${Math.round(size * 0.13)}px)`,
        borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center',
      }}
    />
    <div style={{
      position: 'absolute', bottom: size > 60 ? 4 : 1, right: size > 60 ? 4 : 1,
      background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
      borderRadius: '50%',
      width: size > 60 ? 26 : 16, height: size > 60 ? 26 : 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 60 ? 13 : 8,
      border: '2px solid white',
    }}>
      🧠
    </div>
  </div>
);

const Blob1: React.FC = () => (
  <div style={{
    position: 'fixed', top: '-10%', right: '-5%',
    width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(circle,rgba(59,130,246,0.09) 0%,transparent 70%)',
  }} />
);

const Blob2: React.FC = () => (
  <div style={{
    position: 'fixed', bottom: '-10%', left: '-5%',
    width: 350, height: 350, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(circle,rgba(45,212,191,0.08) 0%,transparent 70%)',
  }} />
);

export default OnboardingProfile;
