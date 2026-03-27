import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error monitoring.
 * Only active in production when VITE_SENTRY_DSN is set.
 * PHI/medical data protection: maskAllText + blockAllMedia enabled on replays.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env.DEV) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // HIPAA: masquer les données médicales et personnelles dans les replays
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Capture 20% des transactions en prod pour éviter les coûts excessifs
    tracesSampleRate: 0.2,
    // Replays: 5% des sessions normales, 100% des sessions avec erreur
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    // Ne pas capturer les erreurs Firebase de connectivité réseau
    ignoreErrors: [
      "Target ID already exists",
      "client has already been terminated",
      "Failed to fetch",
      "NetworkError",
      "ChunkLoadError",
    ],
    beforeSend(event) {
      // Supprimer les données personnelles des événements
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export { Sentry };
