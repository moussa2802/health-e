/**
 * confierService.ts — Où vont les confidences.
 *  - Compte : le journal existant users/{uid}/journal (même format que « Nouvelle entrée »,
 *    avec source: 'confier'), donc visible dans /journal. L'avis de Dr Lô passe par la même
 *    fonction dr-lo-journal (même tarif : 1 Kori).
 *  - Invité : dans le navigateur uniquement (aucun envoi au serveur).
 */
import { collection, addDoc, deleteDoc, doc, updateDoc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { authedFetch } from '../utils/authedFetch';
import { getOnboardingProfile } from '../utils/onboardingProfile';

const GUEST_KEY = 'he_confier_guest_journal';

interface GuestEntry { id: string; contenu: string; date: string; carnet?: string; humeur?: string }

// ── Carnets : séparer ses confidences (famille, amis, couple…) ──────────────

export const DEFAULT_CARNET = 'Général';
export const SUGGESTED_CARNETS = ['Général', 'Famille', 'Amis', 'Couple', 'Travail'];
const CARNETS_KEY = 'he_carnets_v1:';
const CURRENT_KEY = 'he_carnet_current:';

export function cleanCarnet(t: string): string | null {
  const n = t.trim().replace(/\s+/g, ' ');
  if (n.length < 1 || n.length > 24 || /[<>]/.test(n)) return null;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/** Carnets proposés : suggestions + ceux créés par la personne + ceux déjà présents dans le journal. */
export function loadCarnets(owner: string, fromEntries: string[] = []): string[] {
  let custom: string[] = [];
  try { custom = JSON.parse(localStorage.getItem(`${CARNETS_KEY}${owner}`) ?? '[]') as string[]; } catch { /* ignore */ }
  return Array.from(new Set([...SUGGESTED_CARNETS, ...custom, ...fromEntries.filter(Boolean)]));
}

export function addCarnet(owner: string, name: string): string[] {
  const n = cleanCarnet(name);
  let custom: string[] = [];
  try { custom = JSON.parse(localStorage.getItem(`${CARNETS_KEY}${owner}`) ?? '[]') as string[]; } catch { /* ignore */ }
  if (n && !custom.includes(n) && !SUGGESTED_CARNETS.includes(n)) {
    custom = [...custom, n];
    try { localStorage.setItem(`${CARNETS_KEY}${owner}`, JSON.stringify(custom)); } catch { /* ignore */ }
  }
  return loadCarnets(owner);
}

export function currentCarnet(owner: string): string {
  try { return localStorage.getItem(`${CURRENT_KEY}${owner}`) || DEFAULT_CARNET; } catch { return DEFAULT_CARNET; }
}
export function setCurrentCarnet(owner: string, name: string): void {
  try { localStorage.setItem(`${CURRENT_KEY}${owner}`, name); } catch { /* ignore */ }
}

function readGuest(): GuestEntry[] {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]') as GuestEntry[]; } catch { return []; }
}
function writeGuest(list: GuestEntry[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(list)); } catch { /* stockage indisponible */ }
}

export async function saveConfidence(userId: string | null, text: string, carnet: string = DEFAULT_CARNET, humeur = ''): Promise<string> {
  const now = new Date().toISOString();
  if (!userId) {
    const id = `g${Date.now()}`;
    writeGuest([...readGuest(), { id, contenu: text, date: now, carnet, humeur }]);
    return id;
  }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  const ref = await addDoc(collection(fs, 'users', userId, 'journal'), {
    date: now,
    humeur,
    contenu: text,
    themes: [],
    dr_lo_response: null,
    dr_lo_requested_at: null,
    koris_consumed: 0,
    created_at: now,
    updated_at: now,
    is_private: true,
    source: 'confier',
    carnet,
  });
  return ref.id;
}

export async function removeConfidence(userId: string | null, journalId: string): Promise<void> {
  if (!userId) { writeGuest(readGuest().filter(e => e.id !== journalId)); return; }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  await deleteDoc(doc(fs, 'users', userId, 'journal', journalId));
}

/** Modifier une page déjà écrite (texte, carnet, humeur). La date d'origine est gardée. */
export async function updateConfidence(userId: string | null, journalId: string, patch: { contenu?: string; carnet?: string; humeur?: string }): Promise<void> {
  if (!userId) { writeGuest(readGuest().map(e => (e.id === journalId ? { ...e, ...patch } : e))); return; }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  await updateDoc(doc(fs, 'users', userId, 'journal', journalId), { ...patch, updated_at: new Date().toISOString() });
}

/** Relire une page (pour y ajouter un passage sans écraser ce qui a été modifié ailleurs). null = elle n'existe plus. */
export async function getConfidence(userId: string | null, journalId: string): Promise<{ contenu: string; carnet: string } | null> {
  if (!userId) { const e = readGuest().find(x => x.id === journalId); return e ? { contenu: e.contenu, carnet: e.carnet || DEFAULT_CARNET } : null; }
  const fs = db;
  if (!fs) throw new Error('Firestore indisponible');
  const snap = await getDoc(doc(fs, 'users', userId, 'journal', journalId));
  if (!snap.exists()) return null;
  const x = snap.data();
  return { contenu: (x.contenu as string) ?? '', carnet: (x.carnet as string) || DEFAULT_CARNET };
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

// ── Le journal, lu depuis « Me confier » (même source que l'ancienne page /journal) ──

export interface JournalItem {
  id: string;
  /** ISO */
  date: string;
  contenu: string;
  humeur: string;
  drLo: string | null;
  carnet: string;
  /** 'confier' = écrit en se confiant à Dr Lô (page du jour) */
  source?: string;
}

/** Les entrées les plus récentes d'abord (compte : Firestore ; invité : ce téléphone). */
export async function listJournal(userId: string | null, max = 120): Promise<JournalItem[]> {
  if (!userId) {
    return readGuest()
      .map(e => ({ id: e.id, date: e.date, contenu: e.contenu, humeur: e.humeur || '', drLo: null, carnet: e.carnet || DEFAULT_CARNET, source: 'confier' }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const fs = db;
  if (!fs) return [];
  const snap = await getDocs(query(collection(fs, 'users', userId, 'journal'), orderBy('created_at', 'desc'), limit(max)));
  return snap.docs.map(d => {
    const x = d.data();
    return {
      id: d.id,
      date: (x.created_at as string) || (x.date as string) || '',
      contenu: (x.contenu as string) ?? '',
      humeur: (x.humeur as string) ?? '',
      drLo: (x.dr_lo_response as string | null) ?? null,
      carnet: (x.carnet as string) || DEFAULT_CARNET,
      source: (x.source as string) || undefined,
    };
  });
}
