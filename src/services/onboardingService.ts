import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OnboardingState {
  welcome_completed: boolean;
  welcome_completed_at: string | null;
  pages_visited: Record<string, boolean>;
  tooltips_seen: string[];
}

// ── Firebase helpers ──────────────────────────────────────────────────────────

const stateRef = (userId: string) =>
  doc(db, 'users', userId, 'onboarding', 'state');

export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  try {
    const snap = await getDoc(stateRef(userId));
    return snap.exists() ? (snap.data() as OnboardingState) : null;
  } catch {
    return null;
  }
}

export async function markWelcomeCompleted(userId: string): Promise<void> {
  try {
    await setDoc(stateRef(userId), {
      welcome_completed: true,
      welcome_completed_at: new Date().toISOString(),
    }, { merge: true });
  } catch { /* non-bloquant */ }
}

export async function markPageVisited(userId: string, pageKey: string): Promise<void> {
  try {
    const ref = stateRef(userId);
    // updateDoc avec dot notation = mise à jour chirurgicale du champ imbriqué
    // sans écraser les autres clés de pages_visited
    try {
      await updateDoc(ref, { [`pages_visited.${pageKey}`]: true });
    } catch {
      // Document inexistant → création avec setDoc
      await setDoc(ref, {
        welcome_completed: false,
        welcome_completed_at: null,
        pages_visited: { [pageKey]: true },
        tooltips_seen: [],
      });
    }
  } catch { /* non-bloquant */ }
}

export async function resetPageVisited(userId: string, pageKey: string): Promise<void> {
  try {
    const ref = stateRef(userId);
    try {
      await updateDoc(ref, { [`pages_visited.${pageKey}`]: false });
    } catch {
      await setDoc(ref, {
        welcome_completed: false,
        welcome_completed_at: null,
        pages_visited: { [pageKey]: false },
        tooltips_seen: [],
      });
    }
  } catch { /* non-bloquant */ }
}

export async function resetWelcome(userId: string): Promise<void> {
  try {
    await setDoc(stateRef(userId), {
      welcome_completed: false,
      welcome_completed_at: null,
    }, { merge: true });
  } catch { /* non-bloquant */ }
}
