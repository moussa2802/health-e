/**
 * DomainePage — détail d'un domaine de « Mon espace bien-être » (/espace/mental, /espace/social,
 * /espace/intime), dans le même thème que l'accueil : on ne « change plus de site » en touchant
 * un domaine. Chaque test : fait (repère + date) ou à faire, et une action avec Dr Lô.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Crown, Heart, Lock, Sparkles, Users } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getAllGuestResults } from '../../utils/guestSession';
import { BONUS_SCALES, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getGenderHiddenIds, getGreyedScales } from '../../utils/scaleVisibility';
import { getSexualHealthFilter, isSexualFilterComplete } from '../../utils/sexualHealthFilter';
import { toDate } from '../../utils/drLoGuide';
import { trackAccueil } from '../../utils/accueilTracking';
import type { AssessmentScale, ScaleResult } from '../../types/assessment';

type Domaine = 'mental' | 'social' | 'intime';

const TITLES: Record<Domaine, { title: string; intro: string; color: string }> = {
  mental: { title: 'Mental', intro: 'Ce que tes tests disent de toi, pièce par pièce. Touche un test pour le voir ou le faire avec Dr Lô.', color: DC.sage },
  social: { title: 'Social', intro: 'Toi et les autres : ce que tes proches savent de toi, et avec qui tu vibres.', color: DC.social },
  intime: { title: 'Intime', intro: 'Ta vie intime, en toute discrétion. Rien de cette partie n\'est jamais partagé sans ton accord.', color: DC.intime },
};

/** Couleur douce selon le repère (jamais de rouge vif : des tendances, pas des notes). */
function tone(sev?: string): string {
  if (sev === 'severe' || sev === 'alert') return '#E8A0A0';
  if (sev === 'moderate') return DC.gold;
  if (sev === 'mild') return '#E7D39A';
  return DC.ok;
}

function since(d: Date | null): string {
  if (!d) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (days <= 0) return 'aujourd\'hui';
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const m = Math.floor(days / 30);
  return `il y a ${m} mois`;
}

/** Ordre des tests par leur numéro (P1, P2… / V1… / B1…), celui que Dr Lô cite dans ses vidéos. */
const codeNum = (c?: string) => Number((c ?? '').replace(/\D/g, '')) || 999;
const byCode = (a: AssessmentScale, b: AssessmentScale) => codeNum(a.code) - codeNum(b.code);

const h2: React.CSSProperties = { margin: '0 0 10px', fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title };

const DomainePage: React.FC = () => {
  const { domaine } = useParams<{ domaine: string }>();
  const navigate = useNavigate();
  const palette = usePalette();
  const { currentUser, isAuthenticated, authReady } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const ob = getOnboardingProfile();
  const [results, setResults] = useState<Record<string, ScaleResult>>({});
  const [defis, setDefis] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const d = (['mental', 'social', 'intime'].includes(domaine ?? '') ? domaine : null) as Domaine | null;

  useEffect(() => {
    if (!d || !authReady) return;
    let off = false;
    trackAccueil('espace_view', { guest: !uid, domaine: d });
    if (!uid) { setResults(getAllGuestResults()); setLoaded(true); return () => { off = true; }; }
    getProfileProgress(uid).then(p => {
      if (off) return;
      setResults(p.scaleResults ?? {});
      setDefis(p.activeDefis?.length ?? 0);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { off = true; };
  }, [d, uid, authReady]);

  if (!d) return <Navigate to="/espace" replace />;
  const meta = TITLES[d];

  const hidden = ob ? getGenderHiddenIds(ob) : [];
  const greyed = ob ? getGreyedScales(ob, d === 'intime' ? getSexualHealthFilter() : null) : {};

  const startWithDrLo = (id: string) => {
    trackAccueil('go', { to: 'test', from: `espace_${d}` });
    navigate('/', { state: { prescribe: id } });
  };
  const startIntime = (id: string) => {
    trackAccueil('go', { to: 'test_intime', from: 'espace_intime' });
    // Première fois : la page Vie intime pose ses questions de situation (porte d'accès dédiée)
    navigate(isSexualFilterComplete() ? `/assessment/test/${id}` : '/assessment/sexual');
  };

  const row = (s: AssessmentScale, intime = false) => {
    const m = getScaleMeta(s.id);
    const r = results[s.id];
    const at = r ? toDate((r as { completedAt?: unknown }).completedAt) : null;
    const g = greyed[s.id];
    const isOpen = open === s.id;
    const Icon = m.icon;
    return (
      <li key={s.id} style={{ ...card, padding: 0, overflow: 'hidden', opacity: g && !r ? 0.6 : 1 }}>
        <button onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="drl-btn"
          style={{ width: '100%', minHeight: 60, padding: '12px 14px', border: 0, background: 'transparent', color: DC.text, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color={meta.color} aria-hidden="true" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              {s.code && <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}66`, borderRadius: 6, padding: '1px 6px', letterSpacing: '.03em' }}>{s.code}</span>}
              {m.label}
            </span>
            <span style={{ display: 'block', fontSize: 12.5, marginTop: 2, color: r ? tone(r.interpretation?.severity) : DC.faint }}>
              {r ? `${r.interpretation?.label ?? 'Fait'}${at ? ` · ${since(at)}` : ''}` : g ? 'Ne te concerne pas pour l\'instant' : 'À découvrir'}
            </span>
          </span>
          <ChevronDown size={18} color={DC.muted} aria-hidden="true" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        {isOpen && (
          <div className="drl-in" style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: DC.soft }}>{m.description}</p>
            {r?.interpretation?.description && (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: DC.muted }}>{r.interpretation.description}</p>
            )}
            {g && !r && <p style={{ margin: 0, fontSize: 12.5, color: DC.faint }}>{g.reason}.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button onClick={() => (intime ? startIntime(s.id) : startWithDrLo(s.id))} className="drl-btn"
                style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {r ? 'Le refaire' : intime ? 'Faire ce test' : 'Le faire avec Dr Lô'}
              </button>
              {r && (
                <button onClick={() => navigate(`/assessment/${intime ? 'sexual' : 'mental'}`)} className="drl-btn"
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Détail et conseils
                </button>
              )}
            </div>
          </div>
        )}
      </li>
    );
  };

  const list = (scales: AssessmentScale[], intime = false) => (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {scales.filter(s => !hidden.includes(s.id)).slice().sort(byCode).map(s => row(s, intime))}
    </ul>
  );

  const doneOf = (scales: AssessmentScale[]) => scales.filter(s => !hidden.includes(s.id) && results[s.id]).length;
  const totalOf = (scales: AssessmentScale[]) => scales.filter(s => !hidden.includes(s.id)).length;

  return (
    <DrLoShell back={{ to: '/espace', label: 'Retour à mon espace' }} genre={ob?.genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Mon espace bien-être</p>
        <h1 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{meta.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.55, color: DC.soft }}>{meta.intro}</p>
      </div>

      {!loaded && <p style={{ marginTop: 20, color: DC.faint }}>…</p>}

      {loaded && d === 'mental' && (
        <>
          <section style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={h2}>Ton portrait psychologique</h2>
              <span style={{ fontSize: 12.5, color: DC.faint }}>{doneOf(MENTAL_HEALTH_SCALES)} / {totalOf(MENTAL_HEALTH_SCALES)}</span>
            </div>
            {list(MENTAL_HEALTH_SCALES)}
          </section>
          <section style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={h2}>Pour aller plus loin</h2>
              <span style={{ fontSize: 12.5, color: DC.faint }}>{doneOf(BONUS_SCALES)} / {totalOf(BONUS_SCALES)}</span>
            </div>
            {list(BONUS_SCALES)}
          </section>
          <Link to="/assessment/totem" className="drl-btn" style={{ ...card, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, color: DC.text, textDecoration: 'none' }}>
            <Sparkles size={22} color={DC.gold} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Mon totem et l'analyse de Dr Lô</span>
              <span style={{ display: 'block', fontSize: 12.5, color: DC.muted }}>La synthèse de tout ton portrait</span>
            </span>
            <ArrowRight size={18} color={DC.muted} aria-hidden="true" />
          </Link>
        </>
      )}

      {loaded && d === 'social' && (
        <section style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: Crown, title: 'Le Défi · Kan moo ma gën a xam ?', text: defis ? `${defis} défi${defis > 1 ? 's' : ''} en cours. Tes proches devinent tes réponses : qui te connaît le mieux ?` : 'Tes proches devinent tes réponses, et tu découvres qui te connaît le mieux.', cta: 'Lancer un défi avec Dr Lô', flow: 'defi' as const, extra: defis ? { label: 'Voir mes défis', to: '/defi' } : null },
            { icon: Users, title: 'Compatibilité', text: 'Partenaire, crush, ami : partage ton code, l\'autre fait ses tests, et Dr Lô compare vos profils.', cta: 'Comparer avec Dr Lô', flow: 'compat' as const, extra: { label: 'Mes comparaisons', to: '/assessment/compatibility' } },
          ].map(c => (
            <div key={c.title} style={{ ...card, borderColor: `${DC.social}55`, background: `${DC.social}10` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <c.icon size={20} color={DC.social} aria-hidden="true" />
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{c.title}</span>
              </div>
              <p style={{ margin: '8px 0 12px', fontSize: 13.5, lineHeight: 1.5, color: DC.soft }}>{c.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => navigate('/', { state: uid ? { flow: c.flow } : { signup: true } })} className="drl-btn"
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {uid ? c.cta : 'Créer mon espace d\'abord'} <ArrowRight size={16} aria-hidden="true" />
                </button>
                {uid && c.extra && (
                  <button onClick={() => navigate(c.extra!.to)} className="drl-btn"
                    style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {c.extra.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {loaded && d === 'intime' && (
        uid ? (
          <section style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={h2}>Ta vie intime</h2>
              <span style={{ fontSize: 12.5, color: DC.faint }}>{doneOf(SEXUAL_HEALTH_SCALES)} / {totalOf(SEXUAL_HEALTH_SCALES)}</span>
            </div>
            {list(SEXUAL_HEALTH_SCALES, true)}
          </section>
        ) : (
          <section style={{ ...card, marginTop: 18, borderColor: `${DC.intime}55`, background: `${DC.intime}10` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={18} color={DC.intime} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Avec ton espace personnel</span>
            </div>
            <p style={{ margin: '8px 0 12px', fontSize: 13.5, lineHeight: 1.5, color: DC.soft }}>
              Pour protéger ce qui est intime, ces tests se font dans ton espace. C'est gratuit et ça prend 10 secondes.
            </p>
            <button onClick={() => navigate('/', { state: { signup: true } })} className="drl-btn"
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Heart size={16} aria-hidden="true" /> Créer mon espace
            </button>
          </section>
        )
      )}

      <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: DC.faint }}>
        Des repères, jamais des notes. Pas de diagnostic · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
      </p>
    </DrLoShell>
  );
};

export default DomainePage;
