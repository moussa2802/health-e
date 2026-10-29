/**
 * Fold — une section repliable : titre (Fraunces 20) + une ligne de résumé, le détail s'ouvre au toucher.
 * Sert à garder les pages courtes (charte : le moment fort en haut, le détail replié).
 */
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLOR, FONT, FS, RADIUS } from '../../design/charte';

const Fold: React.FC<{
  title: string;
  summary?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, summary, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section style={{ borderRadius: RADIUS.card, border: `1px solid ${COLOR.line}`, background: COLOR.glass }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={id} className="drl-btn"
        style={{ width: '100%', minHeight: 64, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 0, background: 'transparent', color: COLOR.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
        {icon && <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: RADIUS.sm, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: FS.section - 2, fontWeight: 600, color: COLOR.title, lineHeight: 1.25 }}>{title}</span>
          {summary && <span style={{ display: 'block', marginTop: 3, fontSize: FS.small + 1, color: COLOR.muted, lineHeight: 1.45 }}>{summary}</span>}
        </span>
        <ChevronDown size={18} color={COLOR.faint} aria-hidden="true" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && <div id={id} style={{ padding: '0 16px 16px' }}>{children}</div>}
    </section>
  );
};

export default Fold;
