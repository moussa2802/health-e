import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOnboardingState, markPageVisited, resetPageVisited,
} from '../../services/onboardingService';
import { TOOLTIPS, type TooltipConfig } from '../../utils/onboardingConfig';

// ── Helpers de positionnement ─────────────────────────────────────────────────

const EDGE_PAD = 12;
const GAP = 12;

interface BubbleLayout {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  arrowLeft: number;
  arrowSide: 'top' | 'bottom';
}

function computeLayout(rect: DOMRect, position: string): BubbleLayout {
  const vw = window.innerWidth;
  const maxW = Math.min(300, vw - EDGE_PAD * 2);

  const targetCenterX = rect.left + rect.width / 2;
  let left = targetCenterX - maxW / 2;

  if (left < EDGE_PAD) left = EDGE_PAD;
  if (left + maxW > vw - EDGE_PAD) left = vw - EDGE_PAD - maxW;

  const arrowLeft = Math.max(16, Math.min(maxW - 16, targetCenterX - left));

  if (position === 'top') {
    return {
      bottom: window.innerHeight - rect.top + GAP,
      left,
      width: maxW,
      arrowLeft,
      arrowSide: 'bottom',
    };
  }

  return {
    top: rect.bottom + GAP,
    left,
    width: maxW,
    arrowLeft,
    arrowSide: 'top',
  };
}

// ── Spotlight SVG overlay ─────────────────────────────────────────────────────

const SpotlightOverlay: React.FC<{
  targetRect: DOMRect | null;
  onClick: () => void;
}> = ({ targetRect, onClick }) => {
  const pad = 10;
  const r = 10;

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
  const layout = targetRect
    ? computeLayout(targetRect, tooltip.position)
    : null;

  const style: React.CSSProperties = layout
    ? {
        position: 'fixed',
        zIndex: 10001,
        pointerEvents: 'all',
        left: layout.left,
        width: layout.width,
        ...(layout.top != null ? { top: layout.top } : {}),
        ...(layout.bottom != null ? { bottom: layout.bottom } : {}),
      }
    : {
        position: 'fixed',
        zIndex: 10001,
        pointerEvents: 'all',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: Math.min(300, window.innerWidth - EDGE_PAD * 2),
      };

  return (
    <div
      style={style}
      className="bg-card rounded-block px-4 py-3.5 shadow-lift"
      onClick={e => e.stopPropagation()}
    >
      {/* Arrow */}
      {layout && (
        <div
          style={{
            position: 'absolute',
            ...(layout.arrowSide === 'top' ? { top: -7 } : { bottom: -7 }),
            left: layout.arrowLeft,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            ...(layout.arrowSide === 'top'
              ? { borderBottom: '7px solid white' }
              : { borderTop: '7px solid white' }),
            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.06))',
          }}
        />
      )}

      {/* Badge + skip */}
      <div className="flex items-center justify-between mb-2">
        <span className="bg-sage text-white text-[10px] font-bold px-2 py-0.5 rounded-pill">
          {current} / {total}
        </span>
        <button
          onClick={onSkip}
          className="bg-transparent border-0 text-muted text-[11px] cursor-pointer font-semibold hover:text-ink-soft transition-colors p-0"
        >
          Passer tout
        </button>
      </div>

      {/* Titre */}
      <p className="m-0 mb-1 text-sm font-extrabold text-ink">
        {tooltip.titre}
      </p>

      {/* Texte */}
      <p className="m-0 mb-3 text-[13px] text-ink-soft leading-relaxed">
        {tooltip.texte}
      </p>

      {/* Bouton */}
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

  const findTarget = useCallback((tooltip: TooltipConfig) => {
    const el = document.querySelector(`[data-tooltip-id="${tooltip.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
      requestAnimationFrame(() => {
        setTargetRect(el.getBoundingClientRect());
      });
    } else {
      setTargetRect(null);
    }
  }, []);

  const startTooltips = useCallback((list: TooltipConfig[]) => {
    if (!list.length) return;
    const sorted = [...list].sort((a, b) => a.ordre - b.ordre);
    setTooltips(sorted);
    setIndex(0);
    setActive(true);
    setTimeout(() => findTarget(sorted[0]), 400);
  }, [findTarget]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || !pageTooltips.length || checkedRef.current) return;
    checkedRef.current = true;

    getOnboardingState(currentUser.id).then(state => {
      const visited = state?.pages_visited?.[pageKey];
      if (!visited) {
        markPageVisited(currentUser.id!, pageKey);
        setTimeout(() => startTooltips(pageTooltips), 1200);
      }
    });
  }, [isAuthenticated, currentUser?.id, pageKey, pageTooltips, startTooltips]);

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

  useEffect(() => {
    if (active && tooltips[index]) {
      findTarget(tooltips[index]);
    }
  }, [index, active, tooltips, findTarget]);

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
