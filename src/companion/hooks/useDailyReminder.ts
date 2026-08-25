import { useState } from "react";

const DISMISS_KEY = "he-companion-reminder-dismissed";

/**
 * Rappel quotidien (Phase 9) — best effort uniquement.
 * ⚠️ Sans backend de push (hors scope "zéro coût API" de ce MVP), il n'existe
 * pas de moyen fiable de réveiller une PWA fermée à heure fixe. On utilise la
 * Periodic Background Sync API là où elle existe (Chrome/Android, PWA
 * installée, usage régulier) — silencieusement absente partout ailleurs, en
 * particulier sur iOS/Safari où aucune notification web n'est possible pour
 * une PWA non installée (et très limitée même installée).
 */
export function useDailyReminder() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const supported = "Notification" in window && "serviceWorker" in navigator;
  const [permission, setPermission] = useState<NotificationPermission | null>(
    supported ? Notification.permission : null
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  let platform: "android" | "ios" | null = null;
  if (!dismissed) {
    if (isIOS) platform = "ios";
    else if (supported && permission === "default") platform = "android";
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const enable = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        // Confirmation immédiate : preuve tangible que ça marche, plutôt que
        // de promettre un rappel invisible et incertain.
        await reg.showNotification("Health-e", {
          body: "Rappels activés — à demain 👋",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "reminder-confirmation",
        });

        // Best effort : Periodic Background Sync (support très restreint).
        if ("periodicSync" in reg) {
          const permissions = navigator.permissions as unknown as {
            query: (opts: { name: string }) => Promise<{ state: string }>;
          };
          const status = await permissions.query({
            name: "periodic-background-sync",
          });
          if (status.state === "granted") {
            const regWithSync = reg as unknown as {
              periodicSync: {
                register: (
                  tag: string,
                  opts: { minInterval: number }
                ) => Promise<void>;
              };
            };
            await regWithSync.periodicSync.register("daily-checkin-reminder", {
              minInterval: 20 * 60 * 60 * 1000,
            });
          }
        }
      } catch {
        // Périphérique/navigateur non supporté — pas grave, best effort.
      }
    }

    dismiss();
  };

  return { platform, enable, dismiss };
}
