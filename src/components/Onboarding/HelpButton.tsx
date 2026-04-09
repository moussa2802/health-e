import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TOOLTIPS, pathToPageKey } from '../../utils/onboardingConfig';

const HelpButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Pas visible hors pages assessment/mon-espace, ni pour les non-connectés
  if (!isAuthenticated) return null;
  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute) return null;

  const pageKey = pathToPageKey(pathname);
  const hasPageTooltips = pageKey ? (TOOLTIPS[pageKey]?.length ?? 0) > 0 : false;

  const replayTooltips = () => {
    if (!pageKey) return;
    window.dispatchEvent(new CustomEvent('he:replay-tooltips', { detail: { pageKey } }));
    setOpen(false);
  };

  const replayWelcome = () => {
    window.dispatchEvent(new CustomEvent('he:replay-welcome'));
    setOpen(false);
  };

  return (
    <>
      {/* Bouton fixe "?" ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Aide"
        style={{
          position: 'fixed', bottom: 24, left: 20, zIndex: 8000,
          width: 42, height: 42, borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, #3B82F6, #10B981)'
            : 'rgba(255,255,255,0.92)',
          border: '1.5px solid rgba(59,130,246,0.25)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          color: open ? 'white' : '#64748B',
          fontSize: 17, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'background 0.2s, color 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget.style.transform = 'scale(1.08)'); }}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '?'}
      </button>

      {/* Panel d'aide ───────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Overlay de fermeture */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 7999 }}
          />

          <div
            style={{
              position: 'fixed', bottom: 76, left: 20, zIndex: 8001,
              background: 'white',
              borderRadius: 18,
              border: '1px solid rgba(59,130,246,0.15)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
              padding: '18px',
              width: 260,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3B82F6, #10B981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0,
              }}>
                ❓
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0A2342' }}>Aide</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>Comment puis-je t'aider ?</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hasPageTooltips && (
                <button
                  onClick={replayTooltips}
                  style={{
                    padding: '11px 14px', borderRadius: 12,
                    border: '1px solid rgba(59,130,246,0.15)',
                    background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
                    color: '#1E40AF', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                  } as React.CSSProperties}
                >
                  <span style={{ fontSize: 16 }}>🔄</span>
                  <span>Revoir les explications<br /><span style={{ fontSize: 11, fontWeight: 400, color: '#64748B' }}>de cette page</span></span>
                </button>
              )}

              <button
                onClick={replayWelcome}
                style={{
                  padding: '11px 14px', borderRadius: 12,
                  border: '1px solid rgba(16,185,129,0.15)',
                  background: 'linear-gradient(135deg, #F0FDF4, #F0FDFA)',
                  color: '#065F46', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                } as React.CSSProperties}
              >
                <span style={{ fontSize: 16 }}>🌿</span>
                <span>Revoir la présentation<br /><span style={{ fontSize: 11, fontWeight: 400, color: '#64748B' }}>de Healt-e</span></span>
              </button>

              <button
                onClick={() => { navigate('/faq'); setOpen(false); }}
                style={{
                  padding: '11px 14px', borderRadius: 12,
                  background: '#F8FAFC',
                  color: '#374151', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid #E2E8F0',
                } as React.CSSProperties}
              >
                <span style={{ fontSize: 16 }}>📖</span>
                <span>Questions fréquentes</span>
              </button>
            </div>

            {/* Footer */}
            <p style={{ margin: '12px 0 0', fontSize: 10, color: '#CBD5E1', textAlign: 'center' }}>
              Healt-e · Assistance IA
            </p>
          </div>
        </>
      )}
    </>
  );
};

export default HelpButton;
