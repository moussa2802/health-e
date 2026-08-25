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
    <div className="fixed inset-0 z-[9999] bg-paper flex flex-col items-center justify-center px-5 py-6">
      {/* Bouton Passer */}
      {slideIndex < WELCOME_SLIDES.length - 1 && (
        <button
          onClick={complete}
          className="absolute top-5 right-5 bg-transparent border-0 text-muted text-[13px] font-semibold cursor-pointer hover:text-ink-soft transition-colors"
        >
          Passer
        </button>
      )}

      {/* Contenu slide */}
      <div
        className="max-w-[400px] w-full text-center transition-all duration-200 ease-out"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(12px)' : 'translateY(0)',
        }}
      >
        {/* Photo Dr Lô + illustration */}
        <div className="relative inline-block mb-7">
          <div className="w-[100px] h-[100px] rounded-full bg-sage flex items-center justify-center text-[42px] shadow-lift mx-auto">
            <img
              src={DR_LO_PHOTO}
              alt="Dr Lô"
              className="w-full h-full rounded-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.style.fontSize = '42px';
                (e.target as HTMLImageElement).parentElement!.textContent = slide.illustration;
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-card shadow-lift flex items-center justify-center text-lg">
            {slide.illustration}
          </div>
        </div>

        {/* Titre */}
        <h1 className="font-display m-0 mb-2 text-[26px] font-semibold text-ink leading-tight">
          {slideIndex === 0 && prenom ? `Bienvenue ${prenom}` : slide.titre}
        </h1>

        {/* Points */}
        {slide.contenu && (
          <div className="bg-card rounded-block border border-line px-4.5 py-3.5 mb-4 shadow-soft text-left">
            {slide.contenu.map((line, i) => (
              <p key={i} className={`text-sm text-ink-soft font-medium ${i === 0 ? 'm-0' : 'mt-2 mb-0'}`}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Citation Dr Lô */}
        <div className="bg-card rounded-block border border-line px-4.5 py-3.5 mb-8 shadow-soft relative">
          {/* Bulle de speech triangle */}
          <div
            className="absolute -top-2 left-6 w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid var(--tw-color-line, #E7E4DA)',
            }}
          />
          <div
            className="absolute -top-1.5 left-[25px] w-0 h-0"
            style={{
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid white',
            }}
          />
          <p className="m-0 text-sm text-ink-soft leading-relaxed italic">
            "{slide.description}"
          </p>
          <p className="mt-2 mb-0 text-xs font-bold text-sage">
            — Dr Lô
          </p>
        </div>

        {/* Bouton principal */}
        <button
          onClick={goNext}
          className="w-full py-4 px-6 rounded-2xl border-0 bg-sage text-white text-base font-extrabold cursor-pointer shadow-lift transition-transform active:scale-[0.98]"
        >
          {slide.bouton}
        </button>
      </div>

      {/* Indicateurs de progression */}
      <div className="flex gap-2 mt-7">
        {WELCOME_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === slideIndex ? 'w-6 bg-sage' : 'w-2 bg-sage/20'
            }`}
          />
        ))}
      </div>

      {/* Numéro slide */}
      <p className="mt-3 text-[11px] text-muted">
        {slideIndex + 1} / {WELCOME_SLIDES.length}
      </p>
    </div>
  );
};

export default WelcomeFlow;
