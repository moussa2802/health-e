/**
 * GuidedExercise — les exercices guidés en vocal dans la discussion du compagnon.
 *   ExerciseListCard : la liste (menu « + » → Exercices guidés)
 *   ExerciseCard     : un exercice proposé par le compagnon
 *   VocalCard        : un vocal de soutien (lecteur + texte), jamais en lecture automatique
 *   GuidedRunScreen  : l'exercice en cours, en plein écran (cercle, consigne, son, arrêter)
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Anchor, HeartPulse, Moon, Play, Volume2, VolumeX, Waves, Wind, X, type LucideIcon } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { AMBIENTS, EXERCISES, EXERCISE_IDS, VOCALS, VOICES, getVoiceGender, setVoiceGender, voiceUrl, type ExerciseId, type VocalId, type VoiceGender } from '../../data/guidedExercises';
import { exerciseLog, type Feeling, type useGuidedExercise } from '../../hooks/useGuidedExercise';

export const EXERCISE_ICON: Record<ExerciseId, LucideIcon> = {
  coherence: HeartPulse, ancrage: Anchor, sommeil: Moon, relacher: Waves,
};
const TXT = { text: '#F3ECE2', soft: '#D8CFC3', muted: '#B5AA9C', faint: '#948A7E', ink: '#1A120B' };

const rowBtn: React.CSSProperties = {
  width: '100%', minHeight: 52, padding: '8px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)',
  color: TXT.text, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
};

/** « Voix : Femme · Homme » — le choix vaut pour tous les exercices et vocaux, gardé sur l'appareil. */
const VoicePicker: React.FC<{ value: VoiceGender; onChange: (v: VoiceGender) => void; accent: string; compact?: boolean }> = ({ value, onChange, accent, compact }) => (
  <div role="group" aria-label="Voix" style={compact
    ? { display: 'flex', alignItems: 'center', gap: 6 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
    {compact && <span style={{ fontSize: 13, color: TXT.faint, marginRight: 2 }}>Voix :</span>}
    {VOICES.map(v => (
      <button key={v.id} type="button" aria-pressed={value === v.id} onClick={() => onChange(v.id)} className="drl-btn"
        style={compact ? { ...pill(value === v.id, accent), minHeight: 36, padding: '0 12px', fontSize: 13 } : pill(value === v.id, accent)}>{v.label}</button>
    ))}
  </div>
);

export const ExerciseListCard: React.FC<{ accent: string; onBreath: () => void; onPick: (id: ExerciseId) => void }> = ({ accent, onBreath, onPick }) => {
  const [gender, setGender] = useState<VoiceGender>(getVoiceGender);
  return (
  <div className="drl-in" role="group" aria-label="Exercices guidés" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
    <button type="button" onClick={onBreath} className="drl-btn" style={rowBtn}>
      <Wind size={20} color={accent} aria-hidden={true} />
      <span style={{ flex: 1 }}><b style={{ display: 'block', fontSize: 15 }}>Respirer</b><span style={{ fontSize: 13, color: TXT.muted }}>Une pause, tout de suite</span></span>
      <span style={{ fontSize: 13, color: TXT.faint }}>1 min</span>
    </button>
    {EXERCISE_IDS.map(id => {
      const e = EXERCISES[id]; const I = EXERCISE_ICON[id];
      return (
        <button key={id} type="button" onClick={() => onPick(id)} className="drl-btn" style={rowBtn}>
          <I size={20} color={accent} aria-hidden={true} />
          <span style={{ flex: 1 }}><b style={{ display: 'block', fontSize: 15 }}>{e.label}</b><span style={{ fontSize: 13, color: TXT.muted }}>{e.hint}</span></span>
          <span style={{ fontSize: 13, color: TXT.faint }}>{e.minutes} min</span>
        </button>
      );
    })}
    <p style={{ margin: '2px 0 0', fontSize: 13, color: TXT.faint }}>Gratuit · avec la voix (tu peux la couper)</p>
    <VoicePicker compact value={gender} onChange={v => { setGender(v); setVoiceGender(v); }} accent={accent} />
    {(() => { const h = helpedHint(); return h ? (
      <button type="button" onClick={() => onPick(h.id)} className="drl-btn"
        style={{ marginTop: 4, padding: '10px 12px', borderRadius: 12, border: 0, background: 'rgba(157,191,175,.1)', color: '#9DBFAF', fontSize: 13, lineHeight: 1.45, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>{h.text}</button>
    ) : null; })()}
  </div>
  );
};

export const ExerciseCard: React.FC<{ id: ExerciseId; accent: string; onPick: (id: ExerciseId) => void }> = ({ id, accent, onPick }) => {
  const e = EXERCISES[id]; const I = EXERCISE_ICON[id];
  return (
    <button type="button" onClick={() => onPick(id)} className="drl-btn drl-in"
      style={{ marginTop: 10, minHeight: 48, padding: '0 16px', borderRadius: 12, border: 0, background: accent, color: TXT.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
      <I size={16} aria-hidden={true} />{e.label} · {e.minutes} min
    </button>
  );
};

export const VocalCard: React.FC<{ id: VocalId; accent: string; onPlay?: () => void }> = ({ id, accent, onPlay }) => {
  const v = VOCALS[id];
  const [showText, setShowText] = useState(false);
  return (
    <div className="drl-in" style={{ marginTop: 10, textAlign: 'left' }}>
      <AudioPlayer src={voiceUrl('soutien', v.file)} ariaLabel={v.label} durationHint={v.seconds} accent={accent} onPlay={onPlay} />
      <button type="button" onClick={() => setShowText(x => !x)} aria-expanded={showText} className="drl-btn"
        style={{ marginTop: 6, minHeight: 32, padding: 0, border: 0, background: 'transparent', color: TXT.faint, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
        {showText ? 'Masquer le texte' : 'Lire le texte'}
      </button>
      {showText && <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.55, color: TXT.soft }}>{v.text}</p>}
    </div>
  );
};

const SCALE = { in: 1, hold: 1, out: 0.62, rest: 0.8 } as const;
const FEEL_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « La cohérence cardiaque t'avait aidé jeudi. » : le dernier exercice qui a aidé (14 jours). */
export function helpedHint(): { id: ExerciseId; text: string } | null {
  const hit = exerciseLog().find(l => l.feeling === 'mieux' && Date.now() - l.at < 14 * 86400000 && l.id in EXERCISES);
  if (!hit) return null;
  const d = new Date(hit.at);
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  const when = days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : days < 7 ? FEEL_DAYS[d.getDay()] : 'la semaine dernière';
  const lbl = EXERCISES[hit.id].label;
  return { id: hit.id, text: `${lbl.charAt(0).toUpperCase() + lbl.slice(1)} t'a fait du bien ${when}. On recommence ?` };
}

type G = ReturnType<typeof useGuidedExercise>;

const pill = (on: boolean, accent: string): React.CSSProperties => ({
  minHeight: 44, borderRadius: 12, border: `1px solid ${on ? accent : 'rgba(255,255,255,.14)'}`, background: on ? `${accent}29` : 'transparent',
  color: on ? accent : TXT.soft, fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 700 : 600, cursor: 'pointer',
});
const ctrl: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,.16)', background: 'transparent', color: TXT.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };

/** L'exercice en plein écran : entrée, 3-2-1, exercice, puis « Comment tu te sens ? ». */
export const GuidedRunScreen: React.FC<{ g: G; accent: string }> = ({ g, accent }) => {
  const run = g.run!;
  const e = EXERCISES[run.id];
  const night = run.id === 'sommeil';
  const tint = run.id === 'ancrage' ? '#9DBFAF' : night ? '#C9B8E4' : accent;
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Les commandes s'estompent après 10 s sans toucher (pendant l'exercice)
  const [idle, setIdle] = useState(false);
  const [, setTick] = useState(0);
  const lastTouch = useRef(Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => { setTick(t => t + 1); setIdle(run.stage === 'run' && Date.now() - lastTouch.current > 10000); }, 250);
    return () => window.clearInterval(iv);
  }, [run.stage]);
  const wake = () => { lastTouch.current = Date.now(); setIdle(false); };

  const fadeCtl: React.CSSProperties = { opacity: idle ? 0.15 : 1, transition: 'opacity .8s' };
  const left = Math.max(0, Math.ceil((run.totalMs - run.elapsedMs) / 60000));
  const pct = Math.min(100, (run.elapsedMs / run.totalMs) * 100);
  const secs = run.stage === 'run' && run.step.phase !== 'rest' ? Math.max(1, Math.ceil((run.stepEndsAt - Date.now()) / 1000)) : null;
  const phaseWord = run.step.phase === 'in' ? 'Inspire' : run.step.phase === 'out' ? 'Expire' : run.step.phase === 'hold' ? 'Garde' : null;
  const circle: React.CSSProperties = {
    width: 236, height: 236, borderRadius: '50%',
    background: `radial-gradient(circle, ${tint}${night ? '2e' : '8c'} 0%, ${tint}${night ? '0f' : '38'} 55%, ${tint}0a 72%)`,
    border: `2px solid ${tint}${night ? '38' : '99'}`, boxShadow: night ? 'none' : `0 0 60px ${tint}40`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    ...(reduce
      ? { opacity: run.step.phase === 'out' ? 0.55 : 1, transition: 'opacity 1.2s ease-in-out' }
      : { transform: `scale(${run.stage === 'run' ? SCALE[run.step.phase] : 0.8})`, transition: `transform ${run.step.phase === 'hold' ? 300 : Math.min(run.step.ms, 8000)}ms cubic-bezier(.45,0,.55,1)` }),
  };

  let body: React.ReactNode;
  if (run.stage === 'setup') {
    body = (
      <>
        <div style={{ ...circle, width: 170, height: 170, transform: 'none' }} aria-hidden="true" />
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 30 }}>Installe-toi</h1>
        <p style={{ margin: 0, maxWidth: 320, textAlign: 'center', fontSize: 16, lineHeight: 1.55, color: TXT.soft }}>{e.setup}</p>
        <div style={{ alignSelf: 'stretch', maxWidth: 360, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {e.durations && (<>
            <p style={{ margin: 0, fontSize: 13, color: TXT.muted, fontWeight: 600 }}>Durée</p>
            <div role="group" aria-label="Durée" style={{ display: 'grid', gridTemplateColumns: `repeat(${e.durations.length}, minmax(0, 1fr))`, gap: 8 }}>
              {e.durations.map(m => <button key={m} type="button" aria-pressed={g.minutes === m} onClick={() => g.setMinutes(m)} className="drl-btn" style={pill(g.minutes === m, tint)}>{m} min</button>)}
            </div>
          </>)}
          <p style={{ margin: '6px 0 0', fontSize: 13, color: TXT.muted, fontWeight: 600 }}>Voix</p>
          <VoicePicker value={g.gender} onChange={g.setGender} accent={tint} />
          <p style={{ margin: '6px 0 0', fontSize: 13, color: TXT.muted, fontWeight: 600 }}>Fond sonore</p>
          <div role="group" aria-label="Fond sonore" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {AMBIENTS.map(a => <button key={a.id} type="button" aria-pressed={g.ambient === a.id} onClick={() => g.setAmbient(a.id)} className="drl-btn" style={pill(g.ambient === a.id, tint)}>{a.label}</button>)}
          </div>
        </div>
        <button type="button" onClick={g.begin} className="drl-btn"
          style={{ marginTop: 8, alignSelf: 'stretch', maxWidth: 360, width: '100%', marginInline: 'auto', minHeight: 54, borderRadius: 16, border: 0, background: tint, color: TXT.ink, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Commencer
        </button>
      </>
    );
  } else if (run.stage === 'countdown') {
    body = (
      <>
        <div style={circle} aria-hidden="true"><p style={{ margin: 0, fontSize: 64, fontWeight: 300, color: '#FFF6EA' }}>{run.count}</p></div>
        <p aria-live="polite" style={{ margin: 0, fontSize: 16, color: TXT.muted }}>On commence dans {run.count}…</p>
      </>
    );
  } else if (run.stage === 'after') {
    body = (
      <>
        <div style={{ ...circle, width: 120, height: 120, transform: 'none' }} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
        </div>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 30, textAlign: 'center' }}>Comment tu te sens<br />maintenant ?</h1>
        <div style={{ alignSelf: 'stretch', maxWidth: 360, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([['mieux', 'Mieux'], ['pareil', 'Pareil'], ['moins', 'Moins bien']] as [Feeling, string][]).map(([f, l]) => (
            <button key={f} type="button" onClick={() => g.finish(f)} className="drl-btn"
              style={{ minHeight: 56, borderRadius: 16, border: `1px solid ${f === 'mieux' ? 'rgba(157,191,175,.5)' : 'rgba(255,255,255,.16)'}`, background: f === 'mieux' ? 'rgba(157,191,175,.12)' : 'rgba(255,255,255,.04)', color: TXT.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px dashed ${tint}40` }} />
          <div style={circle}>
            {phaseWord && <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600, color: night ? '#A79DB3' : '#FFF6EA' }}>{phaseWord}</p>}
            {secs !== null && <p style={{ margin: 0, fontSize: 40, fontWeight: 300, color: night ? '#6E6578' : 'rgba(255,246,234,.8)', fontVariantNumeric: 'tabular-nums' }}>{secs}</p>}
          </div>
        </div>
        {/* Le texte de l'étape, sauf s'il répète le mot du cercle (« Inspire… ») */}
        <p aria-live="polite" style={{ margin: 0, maxWidth: 340, minHeight: 64, textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 20, lineHeight: 1.4, color: night ? '#6E6578' : TXT.soft }}>{phaseWord && /^(Inspire|Expire|Garde)\b[^.]*…?$/.test(run.text) && run.text.length < 12 ? '' : run.text}</p>
        {run.step.sound && !night && (
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: TXT.faint, fontSize: 13 }}>
            <svg width="44" height="14" viewBox="0 0 54 16" fill="none" stroke={tint} strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M1 8c4-6 8-6 12 0s8 6 12 0 8-6 12 0 8 6 12 0" /></svg>
            {run.step.phase === 'in' ? 'La vague monte' : 'La vague redescend'} · tu peux fermer les yeux
          </p>
        )}
      </>
    );
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={e.label} onPointerDown={wake}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: night ? '#050302' : '#140D08', color: TXT.text, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'calc(20px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
      <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...fadeCtl }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: night ? '#6E6578' : tint }}>{e.label}</p>
        {(run.stage === 'setup' || run.stage === 'after') && (
          <button type="button" onClick={run.stage === 'after' ? () => g.finish() : g.stop} aria-label="Fermer" className="drl-btn"
            style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: TXT.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div style={{ flex: 1, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '16px 0' }}>{body}</div>
      {run.stage === 'run' && (
        <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, ...fadeCtl }}>
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: night ? '#4F4757' : tint, transition: 'width .6s linear' }} />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: TXT.faint, textAlign: 'center' }}>{left > 0 ? `Encore ${left} min environ` : 'Presque fini'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={g.toggleVoice} aria-pressed={g.voiceOn} className="drl-btn" style={ctrl}>
              {g.voiceOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}{g.voiceOn ? 'Voix' : 'Voix coupée'}
            </button>
            <button type="button" onClick={() => { const i = AMBIENTS.findIndex(a => a.id === g.ambient); g.setAmbient(AMBIENTS[(i + 1) % AMBIENTS.length].id); }} className="drl-btn" style={ctrl}
              aria-label={`Fond sonore : ${AMBIENTS.find(a => a.id === g.ambient)?.label}. Toucher pour changer`}>
              <Waves size={16} aria-hidden="true" />{AMBIENTS.find(a => a.id === g.ambient)?.label}
            </button>
            <button type="button" onClick={g.stop} className="drl-btn" style={ctrl}><X size={16} aria-hidden="true" />Arrêter</button>
          </div>
          {!g.voiceOn && <p style={{ margin: 0, fontSize: 13, color: TXT.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Play size={12} aria-hidden="true" />Suis le cercle et le texte</p>}
        </div>
      )}
    </div>,
    document.body,
  );
};
