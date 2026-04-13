import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrCreateUserProfile,
  getProfileProgress,
  saveOnboardingToProfile,
  resetUserProfile,
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
import PageTooltips from '../../components/Onboarding/PageTooltips';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../../data/scales';
import type { ScaleResult } from '../../types/assessment';
import type { OnboardingProfile as OnboardingProfileType } from '../../types/onboarding';
import { useKoris } from '../../contexts/KorisContext';
import { KORIS_COSTS } from '../../services/korisService';


const AssessmentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { canAfford } = useKoris();

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

  return (
    <>
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
          {currentUser?.type === 'admin' && (
            <Link
              to="/admin/evaluations"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                color: '#3B82F6', fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}
            >
              📊 Dashboard
            </Link>
          )}
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

        {/* ── Carte Profil psychologique ── */}
        <button
          data-tooltip-id="card-mental-health"
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
                  Profil psychologique
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
              {mentalCompleted}/{mentalTotal} principales
              {bonusCompleted > 0 && (
                <span style={{ marginLeft: 6, color: '#7C3AED', fontWeight: 700 }}>
                  · {bonusCompleted}/{bonusTotal} bonus
                </span>
              )}
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

        {/* ── Carte Vie intime ── */}
        <button
          data-tooltip-id="card-intimate-life"
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
                  Vie intime
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

        {/* ── Séparateur + Compatibilité ── */}
        {isAuthenticated && (() => {
          const mainCompleted = mentalCompleted + sexualCompleted;
          const mainTotal = mentalTotal + sexualTotal;
          const isUnlocked = mainCompleted >= mainTotal;
          const compatCost = KORIS_COSTS.compatibility;
          const hasKoris = canAfford('compatibility');

          return (
            <div style={{ marginTop: 20 }}>
              <div style={{ height: 1, background: 'rgba(99,102,241,0.12)', marginBottom: 20 }} />
              <div style={{
                background: 'white',
                border: `2px solid ${isUnlocked ? 'rgba(236,72,153,0.2)' : 'rgba(148,163,184,0.2)'}`,
                borderRadius: 18, padding: '20px 24px',
                opacity: isUnlocked ? 1 : 0.7,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>💑</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A2342' }}>Compatibilité</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                      Compare ton profil avec celui de ton/ta partenaire
                    </p>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => navigate('/assessment/compatibility')}
                    style={{
                      width: '100%', padding: '12px 20px', borderRadius: 14, border: 'none',
                      background: hasKoris
                        ? 'linear-gradient(135deg, #EC4899, #8B5CF6)'
                        : 'linear-gradient(135deg, #94A3B8, #CBD5E1)',
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: hasKoris ? '0 4px 16px rgba(236,72,153,0.25)' : 'none',
                    }}
                  >
                    💑 Tester la compatibilité
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10,
                      fontSize: 12, fontWeight: 800,
                    }}>
                      <img src="/kori.png" alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                      {compatCost}
                    </span>
                  </button>
                ) : (
                  <div style={{
                    width: '100%', padding: '12px 20px', borderRadius: 14,
                    background: '#F1F5F9', textAlign: 'center',
                    fontSize: 12, color: '#64748B', fontWeight: 600,
                  }}>
                    🔒 Complète tes {mainTotal} évaluations pour débloquer ({mainCompleted}/{mainTotal})
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Mon Espace */}
        <button
          data-tooltip-id="btn-mon-espace"
          onClick={() => navigate('/mon-espace')}
          style={{
            width: '100%', padding: '18px 20px', borderRadius: 18, border: 'none',
            marginTop: 20,
            background: 'linear-gradient(135deg,#065F46 0%,#1D4ED8 100%)',
            color: '#fff', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 20px rgba(6,95,70,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: -4 }}>
              <span style={{ fontSize: 26 }}>📔</span>
              <span style={{ fontSize: 26, marginLeft: -4 }}>💬</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>🌿 Mon Espace</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                Ton journal &amp; Dr Lo rien que pour toi
              </p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 18, opacity: 0.8 }}>→</span>
          </div>
        </button>

      </div>
    </div>

    {/* Tooltips onboarding */}
    <PageTooltips pageKey="home" />
    </>
  );
};

export default AssessmentHomePage;
