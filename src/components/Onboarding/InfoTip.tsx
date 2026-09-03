import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTipProps {
  text: string;
  variant?: 'light' | 'dark';
}

const InfoTip: React.FC<InfoTipProps> = ({ text, variant = 'light' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

  const reposition = useCallback(() => {
    const btn = containerRef.current;
    const pop = popoverRef.current;
    if (!btn || !pop) return;

    const btnRect = btn.getBoundingClientRect();
    const popW = Math.min(260, window.innerWidth - 24);
    const popH = pop.offsetHeight;

    let left = btnRect.left + btnRect.width / 2 - popW / 2;
    if (left < 12) left = 12;
    if (left + popW > window.innerWidth - 12) left = window.innerWidth - 12 - popW;

    let top = btnRect.bottom + 6;
    if (top + popH > window.innerHeight - 12) {
      top = btnRect.top - popH - 6;
    }

    setPopStyle({ position: 'fixed', top, left, width: popW, zIndex: 9000 });
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(reposition);
    const close = (e: Event) => {
      const target = (e as TouchEvent).touches?.[0]?.target ?? (e as MouseEvent).target;
      if (containerRef.current?.contains(target as Node)) return;
      if (popoverRef.current?.contains(target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open, reposition]);

  const isDark = variant === 'dark';

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all p-0 ${
          isDark
            ? 'bg-white/10 border-white/20 text-white/50 hover:bg-white/20 hover:text-white/70'
            : 'bg-ink/5 border-line text-muted hover:bg-ink/10 hover:text-ink-soft'
        }`}
        aria-label="Plus d'infos"
      >
        <Info size={12} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="rounded-xl shadow-lift px-3.5 py-3 text-left bg-card border border-line"
          style={popStyle}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 text-[12px] leading-relaxed text-ink-soft">
              {text}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="flex-shrink-0 p-0.5 rounded-md cursor-pointer border-0 transition-colors bg-ink/5 text-muted hover:bg-ink/10"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </span>
  );
};

export default InfoTip;
