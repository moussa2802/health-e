/**
 * programmeService — « Mon programme » : enregistrement et appels à l'IA.
 *  - Le programme en cours vit dans le champ `programme` de patients/{uid} (règle Firestore
 *    existante : la personne seule lit et écrit son document, hors portefeuille d'étincelles),
 *    avec une copie locale pour l'affichage immédiat.
 *  - Les programmes terminés sont résumés dans `programmeHistory` (sans le détail des jours).
 *  - Proposition et bilan passent par la fonction drlo-programme (étincelles débitées au serveur).
 */
import { arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';
import type { Programme } from '../utils/programme';
import type { ProgAxis } from '../data/programmeLibrary';

const localKey = (uid: string) => `he_prog_v1:${uid}`;

/** Firestore refuse les champs `undefined`. */
const plain = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function loadLocalProgramme(uid: string): Programme | null {
  try {
    const p = JSON.parse(localStorage.getItem(localKey(uid)) ?? 'null') as Programme | null;
    return p && p.v === 1 ? p : null;
  } catch {
    return null;
  }
}

function saveLocal(uid: string, p: Programme | null) {
  try {
    if (p) localStorage.setItem(localKey(uid), JSON.stringify(p));
    else localStorage.removeItem(localKey(uid));
  } catch { /* ignore */ }
}

/** Le programme en cours (le serveur fait foi ; le local sert hors ligne). */
export async function loadProgramme(uid: string): Promise<Programme | null> {
  const local = loadLocalProgramme(uid);
  const fs = db;
  if (!fs) return local;
  try {
    const snap = await getDoc(doc(fs, 'patients', uid));
    const remote = (snap.exists() ? snap.data().programme : null) as Programme | null;
    if (!remote || remote.v !== 1) {
      // Programme créé hors ligne : on le renvoie au serveur
      if (local) setDoc(doc(fs, 'patients', uid), { programme: plain(local) }, { merge: true }).catch(() => {});
      return local;
    }
    saveLocal(uid, remote);
    return remote;
  } catch {
    return local;
  }
}

export async function saveProgramme(uid: string, p: Programme): Promise<void> {
  saveLocal(uid, p);
  const fs = db;
  if (!fs) return;
  await setDoc(doc(fs, 'patients', uid), { programme: plain(p) }, { merge: true });
}

/** Fin du programme (terminé ou arrêté) : un résumé reste dans l'historique, le détail est effacé. */
export async function closeProgramme(uid: string, p: Programme): Promise<void> {
  saveLocal(uid, null);
  const fs = db;
  if (!fs) return;
  const summary = plain({
    id: p.id, axis: p.axis, startDay: p.startDay, status: p.status === 'done' ? 'done' : 'stopped',
    endedAt: p.endedAt ?? new Date().toISOString(), result: p.result ?? null,
    activeDays: Object.keys(p.checks).length,
  });
  await setDoc(doc(fs, 'patients', uid), { programme: null, programmeHistory: arrayUnion(summary) }, { merge: true });
}

export type AiOut<T> = ({ ok: true } & T) | { ok: false; reason: 'no_koris' | 'error'; required?: number };

async function call<T>(body: Record<string, unknown>): Promise<AiOut<T>> {
  try {
    const res = await authedFetch('/.netlify/functions/drlo-programme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 402) return { ok: false, reason: 'no_koris', required: data.required };
    if (!res.ok) return { ok: false, reason: 'error' };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export interface ProposeInput {
  axis: ProgAxis;
  prenom?: string;
  genre?: 'homme' | 'femme';
  light: boolean;
  fragile: boolean;
  signals: { test: string; result: string }[];
  moodLowDays: number;
  moodDays: number;
}
export const proposeProgramme = (i: ProposeInput) => call<{ intro: string; order: string[] }>({ action: 'propose', ...i });

export type BilanInput = Record<string, unknown> & { axis: ProgAxis };
export const bilanProgramme = (i: BilanInput) => call<{ text: string; advice: 'garder' | 'alleger' | 'changer' }>({ action: 'bilan', ...i });
