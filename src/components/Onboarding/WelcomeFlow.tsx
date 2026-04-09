import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingState, markWelcomeCompleted, resetWelcome } from '../../services/onboardingService';
import { WELCOME_SLIDES } from '../../utils/onboardingConfig';
import { getOnboardingProfile } from '../../utils/onboardingProfile';

const DR_LO_PHOTO = '/dr-lo.png';

const WelcomeFlow: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [checked, setChecked] = useState(false);

  // ── Check si le welcome doit s'afficher ───────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || checked) return;
    setChecked(true);

    getOnboardingState(currentUser.id).then(state => {
      if (!state || !state.welcome_completed) {
        // Léger délai pour laisser la page charger
        setTimeout(() => setVisible(true), 600);
      }
    });
  }, [isAuthenticated, currentUser?.id, checked]);

  // ── Écouter le replay depuis HelpButton ───────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!currentUser?.id) return;
      resetWelcome(currentUser.id).then(() => {
        setSlideIndex(0);
        setVisible(true);
      });
    };
    window.addEventListener('he:replay-welcome', handler);
    return () => window.removeEventListener('he:replay-welcome', handler);
  }, [currentUser?.id]);

  const complete = useCallback(async () => {
    setVisible(false);
    if (currentUser?.id) {
      await markWelcomeCompleted(currentUser.id);
    }
  }, [currentUser?.id]);

  const goNext = useCallback(async () => {
    if (animating) return;
    if (slideIndex >= WELCOME_SLIDES.length - 1) {
      await complete();
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setSlideIndex(i => i + 1);
      setAnimating(false);
    }, 220);
  }, [animating, slideIndex, complete]);

  if (!visible) return null;

  const slide = WELCOME_SLIDES[slideIndex];
  const onboarding = getOnboardingProfile();
  const prenom = onboarding?.prenom || currentUser?.name?.split(' ')[0] || '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #F0FDF4 0%, #EFF6FF 50%, #FDF4FF 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Bouton Passer */}
      {slideIndex < WELCOME_SLIDES.length - 1 && (
        <button
          onClick={complete}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'transparent', border: 'none',
            color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Passer
        </button>
      )}

      {/* Contenu slide */}
      <div
        style={{
          maxWidth: 400, width: '100%', textAlign: 'center',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}
      >
        {/* Photo Dr Lô + illustration */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, boxShadow: '0 8px 32px rgba(59,130,246,0.25)',
            margin: '0 auto',
          }}>
            <img
              src={DR_LO_PHOTO}
              alt="Dr Lô"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.style.fontSize = '42px';
                (e.target as HTMLImageElement).parentElement!.textContent = slide.illustration;
              }}
            />
          </div>
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 36, height: 36, borderRadius: '50%',
            background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {slide.illustration}
          </div>
        </div>

        {/* Titre */}
        <h1 style={{
          margin: '0 0 8px', fontSize: 26, fontWeight: 900, color: '#0A2342', lineHeight: 1.2,
        }}>
          {slideIndex === 0 && prenom ? `Bienvenue ${prenom} 👋` : slide.titre}
        </h1>

        {/* Points */}
        {slide.contenu && (
          <div style={{
            background: 'white', borderRadius: 16,
            border: '1px solid rgba(59,130,246,0.12)',
            padding: '14px 18px', marginBottom: 16,
            boxShadow: '0 2px 12px rgba(59,130,246,0.07)',
            textAlign: 'left',
          }}>
            {slide.contenu.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', fontSize: 14, color: '#374151', fontWeight: 500 }}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Citation Dr Lô */}
        <div style={{
          background: 'white', borderRadius: 16,
          border: '1px solid rgba(59,130,246,0.12)',
          padding: '14px 18px', marginBottom: 32,
          boxShadow: '0 2px 12px rgba(59,130,246,0.07)',
          position: 'relative',
        }}>
          {/* Bulle de speech triangle */}
          <div style={{
            position: 'absolute', top: -8, left: 24,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid rgba(59,130,246,0.12)',
          }} />
          <div style={{
            position: 'absolute', top: -6, left: 25,
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderBottom: '7px solid white',
          }} />
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.65, fontStyle: 'italic' }}>
            "{slide.description}"
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>
            — Dr Lô 🩺
          </p>
        </div>

        {/* Bouton principal */}
        <button
          onClick={goNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {slide.bouton}
        </button>
      </div>

      {/* Indicateurs de progression */}
      <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
        {WELCOME_SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === slideIndex ? 24 : 8,
              height: 8, borderRadius: 4,
              background: i === slideIndex
                ? 'linear-gradient(135deg, #3B82F6, #10B981)'
                : 'rgba(59,130,246,0.2)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Numéro slide */}
      <p style={{ marginTop: 12, fontSize: 11, color: '#94A3B8' }}>
        {slideIndex + 1} / {WELCOME_SLIDES.length}
      </p>
    </div>
  );
};

export default WelcomeFlow;
