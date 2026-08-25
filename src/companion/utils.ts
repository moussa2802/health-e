export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

/**
 * Migration : désinscrit l'ancien SW scopé "/app" et purge ses caches.
 * Le nouveau SW racine est géré par vite-plugin-pwa.
 */
export async function migrateOldCompanionServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      if (reg.scope.endsWith("/app") || reg.scope.endsWith("/app/")) {
        await reg.unregister();
      }
    }
    const oldCaches = ["healthe-companion-v1", "healthe-companion-state"];
    for (const name of oldCaches) {
      await caches.delete(name);
    }
  } catch {
    // Best effort — pas bloquant.
  }
}

const REMINDER_CACHE = "healthe-companion-state";
const LAST_CHECKIN_KEY = "/state/last-checkin-date";

/** Marqueur lu par sw.js (periodicsync) pour savoir si le check-in du jour est déjà fait. */
export async function markCheckinDoneForReminder(date: string): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(REMINDER_CACHE);
    await cache.put(LAST_CHECKIN_KEY, new Response(date));
  } catch {
    // Best effort seulement — n'affecte pas l'enregistrement du check-in.
  }
}
