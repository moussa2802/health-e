import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, X, RefreshCw, Leaf, BookOpen } from 'lucide-react';
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
        className={`fixed bottom-8 left-[88px] z-[8000] w-[34px] h-[34px] rounded-full border-[1.5px] shadow-lift flex items-center justify-center transition-all hover:scale-105 ${
          open ? 'bg-sage text-white border-sage' : 'bg-card/90 text-ink-soft border-line'
        }`}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {open ? <X size={15} /> : <HelpCircle size={16} />}
      </button>

      {/* Panel d'aide ───────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Overlay de fermeture */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[7999]"
          />

          <div className="fixed bottom-[76px] left-5 z-[8001] bg-card rounded-block border border-line shadow-lift px-4.5 py-4.5 w-[260px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center flex-shrink-0">
                <HelpCircle size={16} className="text-white" />
              </div>
              <div>
                <p className="m-0 text-sm font-extrabold text-ink">Aide</p>
                <p className="m-0 text-[11px] text-muted">Comment puis-je t'aider ?</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {hasPageTooltips && (
                <button
                  onClick={replayTooltips}
                  className="px-3.5 py-2.5 rounded-xl border border-sage/20 bg-sage-soft text-sage text-[13px] font-semibold cursor-pointer text-left flex items-center gap-2 hover:bg-sage-soft/70 transition-colors"
                >
                  <RefreshCw size={16} className="flex-shrink-0" />
                  <span>Revoir les explications<br /><span className="text-[11px] font-normal text-muted">de cette page</span></span>
                </button>
              )}

              <button
                onClick={replayWelcome}
                className="px-3.5 py-2.5 rounded-xl border border-sage/20 bg-sage-soft text-sage text-[13px] font-semibold cursor-pointer text-left flex items-center gap-2 hover:bg-sage-soft/70 transition-colors"
              >
                <Leaf size={16} className="flex-shrink-0" />
                <span>Revoir la présentation<br /><span className="text-[11px] font-normal text-muted">de Healt-e</span></span>
              </button>

              <button
                onClick={() => { navigate('/faq'); setOpen(false); }}
                className="px-3.5 py-2.5 rounded-xl border border-line bg-paper text-ink-soft text-[13px] font-semibold cursor-pointer text-left flex items-center gap-2 hover:bg-line/40 transition-colors"
              >
                <BookOpen size={16} className="flex-shrink-0" />
                <span>Questions fréquentes</span>
              </button>
            </div>

            {/* Footer */}
            <p className="mt-3 mb-0 text-[10px] text-muted text-center">
              Healt-e · Assistance IA
            </p>
          </div>
        </>
      )}
    </>
  );
};

export default HelpButton;
