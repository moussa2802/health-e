import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Info } from 'lucide-react';

const CHECK_INTERVAL = 60 * 60 * 1000; // 1h
const RELOAD_KEY = 'he-sw-reload-ts';
const RELOAD_COOLDOWN = 10_000; // 10s anti-boucle

function isLocked(): boolean {
  return ((window as any).__heReloadLocks ?? 0) > 0;
}

function safeReload() {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (now - last < RELOAD_COOLDOWN) return;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {}
  window.location.reload();
}

export default function UpdateBanner() {
  const [deferred, setDeferred] = useState(false);
  const hadController = useRef(!!navigator.serviceWorker?.controller);
  const refreshing = useRef(false);

  useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => registration.update(), CHECK_INTERVAL);
      }
    },
  });

  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;

    const onControllerChange = () => {
      if (refreshing.current) return;
      if (!hadController.current) {
        hadController.current = true;
        return;
      }
      refreshing.current = true;
      if (isLocked()) {
        setDeferred(true);
      } else {
        safeReload();
      }
    };

    sw.addEventListener('controllerchange', onControllerChange);
    return () => sw.removeEventListener('controllerchange', onControllerChange);
  }, []);

  useEffect(() => {
    if (!deferred) return;
    const onLockChange = () => {
      if (!isLocked()) safeReload();
    };
    window.addEventListener('he-reload-locks-changed', onLockChange);
    return () => window.removeEventListener('he-reload-locks-changed', onLockChange);
  }, [deferred]);

  useEffect(() => {
    if (!deferred) return;
    const onVisChange = () => {
      if (document.visibilityState === 'hidden' && !isLocked()) {
        safeReload();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [deferred]);

  if (!deferred) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[9999] flex items-center gap-2 bg-card border border-line rounded-xl px-4 py-3 shadow-lg max-w-sm mx-auto"
      role="status"
    >
      <Info size={14} className="text-accent flex-shrink-0" />
      <span className="text-sm text-ink">
        Mise à jour prête — elle s'appliquera quand tu auras terminé.
      </span>
    </div>
  );
}
