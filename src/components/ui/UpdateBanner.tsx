import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Info } from 'lucide-react';
import { forcerMiseAJour, verifierVersion } from '../../utils/versionCheck';

const CHECK_INTERVAL = 30 * 60 * 1000; // 30 min
const VERSION_CHECK_GAP = 60 * 1000; // au plus une vérification de /version.json par minute (fichier minuscule, jamais en cache)
const VERSION_POLL = 5 * 60 * 1000; // et une toutes les 5 minutes tant que l'appli est ouverte
const RELOAD_KEY = 'he-sw-reload-ts';
const RELOAD_COOLDOWN = 10_000; // 10s anti-boucle

function isLocked(): boolean {
  return ((window as unknown as { __heReloadLocks?: number }).__heReloadLocks ?? 0) > 0;
}

function safeReload() {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (now - last < RELOAD_COOLDOWN) return;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch { /* sessionStorage indisponible en navigation privée */ }
  window.location.reload();
}

export default function UpdateBanner() {
  const [deferred, setDeferred] = useState(false);
  const [nouvelle, setNouvelle] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const hadController = useRef(!!navigator.serviceWorker?.controller);
  const refreshing = useRef(false);

  useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), CHECK_INTERVAL);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
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

  // Filet de sécurité : si l'appli installée sert une ancienne version (mise à jour bloquée), on la répare
  useEffect(() => {
    let last = 0;
    const reload = () => { if (isLocked()) setDeferred(true); else safeReload(); };
    const check = () => {
      if (Date.now() - last < VERSION_CHECK_GAP) return;
      last = Date.now();
      void verifierVersion(__APP_VERSION__, reload, 6000, () => setNouvelle(true));
    };
    // Dès l'entrée dans l'appli (1,5 s), à chaque retour au premier plan, puis toutes les 5 minutes
    const t = window.setTimeout(check, 1500);
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') check(); }, VERSION_POLL);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearTimeout(t); window.clearInterval(poll); document.removeEventListener('visibilitychange', onVis); };
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

  if (!deferred && !nouvelle) return null;

  // « Actualiser » répond tout de suite (le bouton change) ; si le nettoyage traîne, la page se recharge quand même après 6 s
  const actualiser = () => {
    if (enCours) return;
    setEnCours(true);
    const recharger = () => window.location.reload();
    const secours = window.setTimeout(recharger, 6000);
    void forcerMiseAJour(() => { window.clearTimeout(secours); recharger(); });
  };

  // Au-dessus de la barre du bas (elle reste utilisable) ; au-dessus de tout le reste
  return (
    <div
      className="fixed left-4 right-4 z-[9999] flex items-center gap-3 bg-card border border-line rounded-xl px-4 py-3 shadow-lg max-w-sm mx-auto"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
      role="status"
    >
      <Info size={14} className="text-accent flex-shrink-0" />
      <span className="text-sm text-ink flex-1">
        {enCours ? 'Mise à jour en cours…' : deferred ? 'Mise à jour prête : elle s\'appliquera quand tu auras terminé.' : 'Une nouvelle version est disponible.'}
      </span>
      <button
        type="button"
        onClick={actualiser}
        disabled={enCours}
        aria-busy={enCours}
        className="min-h-[44px] px-4 rounded-full bg-accent text-white text-sm font-bold flex-shrink-0 disabled:opacity-70"
      >
        {enCours ? 'Un instant…' : 'Actualiser'}
      </button>
    </div>
  );
}
