import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOnboardingState, markPageVisited, resetPageVisited,
} from '../../services/onboardingService';
import { TOOLTIPS, type TooltipConfig } from '../../utils/onboardingConfig';

// ── Helpers de positionnement ─────────────────────────────────────────────────

interface PositionStyle {
  position: 'fixed';
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  transform?: string;
}

function getTooltipStyle(rect: DOMRect, position: string): PositionStyle {
  const PAD = 14;
  const W = 280; // largeur fixe du tooltip

  // Centre horizontal de l'élément, clampé aux bords de l'écran
  const centerX = Math.max(16, Math.min(window.innerWidth - W - 16, rect.left + rect.width / 2 - W / 2));
  // Centre vertical
  const centerY = rect.top + rect.height / 2;

  switch (position) {
    case 'bottom':
      return { position: 'fixed', top: rect.bottom + PAD, left: centerX };
    case 'top':
      return { position: 'fixed', bottom: window.innerHeight - rect.top + PAD, left: centerX };
    case 'right':
      return { position: 'fixed', top: centerY - 80, left: rect.right + PAD };
    case 'left':
      return { position: 'fixed', top: centerY - 80, right: window.innerWidth - rect.left + PAD };
    default:
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

// ── Arrow direction inverse ────────────────────────────────────────────────────

function ArrowUp() {
  return (
    <div style={{
      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderBottom: '8px solid white',
      filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.08))',
    }} />
  );
}

function ArrowDown() {
  return (
    <div style={{
      position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid white',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
    }} />
  );
}

// ── Spotlight SVG overlay ─────────────────────────────────────────────────────

const SpotlightOverlay: React.FC<{
  targetRect: DOMRect | null;
  onClick: () => void;
}> = ({ targetRect, onClick }) => {
  const pad = 10;
  const r = 10; // border-radius du spotlight

  return (
    <svg
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        zIndex: 10000, pointerEvents: 'all', cursor: 'default',
      }}
      onClick={onClick}
    >
      <defs>
        <mask id="he-spotlight">
          <rect width="100%" height="100%" fill="white" />
          {targetRect && (
            <rect
              x={targetRect.left - pad}
              y={targetRect.top - pad}
              width={targetRect.width + pad * 2}
              height={targetRect.height + pad * 2}
              rx={r}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.62)"
        mask="url(#he-spotlight)"
      />
    </svg>
  );
};

// ── Tooltip Bubble ────────────────────────────────────────────────────────────

const TooltipBubble: React.FC<{
  tooltip: TooltipConfig;
  targetRect: DOMRect | null;
  current: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}> = ({ tooltip, targetRect, current, total, onNext, onSkip }) => {
  const posStyle = targetRect
    ? getTooltipStyle(targetRect, tooltip.position)
    : { position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const showArrowUp = tooltip.position === 'bottom';
  const showArrowDown = tooltip.position === 'top';

  return (
    <div
      style={{ ...posStyle, zIndex: 10001, pointerEvents: 'all' }}
      className="w-[280px] bg-card rounded-block px-4.5 py-4 shadow-lift"
      onClick={e => e.stopPropagation()}
    >
      {showArrowUp && <ArrowUp />}
      {showArrowDown && <ArrowDown />}

      {/* Badge numéro */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="bg-sage text-white text-[10px] font-bold px-2 py-0.5 rounded-pill">
          {current} / {total}
        </span>
        <button
          onClick={onSkip}
          className="bg-transparent border-0 text-muted text-[11px] cursor-pointer font-semibold hover:text-ink-soft transition-colors"
        >
          Passer tout
        </button>
      </div>

      {/* Titre */}
      <p className="m-0 mb-1.5 text-sm font-extrabold text-ink">
        {tooltip.titre}
      </p>

      {/* Texte */}
      <p className="m-0 mb-3.5 text-[13px] text-ink-soft leading-relaxed">
        {tooltip.texte}
      </p>

      {/* Bouton Compris */}
      <button
        onClick={onNext}
        className="w-full py-2.5 rounded-xl border-0 bg-sage text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-sage/90 transition-colors"
      >
        {current === total ? (<>Terminé <Check size={14} /></>) : (<>Compris <ArrowRight size={14} /></>)}
      </button>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

interface PageTooltipsProps {
  pageKey: string;
}

const PageTooltips: React.FC<PageTooltipsProps> = ({ pageKey }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [tooltips, setTooltips] = useState<TooltipConfig[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const checkedRef = useRef(false);

  const pageTooltips = TOOLTIPS[pageKey] ?? [];

  // ── Trouver l'élément DOM et sa position ────────────────────────────────────
  const findTarget = useCallback((tooltip: TooltipConfig) => {
    const el = document.querySelector(`[data-tooltip-id="${tooltip.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Attendre que le scroll soit fini avant de lire getBoundingClientRect
      setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 350);
    } else {
      setTargetRect(null);
    }
  }, []);

  // ── Démarrer les tooltips ───────────────────────────────────────────────────
  const startTooltips = useCallback((list: TooltipConfig[]) => {
    if (!list.length) return;
    const sorted = [...list].sort((a, b) => a.ordre - b.ordre);
    setTooltips(sorted);
    setIndex(0);
    setActive(true);
    // Attendre que la page charge
    setTimeout(() => findTarget(sorted[0]), 400);
  }, [findTarget]);

  // ── Check première visite ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || !pageTooltips.length || checkedRef.current) return;
    checkedRef.current = true;

    getOnboardingState(currentUser.id).then(state => {
      const visited = state?.pages_visited?.[pageKey];
      if (!visited) {
        // Marquer la page comme visitée immédiatement (même si on ferme avant la fin)
        markPageVisited(currentUser.id!, pageKey);
        // Délai pour laisser la page se rendre
        setTimeout(() => startTooltips(pageTooltips), 1200);
      }
    });
  }, [isAuthenticated, currentUser?.id, pageKey, pageTooltips, startTooltips]);

  // ── Écouter le replay depuis HelpButton ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { pageKey: string };
      if (detail?.pageKey !== pageKey) return;
      if (!currentUser?.id) return;

      resetPageVisited(currentUser.id, pageKey).then(() => {
        setIndex(0);
        startTooltips(pageTooltips);
      });
    };
    window.addEventListener('he:replay-tooltips', handler);
    return () => window.removeEventListener('he:replay-tooltips', handler);
  }, [pageKey, currentUser?.id, pageTooltips, startTooltips]);

  // ── Mettre à jour la position quand l'index change ─────────────────────────
  useEffect(() => {
    if (active && tooltips[index]) {
      findTarget(tooltips[index]);
    }
  }, [index, active, tooltips, findTarget]);

  // ── Gérer le resize ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !tooltips[index]) return;
    const handleResize = () => findTarget(tooltips[index]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, index, tooltips, findTarget]);

  const handleNext = useCallback(() => {
    if (index >= tooltips.length - 1) {
      setActive(false);
    } else {
      setIndex(i => i + 1);
    }
  }, [index, tooltips.length]);

  const handleSkip = useCallback(() => {
    setActive(false);
  }, []);

  if (!active || !tooltips[index]) return null;

  return (
    <>
      <SpotlightOverlay targetRect={targetRect} onClick={handleSkip} />
      <TooltipBubble
        tooltip={tooltips[index]}
        targetRect={targetRect}
        current={index + 1}
        total={tooltips.length}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </>
  );
};

export default PageTooltips;
