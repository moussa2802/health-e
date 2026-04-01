import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  saveOnboardingToProfile,
  resetUserProfile,
  createSession,
} from '../../services/evaluationService';
import {
  getGuestCount,
  getAllGuestResults,
  GUEST_MAX_TESTS,
} from '../../utils/guestSession';
import {
  isOnboardingComplete,
  getOnboardingProfile,
  saveOnboardingProfile,
} from '../../utils/onboardingProfile';
import OnboardingProfile from '../../components/assessment/OnboardingProfile';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import type { ScaleResult } from '../../types/assessment';
import type { OnboardingProfile as OnboardingProfileType } from '../../types/onboarding';

interface BonusCard {
  id: string;
  emoji: string;
  name: string;
  hook: string;
  duration: number;
  scaleId: string;
}

const BONUS_CARDS: BonusCard[] = [
  { id: 'dependance',   emoji: '💔', name: 'Dépendance affective',          hook: 'Aimes-tu trop ou juste assez ?',                        duration: 5,  scaleId: 'bonus_dependance'   },
  { id: 'narcissisme',  emoji: '🎭', name: 'Pervers narcissique',           hook: 'Es-tu vraiment toxique ou juste incompris(e) ?',        duration: 5,  scaleId: 'bonus_narcissisme'  },
  { id: 'hsp',          emoji: '🌊', name: 'Hypersensibilité (HSP)',        hook: 'Ressens-tu plus que les autres ?',                      duration: 5,  scaleId: 'bonus_hsp'          },
  { id: 'tdah',         emoji: '🔄', name: 'TDAH Adulte',                   hook: 'Ton cerveau est-il toujours en mode turbo ?',           duration: 7,  scaleId: 'bonus_tdah'         },
  { id: 'hpi',          emoji: '⚡', name: 'Haut Potentiel Intellectuel',   hook: 'Ton cerveau tourne-t-il à une vitesse différente ?',    duration: 5,  scaleId: 'bonus_hpi'          },
  { id: 'confiance',    emoji: '🦁', name: 'Confiance en soi',              hook: 'À quel point crois-tu vraiment en toi ?',               duration: 5,  scaleId: 'bonus_confiance'    },
  { id: 'personnalite', emoji: '🌪️', name: 'Trouble de personnalité',      hook: 'Est-ce que ton caractère cache quelque chose ?',        duration: 5,  scaleId: 'bonus_personnalite' },
  { id: 'manipulation', emoji: '🎭', name: 'Manipulation & Toxicité',      hook: 'Es-tu plus manipulateur(rice) que tu ne le crois ?',    duration: 7,  scaleId: 'bonus_manipulation' },
  { id: 'burnout',      emoji: '🔥', name: 'Burnout professionnel',         hook: 'Ton corps te dit-il d\'arrêter ?',                      duration: 4,  scaleId: 'bonus_burnout'      },
  { id: 'jalousie',     emoji: '😤', name: 'Jalousie',                      hook: 'La jalousie te contrôle-t-elle ?',                      duration: 5,  scaleId: 'bonus_jalousie'     },
  { id: 'eq',           emoji: '💚', name: 'Intelligence émotionnelle',     hook: 'Quel est ton vrai QE émotionnel ?',                     duration: 6,  scaleId: 'bonus_eq'           },
];

const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  // Pour les utilisateurs authentifiés, on attend la confirmation Firestore avant d'afficher l'onboarding
  // Pour les invités, on lit localStorage immédiatement (pas de Firestore)
  const [showOnboarding, setShowOnboarding] = useState(() =>
    isAuthenticated ? false : !isOnboardingComplete()
  );
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfileType | null>(
    () => getOnboardingProfile()
  );
  const [profileResults, setProfileResults] = useState<Record<string, ScaleResult>>({});
  const [bonusCompleted, setBonusCompleted] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [loadRetry, setLoadRetry] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [startingBonus, setStartingBonus] = useState<string | null>(null);

  // Invité : lire les résultats locaux
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCount(getGuestCount());
      setProfileResults(getAllGuestResults());
    }
  }, [isAuthenticated]);

  // Authentifié : charger la progression depuis Firestore
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    getOrCreateUserProfile(currentUser.id, currentUser.name)
      .then(() => getProfileProgress(currentUser.id))
      .then(p => {
        setProfileResults(p.scaleResults);
        setBonusCompleted(p.bonusCompletedCount);
        if (p.onboardingProfile) {
          // Firestore a un profil → sync localStorage et masquer l'onboarding
          saveOnboardingProfile(p.onboardingProfile as Parameters<typeof saveOnboardingProfile>[0]);
          setOnboardingProfile(p.onboardingProfile as OnboardingProfileType);
          setShowOnboarding(false);
        } else if (p.completedCount > 0) {
          // A déjà fait des évaluations → pas besoin d'onboarding
          setShowOnboarding(false);
        } else if (!isOnboardingComplete()) {
          // Firestore confirme : pas de profil, pas d'évaluations → afficher l'onboarding
          setShowOnboarding(true);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = msg.includes('offline') || msg.includes('unavailable') || msg.includes('permission-denied');
        if (isTransient && loadRetry < 5) {
          setTimeout(() => setLoadRetry(r => r + 1), 4000);
        }
      });
  }, [isAuthenticated, currentUser?.id, loadRetry]);

  // Gate : onboarding obligatoire
  if (showOnboarding) {
    return (
      <OnboardingProfile
        defaultPrenom={currentUser?.name ?? undefined}
        onComplete={(profile) => {
          setOnboardingProfile(profile);
          setShowOnboarding(false);
          if (isAuthenticated && currentUser) {
            resetUserProfile(currentUser.id)
              .then(() => saveOnboardingToProfile(currentUser.id, profile as unknown as Record<string, string>))
              .then(() => setLoadRetry(r => r + 1))
              .catch(() => {});
          }
        }}
      />
    );
  }

  const prenom = onboardingProfile?.prenom;
  const mentalCompleted = MENTAL_HEALTH_SCALES.filter(s => profileResults[s.id]).length;
  const sexualCompleted = SEXUAL_HEALTH_SCALES.filter(s => profileResults[s.id]).length;
  const mentalTotal = MENTAL_HEALTH_SCALES.length;
  const sexualTotal = SEXUAL_HEALTH_SCALES.length;
  const bonusTotal = BONUS_SCALES.length;

  const startBonusTest = async (scaleId: string) => {
    if (!isAuthenticated || !currentUser) { setShowAuthModal(true); return; }
    setStartingBonus(scaleId);
    try {
      const session = await createSession(currentUser.id, [scaleId]);
      navigate(`/assessment/quiz/${session.id}`);
    } catch { /* silencieux */ } finally {
      setStartingBonus(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        padding: '14px 0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 600, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
              {prenom ? `Hey ${prenom} 👋` : 'Mes évaluations'}
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748B' }}>
              24 outils cliniquement validés
            </p>
          </div>
          {!isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {Array.from({ length: GUEST_MAX_TESTS }).map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < guestCount
                    ? 'linear-gradient(135deg,#3B82F6,#2DD4BF)'
                    : 'rgba(59,130,246,0.18)',
                  border: '1.5px solid rgba(59,130,246,0.25)',
                }} />
              ))}
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
                {guestCount}/{GUEST_MAX_TESTS}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Bannière invité */}
        {!isAuthenticated && (
          <div style={{
            background: 'linear-gradient(135deg,#EFF6FF,#F0FDFA)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 12, padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, flexWrap: 'wrap', marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', fontWeight: 500 }}>
              {guestCount < GUEST_MAX_TESTS
                ? `${GUEST_MAX_TESTS - guestCount} essai${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} gratuit${GUEST_MAX_TESTS - guestCount > 1 ? 's' : ''} restant — inscris-toi pour tout sauvegarder`
                : 'Limite atteinte — crée un compte pour continuer'}
            </p>
            <Link to="/patient/access" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'linear-gradient(135deg,#3B82F6,#2DD4BF)',
              color: '#fff', fontWeight: 600, fontSize: 11,
              padding: '5px 12px', borderRadius: 14, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {guestCount >= GUEST_MAX_TESTS ? 'Créer un compte' : 'Se connecter'}
            </Link>
          </div>
        )}

        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
          Sélectionne un domaine pour commencer ou voir tes résultats :
        </p>

        {/* ── Carte Santé Mentale ── */}
        <button
          onClick={() => navigate('/assessment/mental')}
          style={{
            width: '100%', marginBottom: 14,
            background: 'white',
            border: '2px solid rgba(59,130,246,0.15)',
            borderRadius: 18, padding: '22px 24px',
            cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s ease',
            boxShadow: '0 2px 12px rgba(59,130,246,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 34 }}>🧠</span>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A2342' }}>
                  Santé Mentale
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                  Anxiété, humeur, personnalité, attachement…
                </p>
              </div>
            </div>
            <span style={{ fontSize: 22, color: '#94A3B8' }}>›</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#0A2342', fontWeight: 600 }}>
              {mentalCompleted}/{mentalTotal} évaluations
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>
              {Math.round((mentalCompleted / mentalTotal) * 100)}%
            </span>
          </div>
          <div style={{ height: 6, background: '#EFF6FF', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round((mentalCompleted / mentalTotal) * 100)}%`,
              background: 'linear-gradient(90deg,#3B82F6,#2DD4BF)',
              borderRadius: 99, transition: 'width 0.5s ease',
              minWidth: mentalCompleted > 0 ? 8 : 0,
            }} />
          </div>
        </button>

        {/* ── Carte Santé Sexuelle ── */}
        <button
          onClick={() => navigate('/assessment/sexual')}
          style={{
            width: '100%',
            background: 'white',
            border: '2px solid rgba(192,38,211,0.15)',
            borderRadius: 18, padding: '22px 24px',
            cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s ease',
            boxShadow: '0 2px 12px rgba(192,38,211,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 34 }}>💋</span>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A2342' }}>
                  Santé Sexuelle
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                  Désir, satisfaction, intimité, identité…
                </p>
              </div>
            </div>
            <span style={{ fontSize: 22, color: '#94A3B8' }}>›</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#0A2342', fontWeight: 600 }}>
              {sexualCompleted}/{sexualTotal} évaluations
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#C026D3' }}>
              {Math.round((sexualCompleted / sexualTotal) * 100)}%
            </span>
          </div>
          <div style={{ height: 6, background: '#FDF4FF', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round((sexualCompleted / sexualTotal) * 100)}%`,
              background: 'linear-gradient(90deg,#C026D3,#EC4899)',
              borderRadius: 99, transition: 'width 0.5s ease',
              minWidth: sexualCompleted > 0 ? 8 : 0,
            }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              background: '#F0FDF4', color: '#16A34A',
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 10,
              border: '1px solid rgba(22,163,74,0.2)',
            }}>
              Confidentiel
            </span>
          </div>
        </button>

        {/* ── Section Tests Bonus ── */}
        <div style={{ marginTop: 28 }}>
          {/* Header bonus */}
          <div style={{
            background: 'linear-gradient(135deg, #1A0533 0%, #2D0A5A 50%, #1A0533 100%)',
            borderRadius: 18, padding: '20px 22px', marginBottom: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>✨</span>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>Tests Bonus</p>
                </div>
                <span style={{
                  background: 'rgba(167,139,250,0.25)', color: '#C4B5FD',
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  border: '1px solid rgba(167,139,250,0.3)',
                }}>
                  {bonusCompleted}/{bonusTotal} complétés
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                Explore des profils qui font le buzz — réservés aux membres
              </p>
            </div>
          </div>

          {/* Grille des cards bonus */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {BONUS_CARDS.map((card) => {
              const isDone = !!profileResults[card.scaleId];
              const isLoading = startingBonus === card.scaleId;
              return (
                <div
                  key={card.id}
                  style={{
                    background: '#fff',
                    border: isDone ? '2px solid rgba(124,58,237,0.25)' : '2px solid rgba(124,58,237,0.08)',
                    borderRadius: 16, padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {isDone && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                  )}
                  <span style={{ fontSize: 28 }}>{card.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#0A2342', lineHeight: 1.3 }}>{card.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontStyle: 'italic', lineHeight: 1.4 }}>"{card.hook}"</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>⏱ {card.duration} min</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '1px 6px', borderRadius: 8 }}>✨ Bonus</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startBonusTest(card.scaleId)}
                    disabled={isLoading}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 10, border: 'none',
                      background: isDone
                        ? 'rgba(124,58,237,0.08)'
                        : 'linear-gradient(135deg,#7C3AED,#EC4899)',
                      color: isDone ? '#7C3AED' : '#fff',
                      fontSize: 12, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {isLoading ? (
                      <>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Chargement…
                      </>
                    ) : isDone ? '🔄 Refaire' : 'Faire ce test →'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modal auth pour tests bonus ── */}
      {showAuthModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowAuthModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 22, maxWidth: 380, width: '100%', padding: '32px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#0A2342' }}>Tests bonus — membres uniquement</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              Les tests bonus sont réservés aux membres Healt-e. Crée ton compte gratuitement pour accéder à tous les tests et construire ton profil complet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                to="/patient/access?mode=register"
                style={{ display: 'block', padding: '13px 0', borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                onClick={() => setShowAuthModal(false)}
              >
                Créer mon compte
              </Link>
              <Link
                to="/patient/access"
                style={{ display: 'block', padding: '12px 0', borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.2)', color: '#7C3AED', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                onClick={() => setShowAuthModal(false)}
              >
                Me connecter
              </Link>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentHomePage;
