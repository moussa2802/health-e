import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore - buffer is a CommonJS module
import * as BufferModule from "buffer";
import { initSentry, Sentry } from "./utils/sentry";
import App from "./App.tsx";
import "./index.css";

// Make Buffer globally available for simple-peer
// @ts-ignore
globalThis.Buffer = BufferModule.Buffer;

// Initialize Sentry before rendering (no-op in dev or if VITE_SENTRY_DSN is missing)
initSentry();

// Reload once when Vite preload fails (old chunks deleted after deploy)
window.addEventListener('vite:preloadError', () => {
  const key = 'he-sw-reload-ts';
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last < 10_000) return;
    sessionStorage.setItem(key, String(now));
  } catch { /* sessionStorage indisponible */ }
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Une erreur inattendue s'est produite. Veuillez recharger la page.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
