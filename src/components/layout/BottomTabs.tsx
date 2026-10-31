/**
 * BottomTabs — la barre du bas : Accueil · Tests · Compagnon · Moi.
 * Elle s'affiche sur les pages de navigation et se cache d'elle-même pendant un test, un exercice et la conversation
 * (la conversation est plein écran, au-dessus de la barre).
 */
import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, User } from 'lucide-react';
import { COLOR } from '../../design/charte';
import '../accueil/accueil.css';

import { isSharedPath, tabForPath, type TabId } from '../../utils/tabForPath';

const TABS: { id: TabId; label: string; to: string; Icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', to: '/', Icon: Home },
  { id: 'tests', label: 'Tests', to: '/espace/mental', Icon: ClipboardList },
  { id: 'compagnon', label: 'Compagnon', to: '/compagnon', Icon: MessageCircle },
  { id: 'moi', label: 'Moi', to: '/espace', Icon: User },
];

const BottomTabs: React.FC = () => {
  const { pathname } = useLocation();
  const last = useRef<TabId | null>(null);
  const active = tabForPath(pathname, last.current);
  if (active && !isSharedPath(pathname)) last.current = active;
  if (!active) return null;
  return (
    <nav aria-label="Navigation principale"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, background: '#1C130B', borderTop: `1px solid ${COLOR.line}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      <div className="drl-wrap" style={{ margin: '0 auto', height: 64, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {TABS.map(({ id, label, to, Icon }) => {
          const on = id === active;
          return (
            <Link key={id} to={to} aria-current={on ? 'page' : undefined} className="drl-btn"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48, textDecoration: 'none', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? COLOR.action : COLOR.muted }}>
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
