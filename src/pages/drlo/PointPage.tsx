/**
 * PointPage — « Ton point de la semaine » (/point-de-la-semaine) : le compagnon fait le bilan des 7 derniers jours.
 * Où tu en es · ce qui a bougé · ce que je te propose (3 au plus, chacun s'ouvre d'un tap) · une question pour toi.
 * Construit par règles (utils/weeklyPoint) : gratuit, instantané. Jamais un diagnostic.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import CompanionMark from '../../components/accueil/CompanionMark';
import MoodIcon from '../../components/accueil/MoodIcon';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { firstName } from '../../utils/accueilFlow';
import { getProfileProgress } from '../../services/evaluationService';
import { fetchMoods } from '../../services/moodService';
import { getAgenda, whenLabel } from '../../services/pencService';
import { dayKey, moodById, type MoodMap } from '../../utils/moodLog';
import { addDays } from '../../utils/programme';
import { getScaleMeta } from '../../utils/scaleMeta';
import { companionSuggestion } from '../../utils/companionSuggestion';
import { buildWeeklyPoint, type PointResult, type PointTodo, type Tone } from '../../utils/weeklyPoint';
import { companionLabel } from '../../utils/companion';
import { markPointSeen } from '../../utils/pointSeen';
import { trackAccueil } from '../../utils/accueilTracking';
import type { ScaleResult } from '../../types/assessment';

const TONE: Record<Tone, string> = { sage: '#9DBFAF', or: '#E9C88F', ambre: '#F2B66D', lavande: '#C9B8E4', neutre: '#A79E90' };
const k: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.1em', color: DC.muted };

const PointPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authReady } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const today = dayKey();
  const ob = getOnboardingProfile();
  const prenom = firstName(ob?.prenom || currentUser?.name);
  const seul = ob?.genre === 'femme' ? 'seule' : 'seul';
  const [results, setResults] = useState<Record<string, ScaleResult> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [moods, setMoods] = useState<MoodMap>({});
  const [penc, setPenc] = useState<{ id: string; title: string; when: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    let off = false;
    getProfileProgress(uid).then(p => { if (!off) { setResults(p.scaleResults ?? {}); setRevealed(!!p.totem?.animal && !!p.totem.revealedAt); } }).catch(() => { if (!off) setResults({}); });
    fetchMoods(uid, addDays(today, -7)).then(m => { if (!off) setMoods(m); }).catch(() => {});
    getAgenda().then(a => {
      if (off) return;
      const next = [...a.live, ...a.upcoming].find(x => !x.locked && x.startAt - Date.now() < 7 * 86400000);
      if (next) setPenc({ id: next.id, title: next.title, when: next.status === 'live' ? 'En direct maintenant' : whenLabel(next.startAt) });
    }).catch(() => {});
    return () => { off = true; };
  }, [uid, today]);

  const point = useMemo(() => {
    if (!results) return null;
    const res: Record<string, PointResult> = Object.fromEntries(Object.entries(results).map(([id, r]) => {
      const at = (r as { completedAt?: unknown }).completedAt;
      const d = at instanceof Date ? at : at && typeof (at as { toDate?: () => Date }).toDate === 'function' ? (at as { toDate: () => Date }).toDate() : at ? new Date(at as string) : null;
      return [id, { severity: r.interpretation?.severity, label: r.interpretation?.label, completedAt: d, alertLevel: r.alertLevel }];
    }));
    return buildWeeklyPoint({ today, moods, results: res, suggestion: companionSuggestion(results, revealed), penc, labelOf: id => getScaleMeta(id).label });
  }, [results, moods, revealed, penc, today]);

  useEffect(() => { if (point) { markPointSeen(point.week); trackAccueil('go', { to: 'weekly_point', from: 'point' }); } }, [point?.week]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authReady && !uid) return <Navigate to="/compagnon" replace state={{ signup: true }} />;

  const go = (t: PointTodo) => {
    if (t.kind === 'test' && t.ref) navigate('/compagnon', { state: { prescribe: t.ref } });
    else if (t.kind === 'totem') navigate('/assessment/totem');
    else if (t.kind === 'mood') navigate('/compagnon', { state: { openMood: true } });
    else if (t.kind === 'breath') navigate('/compagnon', { state: { breath: true } });
    else if (t.kind === 'penc' && t.ref) navigate(`/penc/${t.ref}`);
    else if (t.kind === 'help') navigate('/compagnon', { state: { talk: { greeting: 'Tu as bien fait de venir. Dis-moi ce qui pèse le plus en ce moment : on cherche ensemble vers qui te tourner.', draft: null } } });
  };

  return (
    <DrLoShell back={{ to: '/compagnon', label: 'Retour au compagnon' }} palette={palette}>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <CompanionMark size={64} live mood={point?.care ? 'doux' : 'repos'} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.15, fontWeight: 600, color: DC.title }}>Ton point de la semaine</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.muted }}>{point ? point.range : '…'}</p>
        </div>
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>
        {prenom ? `${prenom}, voici` : 'Voici'} ce que j'ai vu cette semaine. Ce n'est pas un diagnostic : c'est ce que tes réponses racontent. — {companionLabel()}
      </p>

      {!point ? <p style={{ marginTop: 20, color: DC.muted }}>Je prépare ton point…</p> : (
        <>
          {/* La semaine en couleurs */}
          <div aria-label="Ta météo des 7 derniers jours" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginTop: 14 }}>
            {point.days.map((m, i) => {
              const def = m ? moodById(m as Parameters<typeof moodById>[0]) : null;
              return (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: def ? '1px solid rgba(255,255,255,.1)' : '1.5px dashed rgba(255,255,255,.16)', background: def ? 'rgba(255,255,255,.06)' : 'transparent' }}>
                  {def && <MoodIcon id={def.id} color={def.color} size={18} />}
                </div>
              );
            })}
          </div>

          <section aria-label="Où tu en es" style={{ ...card, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={k}>OÙ TU EN ES</p>
            {point.states.map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 15 }}>
                <span style={{ color: DC.text }}>{s.label}</span><b style={{ color: TONE[s.tone] }}>{s.word}</b>
              </div>
            ))}
          </section>

          <section aria-label="Ce qui a bougé" style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={k}>CE QUI A BOUGÉ</p>
            {point.changes.map(c => <p key={c} style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{c}</p>)}
          </section>

          {point.care && (
            <section aria-label="Prends soin de toi" style={{ ...card, marginTop: 12, borderColor: 'rgba(201,184,228,.5)', background: 'rgba(201,184,228,.08)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <HeartHandshake size={22} color="#C9B8E4" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>Certaines de tes réponses montrent que c'est lourd en ce moment. Tu n'as pas à porter ça {seul} : en parler à quelqu'un aide vraiment. En urgence : <a href="tel:1515" style={{ fontWeight: 700, color: '#C9B8E4' }}>1515</a>.</p>
            </section>
          )}

          <section aria-label="Ce que je te propose" style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, borderColor: 'rgba(242,182,109,.45)' }}>
            <p style={{ ...k, color: palette.accent }}>CE QUE JE TE PROPOSE</p>
            {point.todos.map(t => (
              <button key={t.text} onClick={() => go(t)} className="drl-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 0', border: 0, background: 'transparent', color: DC.text, fontSize: 15, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${palette.accent}` }} />
                <span style={{ flex: 1 }}>{t.text}</span>
                <ArrowRight size={16} color={DC.muted} aria-hidden="true" />
              </button>
            ))}
          </section>

          <section aria-label="Une question pour toi" style={{ ...card, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={k}>UNE QUESTION POUR TOI</p>
            <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, lineHeight: 1.35, fontWeight: 600, color: DC.title }}>{point.question}</p>
            <button onClick={() => navigate('/compagnon', { state: { talk: { greeting: point.question, draft: null } } })} className="drl-btn"
              style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 18px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Lui répondre
            </button>
          </section>

          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: DC.faint }}>
            Un nouveau point chaque lundi. <Link to="/humeur" style={{ color: palette.accent, fontWeight: 700 }}>Voir ma météo du mois</Link>
          </p>
        </>
      )}
    </DrLoShell>
  );
};

export default PointPage;
