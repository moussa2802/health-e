/**
 * HumeurPage — « Ta météo intérieure » (/humeur) : l'humeur notée jour après jour,
 * la tendance, les jours de la semaine, et (pour celles qui le souhaitent) le cycle.
 * Des tendances, jamais des notes ni des diagnostics. Données privées, effaçables.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Phone, Trash2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import MoodIcon from '../../components/accueil/MoodIcon';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingProfile } from '../../utils/onboardingProfile';
import { dayKey, MOODS, moodById, type MoodId, type MoodMap } from '../../utils/moodLog';
import { fetchMoods, recordMood, deleteMood, deleteAllMoods, getCycle, saveCycle, type CycleState, type CycleSituation } from '../../services/moodService';
import { monthCells, remark, series, trend, weekdayAverages, cycleRemark, countNoted, lastDays, WEEKDAYS, MOOD_SCORE } from '../../utils/moodInsights';
import { addDays, newPeriodStart } from '../../utils/cycleCalc';
import { getScaleMeta } from '../../utils/scaleMeta';
import { openDrLoChat } from '../../components/DrLoChat/drLoEvents';
import { trackAccueil } from '../../utils/accueilTracking';

import CompanionMark from '../../components/accueil/CompanionMark';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmtDay = (k: string) => { const [, m, d] = k.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
const CYCLE_SHOW_KEY = 'he_humeur_show_cycle';
const SCORE_COLOR = ['', '#B9A6D6', '#9FB4C8', '#CFC6B8', '#E9C88F', '#F2B66D'];

const h2: React.CSSProperties = { margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title };
const small: React.CSSProperties = { fontSize: 13, color: DC.faint };
const chip: React.CSSProperties = {
  minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
};

const HumeurPage: React.FC = () => {
  const navigate = useNavigate();
  const palette = usePalette();
  const { currentUser, isAuthenticated } = useAuth();
  const uid = isAuthenticated && currentUser ? currentUser.id : null;
  const ob = getOnboardingProfile();
  const prenom = ob?.prenom || currentUser?.name?.split(' ')[0];
  const genre = ob?.genre;
  const today = dayKey();

  const [moods, setMoods] = useState<MoodMap>({});
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState(() => { const [y, m] = today.split('-').map(Number); return { y, m: m - 1 }; });
  const [picked, setPicked] = useState<string | null>(null);
  const [cycleState, setCycleState] = useState<CycleState | null>(null);
  const [showCycle, setShowCycle] = useState(() => { try { return localStorage.getItem(CYCLE_SHOW_KEY) !== '0'; } catch { return true; } });
  const [cycleForm, setCycleForm] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMoods(uid, addDays(today, -400)).then(m => { if (!off) { setMoods(m); setLoaded(true); } });
    if (uid && genre === 'femme') getCycle(uid).then(c => { if (!off) setCycleState(c); }).catch(() => {});
    return () => { off = true; };
  }, [uid, genre, today]);

  const cycle = cycleState?.cycle ?? null;
  const cycleOn = !!cycle && showCycle;
  const cells = useMemo(() => monthCells(cursor.y, cursor.m, moods, today, cycleOn ? cycle : null), [cursor, moods, today, cycleOn, cycle]);
  const rem = useMemo(() => remark(moods, today, prenom, genre), [moods, today, prenom, genre]);
  const tr = useMemo(() => trend(moods, today), [moods, today]);
  const ser = useMemo(() => series(moods, today, 30), [moods, today]);
  const wd = useMemo(() => weekdayAverages(moods, today), [moods, today]);
  const cyc = useMemo(() => (cycle ? cycleRemark(moods, cycle, today) : null), [moods, cycle, today]);
  const monthDays = cells.filter(c => c.day && !c.isFuture).map(c => c.day!) as string[];
  const isCurrentMonth = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}` === today.slice(0, 7);

  const setDayMood = async (day: string, mood: MoodId | null) => {
    setPicked(null);
    setMoods(prev => {
      const next = { ...prev };
      if (mood) next[day] = { mood, at: Date.now() }; else delete next[day];
      return next;
    });
    trackAccueil(mood ? 'mood' : 'mood_cancel', { from: 'humeur' });
    try { if (mood) await recordMood(uid, day, mood); else await deleteMood(uid, day); } catch { /* copie locale gardée */ }
  };

  const toggleCycle = () => {
    const v = !showCycle;
    setShowCycle(v);
    try { localStorage.setItem(CYCLE_SHOW_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const chooseCycle = async (situation: CycleSituation, startOffset: number | null) => {
    if (!uid) return;
    const c = situation === 'cycling' && startOffset !== null ? { startDate: addDays(today, -startOffset), length: 28 } : null;
    const sit: CycleSituation = situation === 'cycling' && !c ? 'no_tracking' : situation;
    setCycleState({ situation: sit, cycle: c });
    setCycleForm(false);
    trackAccueil('cycle_set'); // jamais la situation (contraception, ménopause…) dans Analytics
    try { await saveCycle(uid, sit, c); } catch { /* réessaiera */ }
  };

  const periodStarted = async () => {
    if (!uid) return;
    const c = newPeriodStart(cycle, today);
    setCycleState({ situation: 'cycling', cycle: c });
    trackAccueil('cycle_period');
    try { await saveCycle(uid, 'cycling', c); } catch { /* ignore */ }
  };

  const eraseAll = async () => {
    if (!confirmErase) { setConfirmErase(true); return; }
    setMoods({});
    setConfirmErase(false);
    trackAccueil('mood_erase_all');
    try { await deleteAllMoods(uid); } catch { /* ignore */ }
  };

  const goTest = (scaleId: string) => navigate('/compagnon', { state: { prescribe: scaleId } });

  // Courbe des 30 jours (interrompue les jours non notés)
  const W = 320, H = 110;
  const x = (i: number) => Math.round((i / 29) * W);
  const y = (s: number) => Math.round(8 + ((5 - s) / 4) * (H - 16));
  let path = ''; let pen = false;
  ser.forEach((p, i) => {
    if (p.score === null) { pen = false; return; }
    path += `${pen ? 'L' : 'M'}${x(i)},${y(p.score)} `;
    pen = true;
  });
  const dots = ser.map((p, i) => (p.score === null ? null : { cx: x(i), cy: y(p.score), s: p.score })).filter(Boolean) as { cx: number; cy: number; s: number }[];
  const trendLabel = tr === 'up' ? 'En hausse' : tr === 'down' ? 'Un peu plus bas' : tr === 'stable' ? 'Stable' : '';
  const noted30 = countNoted(moods, lastDays(today, 30));

  return (
    <DrLoShell back={{ to: '/espace', label: 'Retour à mon espace' }} genre={genre} palette={palette}>
      <div style={{ marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Ta météo intérieure</p>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>
          Ton humeur en {MONTHS[cursor.m]}
        </h1>
      </div>

      {/* Ce que Dr Lô remarque */}
      <section aria-label="Ce que je remarque" style={{ ...card, marginTop: 16, borderColor: rem.tone === 'care' ? 'rgba(180,195,220,.4)' : 'rgba(242,182,109,.3)', background: rem.tone === 'care' ? 'rgba(180,195,220,.10)' : 'rgba(242,182,109,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CompanionMark size={34} ring={palette.accent} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.accent }}>Ce que je remarque</p>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>{loaded ? rem.text : '…'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {rem.tone === 'care' && (
            <a href="tel:1515" className="drl-btn" style={{ ...chip, textDecoration: 'none', color: '#DCE5F2', borderColor: 'rgba(180,195,220,.45)' }}><Phone size={14} aria-hidden="true" /> 1515</a>
          )}
          <button type="button" onClick={() => openDrLoChat({ greeting: rem.tone === 'care'
            ? `J'ai vu que ces derniers jours ont été durs pour toi${prenom ? `, ${prenom}` : ''}. Tu veux me dire ce qui pèse le plus en ce moment ?`
            : `On regarde ton humeur de ces derniers jours ensemble${prenom ? `, ${prenom}` : ''} ? Dis-moi ce qui t'a fait du bien, ou ce qui t'a pesé.`, source: 'humeur' })}
            className="drl-btn" style={chip}>En parler avec mon compagnon</button>
          {rem.suggestTest && (
            <button onClick={() => goTest(rem.suggestTest!)} className="drl-btn" style={{ ...chip, background: 'rgba(242,182,109,.12)', borderColor: 'rgba(242,182,109,.4)' }}>
              Faire le test « {getScaleMeta(rem.suggestTest).label} »
            </button>
          )}
        </div>
      </section>

      {/* Calendrier */}
      <section aria-label="Calendrier de l'humeur" style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={h2}>Jour après jour</h2>
          <span style={small}>{countNoted(moods, monthDays)} jour{countNoted(moods, monthDays) > 1 ? 's' : ''} noté{countNoted(moods, monthDays) > 1 ? 's' : ''} sur {monthDays.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <button onClick={() => setCursor(c => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} aria-label="Mois précédent" className="drl-btn" style={{ ...chip, padding: '0 10px' }}><ChevronLeft size={18} aria-hidden="true" /></button>
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={() => setCursor(c => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} disabled={isCurrentMonth} aria-label="Mois suivant" className="drl-btn" style={{ ...chip, padding: '0 10px', opacity: isCurrentMonth ? 0.35 : 1 }}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <div role="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5, marginTop: 10 }}>
          {WEEKDAYS.map((d, i) => <span key={i} style={{ ...small, textAlign: 'center', fontWeight: 700 }}>{d}</span>)}
          {cells.map((c, i) => {
            if (!c.day) return <span key={`e${i}`} />;
            const def = c.mood ? moodById(c.mood) : null;
            const mark = c.cycle;
            return (
              <button key={c.day} role="gridcell" disabled={c.isFuture} onClick={() => setPicked(p => (p === c.day ? null : c.day))}
                aria-label={`${fmtDay(c.day)}${def ? ` : ${def.label}` : c.isFuture ? '' : ' : pas noté'}${mark === 'period' ? ', règles' : mark === 'period_predicted' ? ', règles prévues' : mark === 'sensitive_predicted' ? ', jours plus sensibles prévus' : ''}`}
                className={c.isToday ? 'drl-btn drl-halo' : 'drl-btn'}
                style={{ position: 'relative', aspectRatio: '1 / 1.12', borderRadius: 12, cursor: c.isFuture ? 'default' : 'pointer', padding: 2,
                  border: picked === c.day ? `1.5px solid ${palette.accent}` : c.isToday ? `1.5px solid ${palette.accentSoft}` : def ? '1px solid rgba(255,255,255,.10)' : '1.5px dashed rgba(255,255,255,.16)',
                  background: def ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)', opacity: c.isFuture ? 0.4 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, color: DC.muted }}>
                {def ? <MoodIcon id={def.id} color={def.color} size={18} /> : <span style={{ height: 18 }} />}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.n}</span>
                {mark && (
                  <span aria-hidden="true" style={{ position: 'absolute', left: 6, right: 6, bottom: 3, height: 3, borderRadius: 2,
                    background: mark === 'period' ? 'rgba(232,160,184,.9)' : mark === 'period_predicted' ? 'transparent' : 'rgba(233,200,143,.7)',
                    border: mark === 'period_predicted' ? '1px dashed rgba(232,160,184,.8)' : 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="drl-in" style={{ marginTop: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>{picked === today ? 'Aujourd\'hui' : `Le ${fmtDay(picked)}`}, tu te sentais… </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
              {MOODS.map(md => (
                <button key={md.id} onClick={() => setDayMood(picked, md.id)} className="drl-mood"
                  style={{ minHeight: 64, borderRadius: 14, border: `1px solid ${moods[picked]?.mood === md.id ? palette.accent : DC.line}`, background: DC.glass, color: DC.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  <MoodIcon id={md.id} color={md.color} size={20} /> {md.label}
                </button>
              ))}
            </div>
            {moods[picked] && (
              <button onClick={() => setDayMood(picked, null)} style={{ marginTop: 6, minHeight: 36, border: 0, background: 'transparent', color: DC.muted, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
                Effacer ce jour
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
          {[...MOODS].reverse().map(md => (
            <span key={md.id} style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: md.color }} /> {md.label}
            </span>
          ))}
        </div>
        {cycleOn && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 6 }}>
            <span style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'rgba(232,160,184,.9)' }} /> Règles</span>
            <span style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'rgba(233,200,143,.7)' }} /> Jours plus sensibles (prévus)</span>
            <span style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 3, borderRadius: 2, border: '1px dashed rgba(232,160,184,.8)' }} /> Règles prévues</span>
          </div>
        )}
        {cycle && (
          <button onClick={toggleCycle} style={{ marginTop: 8, minHeight: 36, border: 0, background: 'transparent', color: DC.muted, fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', padding: 0 }}>
            {showCycle ? 'Masquer mon cycle' : 'Afficher mon cycle'}
          </button>
        )}
      </section>

      {/* Humeur et cycle (femmes, compte, facultatif) */}
      {uid && genre === 'femme' && cycleState && (
        <section aria-label="Ton humeur et ton cycle" style={{ ...card, marginTop: 14, borderColor: 'rgba(232,160,184,.3)', background: 'rgba(232,160,184,.06)' }}>
          <h2 style={h2}>Ton humeur et ton cycle</h2>
          {cycle && !cycleForm ? (
            <>
              {showCycle && cyc && (
                <>
                  <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>
                    {cyc.link ?? 'Il faut 2 à 3 cycles notés pour voir si ton humeur suit ton cycle. Continue de noter, je te dirai.'}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>
                    Tes prochaines règles devraient arriver vers le <b style={{ color: DC.intime }}>{fmtDay(cyc.next)}</b>.
                    {' '}À partir du <b style={{ color: DC.gold }}>{fmtDay(cyc.sensitiveFrom)}</b>, prévois-toi des soirées plus douces.
                  </p>
                </>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button onClick={periodStarted} className="drl-btn" style={{ ...chip, borderColor: 'rgba(232,160,184,.45)' }}>Mes règles ont commencé aujourd'hui</button>
                <button onClick={() => setCycleForm(true)} className="drl-btn" style={chip}>Modifier</button>
              </div>
            </>
          ) : cycleForm || cycleState.situation === null ? (
            <div className="drl-in">
              <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.55, color: DC.soft }}>
                Tu veux voir ton humeur à côté de ton cycle ? C'est facultatif, privé, et tu peux l'arrêter quand tu veux. Tes dernières règles ont commencé…
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <button onClick={() => chooseCycle('cycling', 3)} className="drl-btn" style={chip}>Cette semaine</button>
                <button onClick={() => chooseCycle('cycling', 10)} className="drl-btn" style={chip}>La semaine dernière</button>
                <button onClick={() => chooseCycle('cycling', 18)} className="drl-btn" style={chip}>Il y a 2 ou 3 semaines</button>
                <button onClick={() => chooseCycle('cycling', null)} className="drl-btn" style={chip}>Je ne sais pas</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button onClick={() => chooseCycle('contraception', null)} className="drl-btn" style={chip}>Contraception hormonale</button>
                <button onClick={() => chooseCycle('menopause', null)} className="drl-btn" style={chip}>Ménopause</button>
                <button onClick={() => chooseCycle('no_tracking', null)} className="drl-btn" style={chip}>Non merci</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
              <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Ton cycle n'est pas suivi.</p>
              <button onClick={() => setCycleForm(true)} className="drl-btn" style={chip}>Suivre mon cycle</button>
            </div>
          )}
          {cycle && !cycleForm && (
            <button onClick={() => chooseCycle('no_tracking', null)} style={{ marginTop: 8, minHeight: 36, border: 0, background: 'transparent', color: DC.faint, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', padding: 0 }}>
              Ne plus suivre mon cycle
            </button>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
            Une estimation pour ton bien-être, pas un outil de contraception ni de fertilité. Si l'humeur chute très fort avant les règles, parles-en à un médecin : ça se soigne.
          </p>
        </section>
      )}

      {/* Tendance */}
      <section aria-label="La tendance" style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={h2}>La tendance <span style={{ ...small, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>· 30 jours</span></h2>
          {trendLabel && <span style={{ fontSize: 13, fontWeight: 700, color: tr === 'up' ? DC.ok : tr === 'down' ? DC.gold : DC.muted }}>{trendLabel}</span>}
        </div>
        {noted30 >= 2 ? (
          <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label={`Humeur des 30 derniers jours${trendLabel ? ` : ${trendLabel.toLowerCase()}` : ''}`} style={{ marginTop: 10, display: 'block' }}>
            {[1, 2, 3, 4, 5].map(s => <line key={s} x1={0} x2={W} y1={y(s)} y2={y(s)} stroke="rgba(255,255,255,.06)" />)}
            <path d={path} fill="none" stroke={palette.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={3.2} fill={SCORE_COLOR[d.s]} />)}
            <text x={0} y={H + 14} fill={DC.faint} fontSize={11}>{fmtDay(ser[0].day)}</text>
            <text x={W} y={H + 14} fill={DC.faint} fontSize={11} textAnchor="end">aujourd'hui</text>
          </svg>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: 14, color: DC.muted }}>La courbe apparaît dès quelques jours notés.</p>
        )}
      </section>

      {/* Jours de la semaine */}
      <section aria-label="Selon le jour de la semaine" style={{ ...card, marginTop: 14 }}>
        <h2 style={h2}>Selon le jour de la semaine</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, alignItems: 'end', height: 110, marginTop: 12 }}>
          {wd.map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}
              aria-label={`${['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][i]} : ${w.avg === null ? 'pas assez de données' : `${w.avg.toFixed(1)} sur 5`}`}>
              <div style={{ width: '70%', borderRadius: 6, height: w.avg === null ? 4 : `${Math.round(10 + ((w.avg - 1) / 4) * 72)}px`, background: w.avg === null ? 'rgba(255,255,255,.08)' : SCORE_COLOR[Math.round(w.avg)] }} />
              <span style={{ ...small, fontWeight: 700 }}>{WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', ...small, lineHeight: 1.5 }}>Sur les 3 derniers mois. Plus la barre est haute, plus la journée est douce.</p>
      </section>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {!moods[today] && (
          <button onClick={() => setPicked(today)} className="drl-btn"
            style={{ minHeight: 48, padding: '0 20px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Noter mon humeur d'aujourd'hui
          </button>
        )}
        <button onClick={eraseAll} style={{ minHeight: 40, border: 0, background: 'transparent', color: confirmErase ? '#F09A7A' : DC.faint, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Trash2 size={13} aria-hidden="true" /> {confirmErase ? 'Touche encore pour tout effacer (définitif)' : 'Effacer toutes mes données d\'humeur'}
        </button>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
          Ces tendances t'aident à te comprendre. Ce n'est pas un diagnostic. Urgence : <a href="tel:1515" style={{ fontWeight: 700 }}>1515</a>
          {!uid && <><br />Sans compte, ton humeur reste sur ce téléphone.</>}
        </p>
      </div>
    </DrLoShell>
  );
};

// Score moyen (exporté pour le tableau de bord)
export const moodScore = (m: MoodId) => MOOD_SCORE[m];

export default HumeurPage;
