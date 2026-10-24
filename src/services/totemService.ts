/**
 * totemService — le défi du totem de la semaine, gardé dans le compte (patients/{uid}.totemDefi,
 * même règle Firestore que le reste du document : la personne seule), avec une copie locale.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface TotemDefi { since: string; animal: string }

const key = (uid: string) => `he_totem_defi:${uid}`;
export const DEFI_DAYS = 7;

export function defiActive(d: TotemDefi | null, animal?: string | null): boolean {
  if (!d) return false;
  if (animal && d.animal && d.animal !== animal) return false;
  return Date.now() - Date.parse(d.since) < DEFI_DAYS * 864e5;
}

function readLocal(uid: string): TotemDefi | null {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    // ancien format : juste la date
    return raw.startsWith('{') ? (JSON.parse(raw) as TotemDefi) : { since: raw, animal: '' };
  } catch {
    return null;
  }
}

export async function loadTotemDefi(uid: string): Promise<TotemDefi | null> {
  const local = readLocal(uid);
  const fs = db;
  if (!fs) return local;
  try {
    const snap = await getDoc(doc(fs, 'patients', uid));
    const remote = (snap.exists() ? snap.data().totemDefi : null) as TotemDefi | null;
    const best = remote && (!local || remote.since >= local.since) ? remote : local;
    if (best) try { localStorage.setItem(key(uid), JSON.stringify(best)); } catch { /* ignore */ }
    return best;
  } catch {
    return local;
  }
}

export async function acceptTotemDefi(uid: string, animal: string): Promise<TotemDefi> {
  const d = { since: new Date().toISOString(), animal };
  try { localStorage.setItem(key(uid), JSON.stringify(d)); } catch { /* ignore */ }
  const fs = db;
  if (fs) await setDoc(doc(fs, 'patients', uid), { totemDefi: d }, { merge: true }).catch(() => {});
  return d;
}
