/**
 * Admin Users Service — Données utilisateurs pour le dashboard admin.
 * Fournit la liste des top users, détails utilisateur, et métriques.
 */

import {
  collection, doc, getDoc, getDocs, query, orderBy,
  limit as firestoreLimit, Timestamp, startAfter,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { SCALE_META } from '../utils/scaleMeta';
import { MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../data/scales';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TopUser {
  id: string;
  name: string;
  registeredAt: string;
  completedTests: number;
  korisSpent: number;
  lastActivity: string;
  lastActivityRaw: Date | null;
  authProvider: string;
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
  authProvider: string;
  googleLinked: boolean;
  // Koris
  korisBalance: number;
  korisSpent: number;
  korisEarned: number;
  // Tests
  completedTests: number;
  totalScales: number;
  tests: UserTestResult[];
  // Recent activity
  recentActivity: UserActivity[];
}

export interface UserTestResult {
  scaleId: string;
  scaleName: string;
  icon: string;
  score: number;
  maxScore: number;
  label: string;
  severity: string;
  completedAt: string;
}

export interface UserActivity {
  type: string;
  feature: string;
  amount: number;
  timestamp: string;
  details: string;
}

export interface UserMetrics {
  completeProfiles: number;
  avgTestsPerUser: number;
  inactiveUsers30d: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) return (val as Timestamp).toDate();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatRelativeDate(date: Date | null): string {
  if (!date) return '—';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatName(patient: Record<string, unknown>): string {
  const name = (patient.name as string) || '';
  if (!name) return `Utilisateur #${String(patient.id || '').substring(0, 6)}`;
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

const TOTAL_MAIN_SCALES = MENTAL_HEALTH_SCALES.length + SEXUAL_HEALTH_SCALES.length;

// ── Get all users (loaded once, sorted/filtered client-side) ─────────────

export async function getAllUsersForAdmin(): Promise<TopUser[]> {
  const patientsSnap = await getDocs(collection(db, 'patients'));
  const profilesSnap = await getDocs(collection(db, 'userProfiles'));

  // Build profile map: userId -> completed tests count
  const profileMap = new Map<string, number>();
  profilesSnap.forEach(d => {
    const results = d.data().scaleResults ?? {};
    profileMap.set(d.id, Object.keys(results).length);
  });

  const users: TopUser[] = [];

  patientsSnap.forEach(d => {
    const data = d.data();
    const createdAt = toDate(data.createdAt);
    const lastActivity = toDate(data.lastActivityAt) || toDate(data.updatedAt) || createdAt;
    const testsFromProfile = profileMap.get(d.id) ?? 0;
    const testsFromCounter = (data.completedTestsCount as number) ?? 0;

    users.push({
      id: d.id,
      name: formatName({ ...data, id: d.id }),
      registeredAt: createdAt?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) ?? '—',
      completedTests: Math.max(testsFromProfile, testsFromCounter),
      korisSpent: data.korisWallet?.totalSpent ?? 0,
      lastActivity: formatRelativeDate(lastActivity),
      lastActivityRaw: lastActivity,
      authProvider: data.googleLinked ? 'Google' : data.authProvider === 'google' ? 'Google' : 'SMS',
    });
  });

  // Sort by tests completed desc by default
  users.sort((a, b) => b.completedTests - a.completedTests);
  return users;
}

// ── User metrics ─────────────────────────────────────────────────────────

export async function getUserMetrics(users: TopUser[]): Promise<UserMetrics> {
  const totalUsers = users.length;
  const totalTests = users.reduce((sum, u) => sum + u.completedTests, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const inactiveUsers30d = users.filter(u => {
    if (!u.lastActivityRaw) return true;
    return u.lastActivityRaw < thirtyDaysAgo;
  }).length;

  const completeProfiles = users.filter(u => u.completedTests >= TOTAL_MAIN_SCALES).length;

  return {
    completeProfiles,
    avgTestsPerUser: totalUsers > 0 ? Math.round((totalTests / totalUsers) * 10) / 10 : 0,
    inactiveUsers30d,
  };
}

// ── User detail ──────────────────────────────────────────────────────────

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  try {
    // Fetch patient doc
    const patientSnap = await getDoc(doc(db, 'patients', userId));
    if (!patientSnap.exists()) return null;
    const patient = patientSnap.data();

    // Fetch userProfile for test results
    const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
    const scaleResults: Record<string, Record<string, unknown>> = profileSnap.exists()
      ? (profileSnap.data().scaleResults ?? {})
      : {};

    // Map test results
    const tests: UserTestResult[] = Object.entries(scaleResults)
      .map(([scaleId, result]) => {
        const meta = SCALE_META[scaleId];
        const completedAt = toDate(result.completedAt);
        return {
          scaleId,
          scaleName: meta?.label ?? scaleId,
          icon: meta?.icon ?? '📋',
          score: (result.totalScore as number) ?? 0,
          maxScore: (result.interpretation as Record<string, unknown>)?.max as number ?? 0,
          label: ((result.interpretation as Record<string, unknown>)?.label as string) ?? '—',
          severity: ((result.interpretation as Record<string, unknown>)?.severity as string) ?? 'unknown',
          completedAt: completedAt?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) ?? '—',
        };
      })
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    // Fetch recent Koris history (activity)
    let recentActivity: UserActivity[] = [];
    try {
      const historySnap = await getDocs(
        query(
          collection(db, 'patients', userId, 'korisHistory'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(10)
        )
      );
      recentActivity = historySnap.docs.map(d => {
        const data = d.data();
        return {
          type: data.type ?? '',
          feature: data.feature ?? '',
          amount: data.amount ?? 0,
          timestamp: data.timestamp ?? '',
          details: data.details ?? '',
        };
      });
    } catch {
      // korisHistory may not exist
    }

    const createdAt = toDate(patient.createdAt);

    return {
      id: userId,
      name: (patient.name as string) || `Utilisateur #${userId.substring(0, 6)}`,
      email: (patient.email as string) || '—',
      phone: (patient.phone as string) || '—',
      registeredAt: createdAt?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—',
      authProvider: patient.googleLinked ? 'Google + SMS' : patient.authProvider === 'google' ? 'Google' : 'SMS',
      googleLinked: !!patient.googleLinked,
      korisBalance: patient.korisWallet?.balance ?? 0,
      korisSpent: patient.korisWallet?.totalSpent ?? 0,
      korisEarned: patient.korisWallet?.totalEarned ?? 0,
      completedTests: Object.keys(scaleResults).length,
      totalScales: TOTAL_MAIN_SCALES,
      tests,
      recentActivity,
    };
  } catch (e) {
    console.error('Error loading user detail:', e);
    return null;
  }
}
