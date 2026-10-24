/**
 * ProgrammeExercise — l'exercice du jour se FAIT dans l'appli, guidé par Dr Lô :
 * respiration rythmée, étapes une par une, choix d'un tap, quelques lignes à écrire (gardées
 * dans le journal, carnet « Programme »), minuteur, ou habitude du jour (engagement le matin,
 * « tu as tenu ? » le soir). L'apprentissage commence par un vrai / faux.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Play } from 'lucide-react';
import type { Guide, ProgLearning } from '../../data/programmeLibrary';
import type { MomentPalette } from '../../utils/drloMoment';
import { detectCrisis } from '../../utils/accueilFlow';

const C = { text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA', sage: '#9DBFAF', ink: '#1C140D', line: 'rgba(255,255,255,.14)' };

export interface ExerciseDone { note?: string; held?: boolean }

const btn = (palette: MomentPalette, ghost = false): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  ...(ghost ? { background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 } : { background: palette.primary, border: 0, color: C.ink, fontWeight: 700 }),
});
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.05)',
  color: C.text, fontSize: 15, padding: '10px 12px', fontFamily: 'inherit', resize: 'vertical',
};

// ── Respiration guidée ───────────────────────────────────────────────────────

const BreathGuide: React.FC<{ g: Extract<Guide, { kind: 'breath' }>; palette: MomentPalette; onDone: () => void }> = ({ g, palette, onDone }) => {
  const phases = [
    { label: 'Inspire', s: g.inhale, scale: 1 },
    ...(g.hold ? [{ label: 'Bloque', s: g.hold, scale: 1 }] : []),
    { label: 'Souffle', s: g.exhale, scale: 0.62 },
    ...(g.hold2 ? [{ label: 'Bloque', s: g.hold2, scale: 0.62 }] : []),
  ];
  const [run, setRun] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cycleLen = phases.reduce((n, x) => n + x.s, 0);
  const total = cycleLen * g.cycles;
  useEffect(() => {
    if (!run) return;
    const t = window.setInterval(() => setElapsed(e => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [run]);
  useEffect(() => {
    if (run && elapsed >= total) { setRun(false); window.setTimeout(onDone, 400); }
  }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps
  const tIn = Math.min(elapsed, total - 1) % cycleLen;
  let acc = 0;
  let ph = phases[0];
  let left = phases[0].s;
  for (const x of phases) {
    if (tIn < acc + x.s) { ph = x; left = acc + x.s - tIn; break; }
    acc += x.s;
  }
  const cycle = Math.floor(Math.min(elapsed, total - 1) / cycleLen) + 1;
  const started = run || elapsed > 0;
  if (!started) {
    return <button onClick={() => setRun(true)} style={{ ...btn(palette), alignSelf: 'flex-start' }}><Play size={16} aria-hidden="true" />Commencer avec Dr Lô</button>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '6px 0' }} role="timer" aria-live="polite">
      <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%', transform: `scale(${ph.scale})`, transition: `transform ${ph.s}s ease-in-out`,
          background: `radial-gradient(circle, ${palette.accentSoft} 0%, rgba(242,182,109,.08) 70%)`, border: `2px solid ${palette.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <img src="/dr-lo.png" alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      </div>
      <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: palette.accent }}>{ph.label} · {left}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: C.faint }}>Cycle {Math.min(cycle, g.cycles)} sur {g.cycles}</p>
    </div>
  );
};

// ── Minuteur ─────────────────────────────────────────────────────────────────

const TimerGuide: React.FC<{ minutes: number; palette: MomentPalette; onDone: () => void }> = ({ minutes, palette, onDone }) => {
  const [end, setEnd] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!end) return;
    const t = window.setInterval(() => {
      tick(x => x + 1);
      if (Date.now() >= end) { window.clearInterval(t); onDone(); }
    }, 1000);
    return () => window.clearInterval(t);
  }, [end]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!end) {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setEnd(Date.now() + minutes * 60000)} style={btn(palette)}><Play size={16} aria-hidden="true" />Lancer {minutes} min</button>
        <button onClick={onDone} style={btn(palette, true)}>Déjà fait</button>
      </div>
    );
  }
  const left = Math.max(0, Math.round((end - Date.now()) / 1000));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span role="timer" style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, color: palette.accent, minWidth: 90 }}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </span>
      <button onClick={onDone} style={btn(palette, true)}>J'ai fini</button>
    </div>
  );
};

// ── Étapes, choix, écriture ──────────────────────────────────────────────────

const StepsGuide: React.FC<{ g: Extract<Guide, { kind: 'steps' }>; palette: MomentPalette; onDone: (note?: string) => void; onCrisis: (t: string) => void }> = ({ g, palette, onDone, onCrisis }) => {
  const [i, setI] = useState(0);
  const [vals, setVals] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const st = g.steps[i];
  const last = i === g.steps.length - 1;
  const next = () => {
    if (st.input && detectCrisis(cur)) { onCrisis(cur); return; }
    const all = [...vals]; all[i] = cur.trim();
    if (!last) { setVals(all); setCur(''); setI(i + 1); return; }
    const lines = g.steps.map((s, k) => (s.input && all[k] ? `${s.input} : ${all[k]}` : null)).filter(Boolean);
    onDone(g.save && lines.length ? `${g.save}\n${lines.join('\n')}` : undefined);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
        {g.steps.map((_, k) => <span key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= i ? palette.accent : 'rgba(255,255,255,.12)' }} />)}
      </div>
      <p key={i} className="drl-in" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: C.title, fontWeight: 600 }}>{st.prompt}</p>
      {st.input && (
        <textarea value={cur} onChange={e => setCur(e.target.value)} rows={2} maxLength={400} aria-label={st.input} placeholder={st.input} style={field} />
      )}
      <button onClick={next} style={{ ...btn(palette), alignSelf: 'flex-start' }}>{last ? 'Terminer' : 'Suivant'}</button>
    </div>
  );
};

const ChipsGuide: React.FC<{ g: Extract<Guide, { kind: 'chips' }>; palette: MomentPalette; onDone: (note?: string) => void }> = ({ g, palette, onDone }) => {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (o: string) => setSel(s => (g.multi ? (s.includes(o) ? s.filter(x => x !== o) : [...s, o]) : [o]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 15.5, color: C.title, fontWeight: 600 }}>{g.prompt}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {g.options.map(o => (
          <button key={o} onClick={() => toggle(o)} aria-pressed={sel.includes(o)}
            style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              border: `1px solid ${sel.includes(o) ? palette.accent : C.line}`, background: sel.includes(o) ? 'rgba(242,182,109,.18)' : 'transparent', color: C.text }}>
            {o}
          </button>
        ))}
      </div>
      <button disabled={!sel.length} onClick={() => onDone(`${g.save} : ${sel.join(', ')}`)} style={{ ...btn(palette), alignSelf: 'flex-start', opacity: sel.length ? 1 : 0.5 }}>Valider</button>
    </div>
  );
};

const WriteGuide: React.FC<{ g: Extract<Guide, { kind: 'write' }>; palette: MomentPalette; onDone: (note?: string) => void; onCrisis: (t: string) => void }> = ({ g, palette, onDone, onCrisis }) => {
  const [t, setT] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 15.5, color: C.title, fontWeight: 600 }}>{g.prompt}</p>
      <textarea value={t} onChange={e => setT(e.target.value)} rows={Math.max(2, g.lines)} maxLength={800} aria-label={g.save} style={field} />
      <button disabled={!t.trim()} onClick={() => (detectCrisis(t) ? onCrisis(t) : onDone(`${g.save}\n${t.trim()}`))}
        style={{ ...btn(palette), alignSelf: 'flex-start', opacity: t.trim() ? 1 : 0.5 }}>Garder dans mon journal</button>
      <p style={{ margin: 0, fontSize: 12, color: C.faint }}>Privé : carnet « Programme » de ton journal.</p>
    </div>
  );
};

// ── Habitude du jour ─────────────────────────────────────────────────────────

const HabitGuide: React.FC<{ g: Extract<Guide, { kind: 'habit' }>; committed: boolean; palette: MomentPalette; onCommit: () => void; onDone: (held: boolean) => void }> = ({ g, committed, palette, onCommit, onDone }) => {
  if (!committed) {
    return <button onClick={onCommit} style={{ ...btn(palette), alignSelf: 'flex-start' }}>Je m'y engage aujourd'hui</button>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: C.sage, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} aria-hidden="true" />Engagement pris. Je te le redemande plus tard.</p>
      <p style={{ margin: 0, fontSize: 15.5, color: C.title, fontWeight: 600 }}>{g.evening}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onDone(true)} style={btn(palette)}>Oui, j'ai tenu</button>
        <button onClick={() => onDone(false)} style={btn(palette, true)}>Pas cette fois</button>
      </div>
    </div>
  );
};

// ── L'exercice du jour ───────────────────────────────────────────────────────

export const ExerciseRunner: React.FC<{
  guide: Guide; palette: MomentPalette; committed: boolean;
  onDone: (r: ExerciseDone) => void; onCommit: () => void; onCrisis: (t: string) => void;
}> = ({ guide, palette, committed, onDone, onCommit, onCrisis }) => {
  switch (guide.kind) {
    case 'breath': return <BreathGuide g={guide} palette={palette} onDone={() => onDone({})} />;
    case 'timer': return <TimerGuide minutes={guide.minutes} palette={palette} onDone={() => onDone({})} />;
    case 'steps': return <StepsGuide g={guide} palette={palette} onDone={note => onDone({ note })} onCrisis={onCrisis} />;
    case 'chips': return <ChipsGuide g={guide} palette={palette} onDone={note => onDone({ note })} />;
    case 'write': return <WriteGuide g={guide} palette={palette} onDone={note => onDone({ note })} onCrisis={onCrisis} />;
    case 'habit': return <HabitGuide g={guide} committed={committed} palette={palette} onCommit={onCommit} onDone={held => onDone({ held })} />;
    default: return <button onClick={() => onDone({})} style={{ ...btn(palette), alignSelf: 'flex-start' }}>C'est fait</button>;
  }
};

// ── L'apprentissage : on devine, puis on comprend ────────────────────────────

export const LearnQuiz: React.FC<{ learning: ProgLearning; quiz?: { q: string; answer: boolean }; palette: MomentPalette; onDone: (right: boolean | null) => void }> = ({ learning, quiz, palette, onDone }) => {
  const [picked, setPicked] = useState<boolean | null>(null);
  const doneRef = useRef(false);
  if (!quiz) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: C.soft }}>{learning.text}</p>
        <button onClick={() => onDone(null)} style={{ ...btn(palette, true), alignSelf: 'flex-start' }}>Lu</button>
      </div>
    );
  }
  const right = picked === quiz.answer;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>Vrai ou faux ?</p>
      <p style={{ margin: 0, fontSize: 15.5, color: C.title, fontWeight: 600, lineHeight: 1.45 }}>« {quiz.q} »</p>
      {picked === null ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPicked(true)} style={{ ...btn(palette, true), flex: 1 }}>Vrai</button>
          <button onClick={() => setPicked(false)} style={{ ...btn(palette, true), flex: 1 }}>Faux</button>
        </div>
      ) : (
        <div className="drl-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: right ? C.sage : palette.accent }}>
            {right ? 'Bien vu !' : 'Pas tout à fait…'} C'est {quiz.answer ? 'vrai' : 'faux'}.
          </p>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: C.soft }}>{learning.text}</p>
          <button onClick={() => { if (!doneRef.current) { doneRef.current = true; onDone(right); } }} style={{ ...btn(palette), alignSelf: 'flex-start' }}>J'ai compris</button>
        </div>
      )}
    </div>
  );
};
