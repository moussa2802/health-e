/**
 * useBreathVoice — la voix qui guide « Respirer avec moi » (inspire… expire…).
 * Un petit fichier par consigne, joué à chaque changement de phase : la voix tombe toujours
 * pile sur le cercle (4 s pour inspirer, 4 s pour expirer), sans dériver.
 * Fichiers : public/audio/respirer/*.mp3 (voir scripts/genBreathAudio.mjs). S'ils manquent, rien ne casse :
 * l'exercice reste visuel, et le bouton son ne s'affiche pas.
 * Le son ne part que parce que la personne a lancé l'exercice ; elle peut le couper (choix gardé sur l'appareil).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const BASE = '/audio/respirer/';
const INHALE = ['inspire_1', 'inspire_2', 'inspire_3'];
const EXHALE = ['expire_1', 'expire_2', 'expire_3'];
const KEY = 'he_breath_sound';

const readPref = (): boolean => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const writePref = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* navigation privée */ } };

/** Quelle consigne pour la phase n (0 = première inspiration). */
export function cueFor(phase: number, inhale: boolean): string {
  if (phase === 0) return 'intro';
  if (inhale && phase === 8) return 'milieu';
  const list = inhale ? INHALE : EXHALE;
  return list[Math.floor(phase / 2) % list.length];
}

export function useBreathVoice(breath: { inhale: boolean } | null) {
  const [soundOn, setSoundOn] = useState(readPref);
  const [available, setAvailable] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const phase = useRef(-1);
  const primed = useRef(false);
  const active = breath !== null;

  const ensure = () => {
    if (!audio.current) {
      const a = new Audio();
      a.preload = 'auto';
      a.onerror = () => { if (a.src.endsWith('intro.mp3')) setAvailable(false); };
      audio.current = a;
    }
    return audio.current;
  };

  const play = useCallback((name: string) => {
    const a = audio.current;
    if (!a || !soundOn || !available) return;
    a.src = `${BASE}${name}.mp3`;
    a.currentTime = 0;
    a.play().catch(() => { /* bloqué par le téléphone (pas de geste) : l'exercice reste visuel */ });
  }, [soundOn, available]);

  // Début / fin de l'exercice
  useEffect(() => {
    if (!active) {
      if (phase.current > 12) play('fin');
      else audio.current?.pause();
      phase.current = -1;
      return;
    }
    ensure();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Une consigne à chaque changement de phase
  useEffect(() => {
    if (!breath) return;
    phase.current += 1;
    if (primed.current) { primed.current = false; return; } // la 1re consigne est déjà partie au toucher
    play(cueFor(phase.current, breath.inhale));
  }, [breath?.inhale, active]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * À appeler DANS le geste qui lance l'exercice (le toucher sur « Respirer avec moi ») :
   * l'iPhone n'autorise le son que s'il démarre pendant un toucher.
   */
  const prime = useCallback(() => {
    if (!soundOn || !available) return;
    const a = ensure();
    a.src = `${BASE}intro.mp3`;
    primed.current = true;
    a.play().catch(() => { /* l'exercice reste visuel */ });
  }, [soundOn, available]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    writePref(next);
    const a = ensure();
    if (!next) a.pause();
    // Rallumé pendant l'exercice : ce toucher débloque le son sur iPhone ; la voix reprend à la phase suivante
    else if (a.src) { a.muted = true; a.play().catch(() => {}).finally(() => { a.pause(); a.muted = false; }); }
  }, [soundOn]); // eslint-disable-line react-hooks/exhaustive-deps

  return { soundOn, toggle, available, prime };
}
