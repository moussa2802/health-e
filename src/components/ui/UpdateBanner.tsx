import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';

const DISMISS_KEY = 'he-update-dismissed';
const CHECK_INTERVAL = 60 * 60 * 1000; // 1h

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => registration.update(), CHECK_INTERVAL);
      }
    },
  });

  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
    catch { return false; }
  });

  const isInQuiz = location.pathname.startsWith('/assessment/quiz/');
  const [deferredFromQuiz, setDeferredFromQuiz] = useState(false);

  useEffect(() => {
    if (needRefresh && isInQuiz) setDeferredFromQuiz(true);
  }, [needRefresh, isInQuiz]);

  useEffect(() => {
    if (deferredFromQuiz && !isInQuiz) setDeferredFromQuiz(false);
  }, [deferredFromQuiz, isInQuiz]);

  const shouldShow = needRefresh && !dismissed && !isInQuiz;
  if (!shouldShow) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-card border-b border-line px-4 py-3"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}
      role="alert"
    >
      <RefreshCw size={14} className="text-accent flex-shrink-0" />
      <span className="text-sm text-ink">
        Nouvelle version disponible
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="text-sm font-bold text-white bg-accent rounded-lg px-3 py-1.5 border-none cursor-pointer hover:opacity-90 transition-opacity"
      >
        Actualiser
      </button>
      <button
        onClick={handleDismiss}
        className="text-muted bg-transparent border-none cursor-pointer p-1 hover:text-ink transition-colors"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
