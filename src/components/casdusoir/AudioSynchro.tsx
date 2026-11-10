/**
 * AudioSynchro — un audio du Cas du soir avec son minutage (épisode, leçon, intrigue) :
 *   - l'image d'en-tête qui change aux moments indiqués (fondu enchaîné de 0,8 s, léger mouvement lent ; aucun mouvement
 *     si l'appareil demande moins d'animations). Une image manquante : on garde la précédente, sans trou ;
 *   - le lecteur (le même partout) ;
 *   - le texte surligné comme des paroles : la phrase en cours est mise en évidence et reste visible ; on voit qui parle
 *     (le narrateur sans étiquette) ; toucher une phrase fait sauter l'audio à ce moment.
 * Sans minutage ou sans audio : l'image fixe et le texte normal (« texte »), comme avant.
 * Léger : un seul fichier de minutage (déjà reçu avec l'épisode), et la page ne se redessine que quand la phrase ou l'image change.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DC } from '../accueil/DrLoShell';
import Illustration from '../accueil/Illustration';
import LecteurAudio from './LecteurAudio';
import type { CdsMinutage } from '../../services/casDuSoirService';
import { indexA } from '../../utils/casDuSoirSync';


const moinsDAnimations = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Les images du minutage, en fondu ; la première image chargée avant l'instant t est montrée. */
const Diaporama: React.FC<{ images: { t: number; image: string }[]; idx: number; fixe: string | null; ratio: '16 / 9' | '4 / 3'; tint: string; radius: number; fallback?: React.ReactNode }> = ({ images, idx, fixe, ratio, tint, radius, fallback }) => {
  const srcs = useMemo(() => images.map(x => `/images/cas-du-soir/${x.image}`), [images]);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  // Chaque image est chargée une fois ; une image absente ne laisse jamais de trou
  useEffect(() => {
    let vivant = true;
    srcs.forEach(src => { const im = new Image(); im.onload = () => { if (vivant) setOk(o => ({ ...o, [src]: true })); }; im.src = src; });
    return () => { vivant = false; };
  }, [srcs]);
  let actif = -1;
  for (let k = Math.max(0, idx); k >= 0; k -= 1) { if (ok[srcs[k]]) { actif = k; break; } }
  if (actif < 0) actif = srcs.findIndex(s => ok[s]); // avant la première image : la première disponible
  const calme = moinsDAnimations();
  return (
    <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden' }}>
      <Illustration src={fixe} ratio={ratio} tint={tint} radius={radius} fallback={fallback} />
      {srcs.map((src, k) => ok[src] && (
        <img key={src} src={src} alt="" aria-hidden="true" className={k === actif && !calme ? 'cds-kb' : undefined}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: k === actif ? 1 : 0, transition: calme ? 'none' : 'opacity .8s ease', willChange: 'opacity' }} />
      ))}
    </div>
  );
};

/** Le texte surligné : une phrase par ligne, l'étiquette de qui parle, toucher pour sauter. */
const Paroles: React.FC<{ lignes: CdsMinutage['lignes']; idx: number; suivre: boolean; accent: string; onSeek: (t: number) => void }> = ({ lignes, idx, suivre, accent, onSeek }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!suivre || idx < 0) return;
    refs.current[idx]?.scrollIntoView({ block: 'center', behavior: moinsDAnimations() ? 'auto' : 'smooth' });
  }, [idx, suivre]);
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lignes.map((l, k) => {
        const on = k === idx;
        const narr = /^narrat/i.test(l.qui);
        return (
          <button key={k} ref={el => { refs.current[k] = el; }} type="button" onClick={() => onSeek(l.t0)} aria-current={on ? 'true' : undefined}
            style={{ textAlign: 'left', border: 0, borderRadius: 12, padding: '8px 10px', margin: '0 -10px', cursor: 'pointer', fontFamily: 'inherit',
              background: on ? `${accent}22` : 'transparent', transition: 'background .3s ease, color .3s ease' }}>
            {!narr && <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: accent }}>{l.qui}</span>}
            <span style={{ display: 'block', fontSize: 16, lineHeight: 1.6, color: on ? DC.title : idx >= 0 && k < idx ? DC.soft : DC.text, fontWeight: on ? 600 : 400 }}>{l.texte}</span>
          </button>
        );
      })}
    </div>
  );
};

const AudioSynchro: React.FC<{
  src: string | null;
  minutage?: CdsMinutage | null;
  label: string;
  accent: string;
  compact?: boolean;
  /** L'image fixe (en-tête) ; absente : pas d'image du tout */
  image?: { src: string | null; ratio: '16 / 9' | '4 / 3'; radius?: number; fallback?: React.ReactNode };
  /** Le texte normal, montré sans audio ou sans minutage */
  texte?: React.ReactNode;
  /** Montrer les paroles seulement une fois la lecture lancée (intrigue sous la couverture) */
  parolesApresLecture?: boolean;
}> = ({ src, minutage, label, accent, compact, image, texte, parolesApresLecture }) => {
  const controle = useRef<{ seek: (t: number) => void } | null>(null);
  const [pret, setPret] = useState(false);
  const [joue, setJoue] = useState(false);
  const [lance, setLance] = useState(false);
  const [idxL, setIdxL] = useState(-1);
  const [idxI, setIdxI] = useState(0);
  const lignes = minutage?.lignes ?? [];
  const images = minutage?.images ?? [];
  // Mis à jour environ 4 fois par seconde, mais l'état ne change que quand la phrase ou l'image change
  const onTime = (t: number, playing: boolean) => {
    const l = indexA(lignes, t, x => x.t0);
    const i = Math.max(0, indexA(images, t, x => x.t));
    setIdxL(p => (p === l ? p : l));
    setIdxI(p => (p === i ? p : i));
    setJoue(p => (p === playing ? p : playing));
    if (playing) setLance(true);
  };
  const synchro = !!minutage && pret && lignes.length > 0;
  return (
    <>
      {image && (images.length && pret
        ? <Diaporama images={images} idx={idxI} fixe={image.src} ratio={image.ratio} tint={accent} radius={image.radius ?? 12} fallback={image.fallback} />
        : <Illustration src={image.src} ratio={image.ratio} tint={accent} radius={image.radius ?? 12} fallback={image.fallback} />)}
      {/* Lecteur collé en haut de l'écran pendant la lecture synchronisée : on peut mettre en pause en lisant */}
      <div style={synchro && joue ? { position: 'sticky', top: 8, zIndex: 5, background: 'rgba(23,16,10,.92)', borderRadius: 14, padding: '2px 8px 8px', margin: '0 -8px' } : undefined}>
        <LecteurAudio src={src} accent={accent} label={label} compact={compact} onTime={onTime} onPret={setPret} controle={controle} />
      </div>
      {synchro && (!parolesApresLecture || lance)
        ? <Paroles lignes={lignes} idx={idxL} suivre={joue} accent={accent} onSeek={t => controle.current?.seek(t)} />
        : texte}
    </>
  );
};

export default AudioSynchro;
