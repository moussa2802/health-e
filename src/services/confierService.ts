/**
 * confierService.ts — Où vont les confidences.
 *  - Compte : le journal existant users/{uid}/journal (même format que « Nouvelle entrée »,
 *    avec source: 'confier'), donc visible dans /journal. L'avis de Dr Lô passe par la même
 *    fonction dr-lo-journal (même tarif : 1 Kori).
 *  - Invité : dans le navigateur uniquement (aucun envoi au serveur).
 */
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';
import { getOnboardingProfile } from '../utils/onboardingProfile';

const GUEST_KEY = 'he_confier_guest_journal';

interface GuestEntry { id: string; contenu: string; date: string }

function readGuest(): GuestEntry[] {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]') as GuestEntry[]; } catch { return []; }
}
function writeGuest(list: GuestEntry[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(list)); } catch { /* stockage indisponible */ }
}

export async function saveConfidence(userId: string | null, text: string): Promise<string> {
  const now = new Date().toISOString();
  if (!userId) {
    const id = `g${Date.now()}`;
    writeGuest([...readGuest(), { id, contenu: text, date: now }]);
    return id;
  }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  const ref = await addDoc(collection(fs, 'users', userId, 'journal'), {
    date: now,
    humeur: '',
    contenu: text,
    themes: [],
    dr_lo_response: null,
    dr_lo_requested_at: null,
    koris_consumed: 0,
    created_at: now,
    updated_at: now,
    is_private: true,
    source: 'confier',
  });
  return ref.id;
}

export async function removeConfidence(userId: string | null, journalId: string): Promise<void> {
  if (!userId) { writeGuest(readGuest().filter(e => e.id !== journalId)); return; }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  await deleteDoc(doc(fs, 'users', userId, 'journal', journalId));
}

export type AdviceOutcome = { ok: true; text: string } | { ok: false; reason: 'no_koris' | 'unavailable' };

export async function askAdvice(userId: string, text: string, lastJournalId: string | null): Promise<AdviceOutcome> {
  const ob = getOnboardingProfile();
  try {
    const res = await authedFetch('/.netlify/functions/dr-lo-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: {
          date: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
          humeur: '',
          themes: [],
          contenu: text,
        },
        context: {
          prenom: ob?.prenom ?? '',
          age: ob?.age ?? '',
          genre: ob?.genre ?? '',
          situation: (ob as { situation_relationnelle?: string } | null)?.situation_relationnelle ?? '',
          resume_profil: '',
        },
      }),
    });
    if (res.status === 402) return { ok: false, reason: 'no_koris' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json() as { response?: string };
    const answer = (data.response ?? '').trim();
    if (!answer) return { ok: false, reason: 'unavailable' };
    const fs = db;
    if (lastJournalId && fs) {
      const now = new Date().toISOString();
      updateDoc(doc(fs, 'users', userId, 'journal', lastJournalId), {
        dr_lo_response: answer, dr_lo_requested_at: now, updated_at: now,
      }).catch(() => { /* l'avis reste affiché même si la copie échoue */ });
    }
    return { ok: true, text: answer };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
