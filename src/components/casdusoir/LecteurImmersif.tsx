/**
 * LecteurImmersif — un épisode (ou la leçon de Dr Lô) en plein écran, comme une scène :
 *   1. l'entrée : l'image remplit l'écran, le titre, deux choix (« Écouter et lire » / « Lire sans le son ») ;
 *   2. la lecture : l'image reste fixe derrière (elle change en fondu au fil de l'histoire), le texte monte par le bas,
 *      la phrase qu'on entend s'agrandit, ce qui est déjà dit se dissout dans un dégradé sur l'image ; le lecteur reste en bas.
 *      Faire défiler librement est possible : « Revenir à l'écoute » ramène à la phrase en cours ; toucher une phrase y saute ;
 *   3. la fin : une feuille sur la dernière image (le vote et la suite pour un épisode, le quiz pour la leçon).
 * Sans minutage ou sans audio : le texte entier, à lire. Aucun mouvement si l'appareil demande moins d'animations.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import LecteurAudio from './LecteurAudio';
import type { CdsMinutage } from '../../services/casDuSoirService';
import { indexA } from '../../utils/casDuSoirSync';

const INK = '#FBF5EA';
const SOFT = '#CDBFAE';
const LINE = 'rgba(255,255,255,.14)';

const moinsDAnimations = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const DOSSIER = '/images/cas-du-soir/';

type Phase = 'entree' | 'lecture' | 'fin';
type Ligne = { t0: number; qui: string; texte: string };

/** L'image de fond : plein cadre, fondu entre les images. « etendu » : l'image (4:3) reste entière en haut et se prolonge par un fond flouté d'elle-même ; « plein » : recadrée sur tout l'écran (portrait). */
const Fond: React.FC<{ srcs: string[]; actif: number; mode: 'etendu' | 'plein' }> = ({ srcs, actif, mode }) => {
  const [ok, setOk] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let vivant = true;
    srcs.forEach(src => { const im = new Image(); im.onload = () => { if (vivant) setOk(o => ({ ...o, [src]: true })); }; im.src = src; });
    return () => { vivant = false; };
  }, [srcs]);
  // L'image voulue, ou la plus proche déjà chargée avant elle : jamais de trou
  let courant = -1;
  for (let k = Math.min(actif, srcs.length - 1); k >= 0; k -= 1) { if (ok[srcs[k]]) { courant = k; break; } }
  if (courant < 0) courant = srcs.findIndex(s => ok[s]);
  const calme = moinsDAnimations();
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#130D08' }}>
      {srcs.map((src, k) => ok[src] && (
        <div key={src} style={{ position: 'absolute', inset: 0, opacity: k === courant ? 1 : 0, transition: calme ? 'none' : 'opacity 1.3s ease' }}>
          {mode === 'etendu' ? (
            <>
              <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(.6)', transform: 'scale(1.25)' }} />
              <img src={src} alt="" className={k === courant && !calme ? 'cds-kb' : undefined}
                style={{ position: 'absolute', left: 0, top: '8%', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 10%, #000 82%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 10%, #000 82%, transparent 100%)' }} />
            </>
          ) : (
            <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 12%' }} />
          )}
        </div>
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.5) 0, rgba(10,6,3,0) 18%, rgba(10,6,3,.1) 40%, rgba(10,6,3,.78) 72%, rgba(10,6,3,.95) 100%)' }} />
    </div>
  );
};

const LecteurImmersif: React.FC<{
  kicker: string;
  titre: string;
  meta?: string;
  accent: string;
  audioSrc: string | null;
  minutage?: CdsMinutage | null;
  texte: string;
  /** L'image d'entrée et de repli (si le minutage n'a pas d'images) */
  image: string | null;
  fond?: 'etendu' | 'plein';
  libelles?: { ecouter: string; lire: string; continuer: string };
  onBack: () => void;
  /** Le contenu de la feuille de fin */
  fin: React.ReactNode;
}> = ({ kicker, titre, meta, accent, audioSrc, minutage, texte, image, fond = 'etendu', libelles, onBack, fin }) => {
  const lib = { ecouter: 'Écouter et lire', lire: 'Lire sans le son', continuer: 'Continuer', ...libelles };
  const [phase, setPhase] = useState<Phase>('entree');
  const [pret, setPret] = useState(false);
  const [joue, setJoue] = useState(false);
  const [idxL, setIdxL] = useState(-1);
  const [idxI, setIdxI] = useState(0);
  const [libre, setLibre] = useState(false);
  const controle = useRef<{ seek: (t: number) => void; time?: () => number } | null>(null);
  const veutJouer = useRef(false);
  const tx = useRef<HTMLDivElement | null>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const centres = useRef<number[]>([]);

  const lignes: Ligne[] = useMemo(() => {
    if (minutage?.lignes?.length) return minutage.lignes.map(l => ({ t0: l.t0, qui: l.qui, texte: l.texte }));
    return texte.split(/\n{2,}/).filter(p => p.trim()).map(p => ({ t0: 0, qui: '', texte: p }));
  }, [minutage, texte]);
  const synchro = !!minutage?.lignes?.length && !!audioSrc && pret;
  const imgs = useMemo(() => minutage?.images ?? [], [minutage]);
  const srcs = useMemo(() => {
    const liste = imgs.length ? imgs.map(x => `${DOSSIER}${x.image}`) : [];
    return image ? [image, ...liste.filter(s => s !== image)] : liste;
  }, [imgs, image]);
  // Quelle image est montrée : celle du minutage à l'instant t ; sinon l'image d'entrée
  const actif = useMemo(() => {
    if (!imgs.length) return 0;
    const cle = `${DOSSIER}${imgs[Math.min(idxI, imgs.length - 1)].image}`;
    return Math.max(0, srcs.indexOf(cle));
  }, [imgs, idxI, srcs]);

  const onTime = (t: number, playing: boolean) => {
    const l = indexA(lignes, t, x => x.t0);
    const i = Math.max(0, indexA(imgs, t, x => x.t));
    setIdxL(p => (p === l ? p : l));
    setIdxI(p => (p === i ? p : i));
    setJoue(p => (p === playing ? p : playing));
  };
  const onPret = (ok: boolean) => {
    setPret(ok);
    if (ok && veutJouer.current) { veutJouer.current = false; controle.current?.seek(0); }
  };

  // Pas de défilement de la page derrière
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);

  // Le texte monte en continu avec la voix, comme un défilement de générique : à chaque image de l'écran, la position suit le temps de l'audio
  // (entre le centre d'une phrase et celui de la suivante), lissée pour que la vitesse change en douceur d'une phrase à l'autre.
  // Pas de défilement « par à-coups » à chaque phrase, et aucun changement de taille de texte qui ferait bouger les lignes en dessous.
  const mesurer = () => { centres.current = refs.current.map(el => (el ? el.offsetTop + el.offsetHeight / 2 : 0)); };
  useEffect(() => {
    mesurer();
    window.addEventListener('resize', mesurer);
    const t = window.setTimeout(mesurer, 400); // une fois les polices chargées
    return () => { window.removeEventListener('resize', mesurer); window.clearTimeout(t); };
  }, [lignes, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'lecture' || !synchro || !joue || libre) return;
    const box = tx.current; if (!box) return;
    const calme = moinsDAnimations();
    const fin = minutage?.duree ?? 0;
    let courant = box.scrollTop; let raf = 0;
    const boucle = () => {
      const c = centres.current; const t = controle.current?.time?.() ?? 0;
      if (c.length === lignes.length && lignes.length > 0) {
        const i = Math.max(0, indexA(lignes, t, x => x.t0));
        const suivante = lignes[i + 1];
        const duree = Math.max(0.4, (suivante ? suivante.t0 : fin || lignes[i].t0 + 3) - lignes[i].t0);
        const f = Math.min(1, Math.max(0, (t - lignes[i].t0) / duree));
        const p = c[i] + ((suivante ? c[i + 1] : c[i]) - c[i]) * f;
        const cible = Math.max(0, p - box.clientHeight * 0.55);
        courant = calme ? cible : courant + (cible - courant) * 0.09;
        box.scrollTop = courant;
      }
      raf = window.requestAnimationFrame(boucle);
    };
    raf = window.requestAnimationFrame(boucle);
    return () => window.cancelAnimationFrame(raf);
  }, [phase, synchro, joue, libre, lignes, minutage]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dès que la personne pose le doigt (ou la molette) sur le texte, elle reprend la main : le défilement automatique s'arrête
  const reprendre = () => { if (joue && synchro && !libre) setLibre(true); };
  const revenir = () => setLibre(false);

  const commencer = (avecSon: boolean) => {
    setPhase('lecture');
    if (avecSon && audioSrc) { if (pret) controle.current?.seek(0); else veutJouer.current = true; }
  };
  // L'audio est fini : un instant, puis la fin
  const onEnded = () => { window.setTimeout(() => setPhase(p => (p === 'lecture' ? 'fin' : p)), 1400); };

  const bouton: React.CSSProperties = { display: 'block', width: '100%', minHeight: 50, borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', padding: '0 16px' };
  const rond: React.CSSProperties = { width: 44, height: 44, borderRadius: 14, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.55)', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' };
  const lecture = phase === 'lecture';

  return (
    <div role="region" aria-label={`${titre} : lecture en plein écran`} style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#0B0704', color: INK, overflow: 'hidden', fontFamily: 'inherit' }}>
      <Fond srcs={srcs} actif={actif} mode={fond} />

      {/* Barre du haut : retour et ce qu'on lit */}
      <div style={{ position: 'absolute', left: 12, right: 12, top: 'calc(10px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', gap: 12, zIndex: 9 }}>
        <button type="button" onClick={onBack} aria-label="Retour" className="drl-btn" style={rond}><ChevronLeft size={22} aria-hidden="true" /></button>
        {phase !== 'entree' && (
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '.06em', color: SOFT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kicker}</p>
            <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titre}</p>
          </div>
        )}
      </div>

      {/* 1. L'entrée */}
      {phase === 'entree' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 22px calc(26px + env(safe-area-inset-bottom, 0px))', zIndex: 5 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: accent }}>{kicker.toUpperCase()}</p>
          <h1 style={{ margin: '6px 0 8px', fontFamily: 'Fraunces, serif', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.08, fontWeight: 600, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{titre}</h1>
          {meta && <p style={{ margin: '0 0 18px', fontSize: 13, color: SOFT }}>{meta}</p>}
          {audioSrc ? (
            <>
              <button type="button" onClick={() => commencer(true)} className="drl-btn" style={{ ...bouton, border: 0, background: accent, color: '#1C1612' }}>{lib.ecouter}</button>
              <button type="button" onClick={() => commencer(false)} className="drl-btn" style={{ ...bouton, minHeight: 46, marginTop: 8, fontSize: 14, fontWeight: 500, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.5)', color: INK }}>{lib.lire}</button>
            </>
          ) : (
            <button type="button" onClick={() => commencer(false)} className="drl-btn" style={{ ...bouton, border: 0, background: accent, color: '#1C1612' }}>Lire</button>
          )}
        </div>
      )}

      {/* 2. La lecture : le texte qui monte et se dissout */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(64px + env(safe-area-inset-top, 0px))', bottom: audioSrc ? 86 : 0, zIndex: 3, opacity: lecture ? 1 : 0, pointerEvents: lecture ? 'auto' : 'none', transition: 'opacity .5s',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 34%, #000 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 34%, #000 100%)' }}>
      <div ref={tx} onTouchStart={reprendre} onWheel={reprendre} onPointerDown={e => { if (e.pointerType === 'mouse') reprendre(); }} tabIndex={lecture ? 0 : -1} aria-hidden={!lecture} aria-label="Le texte"
        style={{ position: 'absolute', inset: 0, overflowY: lecture ? 'auto' : 'hidden', scrollbarWidth: 'none', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: `${synchro ? '45vh' : '34vh'} 22px 30vh`, maxWidth: 520, margin: '0 auto' }}>
          {lignes.map((l, k) => {
            const on = synchro && k === idxL;
            const passe = synchro && k < idxL;
            const narr = !l.qui || /^narrat/i.test(l.qui);
            return (
              <p key={k} ref={el => { refs.current[k] = el; }} onClick={synchro ? () => { setLibre(false); controle.current?.seek(l.t0); } : undefined}
                style={{ margin: '0 0 16px', cursor: synchro ? 'pointer' : 'default', fontFamily: 'Fraunces, serif', fontSize: 19, lineHeight: 1.5, whiteSpace: 'pre-line',
                  color: on ? INK : passe ? 'rgba(251,245,234,.38)' : 'rgba(251,245,234,.62)', transform: on ? 'scale(1.045)' : 'none', transformOrigin: 'left center', transition: 'color .5s ease, transform .5s ease', willChange: synchro ? 'transform, color' : undefined }}>
                {!narr && <span style={{ display: 'block', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: accent, marginBottom: 1 }}>{l.qui}</span>}
                {l.texte}
              </p>
            );
          })}
          <button type="button" onClick={() => setPhase('fin')} className="drl-btn" style={{ ...bouton, marginTop: 18, border: 0, background: accent, color: '#1C1612' }}>{lib.continuer}</button>
        </div>
      </div>
      </div>
      {lecture && libre && synchro && (
        <button type="button" onClick={revenir} className="drl-btn"
          style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 98, zIndex: 7, minHeight: 40, padding: '0 16px', borderRadius: 999, border: 0, background: accent, color: '#1C1612', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Revenir à l'écoute
        </button>
      )}

      {/* Le lecteur : toujours monté (le fichier se charge dès l'entrée), visible dès la lecture */}
      {audioSrc && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))', zIndex: 6, borderRadius: 999, padding: '0 12px', background: 'rgba(30,22,16,.82)', WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)', border: `1px solid ${LINE}`, opacity: lecture && pret ? 1 : 0, pointerEvents: lecture ? 'auto' : 'none', transition: 'opacity .4s' }}>
          <LecteurAudio src={audioSrc} accent={accent} label="Écouter" style={{ marginTop: 0 }} onTime={onTime} onPret={onPret} onEnded={onEnded} controle={controle} />
        </div>
      )}

      {/* 3. La fin : une feuille sur la dernière image */}
      {phase === 'fin' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 8, overflowY: 'auto', background: 'rgba(11,7,4,.82)', WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)' }}>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(70px + env(safe-area-inset-top, 0px)) 18px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
            {fin}
            <button type="button" onClick={() => { setLibre(false); setPhase('lecture'); }} className="drl-btn" style={{ ...bouton, minHeight: 46, marginTop: 14, fontSize: 14, fontWeight: 500, border: `1px solid ${LINE}`, background: 'rgba(19,13,8,.5)', color: INK }}>Relire depuis le début</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecteurImmersif;
