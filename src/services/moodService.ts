/**
 * moodService.ts — L'humeur notée (« Noter mon humeur · 30 s »).
 *  - Compte : patients/{uid}/moods/{AAAA-MM-JJ} (règle Firestore : propriétaire uniquement),
 *    plus une copie locale pour l'affichage immédiat et le hors-ligne.
 *  - Invité : navigateur uniquement (transféré dans le compte à l'inscription).
 * Le cycle réutilise le profil companion existant (patients/{uid}.companion), partagé avec /app.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { loadMoods, saveMoods, setMood, removeMood, MOOD_STORAGE_PREFIX, type MoodId, type MoodMap } from '../utils/moodLog';
import type { CycleInfo } from '../utils/cycleCalc';

const localKey = (uid: string | null) => `${MOOD_STORAGE_PREFIX}${uid ?? 'guest'}`;

export async function recordMood(uid: string | null, day: string, mood: MoodId): Promise<void> {
  saveMoods(localKey(uid), setMood(loadMoods(localKey(uid)), day, mood));
  const fs = db;
  if (!uid || !fs) return;
  await setDoc(doc(fs, 'patients', uid, 'moods', day), { date: day, mood, at: new Date().toISOString(), source: 'drlo' });
}

export async function deleteMood(uid: string | null, day: string): Promise<void> {
  saveMoods(localKey(uid), removeMood(loadMoods(localKey(uid)), day));
  const fs = db;
  if (!uid || !fs) return;
  await deleteDoc(doc(fs, 'patients', uid, 'moods', day));
}

/** Humeurs depuis `fromDay` : serveur (compte) fusionné avec le local, le serveur fait foi. */
export async function fetchMoods(uid: string | null, fromDay: string): Promise<MoodMap> {
  const local = loadMoods(localKey(uid));
  const fs = db;
  if (!uid || !fs) return local;
  try {
    const snap = await getDocs(query(collection(fs, 'patients', uid, 'moods'), where('date', '>=', fromDay)));
    const remote: MoodMap = {};
    snap.docs.forEach(d => {
      const v = d.data() as { date: string; mood: MoodId; at?: string };
      remote[v.date] = { mood: v.mood, at: v.at ? Date.parse(v.at) : 0 };
    });
    // Jours notés hors ligne (ou avant la synchro) : on les envoie
    for (const [day, e] of Object.entries(local)) {
      if (day >= fromDay && !remote[day]) {
        remote[day] = e;
        setDoc(doc(fs, 'patients', uid, 'moods', day), { date: day, mood: e.mood, at: new Date(e.at || Date.now()).toISOString(), source: 'drlo' }).catch(() => {});
      }
    }
    const merged = { ...local, ...remote };
    saveMoods(localKey(uid), merged);
    return merged;
  } catch {
    return local;
  }
}

/** Efface toutes les humeurs (droit de la personne sur ses données). */
export async function deleteAllMoods(uid: string | null): Promise<void> {
  try { localStorage.removeItem(localKey(uid)); } catch { /* ignore */ }
  const fs = db;
  if (!uid || !fs) return;
  const snap = await getDocs(collection(fs, 'patients', uid, 'moods'));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

// ── Cycle (profil companion partagé avec /app) ───────────────────────────────

export type CycleSituation = 'cycling' | 'menopause' | 'contraception' | 'no_tracking';
export interface CycleState { situation: CycleSituation | null; cycle: CycleInfo | null }

export async function getCycle(uid: string): Promise<CycleState> {
  const fs = db;
  if (!fs) return { situation: null, cycle: null };
  const snap = await getDoc(doc(fs, 'patients', uid));
  const c = (snap.exists() ? snap.data().companion : null) as
    { situation?: CycleSituation | null; cycleStartDate?: string | null; cycleLength?: number; cycleKnown?: boolean } | null;
  if (!c) return { situation: null, cycle: null };
  const cycle = c.situation === 'cycling' && c.cycleKnown && c.cycleStartDate
    ? { startDate: c.cycleStartDate.slice(0, 10), length: c.cycleLength ?? 28 } : null;
  return { situation: c.situation ?? null, cycle };
}

export async function saveCycle(uid: string, situation: CycleSituation, cycle: CycleInfo | null): Promise<void> {
  const fs = db;
  if (!fs) return;
  await setDoc(doc(fs, 'patients', uid), {
    companion: {
      situation,
      cycleStartDate: cycle?.startDate ?? null,
      cycleLength: cycle?.length ?? 28,
      cycleKnown: !!cycle,
      onboardingDone: true,
    },
  }, { merge: true });
}
