/**
 * useGuidedExercise — joue un exercice guidé (voix + petit son), étape par étape, à durées fixes.
 * Le calendrier est calculé depuis le départ (pas de dérive si un minuteur prend du retard).
 * start() doit être appelé DANS le toucher de la personne : c'est ce qui autorise le son sur iPhone.
 * Le choix « Couper la voix » est le même que pour « Respirer 1 min » (gardé sur l'appareil).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { EXERCISES, type ExerciseId, type Step } from '../data/guidedExercises';

const KEY = 'he_breath_sound';
const readPref = (): boolean => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const writePref = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* navigation privée */ } };

export interface GuidedState { id: ExerciseId; index: number; step: Step; text: string; elapsedMs: number; totalMs: number }

type WakeLockLike = { release: () => Promise<void> };

export function useGuidedExercise(onEnd: (id: ExerciseId, completed: boolean) => void) {
  const [run, setRunState] = useState<GuidedState | null>(null);
  const runRef = useRef<GuidedState | null>(null);
  const setRun = (r: GuidedState | null) => { runRef.current = r; setRunState(r); };
  const [soundOn, setSoundOn] = useState(readPref);
  const voice = useRef<HTMLAudioElement | null>(null);
  const sound = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<number | null>(null);
  const wake = useRef<WakeLockLike | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const el = (r: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (!r.current) { const a = new Audio(); a.preload = 'auto'; r.current = a; }
    return r.current;
  };

  const playStep = (dir: string, st: Step) => {
    if (!soundRef.current) return;
    if (st.voice) { const a = el(voice); a.src = `/audio/${dir}/${st.voice}.mp3`; a.play().catch(() => {}); }
    if (st.sound) { const b = el(sound); b.src = `/audio/${dir}/${st.sound}.mp3`; b.play().catch(() => {}); }
  };

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    wake.current?.release().catch(() => {});
    wake.current = null;
  };

  const stop = useCallback((completed = false) => {
    const cur = runRef.current;
    setRun(null);
    clear();
    if (cur) endRef.current(cur.id, completed);
    if (!completed) { voice.current?.pause(); sound.current?.pause(); }
  }, []);

  const start = useCallback((id: ExerciseId) => {
    const ex = EXERCISES[id];
    clear();
    voice.current?.pause();
    // Débloque les deux lecteurs pendant le toucher (iPhone)
    if (soundRef.current) {
      const b = el(sound);
      if (!b.src) { b.src = '/audio/coherence/son_inspire.mp3'; b.muted = true; b.play().then(() => { b.pause(); b.muted = false; }).catch(() => { b.muted = false; }); }
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } };
    nav.wakeLock?.request('screen').then(w => { wake.current = w; }).catch(() => {});

    const total = ex.steps.reduce((n, x) => n + x.ms, 0);
    const t0 = Date.now();
    const ends: number[] = [];
    ex.steps.reduce((n, x, i) => { ends[i] = n + x.ms; return ends[i]; }, 0);
    let lastText = '';
    const go = (i: number) => {
      if (i >= ex.steps.length) { stop(true); return; }
      const st = ex.steps[i];
      if (st.text) lastText = st.text;
      setRun({ id, index: i, step: st, text: lastText, elapsedMs: i ? ends[i - 1] : 0, totalMs: total });
      playStep(ex.dir, st);
      timer.current = window.setTimeout(() => go(i + 1), Math.max(0, t0 + ends[i] - Date.now()));
    };
    go(0);
  }, [stop]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    setSoundOn(next);
    writePref(next);
    if (!next) { voice.current?.pause(); sound.current?.pause(); }
  }, []);

  useEffect(() => () => { clear(); voice.current?.pause(); sound.current?.pause(); }, []);

  return { run, start, stop, soundOn, toggleSound };
}
