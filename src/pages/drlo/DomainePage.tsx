/**
 * DomainePage — l'onglet « Tests » : /espace/mental, /espace/intime et /espace/bonus se choisissent d'un bouton
 * en haut (la partie intime reste cachée tant qu'on ne l'affiche pas). /espace/social (compatibilité) reste
 * accessible par « À deux ». Chaque test : fait (repère + date) ou à faire, et une action pour le faire.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Eye, EyeOff, Heart, Lock, Users } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { getProfileProgress } from '../../services/evaluationService';
import { getTotemProgress, TOTEM_REQUIRED_SCALES } from '../../utils/totemAlgorithm';
import { getAllGuestResults } from '../../utils/guestSession';
import { BONUS_SCALES, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../../data/scales';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getGenderHiddenIds, getGreyedScales } from '../../utils/scaleVisibility';
import { getSexualHealthFilter, isSexualFilterComplete } from '../../utils/sexualHealthFilter';
import { toDate } from '../../utils/drLoGuide';
import { trackAccueil } from '../../utils/accueilTracking';
import type { AssessmentScale, ScaleResult } from '../../types/assessment';

type Domaine = 'mental' | 'social' | 'intime' | 'bonus';
const SHOW_INTIME_KEY = 'he_espace_show_intime';

const TITLES: Record<Domaine, { title: string; intro: string; color: string }> = {
  mental: { title: 'Mental', intro: 'Ce que tes tests disent de toi, pièce par pièce. Touche un test fait pour voir ton résultat, la flèche pour en savoir plus.', color: DC.sage },
  bonus: { title: 'Bonus', intro: 'Pour aller plus loin : hypersensibilité, TDAH, jalousie, burnout… des tests qui parlent de toi autrement.', color: DC.gold },
  social: { title: 'Compatibilité', intro: 'Toi et l\'autre : partenaire, crush ou ami, découvrez ce qui vous rapproche et ce qui peut coincer.', color: DC.social },
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
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const d = (['mental', 'social', 'intime', 'bonus'].includes(domaine ?? '') ? domaine : null) as Domaine | null;
  const [showIntime, setShowIntime] = useState(() => { try { return localStorage.getItem(SHOW_INTIME_KEY) === '1'; } catch { return false; } });
  const toggleIntime = () => {
    const v = !showIntime;
    setShowIntime(v);
    try { localStorage.setItem(SHOW_INTIME_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (!v && d === 'intime') navigate('/espace/mental', { replace: true });
  };

  useEffect(() => {
    if (!d || !authReady) return;
    let off = false;
    trackAccueil('espace_view', { guest: !uid, domaine: d });
    if (!uid) { setResults(getAllGuestResults()); setLoaded(true); return () => { off = true; }; }
    getProfileProgress(uid).then(p => {
      if (off) return;
      setResults(p.scaleResults ?? {});
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
    navigate('/compagnon', { state: { prescribe: id } });
  };
  const startIntime = (id: string) => {
    trackAccueil('go', { to: 'test_intime', from: 'espace_intime' });
    // Première fois : la page Vie intime pose ses questions de situation (porte d'accès dédiée)
    navigate(isSexualFilterComplete() ? `/assessment/test/${id}` : `/assessment/sexual?from=espace&test=${id}`);
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => (r ? navigate(`/espace/resultat/${s.id}`) : setOpen(isOpen ? null : s.id))} aria-label={r ? `${m.label} : voir mon résultat` : undefined} className="drl-btn"
          style={{ flex: 1, minWidth: 0, minHeight: 60, padding: '12px 4px 12px 14px', border: 0, background: 'transparent', color: DC.text, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: `${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color={meta.color} aria-hidden="true" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              {s.code && <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}66`, borderRadius: 6, padding: '1px 6px', letterSpacing: '.03em' }}>{s.code}</span>}
              {m.label}
            </span>
            <span style={{ display: 'block', fontSize: 13, marginTop: 2, color: r ? tone(r.interpretation?.severity) : DC.faint }}>
              {r ? `${r.interpretation?.label ?? 'Fait'}${at ? ` · ${since(at)}` : ''}` : g ? 'Ne te concerne pas pour l\'instant' : (TOTEM_REQUIRED_SCALES as readonly string[]).includes(s.id) ? 'Compte pour ton animal intérieur' : 'À découvrir'}
            </span>
          </span>
        </button>
        <button onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} aria-label={isOpen ? 'Replier' : 'Déplier'} className="drl-btn"
          style={{ width: 48, minHeight: 60, flexShrink: 0, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronDown size={18} color={DC.muted} aria-hidden="true" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        </div>
        {isOpen && (
          <div className="drl-in" style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>{m.description}</p>
            {r?.interpretation?.description && (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: DC.muted }}>{r.interpretation.description}</p>
            )}
            {g && !r && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>{g.reason}.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button onClick={() => (intime ? startIntime(s.id) : startWithDrLo(s.id))} className="drl-btn"
                style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {r ? 'Le refaire' : 'Faire ce test'}
              </button>
              {r && (
                <button onClick={() => navigate(`/espace/resultat/${s.id}`)} className="drl-btn"
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

  const totem = getTotemProgress(results);
  const isTests = d !== 'social';
  const segments: { id: Domaine; label: string; to: string }[] = [
    { id: 'mental', label: 'Mental', to: '/espace/mental' },
    { id: 'bonus', label: 'Bonus', to: '/espace/bonus' },
    ...(showIntime || d === 'intime' ? [{ id: 'intime' as Domaine, label: 'Intime', to: '/espace/intime' }] : []),
  ];

  return (
    <DrLoShell back={isTests ? { to: '/', label: 'Retour à l\'accueil' } : { to: '/espace/mental', label: 'Retour aux tests' }} genre={ob?.genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>{isTests ? 'Tests' : meta.title}</h1>
        {!isTests && <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>{meta.intro}</p>}
      </div>

      {isTests && loaded && (
        <>
          <Link to={totem.missing.length === 0 ? '/assessment/totem' : '#'} onClick={e => { if (totem.missing.length > 0) e.preventDefault(); }} className="drl-btn"
            style={{ ...card, marginTop: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: DC.text, borderColor: 'rgba(242,182,109,.5)', background: 'rgba(242,182,109,.09)', cursor: totem.missing.length === 0 ? 'pointer' : 'default' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: 16, color: DC.title }}>Ton animal intérieur</b>
              <span style={{ fontSize: 14, fontWeight: 700, color: DC.gold }}>{totem.missing.length === 0 ? 'Prêt : le découvrir' : `${totem.completed} tests sur ${totem.total}`}</span>
            </span>
            <span style={{ display: 'flex', gap: 5 }} role="img" aria-label={`${totem.completed} tests faits sur ${totem.total}`}>
              {Array.from({ length: totem.total }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < totem.completed ? DC.gold : 'rgba(255,255,255,.18)' }} />
              ))}
            </span>
          </Link>

          <div role="tablist" aria-label="Domaines" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))`, padding: 4, borderRadius: 999, border: `1px solid ${DC.line}`, gap: 4 }}>
            {segments.map(sg => (
              <button key={sg.id} type="button" role="tab" aria-selected={d === sg.id} onClick={() => { if (d !== sg.id) navigate(sg.to, { replace: true }); }} className="drl-btn"
                style={{ minHeight: 44, borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', fontWeight: d === sg.id ? 700 : 500, background: d === sg.id ? palette.primary : 'transparent', color: d === sg.id ? DC.ink : DC.soft }}>
                {sg.label}
              </button>
            ))}
          </div>
        </>
      )}

      {!loaded && <p style={{ marginTop: 20, color: DC.faint }}>…</p>}

      {loaded && d === 'mental' && (
        <section style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={h2}>Ton portrait psychologique</h2>
            <span style={{ fontSize: 13, color: DC.faint }}>{doneOf(MENTAL_HEALTH_SCALES)} / {totalOf(MENTAL_HEALTH_SCALES)}</span>
          </div>
          {list(MENTAL_HEALTH_SCALES)}
        </section>
      )}

      {loaded && d === 'bonus' && (
        <section style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={h2}>Pour aller plus loin</h2>
            <span style={{ fontSize: 13, color: DC.faint }}>{doneOf(BONUS_SCALES)} / {totalOf(BONUS_SCALES)}</span>
          </div>
          {list(BONUS_SCALES)}
        </section>
      )}

      {loaded && d === 'social' && (
        <section style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: Users, title: 'Compatibilité', text: 'Partenaire, crush, ami : partage ton code, l\'autre fait ses tests, et vous obtenez une analyse croisée de vos profils.', cta: 'Ouvrir la compatibilité', to: '/assessment/compatibility', flow: 'compat' as const, extra: { label: 'La faire en discutant', flow: 'compat' as const } },
          ].map(c => (
            <div key={c.title} style={{ ...card, borderColor: `${DC.social}55`, background: `${DC.social}10` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <c.icon size={20} color={DC.social} aria-hidden="true" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{c.title}</span>
              </div>
              <p style={{ margin: '8px 0 12px', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>{c.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={() => (uid ? navigate(c.to) : navigate('/compagnon', { state: { signup: true } }))} className="drl-btn"
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {uid ? c.cta : 'Créer mon espace d\'abord'} <ArrowRight size={16} aria-hidden="true" />
                </button>
                {uid && c.extra && (
                  <button onClick={() => navigate('/compagnon', { state: { flow: c.extra!.flow } })} className="drl-btn"
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
              <span style={{ fontSize: 13, color: DC.faint }}>{doneOf(SEXUAL_HEALTH_SCALES)} / {totalOf(SEXUAL_HEALTH_SCALES)}</span>
            </div>
            {list(SEXUAL_HEALTH_SCALES, true)}
          </section>
        ) : (
          <section style={{ ...card, marginTop: 18, borderColor: `${DC.intime}55`, background: `${DC.intime}10` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={18} color={DC.intime} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Avec ton espace personnel</span>
            </div>
            <p style={{ margin: '8px 0 12px', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>
              Pour protéger ce qui est intime, ces tests se font dans ton espace. C'est gratuit et ça prend 10 secondes.
            </p>
            <button onClick={() => navigate('/compagnon', { state: { signup: true } })} className="drl-btn"
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Heart size={16} aria-hidden="true" /> Créer mon espace
            </button>
          </section>
        )
      )}

      {isTests && loaded && (
        <>
          <Link to="/espace/social" className="drl-btn" style={{ minHeight: 48, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: DC.soft, textDecoration: 'none' }}>
            <Users size={18} color={DC.social} aria-hidden="true" /> À deux : <b style={{ color: DC.gold }}>la compatibilité</b>
          </Link>
          <button type="button" onClick={toggleIntime} className="drl-btn"
            style={{ minHeight: 44, border: 0, background: 'transparent', color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0 }}>
            {showIntime ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            {showIntime ? 'Masquer la partie intime' : 'Afficher la partie intime'}
          </button>
        </>
      )}

      <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
        Des repères, jamais des notes. Pas de diagnostic · Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
      </p>
    </DrLoShell>
  );
};

export default DomainePage;
