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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DC } from '../accueil/DrLoShell';
import Illustration from '../accueil/Illustration';
import LecteurAudio from './LecteurAudio';
import ScenesVivantes from './ScenesVivantes';
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
const Paroles: React.FC<{ lignes: CdsMinutage['lignes']; idx: number; suivre: boolean; accent: string; onSeek: (t: number) => void; marge: number }> = ({ lignes, idx, suivre, accent, onSeek, marge }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!suivre || idx < 0) return;
    // La phrase en cours vient se placer juste sous l'image et le lecteur, qui restent fixés en haut.
    // (Pas pour l'intrigue : son texte est court, la page ne doit pas bouger, sinon l'image remonterait avec lui.)
    refs.current[idx]?.scrollIntoView({ block: 'start', behavior: moinsDAnimations() ? 'auto' : 'smooth' });
  }, [idx, suivre]);
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lignes.map((l, k) => {
        const on = k === idx;
        const narr = /^narrat/i.test(l.qui);
        return (
          <button key={k} ref={el => { refs.current[k] = el; }} type="button" onClick={() => onSeek(l.t0)} aria-current={on ? 'true' : undefined}
            style={{ textAlign: 'left', border: 0, borderRadius: 12, padding: '8px 10px', margin: '0 -10px', cursor: 'pointer', fontFamily: 'inherit', scrollMarginTop: marge,
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
  const controle = useRef<{ seek: (t: number) => void; time?: () => number } | null>(null);
  const temps = useCallback(() => controle.current?.time?.() ?? 0, []);
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
  const scene = minutage?.scene && src && minutage.scene.lignes.length === lignes.length ? minutage.scene : null;
  const parolesVisibles = synchro && (!parolesApresLecture || lance);
  // Pendant l'écoute synchronisée, l'image et le lecteur restent fixés en haut ; seul le texte défile dessous.
  // Pas de « position: sticky » : sur iPhone, un élément sticky retarde sur le défilement (l'image remonte un instant avec le texte,
  // surtout au doigt). On le fixe (« fixed », posé par le navigateur sur sa propre couche) tant que la zone est à l'écran :
  // en haut de la zone il reste à sa place, en bas il s'arrête sur le dernier texte, entre les deux il est collé au haut de l'écran.
  const tete = useRef<HTMLDivElement | null>(null);
  const zone = useRef<HTMLDivElement | null>(null);
  const [hTete, setHTete] = useState(0);
  const [pos, setPos] = useState<'haut' | 'milieu' | 'bas'>('haut');
  const [geo, setGeo] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const el = tete.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHTete(el.getBoundingClientRect().height)); ro.observe(el);
    return () => ro.disconnect();
  }, [parolesVisibles]);
  useEffect(() => {
    if (!parolesVisibles) return;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const z = zone.current; if (!z) return;
      const r = z.getBoundingClientRect();
      const h = tete.current?.getBoundingClientRect().height ?? 0;
      const p = r.top >= 0 ? 'haut' : r.bottom <= h ? 'bas' : 'milieu';
      setPos(prev => (prev === p ? prev : p));
      setGeo(g => (Math.abs(g.left - (r.left - 8)) < 0.5 && Math.abs(g.width - (r.width + 16)) < 0.5 ? g : { left: r.left - 8, width: r.width + 16 }));
    };
    const demande = () => { if (!raf) raf = window.requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', demande, { passive: true });
    window.addEventListener('resize', demande);
    return () => { window.removeEventListener('scroll', demande); window.removeEventListener('resize', demande); if (raf) window.cancelAnimationFrame(raf); };
  }, [parolesVisibles, hTete]);
  const styleTete: React.CSSProperties | undefined = parolesVisibles
    ? { zIndex: 5, background: 'rgb(33,25,19)', padding: 8, boxSizing: 'border-box', boxShadow: '0 10px 14px -10px rgba(0,0,0,.7)', transform: 'translateZ(0)',
        ...(pos === 'milieu' ? { position: 'fixed', top: 0, left: geo.left, width: geo.width }
          : pos === 'bas' ? { position: 'absolute', bottom: 0, left: -8, right: -8 }
          : { position: 'absolute', top: 0, left: -8, right: -8 }) }
    : undefined;
  return (
    <div ref={zone} style={{ position: 'relative' }}>
      {/* La place de l'en-tête, gardée dans la page pendant qu'il est fixé */}
      {parolesVisibles && <div aria-hidden="true" style={{ height: hTete }} />}
      <div ref={tete} style={styleTete}>
      {/* Les plans vivants (l'intrigue) : l'image de l'histoire qui bouge avec la voix, même avant la lecture (premier plan) */}
      {scene && minutage && <div style={{ marginBottom: 8 }}><ScenesVivantes compact scene={scene} lignes={minutage.lignes} duree={minutage.duree} accent={accent} temps={temps} /></div>}
      {!scene && image && (images.length && pret
        ? <Diaporama images={images} idx={idxI} fixe={image.src} ratio={image.ratio} tint={accent} radius={image.radius ?? 12} fallback={image.fallback} />
        : <Illustration src={image.src} ratio={image.ratio} tint={accent} radius={image.radius ?? 12} fallback={image.fallback} />)}
      {/* Lecteur collé en haut de l'écran pendant la lecture synchronisée : on peut mettre en pause en lisant */}
      <LecteurAudio src={src} accent={accent} label={label} compact={compact} onTime={onTime} onPret={setPret} controle={controle} />
      </div>
      {parolesVisibles
        ? <Paroles lignes={lignes} idx={idxL} suivre={joue && !parolesApresLecture} accent={accent} marge={hTete + 12} onSeek={t => controle.current?.seek(t)} />
        : texte}
    </div>
  );
};

export default AudioSynchro;
