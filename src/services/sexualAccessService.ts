import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const LOCAL_KEY = 'he_sexual_access';

export type AccessStatus =
  | 'autorise'
  | 'acces_limite'
  | 'pas_assez_experience'
  | 'non_disponible'
  | 'mineur'
  // legacy (kept for backward compat with existing Firestore data)
  | 'acces_accompagne'
  | 'bloque_temp'
  | null;

export interface SexualAccessData {
  age_verifie: boolean;
  date_naissance?: string;
  age?: number;
  statut: AccessStatus;
  date_evaluation?: string;
  date_prochaine_reevaluation?: string | null;
}

export async function checkSexualAccess(userId: string | null): Promise<SexualAccessData | null> {
  if (!userId) {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as SexualAccessData) : null;
    } catch {
      return null;
    }
  }
  const snap = await getDoc(doc(db, 'users', userId, 'acces', 'vie_intime'));
  return snap.exists() ? (snap.data() as SexualAccessData) : null;
}

export async function saveSexualAccess(userId: string | null, data: SexualAccessData): Promise<void> {
  if (!userId) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'acces', 'vie_intime'), data, { merge: true });
}

export async function resetSexualAccess(userId: string | null): Promise<void> {
  if (!userId) {
    localStorage.removeItem(LOCAL_KEY);
    return;
  }
  await setDoc(
    doc(db, 'users', userId, 'acces', 'vie_intime'),
    { statut: null, date_evaluation: null },
    { merge: true }
  );
}
