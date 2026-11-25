/**
 * ScenesVivantes — l'épisode en « plans vivants » (décision de Papa Moussa, 25/11/2026), sans conteur à l'écran :
 *   - chaque phrase a son plan : un cadre carré dans l'image d'origine, qui glisse lentement (gros plan sur qui parle, sur l'objet dont on parle) ;
 *     d'un plan à l'autre, un fondu court ; les lumières de la scène vivent (écran de téléphone, lampe) ;
 *   - le nom du personnage qui parle sur l'image ;
 *   - Dr Lô a son moment, mis en scène selon le contexte de l'histoire (vidéo, vocal, appel, live, cabinet, leçon) : sa photo,
 *     et des fiches avec les points clés qui apparaissent quand il les dit (tirées mot pour mot de son texte).
 * Le temps vient du lecteur audio (controle.time). Moins d'animations demandé par l'appareil : plans fixes, coupes franches, lumières immobiles.
 * Aucune vidéo : les images de l'épisode et un peu de dessin ; rien n'est chargé en plus de ces images.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CdsScene } from '../../services/casDuSoirService';

type Ligne = { t0: number; t1: number; qui: string; texte: string };
type Seg = { deb: number; fin: number; plan: string; drlo: boolean };
type Rect = [number, number, number];

const INK = '#FBF5EA';
const SOFT = '#CDBFAE';
const LINE = 'rgba(255,255,255,.14)';
const AVATAR = '/images/cas-du-soir/drlo-avatar.webp';
/** La taille du cadre carré (CSS) : toute la largeur, sans dépasser un peu plus de la moitié de la hauteur */
export const CADRE = 'min(100vw, 56vh, 560px)';
export const HAUT_CADRE = 'calc(58px + env(safe-area-inset-top, 0px))';

const moinsDAnimations = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const lisse = (f: number) => { const x = Math.min(1, Math.max(0, f)); return x * x * (3 - 2 * x); };
const estDrLo = (qui: string) => /^dr\.?\s*l/i.test(qui);
const estNarrateur = (qui: string) => !qui || /^narrat/i.test(qui);

/** Les segments : des phrases qui se suivent sur le même plan ne font qu'un mouvement */
function segments(scene: CdsScene, lignes: Ligne[], duree: number): Seg[] {
  const segs: Seg[] = [];
  let plan = scene.lignes.find(p => p && p !== 'DRLO') || Object.keys(scene.plans)[0];
  lignes.forEach((l, i) => {
    const v = scene.lignes[i];
    const drlo = v === 'DRLO';
    if (v && !drlo) plan = v;
    const p = drlo ? (scene.drlo?.fond || plan) : plan;
    const der = segs[segs.length - 1];
    if (der && der.plan === p && der.drlo === drlo) return;
    const deb = i === 0 ? 0 : l.t0 - 0.2;
    if (der) der.fin = deb;
    segs.push({ deb, fin: duree, plan: p, drlo });
  });
  return segs;
}

const ScenesVivantes: React.FC<{
  scene: CdsScene;
  lignes: Ligne[];
  duree: number;
  accent: string;
  /** Le temps de l'audio (s) */
  temps: () => number;
  /** Prévenir la page quand Dr Lô prend l'écran (le texte descend sous ses fiches) */
  onDrLo?: (actif: boolean) => void;
  /** Dans une carte (l'intrigue sur la page du cas) : un cadre 4/3 dans la page, sans plein écran */
  compact?: boolean;
}> = ({ scene, lignes, duree, accent, temps, onDrLo, compact }) => {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const segs = useMemo(() => segments(scene, lignes, duree), [scene, lignes, duree]);
  const [etat, setEtat] = useState<{ src: string; drlo: boolean; qui: string; fiche: number; points: number; parle: boolean; com: number }>({ src: '', drlo: false, qui: '', fiche: -1, points: 0, parle: false, com: -1 });
  const precedent = useRef(etat);
  const debutDrLo = useRef(0);
  const [horloge, setHorloge] = useState(0);

  // Les fiches : de la phrase où Dr Lô commence le point jusqu'à la fin de ce qu'il en dit
  const fiches = useMemo(() => (scene.drlo?.fiches || []).map(f => ({
    ...f, deb: (lignes[f.i]?.t0 ?? 0) - 0.1, fin: (lignes[f.fin ?? f.i]?.t1 ?? 0) + 0.8,
    pts: f.points.map(([i, x]) => ({ t: (lignes[i]?.t0 ?? 0) - 0.1, x })),
  })), [scene, lignes]);
  const coms = useMemo(() => (scene.drlo?.commentaires || []).map(([i, x]) => ({ t: (lignes[i]?.t0 ?? 0) - 0.1, x })), [scene, lignes]);

  useEffect(() => {
    let vivant = true;
    Object.entries(scene.images).forEach(([k, v]) => {
      const im = new Image(); im.decoding = 'async'; im.src = v.src;
      im.onload = () => { if (vivant) imgs.current[k] = im; };
    });
    return () => { vivant = false; };
  }, [scene]);

  // La leçon : ses fiches sont là du début à la fin, posées en bas de l'image ; le texte reste dessous, sans bouger
  const lecon = scene.drlo?.contexte === 'lecon';
  useEffect(() => { if (lecon) onDrLo?.(true); }, [lecon, onDrLo]);

  useEffect(() => {
    const calme = moinsDAnimations();
    let raf = 0;
    const rect = (plan: string, f: number): Rect => {
      const P = scene.plans[plan]; if (!P) return [0, 0, 1];
      const [, a, b] = P; const e = calme ? 0 : lisse(f);
      return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
    };
    const dessine = (ctx: CanvasRenderingContext2D, W: number, H: number, plan: string, f: number, alpha: number, t: number) => {
      const P = scene.plans[plan]; if (!P) return;
      const im = imgs.current[P[0]]; const info = scene.images[P[0]]; if (!im || !info) return;
      // le plan est un carré ; dans un cadre plus large que haut (l'intrigue), on en garde la bande du milieu
      const [x, y, s] = rect(plan, f); const sh = s * Math.min(1, H / W); const sx = x - s / 2; const sy = y - sh / 2;
      ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(im, sx, sy, s, sh, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly, r, c, sorte] of info.lum || []) {
        const X = (lx - sx) / s * W; const Y = (ly - sy) / sh * H; const R = r / s * W;
        if (X < -R || X > W + R || Y < -R || Y > H + R) continue;
        const w = t + lx * 0.01;
        const o = calme ? 0.15 : sorte === 'lampe' ? 0.14 + 0.08 * Math.sin(w * 9.7) + 0.06 * Math.sin(w * 5.3 + 1) : 0.16 + 0.1 * Math.sin(w * 2.1) + 0.05 * Math.sin(w * 7.3);
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
        g.addColorStop(0, `rgba(${c},${Math.max(0, o) * alpha})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, 2 * R, 2 * R);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };
    const boucle = () => {
      const t = temps();
      const c = cv.current;
      if (c) {
        const r = c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(r.width * dpr); const H = Math.round(r.height * dpr);
        if (W > 0 && (c.width !== W || c.height !== H)) { c.width = W; c.height = H; }
        const ctx = c.getContext('2d');
        let k = 0; for (let i = 0; i < segs.length; i += 1) if (segs[i].deb <= t) k = i;
        const S = segs[k];
        if (ctx && S) {
          ctx.clearRect(0, 0, c.width, c.height);
          const f = (t - S.deb) / Math.max(0.5, S.fin - S.deb);
          const fondu = calme ? 1 : Math.min(1, (t - S.deb) / 0.7);
          if (k > 0 && fondu < 1) dessine(ctx, c.width, c.height, segs[k - 1].plan, 1, 1, t);
          dessine(ctx, c.width, c.height, S.plan, f, k > 0 ? fondu : 1, t);
        }
        // l'état affiché : seulement quand il change
        let iL = -1; for (let i = 0; i < lignes.length; i += 1) { if (lignes[i].t0 <= t) iL = i; else break; }
        const L = lignes[iL]; const enCours = !!L && t < L.t1 + 0.3;
        const qui = enCours && !estNarrateur(L.qui) ? L.qui : '';
        const drlo = !!S?.drlo;
        let fiche = -1; fiches.forEach((F, j) => { if (t >= F.deb && t < F.fin) fiche = j; });
        const points = fiche >= 0 ? fiches[fiche].pts.filter(p => t >= p.t).length : 0;
        let com = -1; coms.forEach((x, j) => { if (t >= x.t) com = j; });
        const src = S ? scene.images[scene.plans[S.plan]?.[0]]?.src || '' : '';
        const n = { src, drlo, qui, fiche, points, parle: enCours && estDrLo(L.qui), com };
        const p = precedent.current;
        if (n.src !== p.src || n.drlo !== p.drlo || n.qui !== p.qui || n.fiche !== p.fiche || n.points !== p.points || n.parle !== p.parle || n.com !== p.com) {
          if (n.drlo && !p.drlo) debutDrLo.current = t;
          precedent.current = n; setEtat(n);
          if (n.drlo !== p.drlo) onDrLo?.(n.drlo);
        }
        if (n.drlo && scene.drlo?.contexte === 'appel') { const h = Math.max(0, Math.floor(t - debutDrLo.current)); setHorloge(x => (x === h ? x : h)); }
      }
      raf = window.requestAnimationFrame(boucle);
    };
    raf = window.requestAnimationFrame(boucle);
    return () => window.cancelAnimationFrame(raf);
  }, [scene, segs, lignes, fiches, coms, temps, onDrLo]);

  const ctx = scene.drlo?.contexte;
  const enSurimpression = etat.drlo;
  // Au cabinet, Dr Lô est dans la scène : son nom avec sa photo, et ses fiches posées sur l'image
  const ficheEnBas = !enSurimpression && etat.fiche >= 0 && !lecon;
  const F = etat.fiche >= 0 ? fiches[etat.fiche] : null;

  const fiche = F && (
    <div key={etat.fiche} className="cdsv-fiche" style={{ padding: '14px 16px 12px', borderRadius: 18, background: 'rgba(32,23,16,.8)', border: `1px solid ${LINE}`, WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)' }}>
      <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 18, lineHeight: 1.25, fontWeight: 600, color: INK }}>{F.titre}</p>
      {/* seulement les points déjà dits : la fiche grandit au fil de la parole, sans cacher l'image d'avance */}
      {F.pts.slice(0, etat.points).map((p, m) => (
        <p key={m} className="cdsv-fiche" style={{ margin: '7px 0 0', paddingLeft: 16, position: 'relative', fontSize: 14, lineHeight: 1.4, color: m === etat.points - 1 ? INK : SOFT, transition: 'color .5s' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 2, top: '.55em', width: 6, height: 6, borderRadius: 3, background: accent }} />{p.x}
        </p>
      ))}
    </div>
  );

  const quiVisible = !!etat.qui && !enSurimpression && !lecon;
  const etiquette = (
    <div style={{ position: 'absolute', left: compact ? 10 : 16, ...(compact ? { bottom: 10 } : { top: '58%' }), display: 'flex', alignItems: 'center', gap: 6, maxWidth: '70%', padding: etat.qui && estDrLo(etat.qui) ? '3px 12px 3px 3px' : '5px 12px', borderRadius: 999,
      background: 'rgba(0,0,0,.55)', WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)', opacity: quiVisible ? 1 : 0, transition: 'opacity .35s' }}>
      {etat.qui && estDrLo(etat.qui) && <img src={AVATAR} alt="" style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover' }} />}
      <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', color: accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{etat.qui}</span>
    </div>
  );

  // Dans une carte : l'image seule, en 4/3, avec le nom de qui parle
  if (compact) return (
    <div aria-hidden="true" style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', background: '#0B0704' }}>
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} />
      {etiquette}
    </div>
  );

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#0B0704', overflow: 'hidden' }}>
      <style>{`
        @keyframes cdsv-onde{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        @keyframes cdsv-anneau{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.45);opacity:0}}
        @keyframes cdsv-direct{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes cdsv-entre{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
        .cdsv-fiche{animation:cdsv-entre .6s ease both}
        @media (prefers-reduced-motion: reduce){.cdsv-fiche{animation:none}.cdsv-anim{animation:none!important}}
      `}</style>
      {etat.src && <img src={etat.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px) brightness(.45)', transform: 'scale(1.3)' }} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: HAUT_CADRE, margin: '0 auto', width: CADRE, aspectRatio: '1 / 1',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 76%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 76%, transparent 100%)' }}>
        <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block', transition: 'filter .9s ease', filter: enSurimpression ? 'brightness(.28) blur(3px) saturate(.7)' : 'none' }} />
        {/* qui parle */}
        {etiquette}
        {ficheEnBas && <div style={{ position: 'absolute', left: 14, right: 14, top: '12%' }}>{fiche}</div>}
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(10,6,3,.55) 0, rgba(10,6,3,0) 14%, rgba(10,6,3,0) 46%, rgba(10,6,3,.82) 70%, rgba(10,6,3,.96) 100%)' }} />
      {/* La leçon : la fiche du point en cours, posée en bas de l'image (le visage reste en haut), elle grandit vers le haut */}
      {lecon && F && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: HAUT_CADRE, margin: '0 auto', width: CADRE, aspectRatio: '1 / 1', padding: '0 14px', boxSizing: 'border-box', zIndex: 2,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '3%' }}>{fiche}</div>
      )}

      {/* Le moment Dr Lô, selon le contexte */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: `calc(${HAUT_CADRE} + 4px)`, margin: '0 auto', width: CADRE, padding: '0 18px', zIndex: 2,
        opacity: enSurimpression ? 1 : 0, transform: enSurimpression ? 'none' : 'translateY(8px)', transition: 'opacity .9s ease, transform .9s ease' }}>
        <EnTeteDrLo contexte={ctx || 'video'} titre={scene.drlo?.titre} parle={etat.parle} accent={accent} horloge={horloge} />
        {ctx === 'live' && etat.com >= 0 && (
          <p key={etat.com} className="cdsv-fiche" style={{ margin: '10px 0 0', padding: '8px 12px', borderRadius: 14, background: 'rgba(255,255,255,.08)', fontSize: 13, color: INK, lineHeight: 1.35 }}>
            <span style={{ color: SOFT }}>Un commentaire · </span>{coms[etat.com].x}
          </p>
        )}
        <div style={{ marginTop: 12 }}>{enSurimpression && fiche}</div>
      </div>
    </div>
  );
};

/** L'en-tête du moment Dr Lô : sa photo, son nom, et ce qui rappelle d'où vient sa voix dans l'histoire */
const EnTeteDrLo: React.FC<{ contexte: string; titre?: string; parle: boolean; accent: string; horloge: number }> = ({ contexte, titre, parle, accent, horloge }) => {
  const photo = (taille: number) => (
    <div style={{ position: 'relative', width: taille, height: taille, flex: 'none' }}>
      {contexte === 'appel' && parle && [0, 1].map(k => (
        <span key={k} className="cdsv-anim" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${accent}`, animation: `cdsv-anneau 1.8s ${k * 0.9}s ease-out infinite` }} />
      ))}
      <img src={AVATAR} alt="" style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${parle ? accent : '#1a120b'}`, transition: 'border-color .4s' }} />
    </div>
  );
  const nom = (sous: string) => (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: INK }}>Dr Lô</p>
      <p style={{ margin: 0, fontSize: 12, color: SOFT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sous}</p>
    </div>
  );
  const onde = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 26, flex: 1, minWidth: 0 }}>
      {Array.from({ length: 22 }, (_, k) => (
        <span key={k} className="cdsv-anim" style={{ width: 3, height: `${30 + ((k * 37) % 70)}%`, borderRadius: 2, background: parle ? accent : 'rgba(255,255,255,.3)', transformOrigin: 'center',
          animation: parle ? `cdsv-onde ${0.5 + ((k * 13) % 7) / 10}s ${(k % 5) / 10}s ease-in-out infinite` : 'none', transform: parle ? undefined : 'scaleY(.35)' }} />
      ))}
    </div>
  );
  if (contexte === 'vocal') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px 8px 8px', borderRadius: 22, background: 'rgba(32,23,16,.8)', border: `1px solid ${LINE}` }}>
      {photo(44)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 12, color: SOFT }}>{titre || 'Message vocal'} · Dr Lô</p>
        {onde}
      </div>
    </div>
  );
  if (contexte === 'appel') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {photo(56)}
      {nom(`${titre || 'Appel en cours'} · ${Math.floor(horloge / 60)}:${String(horloge % 60).padStart(2, '0')}`)}
    </div>
  );
  if (contexte === 'live') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {photo(50)}
      {nom(titre || 'Médecin · santé mentale et sexuelle')}
      <span className="cdsv-anim" style={{ marginLeft: 'auto', padding: '4px 9px', borderRadius: 8, background: '#D93A3A', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', animation: 'cdsv-direct 1.6s ease-in-out infinite' }}>EN DIRECT</span>
    </div>
  );
  if (contexte === 'video') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {photo(50)}
      {nom(titre || 'Vidéo · médecin, santé mentale et sexuelle')}
      <span aria-hidden="true" style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, fontSize: 11 }}>▶</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {photo(50)}
      {nom(titre || 'Médecin · santé mentale et sexuelle')}
    </div>
  );
};

export default ScenesVivantes;
