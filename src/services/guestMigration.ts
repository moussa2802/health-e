/**
 * guestMigration.ts — À l'inscription (ou connexion) depuis le chat, ce que la personne a fait
 * en invitée la suit dans son compte :
 *  - tests invités → session terminée + résultat dans le profil (mêmes fonctions que la page de test) ;
 *  - confidences du journal invité → users/{uid}/journal ;
 *  - humeur → clé du compte (stockage local, la synchro Firestore arrive en vague 2) ;
 *  - prénom / genre / âge → onboarding du profil s'il n'en a pas.
 * Rien n'est écrasé : un résultat plus récent dans le compte est gardé.
 */
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getOrCreateUserProfile, saveScaleResultToProfile, saveOnboardingToProfile } from './evaluationService';
import { listCompletedGuestSessions, markGuestSessionImported } from '../utils/guestSession';
import { planTestImport, mergeMoods } from '../utils/guestImport';
import { getScaleById } from '../data/scales';
import { signatureFrom } from '../utils/chatTest';
import { getOnboardingProfile } from '../utils/onboardingProfile';
import { MOOD_STORAGE_PREFIX } from '../utils/moodLog';
import { fetchMoods } from './moodService';
import type { ScaleResult } from '../types/assessment';

const GUEST_JOURNAL_KEY = 'he_confier_guest_journal';

export interface MigrationReport { importedScaleIds: string[]; journalCount: number; moodDays: number }

function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export async function migrateGuestData(uid: string, displayName: string): Promise<MigrationReport> {
  const report: MigrationReport = { importedScaleIds: [], journalCount: 0, moodDays: 0 };
  const fs = db;
  if (!fs) return report;

  await getOrCreateUserProfile(uid, displayName);
  const profileSnap = await getDoc(doc(fs, 'userProfiles', uid));
  const profile = profileSnap.data() ?? {};
  const accountResults = (profile.scaleResults ?? {}) as Record<string, ScaleResult>;

  // 1. Tests
  for (const g of planTestImport(listCompletedGuestSessions(), accountResults)) {
    const scale = getScaleById(g.scaleId);
    const result = g.result!;
    try {
      const ref = doc(collection(fs, 'assessmentSessions'));
      await setDoc(ref, {
        id: ref.id,
        userId: uid,
        selectedScaleIds: [g.scaleId],
        status: 'completed',
        currentScaleIndex: 0,
        answers: { [g.scaleId]: g.answers },
        scores: {
          [g.scaleId]: stripUndefined({
            scaleId: result.scaleId,
            totalScore: result.totalScore,
            subscaleScores: result.subscaleScores ?? null,
            interpretation: result.interpretation,
            completedAt: new Date(result.completedAt as unknown as string),
            alertLevel: result.alertLevel ?? null,
            alertsTriggered: result.alertsTriggered ?? null,
            scoringVersion: result.scoringVersion ?? null,
          }),
        },
        startedAt: new Date(g.startedAt),
        completedAt: new Date(result.completedAt as unknown as string),
        alertDetected: !!result.interpretation?.referralRequired || (result.alertLevel ?? 0) >= 2,
        source: 'guest_import',
        importedAt: serverTimestamp(),
      });
      await saveScaleResultToProfile(uid, g.scaleId, result, scale ? signatureFrom(scale, g.answers) : undefined);
      markGuestSessionImported(g.id, uid);
      report.importedScaleIds.push(g.scaleId);
    } catch { /* on réessaiera à la prochaine connexion depuis l'accueil */ }
  }

  // 2. Journal invité (« Me confier »)
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_JOURNAL_KEY) ?? '[]') as { id: string; contenu: string; date: string; carnet?: string }[];
    const left: typeof list = [];
    for (const e of list) {
      try {
        await addDoc(collection(fs, 'users', uid, 'journal'), {
          date: e.date, humeur: '', contenu: e.contenu, carnet: e.carnet || 'Général', themes: [], dr_lo_response: null, dr_lo_requested_at: null,
          koris_consumed: 0, created_at: e.date, updated_at: new Date().toISOString(), is_private: true, source: 'confier_invite',
        });
        report.journalCount += 1;
      } catch { left.push(e); }
    }
    if (left.length) localStorage.setItem(GUEST_JOURNAL_KEY, JSON.stringify(left));
    else localStorage.removeItem(GUEST_JOURNAL_KEY);
    // Le fil local de l'invité pointait vers des entrées locales : on repart d'un fil vierge
    localStorage.removeItem('he_confier_v1:guest');
  } catch { /* ignore */ }

  // 3. Humeur (locale pour l'instant)
  try {
    const gk = `${MOOD_STORAGE_PREFIX}guest`;
    const ak = `${MOOD_STORAGE_PREFIX}${uid}`;
    const guest = JSON.parse(localStorage.getItem(gk) ?? '{}') as Record<string, unknown>;
    const days = Object.keys(guest).length;
    if (days) {
      const account = JSON.parse(localStorage.getItem(ak) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(ak, JSON.stringify(mergeMoods(account, guest)));
      localStorage.removeItem(gk);
      report.moodDays = days;
      await fetchMoods(uid, '2000-01-01'); // envoie dans le compte les jours notés en invité
    }
  } catch { /* ignore */ }

  // 4. Prénom / genre / âge
  try {
    const ob = getOnboardingProfile();
    if (ob && !profile.onboardingProfile) {
      await saveOnboardingToProfile(uid, ob as unknown as Record<string, string>);
    }
  } catch { /* ignore */ }

  return report;
}
