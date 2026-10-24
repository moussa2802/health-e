/**
 * pushService — les rappels de Dr Lô sur le téléphone (Firebase Cloud Messaging) et les réglages.
 *  - Réglages et jetons dans patients/{uid} : notifPrefs, pushTokens (la personne seule y a accès).
 *  - Android (Chrome, site installé ou non) : fonctionne. iPhone : seulement si Health-e est
 *    ajouté à l'écran d'accueil (iOS 16.4+).
 *  - Clé publique Web Push (VAPID) générée dans la console Firebase le 24 oct. 2026.
 */
import { arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { app, db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';
import { detectDevice, guideFor, mayPropose, type AskLog, type Device, type Guide } from '../utils/pushGuide';

export const VAPID_KEY = 'BJv78nCHrOMw2A-bu06NUwOA3B9SW-a52LqRkJ56agLGfO-ZsKAH7Td2sapaeBbkbvMuRPI8BPyQcVTMnO_VxaQ';

export interface NotifPrefs {
  on: boolean;
  hour: number;
  tz: string;
  programme: boolean;
  drlo: boolean;
  social: boolean;
  totem: boolean;
  nudge: boolean;
  quiet: boolean;
  /** Guide d'activation affiché (date) et la situation du téléphone à ce moment-là : pour reprendre ailleurs. */
  setupPending?: string | null;
  setupFrom?: string | null;
}

export const REMINDER_HOURS = [8, 13, 19, 21];

export const defaultPrefs = (): NotifPrefs => ({
  on: false,
  hour: 19,
  tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Dakar'; } catch { return 'Africa/Dakar'; } })(),
  programme: true, drlo: true, social: true, totem: true, nudge: false, quiet: true,
});

export type PushSupport = 'ok' | 'ios_install' | 'denied' | 'unsupported' | 'in_app';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Le téléphone et le navigateur de la personne (pour le guide pas à pas). */
export function currentDevice(): Device {
  return detectDevice(navigator.userAgent, isStandalone(), navigator.maxTouchPoints ?? 0);
}

export function permissionState(): 'default' | 'granted' | 'denied' | 'none' {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'none';
  return Notification.permission;
}

/** Le guide adapté à ce téléphone (cf. utils/pushGuide.ts). */
export function currentGuide(): Guide {
  return guideFor(currentDevice(), permissionState(), !!installEvent);
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const g = currentGuide();
  return g.state === 'ready' ? 'ok'
    : g.state === 'in_app' ? 'in_app'
    : g.state === 'denied' ? 'denied'
    : g.state === 'ios_install' || g.state === 'ios_open_safari' ? 'ios_install'
    : 'unsupported';
}

// ── Installer Health-e sur l'écran d'accueil (Android / Chrome) ──
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installEvent: InstallEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e as InstallEvent; });
  window.addEventListener('appinstalled', () => { installEvent = null; });
}
export const canInstall = () => !!installEvent;
export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false;
  await installEvent.prompt();
  const choice = await installEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
  installEvent = null;
  return choice.outcome === 'accepted';
}

/** Une notification d'essai, envoyée par le serveur (vérifie toute la chaîne). */
export async function sendTest(): Promise<'ok' | 'no_device' | 'error'> {
  try {
    const res = await authedFetch('/.netlify/functions/push-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.sent > 0) return 'ok';
    return res.ok ? 'no_device' : 'error';
  } catch {
    return 'error';
  }
}

export async function loadPrefs(uid: string): Promise<NotifPrefs> {
  const base = defaultPrefs();
  try {
    const snap = await getDoc(doc(db!, 'patients', uid));
    const p = snap.exists() ? (snap.data().notifPrefs as Partial<NotifPrefs> | undefined) : undefined;
    return { ...base, ...(p ?? {}) };
  } catch {
    return base;
  }
}

export async function savePrefs(uid: string, prefs: NotifPrefs): Promise<void> {
  await setDoc(doc(db!, 'patients', uid), { notifPrefs: prefs }, { merge: true });
}

/** Demande l'autorisation, enregistre l'appareil, active les rappels. */
export async function enablePush(uid: string, prefs: NotifPrefs): Promise<{ ok: true } | { ok: false; reason: PushSupport | 'refused' | 'error' }> {
  const sup = pushSupport();
  if (sup !== 'ok') return { ok: false, reason: sup };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'refused' };
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return { ok: false, reason: 'unsupported' };
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: 'error' };
    await setDoc(doc(db!, 'patients', uid), { pushTokens: arrayUnion(token), notifPrefs: { ...prefs, on: true, tz: defaultPrefs().tz, setupPending: null, setupFrom: null } }, { merge: true });
    try { localStorage.setItem(`he_push_on:${uid}`, '1'); } catch { /* ignore */ }
    return { ok: true };
  } catch (e) {
    console.warn('enablePush', e);
    return { ok: false, reason: 'error' };
  }
}

/** Dernière visite (pour « prendre de tes nouvelles »), une fois par jour au plus. */
export function markSeen(uid: string): void {
  const k = `he_seen:${uid}:${new Date().toISOString().slice(0, 10)}`;
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { /* ignore */ }
  setDoc(doc(db!, 'patients', uid), { lastSeenAt: new Date().toISOString() }, { merge: true }).catch(() => {});
}

// ── Quand Dr Lô propose les rappels de lui-même (1 fois par semaine au plus, jamais après 2 refus) ──
const askKey = (uid: string) => `he_push_ask:${uid}`;
function askLog(uid: string): AskLog {
  try {
    const raw = localStorage.getItem(askKey(uid));
    if (raw) return { refused: 0, last: 0, ...JSON.parse(raw) };
    if (localStorage.getItem(`he_push_asked:${uid}`)) return { refused: 1, last: Date.now() }; // ancienne version
  } catch { /* ignore */ }
  return { refused: 0, last: 0 };
}
const saveAskLog = (uid: string, l: AskLog) => { try { localStorage.setItem(askKey(uid), JSON.stringify(l)); } catch { /* ignore */ } };
export const canProposeReminders = (uid: string) => mayPropose(askLog(uid), Date.now());
export const noteProposed = (uid: string) => saveAskLog(uid, { ...askLog(uid), last: Date.now() });
export const noteRefused = (uid: string) => { const l = askLog(uid); saveAskLog(uid, { refused: l.refused + 1, last: Date.now() }); };

/** Le guide a été montré : on s'en souvient sur le compte, pour reprendre dans un autre navigateur. */
export function markSetupPending(uid: string, from: PushSupport): void {
  setDoc(doc(db!, 'patients', uid), { notifPrefs: { setupPending: new Date().toISOString(), setupFrom: from } }, { merge: true }).catch(() => {});
}
export function clearSetupPending(uid: string): void {
  setDoc(doc(db!, 'patients', uid), { notifPrefs: { setupPending: null, setupFrom: null } }, { merge: true }).catch(() => {});
}
