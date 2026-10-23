/**
 * ProgrammePanel — « Mes engagements du jour » (Mon programme Dr Lô), plein écran au-dessus de l'accueil.
 * Cocher est gratuit. Le bilan de la semaine (IA) et le nouveau test coûtent des étincelles.
 * Aucune culpabilisation : un jour manqué s'affiche en gris, jamais en rouge.
 */
import React, { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronLeft, ClipboardCheck, LineChart, Moon, Pause, Phone, Play, Wind } from 'lucide-react';
import {
  AXES, bilanDue, dayNumber, hardStreak, improved, isDone, planFor, PROGRAMME_DAYS, retestInfo, weekDots,
  type Engagement, type EngKey, type MoodLike, type Programme, type SleepNote,
} from '../../utils/programme';
import { getCrisisResources } from '../../data/crisisResources';
import type { MomentPalette } from '../../utils/drloMoment';

const C = {
  text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA',
  sage: '#9DBFAF', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D',
};

export interface ProgrammePanelProps {
  p: Programme;
  today: string;
  moods: MoodLike;
  palette: MomentPalette;
  testLabel: (scaleId: string) => string;
  bilanCost: string;
  testCost: string;
  busy: 'bilan' | null;
  onClose: () => void;
  onToggle: (key: EngKey) => void;
  onSleep: (n: SleepNote) => void;
  onMood: () => void;
  onBreath: () => void;
  onBilan: () => void;
  onRetest: (scaleId: string) => void;
  onLight: (on: boolean) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOther: () => void;
}

const SLEEP: { id: SleepNote; label: string }[] = [
  { id: 'mal', label: 'Mal dormi' }, { id: 'moyen', label: 'Moyen' }, { id: 'bien', label: 'Bien dormi' },
];

const ProgrammePanel: React.FC<ProgrammePanelProps> = props => {
  const { p, today, moods, palette } = props;
  const [open, setOpen] = useState<EngKey | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const ax = AXES[p.axis];
  const day = dayNumber(p, today);
  const shownDay = Math.min(PROGRAMME_DAYS, day);
  const plan = planFor(p, day);
  const { dots, active } = weekDots(p, today, moods);
  const due = p.status === 'active' ? bilanDue(p, today) : null;
  const nextBilanDay = Math.min(PROGRAMME_DAYS, (Math.floor(day / 7) + 1) * 7);
  const retest = retestInfo(p, today, moods);
  const hard = hardStreak(moods, today) >= 3;
  const lastBilan = p.bilans.length ? p.bilans[p.bilans.length - 1] : null;
  const resources = getCrisisResources();

  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass };
  const primary: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };
  const link: React.CSSProperties = { border: 0, background: 'transparent', color: C.faint, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40, textDecoration: 'underline', textUnderlineOffset: 3 };

  const row = (e: Engagement) => {
    const done = isDone(p, today, e.key, moods);
    const expanded = open === e.key;
    const tag = e.kind === 'mood' ? 'Un tap' : e.kind === 'learn' ? (e.reread ? 'À relire · 30 s' : 'Une idée à comprendre · 30 s') : e.duration ? e.duration : 'Dans la journée';
    const canTick = e.kind !== 'mood';
    return (
      <div key={e.key} style={{ ...card, padding: 0, borderColor: done ? 'rgba(157,191,175,.35)' : C.line }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
          <button
            onClick={() => (canTick ? props.onToggle(e.key) : props.onMood())}
            aria-label={done ? `${e.title} : fait` : `${e.title} : à faire`}
            aria-pressed={done}
            style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: `2px solid ${done ? palette.accent : 'rgba(242,182,109,.55)'}`, background: done ? palette.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            {done && <Check size={16} strokeWidth={3} color={C.ink} aria-hidden="true" />}
          </button>
          <button onClick={() => setOpen(expanded ? null : e.key)} aria-expanded={expanded}
            style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: C.text, textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: done ? C.muted : C.text }}>{e.title}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: done ? C.sage : C.faint, marginTop: 2 }}>{done ? `Fait · ${tag}` : tag}</span>
            </span>
            <ChevronDown size={18} color={C.faint} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        </div>
        {(expanded || (e.kind === 'mood' && p.axis === 'sommeil' && !p.sleep[today])) && (
          <div className="drl-in" style={{ padding: '0 14px 14px 56px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expanded && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.soft }}>{e.text}</p>}
            {e.kind === 'mood' && p.axis === 'sommeil' && (
              <div role="group" aria-label="Ma nuit" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SLEEP.map(s => (
                  <button key={s.id} onClick={() => props.onSleep(s.id)} aria-pressed={p.sleep[today] === s.id}
                    style={{ minHeight: 38, padding: '0 12px', borderRadius: 999, border: `1px solid ${p.sleep[today] === s.id ? palette.accent : C.line}`, background: p.sleep[today] === s.id ? 'rgba(242,182,109,.18)' : 'transparent', color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Moon size={13} aria-hidden="true" />{s.label}
                  </button>
                ))}
              </div>
            )}
            {expanded && e.kind === 'mood' && !done && <button onClick={props.onMood} style={{ ...primary, alignSelf: 'flex-start' }}>Noter mon humeur</button>}
            {expanded && e.kind === 'breath' && <button onClick={props.onBreath} style={{ ...primary, alignSelf: 'flex-start' }}><Wind size={16} aria-hidden="true" />Respirer maintenant</button>}
            {expanded && e.kind !== 'mood' && !done && (
              <button onClick={() => { props.onToggle(e.key); setOpen(null); }} style={{ ...ghost, alignSelf: 'flex-start' }}>
                {e.kind === 'learn' ? 'Lu' : 'C\'est fait'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const result = p.result;
  const verdict = result ? improved(result) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Mes engagements du jour"
      style={{ position: 'fixed', inset: 0, zIndex: 55, background: palette.bg, color: C.text, overflowY: 'auto', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={props.onClose} aria-label="Revenir à l'accueil" style={{ width: 44, height: 44, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.title }}>
              {result ? 'Mon programme Dr Lô' : 'Mes engagements du jour'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.faint }}>
              {ax.short} · Jour {shownDay} sur {PROGRAMME_DAYS}{p.light ? ' · version légère' : ''}
            </p>
          </div>
        </header>

        {(hard || p.fragile) && (
          <div style={{ ...card, padding: 14, borderColor: 'rgba(185,166,214,.4)', background: 'rgba(185,166,214,.10)' }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.soft }}>
              {hard
                ? 'Ces derniers jours ont l\'air très durs. Tu n\'as pas à porter ça sans aide : parles-en à quelqu\'un de confiance ou à un professionnel. Si c\'est trop lourd maintenant, appelle :'
                : 'Ce programme t\'accompagne au quotidien, il ne remplace pas un médecin ou un psychologue. En cas de besoin urgent :'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {resources.filter(r => r.phone).slice(0, 2).map(r => (
                <a key={r.label} href={`tel:${r.phone!.replace(/\s/g, '')}`} style={{ ...ghost, textDecoration: 'none', fontSize: 13 }}>
                  <Phone size={14} aria-hidden="true" />{r.label.split(' — ')[0]}
                </a>
              ))}
            </div>
          </div>
        )}

        {p.status === 'paused' && (
          <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Pause size={20} color={palette.accent} aria-hidden="true" />
            <p style={{ margin: 0, flex: 1, fontSize: 14, color: C.soft }}>Ton programme est en pause. Les jours ne défilent pas.</p>
            <button onClick={props.onResume} style={primary}><Play size={15} aria-hidden="true" />Reprendre</button>
          </div>
        )}

        {result && verdict ? (
          <div style={{ ...card, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>Le chemin parcouru · {props.testLabel(result.scaleId)}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {[['Au départ', result.before, result.beforeLabel], ['Aujourd\'hui', result.after, result.afterLabel]].map(([t, v, l]) => (
                <div key={String(t)} style={{ borderRadius: 14, background: 'rgba(255,255,255,.05)', padding: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, color: C.faint }}>{t}</span>
                  <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.title }}>{v}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: C.soft }}>{l}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: C.soft }}>
              {verdict === 'mieux' ? 'Ça a bougé dans le bon sens. Ce que tu as fait ces semaines compte vraiment.'
                : verdict === 'pareil' ? 'Ton résultat est stable. Parfois les effets arrivent plus tard : tu peux continuer, ou essayer un autre programme.'
                : 'C\'est plus lourd qu\'au départ. Ce n\'est pas un échec : c\'est le bon moment pour en parler à un professionnel, en plus du programme.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button onClick={props.onRestart} style={primary}>Continuer 4 semaines</button>
              <button onClick={props.onOther} style={ghost}>Un autre programme</button>
              <button onClick={props.onStop} style={ghost}>Faire une pause</button>
            </div>
          </div>
        ) : (<>
          <div style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', gap: 7 }} aria-hidden="true">
              {dots.map((d, i) => (
                <span key={i} style={{
                  width: 22, height: 22, borderRadius: '50%', boxSizing: 'border-box',
                  background: d === 'done' ? palette.accent : d === 'missed' ? 'rgba(255,255,255,.10)' : 'transparent',
                  border: d === 'future' ? '1px dashed rgba(255,255,255,.22)' : d === 'today' ? `2px solid ${palette.accent}` : 0,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: C.faint }}>jours actifs <b style={{ color: C.text }}>{active}/7</b></span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{plan.map(row)}</div>

          {day === 1 && p.intro && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <img src="/dr-lo.png" alt="" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.soft }}>{p.intro}</p>
            </div>
          )}
        </>)}

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lastBilan && (
              <details style={{ ...card, padding: 14 }} open={lastBilan.week === Math.floor(day / 7)}>
                <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChart size={18} color={palette.accent} aria-hidden="true" />Le bilan de la semaine {lastBilan.week}
                </summary>
                <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: C.soft }}>{lastBilan.text}</p>
                {lastBilan.advice === 'alleger' && !p.light && (
                  <button onClick={() => props.onLight(true)} style={{ ...ghost, marginTop: 10 }}>Passer en version légère</button>
                )}
                {lastBilan.advice === 'changer' && (
                  <button onClick={props.onOther} style={{ ...ghost, marginTop: 10 }}>Choisir un autre programme</button>
                )}
              </details>
            )}
            <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <LineChart size={22} color={due ? palette.accent : C.muted} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Bilan de la semaine avec Dr Lô</span>
                <span style={{ display: 'block', fontSize: 12.5, color: C.faint }}>
                  {due ? `Semaine ${due} · ${props.bilanCost}` : `Disponible au jour ${nextBilanDay} · ${props.bilanCost}`}
                </span>
              </div>
              {due && (
                <button onClick={props.onBilan} disabled={props.busy === 'bilan'} style={{ ...primary, opacity: props.busy === 'bilan' ? 0.6 : 1 }}>
                  {props.busy === 'bilan' ? 'Dr Lô relit…' : 'Voir'}
                </button>
              )}
            </div>
            {retest && (
              <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <ClipboardCheck size={22} color={retest.available ? palette.accent : C.muted} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Refaire mon test « {props.testLabel(retest.scaleId)} »</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: C.faint }}>
                    {retest.available ? `Pour voir le chemin parcouru · ${props.testCost}` : `Prévu au jour ${retest.fromDay} · pour voir le chemin parcouru`}
                  </span>
                </div>
                {retest.available && <button onClick={() => props.onRetest(retest.scaleId)} style={primary}>Le faire</button>}
              </div>
            )}
            <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookOpen size={20} color={C.muted} aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 14 }}>Version légère (5 min par jour)</span>
              <button role="switch" aria-checked={p.light} onClick={() => props.onLight(!p.light)} disabled={!!p.fragile && p.light}
                style={{ width: 50, height: 30, borderRadius: 999, border: 0, cursor: 'pointer', background: p.light ? palette.accent : 'rgba(255,255,255,.16)', position: 'relative', opacity: p.fragile ? 0.6 : 1 }}>
                <span style={{ position: 'absolute', top: 3, left: p.light ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </button>
            </div>
          </div>
        )}

        {!result && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {p.status === 'active' && <button onClick={props.onPause} style={link}>Mettre en pause</button>}
            {confirmStop
              ? <button onClick={props.onStop} style={{ ...link, color: '#E8A08F' }}>Confirmer l'arrêt</button>
              : <button onClick={() => setConfirmStop(true)} style={link}>Arrêter le programme</button>}
          </div>
        )}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>
          Cocher est gratuit. Un jour manqué n'est pas grave : reprends simplement le lendemain.
        </p>
      </div>
    </div>
  );
};

export default ProgrammePanel;

/** La carte de l'accueil : comme une petite notification (pastille = engagements restants). */
export const ProgrammeHomeCard: React.FC<{ p: Programme; today: string; remaining: number; palette: MomentPalette; onOpen: () => void }> = ({ p, today, remaining, palette, onOpen }) => {
  const day = Math.min(PROGRAMME_DAYS, dayNumber(p, today));
  const sub = p.result ? `${AXES[p.axis].short} · terminé, vois le chemin parcouru`
    : p.status === 'paused' ? `${AXES[p.axis].short} · en pause`
    : `${AXES[p.axis].short} · Jour ${day} sur ${PROGRAMME_DAYS}`;
  const badge = p.status === 'active' && !p.result && remaining > 0 ? remaining : 0;
  return (
    <button onClick={onOpen} className="drl-btn drl-in"
      aria-label={`Mon programme Dr Lô. ${sub}.${badge ? ` ${badge} engagement${badge > 1 ? 's' : ''} à faire aujourd'hui.` : ''}`}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass, color: C.text, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, background: 'rgba(242,182,109,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ClipboardCheck size={22} color={palette.accent} aria-hidden="true" />
          {badge > 0 && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{badge}</span>
          )}
          {badge === 0 && p.status === 'active' && !p.result && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>
              <Check size={12} strokeWidth={3} color={C.ink} />
            </span>
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Mon programme Dr Lô</span>
          <span style={{ display: 'block', fontSize: 12.5, color: C.faint, marginTop: 2 }}>{sub}</span>
        </span>
      </span>
      {!p.result && (
        <span aria-hidden="true" style={{ display: 'block', width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
          <span style={{ display: 'block', width: `${Math.round((day / PROGRAMME_DAYS) * 100)}%`, height: '100%', borderRadius: 3, background: palette.accent }} />
        </span>
      )}
    </button>
  );
};
