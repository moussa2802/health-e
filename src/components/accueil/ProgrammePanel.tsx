/**
 * ProgrammePanel — « Mes engagements du jour » (Mon programme), plein écran.
 * Chaque engagement se FAIT ici, guidé par Dr Lô (respiration, étapes, quelques lignes gardées
 * dans le journal, habitude du jour, vrai/faux), et Dr Lô réagit. Cocher reste gratuit.
 * Aucune culpabilisation : un jour manqué s'affiche en gris, jamais en rouge.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronLeft, ClipboardCheck, Flame, LineChart, Moon, Pause, Phone, Play, Plus, X } from 'lucide-react';
import {
  AXES, bilanDue, dailyLine, dayComplete, dayNumber, hardStreak, improved, isDone, moodSeries, planFor,
  PROGRAMME_DAYS, retestInfo, routineDone, streak, weekDots, weekOf,
  type Engagement, type EngKey, type MoodLike, type Programme, type SleepNote,
} from '../../utils/programme';
import { CHAPTERS, guideOf, LEARNINGS, QUIZ } from '../../data/programmeLibrary';
import { getCrisisResources } from '../../data/crisisResources';
import { routineById, TOTEM_ROUTINES } from '../../data/totemGuide';
import { resolveGender } from '../../utils/gender';
import type { TotemAnimal } from '../../utils/totemAlgorithm';
import type { MomentPalette } from '../../utils/drloMoment';
import { ExerciseRunner, LearnQuiz, type ExerciseDone } from './ProgrammeExercise';
import MoodIcon from './MoodIcon';
import { MOODS, type MoodId } from '../../utils/moodLog';

import CompanionMark from './CompanionMark';
const C = {
  text: '#F4EEE4', soft: '#DCD3C5', muted: '#CFC6B8', faint: '#A79E90', title: '#FBF5EA',
  sage: '#9DBFAF', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.05)', ink: '#1C140D',
};

export interface ProgrammePanelProps {
  p: Programme;
  today: string;
  moods: MoodLike;
  palette: MomentPalette;
  prenom?: string;
  genre?: 'homme' | 'femme';
  /** Totem révélé : ses routines peuvent rejoindre le programme */
  totem?: { animal: TotemAnimal; label: string; words: { du: string; ton: string } } | null;
  testLabel: (scaleId: string) => string;
  bilanCost: string;
  testCost: string;
  busy: 'bilan' | null;
  onClose: () => void;
  onToggle: (key: EngKey, on?: boolean) => void;
  onCommit: () => void;
  /** Garde une trace écrite de l'exercice dans le journal (carnet « Programme ») */
  onNote: (text: string) => void;
  /** Un mot de crise écrit dans un exercice : protocole de crise habituel */
  onCrisis: (text: string) => void;
  onSleep: (n: SleepNote) => void;
  /** Cocher / décocher une routine aujourd'hui */
  onRoutineCheck: (id: string, on?: boolean) => void;
  /** Ajouter / retirer une routine du programme */
  onRoutineSet: (id: string, on: boolean) => void;
  /** Noter l'humeur du jour ici même (sans quitter le programme) : renvoie le petit mot de Dr Lô. */
  onMood: (id: MoodId) => string;
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

/** Ce que Dr Lô dit quand un engagement est tenu (écrit à l'avance, gratuit). */
const REACT = {
  breath: ['Tu sens ? Ton souffle a déjà ralenti.', 'Une minute rien que pour toi. Ça compte.', 'Ton corps vient de recevoir le message : tout va bien.'],
  note: ['C\'est gardé dans ton journal, carnet « Programme ».', 'Bien joué. Mettre des mots, c\'est déjà alléger.', 'Noté. Tu pourras relire ça dans quelques semaines.'],
  done: ['Bien joué. Un pas de plus, ndank ndank.', 'C\'est fait. Je suis fier de toi.', 'Bravo. Chaque petit geste compte.'],
  held: ['Bravo, tu as tenu !', 'Tenu ! C\'est comme ça qu\'une habitude s\'installe.'],
  notHeld: ['Tu as essayé, c\'est déjà beaucoup. Demain est un autre jour.', 'Pas grave du tout. On réessaie demain, tranquillement.'],
  learnRight: ['Bien vu ! Tu en sais déjà beaucoup.', 'Exact. Tu as l\'œil.'],
  learnWrong: ['Maintenant tu sais. C\'est tout l\'intérêt.', 'Beaucoup de gens pensent pareil. Maintenant tu sais.'],
  commit: ['C\'est noté. Je te le redemande plus tard.'],
};
const pick = (list: string[], seed: number) => list[seed % list.length];

const ProgrammePanel: React.FC<ProgrammePanelProps> = props => {
  const { p, today, moods, palette } = props;
  const day = dayNumber(p, today);
  const shownDay = Math.min(PROGRAMME_DAYS, day);
  const plan = planFor(p, day);
  // À l'ouverture : le premier engagement pas encore tenu est déplié
  const firstOpen = (): EngKey | null => (plan.find(e => !isDone(p, today, e.key, moods))?.key ?? null);
  const [open, setOpen] = useState<EngKey | null>(firstOpen);
  const [confirmStop, setConfirmStop] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const wasComplete = useRef(dayComplete(p, today, moods));
  const [cheer, setCheer] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; if (toastTimer.current) window.clearTimeout(toastTimer.current); };
  }, []);
  const complete = dayComplete(p, today, moods);
  useEffect(() => {
    if (complete && !wasComplete.current) {
      setCheer(true);
      window.setTimeout(() => setCheer(false), 2600);
      window.setTimeout(() => doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
    wasComplete.current = complete;
  }, [complete]);

  const say = (t: string) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  };
  const seed = day;
  /** Engagement tenu : on coche, Dr Lô réagit, et on déplie le suivant. */
  /** Humeur notée ici même : Dr Lô réagit, et on déplie l'engagement suivant. */
  const pickMood = (id: MoodId) => {
    say(props.onMood(id));
    const next = plan.find(e => e.kind !== 'mood' && !isDone(p, today, e.key, moods));
    setOpen(next ? next.key : null);
  };
  const finish = (key: EngKey, line: string) => {
    props.onToggle(key, true);
    say(line);
    const next = plan.find(e => e.key !== key && !isDone(p, today, e.key, moods));
    setOpen(next ? next.key : null);
  };

  const ax = AXES[p.axis];
  const week = weekOf(shownDay);
  const chapters = CHAPTERS[p.axis];
  const { dots, active } = weekDots(p, today, moods);
  const due = p.status === 'active' ? bilanDue(p, today) : null;
  const nextBilanDay = Math.min(PROGRAMME_DAYS, (Math.floor(day / 7) + 1) * 7);
  const retest = retestInfo(p, today, moods);
  const hard = hardStreak(moods, today) >= 3;
  const lastBilan = p.bilans.length ? p.bilans[p.bilans.length - 1] : null;
  const resources = getCrisisResources();
  const series = moodSeries(p, today, moods);
  const noted = series.filter(v => v !== null).length;
  const run = streak(p, today, moods);
  const tomorrow = shownDay < PROGRAMME_DAYS ? planFor(p, shownDay + 1)[1] : null;

  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass };
  const primary: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: palette.primary, color: C.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' };
  const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: C.text, fontWeight: 600 };
  const link: React.CSSProperties = { border: 0, background: 'transparent', color: C.faint, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40, textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit' };

  const onExercise = (e: Engagement, r: ExerciseDone) => {
    if (r.note) props.onNote(r.note);
    const g = guideOf(e.refId);
    const line = r.held === true ? pick(REACT.held, seed) : r.held === false ? pick(REACT.notHeld, seed)
      : g.kind === 'breath' ? pick(REACT.breath, seed) : r.note ? pick(REACT.note, seed) : pick(REACT.done, seed);
    finish('action', line);
  };

  const row = (e: Engagement) => {
    const done = isDone(p, today, e.key, moods);
    const expanded = open === e.key;
    const g = e.key === 'action' ? guideOf(e.refId) : null;
    const committed = !!p.commits?.[today];
    const tag = e.kind === 'mood' ? 'Un tap'
      : e.kind === 'learn' ? (e.reread ? 'À relire · vrai ou faux' : 'Vrai ou faux · 30 s')
      : g?.kind === 'habit' ? (committed && !done ? 'Engagé · je te le redemande' : 'Habitude du jour')
      : g?.kind === 'breath' ? `Guidé · ${e.duration ?? '1 min'}`
      : g?.kind === 'write' || g?.kind === 'steps' || g?.kind === 'chips' ? `Accompagné · ${e.duration ?? '2 min'}`
      : e.duration ?? 'Dans la journée';
    const onCircle = () => {
      if (e.kind === 'mood') { if (!done) setOpen(e.key); return; }
      if (done) { props.onToggle(e.key, false); return; }
      setOpen(e.key);
    };
    const learning = e.kind === 'learn' ? LEARNINGS.find(l => l.id === e.refId) : undefined;
    return (
      <div key={e.key} style={{ ...card, padding: 0, borderColor: done ? 'rgba(157,191,175,.35)' : expanded ? 'rgba(242,182,109,.35)' : C.line }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
          <button onClick={onCircle} aria-label={done ? `${e.title} : fait` : `${e.title} : à faire`} aria-pressed={done}
            style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: `2px solid ${done ? palette.accent : 'rgba(242,182,109,.55)'}`, background: done ? palette.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            {done && <Check size={16} strokeWidth={3} color={C.ink} aria-hidden="true" />}
          </button>
          <button onClick={() => setOpen(expanded ? null : e.key)} aria-expanded={expanded}
            style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: C.text, textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: done ? C.muted : C.text }}>{e.title}</span>
              <span style={{ display: 'block', fontSize: 13, color: done ? C.sage : C.faint, marginTop: 2 }}>{done ? `Fait · ${tag}` : tag}</span>
            </span>
            <ChevronDown size={18} color={C.faint} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        </div>
        {(expanded || (e.kind === 'mood' && p.axis === 'sommeil' && !p.sleep[today])) && (
          <div className="drl-in" style={{ padding: '0 14px 16px 56px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {expanded && e.kind !== 'learn' && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.soft }}>{e.text}</p>}
            {e.kind === 'mood' && p.axis === 'sommeil' && (
              <div role="group" aria-label="Ma nuit" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SLEEP.map(s => (
                  <button key={s.id} onClick={() => props.onSleep(s.id)} aria-pressed={p.sleep[today] === s.id}
                    style={{ minHeight: 38, padding: '0 12px', borderRadius: 999, border: `1px solid ${p.sleep[today] === s.id ? palette.accent : C.line}`, background: p.sleep[today] === s.id ? 'rgba(242,182,109,.18)' : 'transparent', color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                    <Moon size={13} aria-hidden="true" />{s.label}
                  </button>
                ))}
              </div>
            )}
            {expanded && e.kind === 'mood' && !done && (
              <div role="group" aria-label="Mon humeur maintenant" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {MOODS.map(md => (
                  <button key={md.id} onClick={() => pickMood(md.id)} className="drl-mood" aria-label={md.label}
                    style={{ minHeight: 68, borderRadius: 14, border: `1px solid ${C.line}`, background: C.glass, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 2px', fontFamily: 'inherit' }}>
                    <MoodIcon id={md.id} color={md.color} />
                    {md.label}
                  </button>
                ))}
              </div>
            )}
            {expanded && e.key === 'action' && g && !done && (
              <ExerciseRunner guide={g} palette={palette} committed={committed}
                onDone={r => onExercise(e, r)}
                onCommit={() => { props.onCommit(); say(REACT.commit[0]); }}
                onCrisis={props.onCrisis} />
            )}
            {expanded && e.kind === 'learn' && learning && (done
              ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.soft }}>{learning.text}</p>
              : <LearnQuiz key={learning.id} learning={learning} quiz={QUIZ[learning.id]} palette={palette}
                  onDone={right => finish('learn', right === false ? pick(REACT.learnWrong, seed) : pick(REACT.learnRight, seed))} />)}
          </div>
        )}
      </div>
    );
  };

  const result = p.result;
  const verdict = result ? improved(result) : null;

  // Courbe de l'humeur depuis le début
  const spark = (() => {
    if (noted < 3) return null;
    const W = 300; const H = 70; const n = series.length;
    const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 12) + 6);
    const y = (v: number) => H - 8 - ((v - 1) / 4) * (H - 16);
    const pts = series.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Ton humeur jour après jour depuis le début du programme">
        <line x1="0" x2={W} y1={y(3)} y2={y(3)} stroke="rgba(255,255,255,.10)" strokeDasharray="3 4" />
        <polyline points={pts} fill="none" stroke={palette.accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill={palette.accent} />))}
      </svg>
    );
  })();

  // ── Mes routines (celles de l'animal intérieur) : en plus des 3 engagements, retirables ──
  const gtxt = (t: string) => resolveGender(t, props.genre ?? 'homme');
  const myRoutines = (p.routines ?? []).map(id => routineById(id)).filter((r): r is NonNullable<typeof r> => !!r);
  const suggest = props.totem ? TOTEM_ROUTINES[props.totem.animal].filter(r => !(p.routines ?? []).includes(r.id)) : [];
  const WHEN: Record<string, string> = { matin: 'Le matin', 'journée': 'Dans la journée', soir: 'Le soir' };
  const routinesBlock = (myRoutines.length > 0 || suggest.length > 0) ? (
    <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{props.totem ? `Mes routines ${props.totem.words.du}` : 'Mes routines'}</p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: C.faint }}>En plus de tes 3 engagements. Tu peux en retirer quand tu veux.</p>
      </div>
      {myRoutines.map(r => {
        const done = routineDone(p, today, r.id);
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <button onClick={() => { props.onRoutineCheck(r.id); if (!done) say(pick(REACT.done, seed + r.id.length)); }} aria-pressed={done} aria-label={done ? `${r.title} : fait` : `${r.title} : à faire`}
              style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: `2px solid ${done ? C.sage : 'rgba(157,191,175,.6)'}`, background: done ? C.sage : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginTop: 2 }}>
              {done && <Check size={15} strokeWidth={3} color={C.ink} aria-hidden="true" />}
            </button>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: done ? C.muted : C.text }}>{r.title}</span>
              <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>{WHEN[r.when]} · {gtxt(r.text)}</span>
            </span>
            <button onClick={() => props.onRoutineSet(r.id, false)} aria-label={`Retirer « ${r.title} » de mon programme`}
              style={{ flexShrink: 0, width: 36, height: 36, border: 0, background: 'transparent', color: C.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      {suggest.length > 0 && (
        <div style={{ borderTop: myRoutines.length ? `1px solid ${C.line}` : 0, paddingTop: myRoutines.length ? 10 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myRoutines.length > 0 && <p style={{ margin: 0, fontSize: 13, color: C.faint }}>{props.totem!.words.ton.charAt(0).toUpperCase() + props.totem!.words.ton.slice(1)} te propose aussi :</p>}
          {suggest.map(r => (
            <button key={r.id} onClick={() => { props.onRoutineSet(r.id, true); say('Ajouté à ton programme. Tu pourras le retirer à tout moment.'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px dashed rgba(255,255,255,.22)', background: 'transparent', color: C.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <Plus size={16} color={palette.accent} aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{r.title}</span>
                <span style={{ display: 'block', fontSize: 13, color: C.faint }}>{WHEN[r.when]} · {gtxt(r.text)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Mes engagements du jour"
      style={{ position: 'fixed', inset: 0, zIndex: 55, background: palette.bg, color: C.text, overflowY: 'auto', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <div className="drl-wrap" style={{ margin: '0 auto', padding: '14px 16px 110px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={props.onClose} aria-label="Revenir" style={{ width: 44, height: 44, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.title }}>
              {result ? 'Mon programme' : 'Mes engagements du jour'}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.faint }}>
              {ax.short} · Jour {shownDay} sur {PROGRAMME_DAYS}{p.light ? ' · version légère' : ''}
            </p>
          </div>
        </header>

        {/* Dr Lô accueille chaque jour */}
        {!result && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CompanionMark size={44} className={cheer ? 'drl-joy-glow' : undefined} ring={cheer ? '#E9C88F' : 'rgba(242,182,109,.45)'} />
            <p className="drl-in" key={complete ? 'c' : 'n'} style={{ margin: 0, padding: '12px 14px', borderRadius: '6px 18px 18px 18px', background: 'rgba(255,255,255,.07)', fontSize: 15, lineHeight: 1.55, color: C.soft }}>
              {complete
                ? `Journée validée${props.prenom ? `, ${props.prenom}` : ''} ! ${tomorrow ? `Demain : ${tomorrow.title.toLowerCase()}${tomorrow.duration ? ` (${tomorrow.duration})` : ''}. ` : ''}Repose-toi bien.`
                : dailyLine(p, today, moods, props.prenom)}
            </p>
          </div>
        )}

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
            <p style={{ margin: 0, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: palette.accent }}>Le chemin parcouru · {props.testLabel(result.scaleId)}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {[['Au départ', result.before, result.beforeLabel], ['Aujourd\'hui', result.after, result.afterLabel]].map(([t, v, l]) => (
                <div key={String(t)} style={{ borderRadius: 14, background: 'rgba(255,255,255,.05)', padding: 12 }}>
                  <span style={{ display: 'block', fontSize: 13, color: C.faint }}>{t}</span>
                  <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: C.title }}>{v}</span>
                  <span style={{ display: 'block', fontSize: 13, color: C.soft }}>{l}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.55, color: C.soft }}>
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
          {/* Le chemin : 4 étapes */}
          <div style={{ ...card, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
              {chapters.map((c, i) => (
                <span key={c.name} style={{ flex: 1, height: 6, borderRadius: 3, background: i + 1 < week ? palette.accent : i + 1 === week ? `linear-gradient(90deg, ${palette.accent} ${Math.round((((shownDay - 1) % 7) + 1) / 7 * 100)}%, rgba(255,255,255,.12) 0)` : 'rgba(255,255,255,.12)' }} />
              ))}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 14, color: C.text, fontWeight: 700 }}>
              Étape {week} sur 4 · {chapters[week - 1].name}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.faint }}>
              {week < 4 ? `Ensuite : ${chapters[week].name}` : 'Dernière étape, puis le nouveau test'}
            </p>
          </div>

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
            <span style={{ fontSize: 13, color: C.faint, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {run >= 2 ? <><Flame size={15} color="#F2B66D" aria-hidden="true" /><b style={{ color: C.text }}>{run} jours</b> d'affilée</> : <>jours actifs <b style={{ color: C.text }}>{active}/7</b></>}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{plan.map(row)}</div>

          {routinesBlock}

          {complete && (
            <div ref={doneRef} className="drl-in" style={{ ...card, padding: 16, textAlign: 'center', borderColor: 'rgba(233,200,143,.45)', background: 'radial-gradient(120% 90% at 50% 0%, rgba(233,200,143,.16), rgba(233,200,143,0) 70%), rgba(255,255,255,.04)' }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: '50%', background: palette.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={26} strokeWidth={3} color={C.ink} />
              </span>
              <p style={{ margin: '10px 0 2px', fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: C.title }}>Journée validée</p>
              <p style={{ margin: 0, fontSize: 14, color: C.soft, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {run >= 2 ? <><Flame size={15} color="#F2B66D" aria-hidden="true" />{run} jours d'affilée</> : 'Premier jour tenu, bravo.'}
              </p>
              {tomorrow && (
                <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.5, color: C.faint }}>
                  Demain : <b style={{ color: C.text }}>{tomorrow.title}</b>{tomorrow.duration ? ` · ${tomorrow.duration}` : ''}
                </p>
              )}
            </div>
          )}

          {spark && (
            <div style={{ ...card, padding: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>Ton humeur depuis le début</p>
              {spark}
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.faint }}>{noted} jour{noted > 1 ? 's' : ''} noté{noted > 1 ? 's' : ''} · plus c'est haut, mieux ça va</p>
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
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Bilan de la semaine</span>
                <span style={{ display: 'block', fontSize: 13, color: C.faint }}>
                  {due ? `Semaine ${due} · ${props.bilanCost}` : `Disponible au jour ${nextBilanDay} · ${props.bilanCost}`}
                </span>
              </div>
              {due && (
                <button onClick={props.onBilan} disabled={props.busy === 'bilan'} style={{ ...primary, opacity: props.busy === 'bilan' ? 0.6 : 1 }}>
                  {props.busy === 'bilan' ? 'Je relis…' : 'Voir'}
                </button>
              )}
            </div>
            {retest && (
              <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <ClipboardCheck size={22} color={retest.available ? palette.accent : C.muted} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Refaire mon test « {props.testLabel(retest.scaleId)} »</span>
                  <span style={{ display: 'block', fontSize: 13, color: C.faint }}>
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
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: C.faint, lineHeight: 1.5 }}>
          Cocher est gratuit. Un jour manqué n'est pas grave : reprends simplement le lendemain.
        </p>
      </div>

      {/* Dr Lô réagit */}
      {toast && (
        <div role="status" className="drl-in" style={{ position: 'fixed', left: 16, right: 16, bottom: 20, zIndex: 56, maxWidth: 488, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 18, background: '#2A211A', border: '1px solid rgba(242,182,109,.35)', boxShadow: '0 12px 30px rgba(0,0,0,.45)' }}>
          <CompanionMark size={32} />
          <span style={{ fontSize: 14, lineHeight: 1.45, color: C.text }}>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default ProgrammePanel;

/** La carte de l'accueil : comme une petite notification (pastille = engagements restants). */
export const ProgrammeHomeCard: React.FC<{ p: Programme; today: string; remaining: number; palette: MomentPalette; onOpen: () => void; totemImg?: string }> = ({ p, today, remaining, palette, onOpen, totemImg }) => {
  const day = Math.min(PROGRAMME_DAYS, dayNumber(p, today));
  const sub = p.result ? `${AXES[p.axis].short} · terminé, vois le chemin parcouru`
    : p.status === 'paused' ? `${AXES[p.axis].short} · en pause`
    : `${AXES[p.axis].short} · Jour ${day} sur ${PROGRAMME_DAYS}`;
  const badge = p.status === 'active' && !p.result && remaining > 0 ? remaining : 0;
  return (
    <button onClick={onOpen} className="drl-btn drl-in"
      aria-label={`Mon programme. ${sub}.${badge ? ` ${badge} engagement${badge > 1 ? 's' : ''} à faire aujourd'hui.` : ''}`}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', borderRadius: 18, border: `1px solid ${C.line}`, background: C.glass, color: C.text, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, background: 'rgba(242,182,109,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ClipboardCheck size={22} color={palette.accent} aria-hidden="true" />
          {badge > 0 && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#E8664F', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>{badge}</span>
          )}
          {badge === 0 && p.status === 'active' && !p.result && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1C1612' }}>
              <Check size={12} strokeWidth={3} color={C.ink} />
            </span>
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Mon programme</span>
          <span style={{ display: 'block', fontSize: 13, color: C.faint, marginTop: 2 }}>{sub}</span>
        </span>
        {totemImg && <img src={totemImg} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(233,200,143,.35)' }} />}
      </span>
      {!p.result && (
        <span aria-hidden="true" style={{ display: 'block', width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
          <span style={{ display: 'block', width: `${Math.round((day / PROGRAMME_DAYS) * 100)}%`, height: '100%', borderRadius: 3, background: palette.accent }} />
        </span>
      )}
    </button>
  );
};
