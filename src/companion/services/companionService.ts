import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  getFirestoreInstance,
  ensureFirestoreReady,
  retryFirestoreOperation,
} from "../../utils/firebase";
import {
  DEFAULT_COMPANION_DATA,
  type CompanionData,
  type Checkin,
} from "../types";
import { toDateString, todayDateString } from "../utils";

function getDb() {
  const db = getFirestoreInstance();
  if (!db) throw new Error("Firestore not available");
  return db;
}

/** Lit le profil companion (patients/{uid}.companion), avec valeurs par défaut si absent. */
export async function getCompanionData(
  patientId: string
): Promise<CompanionData> {
  await ensureFirestoreReady();
  const db = getDb();
  const ref = doc(db, "patients", patientId);
  const snap = await retryFirestoreOperation(() => getDoc(ref));
  const companion = snap.exists()
    ? (snap.data().companion as Partial<CompanionData> | undefined)
    : undefined;
  return { ...DEFAULT_COMPANION_DATA, ...companion };
}

/** Enregistre le résultat de l'onboarding (situation choisie + estimation cycle). */
export async function saveOnboarding(
  patientId: string,
  data: Pick<
    CompanionData,
    "situation" | "cycleStartDate" | "cycleLength" | "cycleKnown"
  >
): Promise<void> {
  await ensureFirestoreReady();
  const db = getDb();
  const ref = doc(db, "patients", patientId);
  await setDoc(
    ref,
    { companion: { ...data, onboardingDone: true } },
    { merge: true }
  );
}

/** Retourne le check-in du jour s'il existe déjà, sinon null. */
export async function getTodayCheckin(
  patientId: string
): Promise<Checkin | null> {
  await ensureFirestoreReady();
  const db = getDb();
  const ref = doc(db, "patients", patientId, "checkins", todayDateString());
  const snap = await retryFirestoreOperation(() => getDoc(ref));
  return snap.exists() ? ({ ...(snap.data() as Checkin), id: snap.id }) : null;
}

/** Derniers check-ins (les plus récents en dernier), pour le dispositif de vigilance. */
export async function getRecentCheckins(
  patientId: string,
  count = 4
): Promise<Checkin[]> {
  await ensureFirestoreReady();
  const db = getDb();
  const checkinsRef = collection(db, "patients", patientId, "checkins");
  const q = query(checkinsRef, orderBy("date", "desc"), limit(count));
  const snap = await retryFirestoreOperation(() => getDocs(q));
  return snap.docs
    .map((d) => ({ ...(d.data() as Checkin), id: d.id }))
    .reverse();
}

function computeStreak(
  lastCheckinDate: string | null,
  today: string,
  currentStreak: number
): number {
  if (lastCheckinDate === today) return currentStreak; // déjà fait aujourd'hui
  if (!lastCheckinDate) return 1;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return lastCheckinDate === toDateString(yesterday) ? currentStreak + 1 : 1;
}

/** Crée le check-in du jour et met à jour lastCheckinDate/checkinStreak. */
export async function saveCheckin(
  patientId: string,
  checkin: Omit<Checkin, "id" | "date" | "createdAt">
): Promise<Checkin> {
  await ensureFirestoreReady();
  const db = getDb();
  const date = todayDateString();

  const fullCheckin: Checkin = {
    ...checkin,
    id: date,
    date,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "patients", patientId, "checkins", date), fullCheckin);

  const companion = await getCompanionData(patientId);
  const checkinStreak = computeStreak(
    companion.lastCheckinDate,
    date,
    companion.checkinStreak
  );
  await setDoc(
    doc(db, "patients", patientId),
    { companion: { lastCheckinDate: date, checkinStreak } },
    { merge: true }
  );

  return fullCheckin;
}
