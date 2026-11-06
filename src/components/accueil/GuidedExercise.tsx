/**
 * GuidedExercise — les exercices guidés en vocal dans la discussion du compagnon.
 *   ExerciseListCard : la liste (menu « + » → Exercices guidés)
 *   ExerciseCard     : un exercice proposé par le compagnon
 *   VocalCard        : un vocal de soutien (lecteur + texte), jamais en lecture automatique
 *   GuidedRunScreen  : l'exercice en cours, en plein écran (cercle, consigne, son, arrêter)
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Anchor, HeartPulse, Moon, Play, Volume2, VolumeX, Waves, Wind, X, type LucideIcon } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { EXERCISES, EXERCISE_IDS, VOCALS, type ExerciseId, type VocalId } from '../../data/guidedExercises';
import type { GuidedState } from '../../hooks/useGuidedExercise';

export const EXERCISE_ICON: Record<ExerciseId, LucideIcon> = {
  coherence: HeartPulse, ancrage: Anchor, sommeil: Moon, relacher: Waves,
};
const TXT = { text: '#F3ECE2', soft: '#D8CFC3', muted: '#B5AA9C', faint: '#948A7E', ink: '#1A120B' };

const rowBtn: React.CSSProperties = {
  width: '100%', minHeight: 52, padding: '8px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)',
  color: TXT.text, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
};

export const ExerciseListCard: React.FC<{ accent: string; onBreath: () => void; onPick: (id: ExerciseId) => void }> = ({ accent, onBreath, onPick }) => (
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
  </div>
);

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
      <AudioPlayer src={v.file} ariaLabel={v.label} durationHint={v.seconds} accent={accent} onPlay={onPlay} />
      <button type="button" onClick={() => setShowText(x => !x)} aria-expanded={showText} className="drl-btn"
        style={{ marginTop: 6, minHeight: 32, padding: 0, border: 0, background: 'transparent', color: TXT.faint, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
        {showText ? 'Masquer le texte' : 'Lire le texte'}
      </button>
      {showText && <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.55, color: TXT.soft }}>{v.text}</p>}
    </div>
  );
};

const SCALE = { in: 1, hold: 1, out: 0.62, rest: 0.8 } as const;

export const GuidedRunScreen: React.FC<{ run: GuidedState; accent: string; soundOn: boolean; onToggleSound: () => void; onStop: () => void }> = ({ run, accent, soundOn, onToggleSound, onStop }) => {
  const e = EXERCISES[run.id];
  const night = run.id === 'sommeil';
  const pct = Math.min(100, (run.elapsedMs / run.totalMs) * 100);
  const left = Math.max(0, Math.ceil((run.totalMs - run.elapsedMs) / 60000));
  const btn: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,.16)', background: 'transparent', color: TXT.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };
  // Portail : un parent avec transform ou backdrop-filter casserait le plein écran
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={e.label}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: night ? '#050302' : '#140D08', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px calc(24px + env(safe-area-inset-bottom))', gap: 22 }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: night ? TXT.faint : accent }}>{e.label}</p>
      <div aria-hidden="true" style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}${night ? '33' : '55'} 0%, ${accent}${night ? '11' : '22'} 60%, transparent 72%)`,
          border: `2px solid ${accent}${night ? '44' : '88'}`,
          transform: `scale(${SCALE[run.step.phase]})`,
          transition: `transform ${run.step.phase === 'hold' ? 300 : Math.min(run.step.ms, 8000)}ms ease-in-out`,
        }} />
      </div>
      <p aria-live="polite" style={{ margin: 0, maxWidth: 340, minHeight: 72, textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 21, lineHeight: 1.4, color: night ? TXT.muted : TXT.text }}>{run.text}</p>
      <div style={{ width: '100%', maxWidth: 280 }}>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: night ? TXT.faint : accent, transition: 'width .6s linear' }} />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: TXT.faint, textAlign: 'center' }}>{left > 0 ? `Encore ${left} min environ` : 'Presque fini'}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={onToggleSound} aria-pressed={soundOn} className="drl-btn" style={btn}>
          {soundOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}{soundOn ? 'Couper la voix' : 'Remettre la voix'}
        </button>
        <button type="button" onClick={onStop} className="drl-btn" style={btn}><X size={16} aria-hidden="true" />Arrêter</button>
      </div>
      {!soundOn && <p style={{ margin: 0, fontSize: 13, color: TXT.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Play size={12} aria-hidden="true" />Suis le cercle et le texte</p>}
    </div>,
    document.body,
  );
};
