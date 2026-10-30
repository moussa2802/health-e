/**
 * RoutinePage — /routine : « Ma routine ». Les outils que la personne est en train d'APPRENDRE (3 à 14 jours au choix de Dr Lô),
 * 3 places au plus. Quand un apprentissage est fini, la place se libère et l'outil passe dans la boîte à outils.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { localDay, myPractices, PLACES_MAX, type Mine, type MineItem } from '../../services/practiceService';
import { pageTitle, pill, Segments } from './outilsShared';

const ctaFull = (primary: string): React.CSSProperties => ({ minHeight: 48, borderRadius: 999, border: 0, background: primary, color: DC.ink, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' });
const ctaLine: React.CSSProperties = { minHeight: 48, borderRadius: 999, border: '1px solid rgba(242,182,109,.6)', background: 'transparent', color: '#F2B66D', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' };

const LearningCard: React.FC<{ it: MineItem; primary: string }> = ({ it, primary }) => {
  const l = it.learning;
  const today = localDay(0);
  const doneToday = !!l && l.days.includes(today);
  const ready = !!l?.ready;
  const carnet = it.type === 'carnet';
  const label = ready ? 'Voir mon bilan' : carnet ? (doneToday ? 'Modifier ce soir' : 'Remplir ce soir') : doneToday ? 'Refaire' : 'Faire maintenant';
  const hint = ready ? 'Apprentissage terminé : choisis ce que tu en fais.'
    : doneToday ? 'C\'est fait pour aujourd\'hui. À demain.'
    : l && l.moins === 0 && l.mieux > 0 ? `${it.minutes} min. Jusqu'ici, tu t'es senti mieux ${l.mieux} fois sur ${l.done}.`
    : `${it.minutes} min.`;
  return (
    <section aria-label={it.title} style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={pill(carnet ? '#F2B66D' : '#9DBFAF')}>{carnet ? `Carnet de ${l?.of ?? it.learnDays} jours` : 'Apprentissage'}</span>
        {l && <span style={{ fontSize: 13, color: DC.muted }}>{ready ? 'Terminé' : `Jour ${l.day} sur ${l.of}`}</span>}
      </div>
      <b style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: DC.title }}>{it.title}</b>
      {l && l.of > 0 && <Segments done={l.done} of={l.of} color={carnet ? '#F2B66D' : '#9DBFAF'} />}
      <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.4 }}>{hint}</p>
      <Link to={`/pratique/${it.id}?from=/routine`} className="drl-btn" style={ready || !doneToday ? ctaFull(primary) : ctaLine}>{label}</Link>
    </section>
  );
};

const RoutinePage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [mine, setMine] = useState<Mine | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent('/routine')}`, { replace: true }); }, [authReady, isAuthenticated, navigate]);
  useEffect(() => { if (isAuthenticated) myPractices().then(setMine).catch(e => setError(e instanceof Error ? e.message : 'Erreur')); }, [isAuthenticated]);
  if (!authReady || !isAuthenticated) return null;
  const used = mine?.places.used ?? 0;
  const free = Math.max(0, PLACES_MAX - used);
  return (
    <DrLoShell back={{ to: '/espace', label: 'Mon espace' }} palette={palette}>
      <h1 style={pageTitle}>Ma routine</h1>
      {error && <p role="alert" style={{ marginTop: 16, color: '#F09A7A', fontSize: 15 }}>{error}</p>}
      {!mine && !error && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 50 }}><Loader2 className="animate-spin" aria-label="Chargement" /></div>}
      {mine && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 14, color: DC.soft }}>
            <span style={{ display: 'flex', gap: 6 }} aria-hidden="true">
              {Array.from({ length: PLACES_MAX }, (_, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', boxSizing: 'border-box', background: i < used ? '#F2B66D' : 'transparent', border: i < used ? 0 : '2px solid #BFB3A3' }} />)}
            </span>
            <span>{used} place{used > 1 ? 's' : ''} sur {PLACES_MAX} utilisée{used > 1 ? 's' : ''}</span>
          </div>
          {mine.learning.map(it => <LearningCard key={it.id} it={it} primary={palette.primary} />)}
          {free > 0 && (
            <section style={{ marginTop: 12, padding: 14, borderRadius: 18, border: '2px dashed rgba(243,233,220,.25)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <b style={{ fontSize: 15, color: DC.soft }}>{free > 1 ? `${free} places sont libres` : 'Une place est libre'}</b>
              <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.45 }}>
                {mine.learning.length ? 'Tu peux apprendre un autre outil en même temps.' : 'Choisis un outil à apprendre : quelques jours suffisent, ensuite il reste dans ta boîte à outils.'}
              </p>
              <Link to="/outils" style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: palette.accent }}>Trouver un outil</Link>
            </section>
          )}
          <p style={{ margin: '18px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>
            Un outil occupe une place seulement le temps de l'apprendre. Ensuite, il va dans <Link to="/boite-a-outils" style={{ color: palette.accent, fontWeight: 700 }}>ta boîte à outils</Link> et tu l'utilises quand tu en as besoin.
          </p>
        </>
      )}
    </DrLoShell>
  );
};

export default RoutinePage;
