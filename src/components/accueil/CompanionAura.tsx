/**
 * CompanionAura — le compagnon : une aura de lumière vivante, avec deux yeux de lumière (choix du 4 nov. 2026).
 * Ni pieds, ni bras, ni contour noir : un corps de lumière qui respire et réagit.
 *   repos : respire lentement · ecoute : la personne écrit (yeux grands, légère vibration)
 *   pense : il lit / réfléchit / écrit (regard en l'air) · joie : s'élargit, brille, yeux en arcs
 *   doux : moment difficile (se resserre, lavande, yeux fermés, calme) · nuit : yeux fermés, respiration lente
 * Grandes tailles (≥ 72 px) : contour vivant animé et particules. Petites tailles : forme fixe + respiration CSS (léger).
 * Jamais triste, jamais fatigué, jamais « qui s'éteint » (règle anti-manipulation).
 */
import React, { useEffect, useId, useRef } from 'react';
import { baseRadii, livePoints, shade, smoothPath, STILL_PATH } from '../../utils/auraShape';

export type AuraMood = 'repos' | 'ecoute' | 'pense' | 'joie' | 'doux' | 'nuit';

const LAVANDE = ['#F4F0FF', '#BFD0F2', '#7C8FD0'];
const RADII = baseRadii();

const CSS = `
.ca-breathe{transform-origin:100px 170px;animation:caBreathe 3.4s ease-in-out infinite}
.ca-breathe.ca-slow{animation-duration:6s}
.ca-breathe.ca-fast{animation-duration:1.6s}
.ca-blink{transform-box:fill-box;transform-origin:center;animation:caBlink 5.2s infinite}
.ca-p{animation:caRise 4s linear infinite}
.ca-pop{animation:caPop .5s ease}
@keyframes caBreathe{50%{transform:scale(1.035,.975)}}
@keyframes caBlink{0%,45%,49%,100%{transform:scaleY(1)}47%{transform:scaleY(.08)}}
@keyframes caRise{0%{transform:translateY(0);opacity:0}25%{opacity:.9}100%{transform:translateY(-60px);opacity:0}}
@keyframes caPop{40%{transform:translateY(-8px) scale(1.04)}}
@media (prefers-reduced-motion:reduce){.ca-breathe,.ca-blink,.ca-p,.ca-pop{animation:none}}`;
let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.setAttribute('data-companion-aura', '');
  el.textContent = CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

function Eyes({ mood }: { mood: AuraMood }) {
  const cy = mood === 'pense' ? 114 : 120, ex = 15, col = 'rgba(70,32,12,.62)';
  const dx = mood === 'pense' ? 3 : 0;
  if (mood === 'joie') return <path d={`M${100 - ex - 6} ${cy + 2}q6 -9 12 0M${100 + ex - 6} ${cy + 2}q6 -9 12 0`} stroke={col} strokeWidth={3.8} fill="none" strokeLinecap="round" />;
  if (mood === 'doux' || mood === 'nuit') return <path d={`M${100 - ex - 6} ${cy}q6 5 12 0M${100 + ex - 6} ${cy}q6 5 12 0`} stroke="rgba(40,40,90,.5)" strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  const ry = mood === 'ecoute' ? 8.6 : 7.4;
  return (
    <g className="ca-blink">
      <ellipse cx={100 - ex + dx} cy={cy} rx={5.8} ry={ry} fill={col} />
      <ellipse cx={100 + ex + dx} cy={cy} rx={5.8} ry={ry} fill={col} />
      <circle cx={100 - ex + dx + 1.9} cy={cy - 3} r={2.3} fill="#fff" />
      <circle cx={100 + ex + dx + 1.9} cy={cy - 3} r={2.3} fill="#fff" />
    </g>
  );
}

const CompanionAura: React.FC<{ size: number; color: string; mood?: AuraMood; live?: boolean; sign?: React.ReactNode; onTap?: () => void }> = ({ size, color, mood = 'repos', live, sign, onTap }) => {
  injectCss();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bodyRef = useRef<SVGPathElement>(null);
  const haloRef = useRef<SVGPathElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const isLive = live ?? size >= 72;
  const moodRef = useRef(mood);
  moodRef.current = mood;

  // Contour vivant (grandes tailles seulement) ; s'arrête quand l'onglet est caché ou si l'on préfère moins d'animations
  useEffect(() => {
    if (!isLive || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const tick = (now: number) => {
      const m = moodRef.current;
      const speed = m === 'ecoute' ? 2.2 : m === 'doux' || m === 'nuit' ? 0.6 : 1;
      const scale = m === 'joie' ? 1.08 : m === 'doux' ? 0.94 : 1;
      const d = smoothPath(livePoints(RADII, now / 1000, { speed, scale, jitter: m === 'ecoute' ? 0.9 : 0 }));
      bodyRef.current?.setAttribute('d', d);
      haloRef.current?.setAttribute('d', d);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    const onVis = () => { if (!document.hidden) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } };
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [isLive]);

  const pal = mood === 'doux' ? LAVANDE : [shade(color, 0.82), shade(color, 0.12), shade(color, -0.22)];
  const haloOpacity = mood === 'joie' ? 0.95 : mood === 'doux' ? 0.45 : 0.7;
  const breatheCls = isLive ? '' : `ca-breathe${mood === 'doux' || mood === 'nuit' ? ' ca-slow' : mood === 'ecoute' ? ' ca-fast' : ''}`;
  const tap = () => {
    const g = groupRef.current;
    if (g) { g.classList.remove('ca-pop'); void g.getBoundingClientRect(); g.classList.add('ca-pop'); }
    onTap?.();
  };

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" onClick={onTap ? tap : undefined} style={{ display: 'block', overflow: 'visible', cursor: onTap ? 'pointer' : undefined }}>
      <defs>
        <radialGradient id={`${uid}b`} cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor={pal[0]} />
          <stop offset=".5" stopColor={pal[1]} stopOpacity={0.95} />
          <stop offset="1" stopColor={pal[2]} stopOpacity={0.85} />
        </radialGradient>
        <radialGradient id={`${uid}c`} cx="50%" cy="55%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <filter id={`${uid}g`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation={size >= 48 ? 14 : 9} /></filter>
        {size >= 48 && <filter id={`${uid}s`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={2} /></filter>}
      </defs>
      <g ref={groupRef}>
        <g className={breatheCls}>
          <path ref={haloRef} d={STILL_PATH} fill={pal[1]} opacity={haloOpacity} filter={`url(#${uid}g)`} />
          <path ref={bodyRef} d={STILL_PATH} fill={`url(#${uid}b)`} filter={size >= 48 ? `url(#${uid}s)` : undefined} />
          <ellipse cx={100} cy={124} rx={34} ry={30} fill={`url(#${uid}c)`} opacity={0.7} />
          <Eyes mood={mood} />
        </g>
      </g>
      {sign && <g transform="translate(138 38) scale(1.5)" fill="none" stroke={pal[0]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>{sign}</g>}
      {isLive && mood !== 'doux' && (
        <g fill={pal[0]}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <circle key={i} className="ca-p" r={1.4 + (i % 3) * 0.6} cx={70 + i * 12} cy={100 + (i % 2) * 30} style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${3 + (i % 3)}s` }} />
          ))}
        </g>
      )}
    </svg>
  );
};

export default CompanionAura;
