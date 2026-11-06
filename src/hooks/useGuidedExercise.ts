/**
 * useGuidedExercise — un exercice guidé, de l'écran « Installe-toi » au « Comment tu te sens ? ».
 *   open(id)   → écran d'entrée (posture, durée, fond sonore) — rien ne joue encore
 *   begin()    → DANS le toucher « Commencer » : débloque le son (iPhone), décompte 3-2-1, puis l'exercice
 *   finish(f)  → la réponse « Mieux / Pareil / Moins bien »
 *
 * Voix : un lecteur <audio> (une phrase par étape). Souffle et fond sonore : Web Audio
 * (boucle sans coupure, fondus, minutage précis). Étapes à durées fixes, calendrier calculé
 * depuis le départ : pas de dérive. Les choix (voix, fond sonore) sont gardés sur l'appareil.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { EXERCISES, getVoiceGender, setVoiceGender, stepsFor, voiceUrl, type Ambient, type ExerciseId, type Step, type VoiceGender } from '../data/guidedExercises';

const VOICE_KEY = 'he_breath_sound';
const AMB_KEY = 'he_ex_ambient';
const DONE_KEY = 'he_ex_done';
const LOG_KEY = 'he_ex_log';
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } };

export type Feeling = 'mieux' | 'pareil' | 'moins';
export interface ExLog { id: ExerciseId; feeling: Feeling; at: number }
/** Ce qui a aidé, sur cet appareil (le plus récent d'abord). */
export function exerciseLog(): ExLog[] {
  try { const v = JSON.parse(get(LOG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export type Stage = 'setup' | 'countdown' | 'run' | 'after';
export interface GuidedState {
  id: ExerciseId; stage: Stage;
  index: number; step: Step; text: string;
  elapsedMs: number; totalMs: number;
  /** Fin de la phase en cours (Date.now()), pour le compte à rebours. */
  stepEndsAt: number;
  count?: number; // décompte 3-2-1
}

const VOL = { souffle: 0.55, ambient: 0.28, preview: 0.4 };
type WakeLockLike = { release: () => Promise<void> };

/** elapsedMs : temps d'exercice déjà fait (0 si on arrête pendant le 3-2-1). */
export function useGuidedExercise(onEnd: (id: ExerciseId, completed: boolean, feeling?: Feeling, elapsedMs?: number) => void) {
  const [run, setRunState] = useState<GuidedState | null>(null);
  const runRef = useRef<GuidedState | null>(null);
  const setRun = (r: GuidedState | null) => { runRef.current = r; setRunState(r); };
  const [voiceOn, setVoiceOn] = useState(() => get(VOICE_KEY) !== 'off');
  const voiceRef = useRef(voiceOn); voiceRef.current = voiceOn;
  const [gender, setGenderState] = useState<VoiceGender>(getVoiceGender);
  const genderRef = useRef(gender); genderRef.current = gender;
  const [minutes, setMinutes] = useState<number | null>(null);
  const [ambient, setAmbientState] = useState<Ambient>('none');
  const ambientRef = useRef<Ambient>('none'); ambientRef.current = ambient;
  const endRef = useRef(onEnd); endRef.current = onEnd;

  const voice = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const buffers = useRef(new Map<string, Promise<AudioBuffer | null>>());
  const amb = useRef<{ src: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const timer = useRef<number | null>(null);
  const ambTimer = useRef<number | null>(null);
  const wake = useRef<WakeLockLike | null>(null);

  const audioCtx = () => {
    if (!ctx.current) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      // iPhone : sans ça, le bouton « silencieux » coupe les sons Web Audio (souffle, fond) mais pas la voix
      try { const n = navigator as Navigator & { audioSession?: { type: string } }; if (n.audioSession) n.audioSession.type = 'playback'; } catch { /* ancien iOS */ }
      ctx.current = new C();
    }
    return ctx.current;
  };
  /** Charge (une fois) un son sous /audio/. Fichier absent : null, l'exercice continue sans. */
  const load = (path: string) => {
    let p = buffers.current.get(path);
    if (!p) {
      const c = audioCtx();
      p = !c ? Promise.resolve(null) : fetch(`/audio/${path}.mp3`).then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then(b => new Promise<AudioBuffer>((ok, ko) => c.decodeAudioData(b, ok, ko))).catch(() => null);
      buffers.current.set(path, p);
    }
    return p;
  };
  const playBuffer = (path: string, volume: number) => {
    const c = ctx.current;
    if (!c) return;
    void load(path).then(buf => {
      if (!buf || !runRef.current) return;
      const src = c.createBufferSource(); const g = c.createGain();
      g.gain.value = volume; src.buffer = buf; src.connect(g).connect(c.destination); src.start();
    });
  };

  // ── Fond sonore ─────────────────────────────────────────────────────────────
  const stopAmbient = (fadeMs = 1500) => {
    const a = amb.current; const c = ctx.current;
    if (ambTimer.current) { window.clearTimeout(ambTimer.current); ambTimer.current = null; }
    if (!a || !c) return;
    a.gain.gain.cancelScheduledValues(c.currentTime);
    a.gain.gain.setValueAtTime(a.gain.gain.value, c.currentTime);
    a.gain.gain.linearRampToValueAtTime(0, c.currentTime + fadeMs / 1000);
    const src = a.src; window.setTimeout(() => { try { src.stop(); } catch { /* déjà arrêté */ } }, fadeMs + 50);
    amb.current = null;
  };
  const ambToken = useRef(0);
  /** Lance le fond sonore en boucle. preview : un extrait de 4 s quand on le choisit sur l'écran d'entrée. */
  const startAmbient = (which: Ambient, preview = false) => {
    stopAmbient(preview ? 300 : 600);
    const token = ++ambToken.current;
    const c = preview ? audioCtx() : ctx.current;
    if (!c || which === 'none') return;
    c.resume().catch(() => {});
    void load(`ambiance/fond_${which}`).then(buf => {
      // Un autre choix a été fait entre-temps : on ne superpose pas deux fonds
      if (!buf || token !== ambToken.current || ambientRef.current !== which || !runRef.current) return;
      const src = c.createBufferSource(); const g = c.createGain();
      src.buffer = buf; src.loop = true;
      // Les MP3 ont un petit silence au début et à la fin : on boucle sur le milieu (pas de « clic »)
      if (buf.duration > 2) { src.loopStart = 0.06; src.loopEnd = buf.duration - 0.06; }
      src.connect(g).connect(c.destination);
      const t = c.currentTime;
      // setValueAtTime d'abord : sans lui, Safari ignore la montée progressive
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(preview ? VOL.preview : VOL.ambient, t + (preview ? 0.6 : 3));
      src.start(t, buf.duration > 2 ? 0.06 : 0);
      amb.current = { src, gain: g };
      if (preview) ambTimer.current = window.setTimeout(() => { if (token === ambToken.current) stopAmbient(1200); }, 3500);
    });
  };

  const clearTimer = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
  const release = () => { wake.current?.release().catch(() => {}); wake.current = null; };

  const playStep = (dir: string, st: Step) => {
    if (st.voice && voiceRef.current) { const a = voice.current; if (a) { a.src = voiceUrl(dir, st.voice, genderRef.current); a.play().catch(() => {}); } }
    if (st.sound) playBuffer(st.sound, VOL.souffle);
    if (st.phase === 'in' || st.phase === 'out' || st.phase === 'hold') navigator.vibrate?.(25);
  };

  // ── Ouvrir l'écran d'entrée (aucun son) ─────────────────────────────────────
  const open = useCallback((id: ExerciseId) => {
    const ex = EXERCISES[id];
    clearTimer();
    const saved = get(`${AMB_KEY}_${id}`) as Ambient | null;
    const a: Ambient = saved && ['none', 'vagues', 'pluie', 'nuit'].includes(saved) ? saved : ex.ambient;
    setAmbientState(a);
    setMinutes(ex.durations ? (ex.durations.includes(5) ? 5 : ex.durations[0]) : null);
    const steps = stepsFor(ex);
    setRun({ id, stage: 'setup', index: -1, step: steps[0], text: ex.setup, elapsedMs: 0, totalMs: 1, stepEndsAt: 0 });
  }, []);

  const finish = useCallback((feeling?: Feeling) => {
    const cur = runRef.current;
    clearTimer(); release();
    if (cur?.id !== 'sommeil') stopAmbient();
    voice.current?.pause();
    setRun(null);
    if (!cur) return;
    if (feeling) {
      const log = [{ id: cur.id, feeling, at: Date.now() }, ...exerciseLog()].slice(0, 20);
      set(LOG_KEY, JSON.stringify(log));
    }
    endRef.current(cur.id, cur.stage === 'after', feeling);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Arrêter en cours de route. */
  const stop = useCallback(() => {
    const cur = runRef.current;
    clearTimer(); release(); stopAmbient(); voice.current?.pause();
    setRun(null);
    if (cur && cur.stage !== 'setup') endRef.current(cur.id, false, undefined, cur.stage === 'run' ? cur.elapsedMs : 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Commencer : dans le toucher ─────────────────────────────────────────────
  const begin = useCallback(() => {
    const cur = runRef.current;
    if (!cur || cur.stage !== 'setup') return;
    const ex = EXERCISES[cur.id];
    const beginner = cur.id === 'coherence' && !get(`${DONE_KEY}_coherence`);
    const steps = stepsFor(ex, { minutes: minutes ?? undefined, beginner });
    // Débloque la voix et le son pendant le toucher (iPhone)
    if (!voice.current) { voice.current = new Audio(); voice.current.preload = 'auto'; }
    const v = voice.current;
    const first = steps.find(x => x.voice);
    if (first) { v.src = voiceUrl(ex.dir, first.voice!, genderRef.current); v.muted = true; v.play().then(() => { v.pause(); v.muted = false; }).catch(() => { v.muted = false; }); }
    const c = audioCtx();
    c?.resume().catch(() => {});
    steps.forEach(x => { if (x.sound) void load(x.sound); });
    if (ambientRef.current !== 'none') void load(`ambiance/fond_${ambientRef.current}`);
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } };
    nav.wakeLock?.request('screen').then(w => { wake.current = w; }).catch(() => {});

    const total = steps.reduce((n, x) => n + x.ms, 0);
    const ends: number[] = [];
    steps.reduce((n, x, i) => { ends[i] = n + x.ms; return ends[i]; }, 0);
    // Décompte 3-2-1, pendant que le fond sonore arrive en fondu
    let n = 3;
    const base = { ...cur, stage: 'countdown' as Stage, totalMs: total };
    setRun({ ...base, count: n });
    runRef.current = { ...base, count: n };
    startAmbient(ambientRef.current);
    const tick = () => {
      n -= 1;
      if (n > 0) { setRun({ ...base, count: n }); timer.current = window.setTimeout(tick, 1000); return; }
      const t0 = Date.now();
      let lastText = '';
      const go = (i: number) => {
        if (i >= steps.length) {
          if (cur.id === 'coherence') set(`${DONE_KEY}_coherence`, '1');
          release();
          if (ex.quietEnd) {
            // Sommeil : pas de question, le fond sonore continue 10 min puis s'éteint en fondu
            ambTimer.current = window.setTimeout(() => stopAmbient(60000), 10 * 60000);
            const c0 = runRef.current;
            setRun(null);
            if (c0) endRef.current(c0.id, true);
            return;
          }
          stopAmbient(4000);
          setRun({ ...runRef.current!, stage: 'after', elapsedMs: total });
          return;
        }
        const st = steps[i];
        if (st.text) lastText = st.text;
        setRun({ ...base, stage: 'run', index: i, step: st, text: lastText, elapsedMs: i ? ends[i - 1] : 0, stepEndsAt: t0 + ends[i] });
        playStep(ex.dir, st);
        timer.current = window.setTimeout(() => go(i + 1), Math.max(0, t0 + ends[i] - Date.now()));
      };
      go(0);
    };
    timer.current = window.setTimeout(tick, 1000);
  }, [minutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVoice = useCallback(() => {
    const next = !voiceRef.current;
    setVoiceOn(next); set(VOICE_KEY, next ? 'on' : 'off');
    if (!next) voice.current?.pause();
  }, []);

  /** Choisir la voix (femme / homme) : gardée sur l'appareil. Sur l'écran d'entrée, une courte phrase la fait entendre. */
  const setGender = useCallback((v: VoiceGender) => {
    setGenderState(v); genderRef.current = v; setVoiceGender(v);
    const cur = runRef.current;
    if (cur?.stage === 'setup' && voiceRef.current) {
      if (!voice.current) { voice.current = new Audio(); voice.current.preload = 'auto'; }
      voice.current.src = voiceUrl('respirer', 'intro', v);
      voice.current.play().catch(() => {});
    }
  }, []);

  const setAmbient = useCallback((a: Ambient) => {
    setAmbientState(a);
    ambientRef.current = a;
    const cur = runRef.current;
    if (cur) set(`${AMB_KEY}_${cur.id}`, a);
    // Sur l'écran d'entrée : un extrait de 4 s pour entendre le fond choisi (et ça débloque le son sur iPhone)
    if (cur) startAmbient(a, cur.stage === 'setup');
    if (a === 'none') stopAmbient(300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { clearTimer(); release(); stopAmbient(0); voice.current?.pause(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { run, open, begin, stop, finish, voiceOn, toggleVoice, gender, setGender, ambient, setAmbient, minutes, setMinutes };
}
