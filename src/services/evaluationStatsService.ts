/**
 * Service for aggregating evaluation statistics for the admin dashboard.
 * Reads from userProfiles (scaleResults map), patients, and users collections.
 * All data is anonymized — no patient-identifying info is exposed.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, orderBy, limit as firestoreLimit,
  Timestamp, increment, collectionGroup,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { SCALE_META } from '../utils/scaleMeta';

// ── Types ──

export interface EvaluationStats {
  totalUsers: number;
  totalTests: number;
  googleUsers: number;
  phoneUsers: number;
  alertsLevel2: number;
  alertsLevel3: number;
  testCounts: Record<string, number>;
  lastUpdated: Date | null;
}

export interface WeeklySignup {
  week: string;
  label: string;
  count: number;
}

export interface DailyTests {
  date: string;
  label: string;
  count: number;
}

export interface TestPopularity {
  scaleId: string;
  name: string;
  icon: string;
  count: number;
}

export interface AverageScore {
  scaleId: string;
  name: string;
  icon: string;
  avgScore: number;
  maxScore: number;
  mostCommonSeverity: string;
  count: number;
}

export interface AnonymousAlert {
  scaleId: string;
  scaleName: string;
  icon: string;
  alertLevel: number;
  severity: string;
  date: string;
}

// ── Helpers ──

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekLabel(weekKey: string): string {
  // "2026-W14" → "Sem 14"
  const match = weekKey.match(/W(\d+)/);
  return match ? `Sem ${parseInt(match[1])}` : weekKey;
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && 'toDate' in (val as any)) return (val as any).toDate();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ── Read aggregated stats doc (fast path) ──

export async function getEvaluationStats(): Promise<EvaluationStats | null> {
  try {
    const snap = await getDoc(doc(db, 'stats', 'evaluations'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      totalUsers: data.totalUsers ?? 0,
      totalTests: data.totalTests ?? 0,
      googleUsers: data.googleUsers ?? 0,
      phoneUsers: data.phoneUsers ?? 0,
      alertsLevel2: data.alertsLevel2 ?? 0,
      alertsLevel3: data.alertsLevel3 ?? 0,
      testCounts: data.testCounts ?? {},
      lastUpdated: toDate(data.lastUpdated),
    };
  } catch {
    return null;
  }
}

// ── Compute stats from raw Firestore data (full scan) ──

export async function computeEvaluationStatsFromRaw(): Promise<EvaluationStats> {
  // 1. Count patients and auth providers
  const patientsSnap = await getDocs(collection(db, 'patients'));
  let googleUsers = 0;
  let phoneUsers = 0;

  patientsSnap.forEach(doc => {
    const data = doc.data();
    if (data.googleLinked || data.authProvider === 'google') {
      googleUsers++;
    } else {
      phoneUsers++;
    }
  });

  // 2. Scan all userProfiles for scaleResults
  const profilesSnap = await getDocs(collection(db, 'userProfiles'));
  let totalTests = 0;
  let alertsLevel2 = 0;
  let alertsLevel3 = 0;
  const testCounts: Record<string, number> = {};

  profilesSnap.forEach(doc => {
    const data = doc.data();
    const results: Record<string, any> = data.scaleResults ?? {};
    for (const [scaleId, result] of Object.entries(results)) {
      totalTests++;
      testCounts[scaleId] = (testCounts[scaleId] || 0) + 1;
      const alertLevel = result?.alertLevel ?? result?.interpretation?.alertLevel ?? 0;
      if (alertLevel >= 3) alertsLevel3++;
      else if (alertLevel >= 2) alertsLevel2++;
    }
  });

  return {
    totalUsers: patientsSnap.size,
    totalTests,
    googleUsers,
    phoneUsers,
    alertsLevel2,
    alertsLevel3,
    testCounts,
    lastUpdated: new Date(),
  };
}

// ── Save stats doc ──

export async function saveEvaluationStats(stats: EvaluationStats): Promise<void> {
  await setDoc(doc(db, 'stats', 'evaluations'), {
    ...stats,
    lastUpdated: Timestamp.now(),
  });
}

// ── Incremental update after a test is saved ──

export async function incrementTestStat(scaleId: string, alertLevel: number): Promise<void> {
  const statsRef = doc(db, 'stats', 'evaluations');
  try {
    const updates: Record<string, any> = {
      totalTests: increment(1),
      [`testCounts.${scaleId}`]: increment(1),
      lastUpdated: Timestamp.now(),
    };
    if (alertLevel >= 3) {
      updates.alertsLevel3 = increment(1);
    } else if (alertLevel >= 2) {
      updates.alertsLevel2 = increment(1);
    }
    await updateDoc(statsRef, updates);
  } catch {
    // Stats doc may not exist yet — skip, admin can init via dashboard
  }
}

// ── Signups by week (last 3 months) ──

export async function getSignupsByWeek(): Promise<WeeklySignup[]> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const patientsSnap = await getDocs(collection(db, 'patients'));
  const weeklyData: Record<string, number> = {};

  patientsSnap.forEach(doc => {
    const data = doc.data();
    const date = toDate(data.createdAt);
    if (date && date >= threeMonthsAgo) {
      const key = getWeekKey(date);
      weeklyData[key] = (weeklyData[key] || 0) + 1;
    }
  });

  return Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, label: getWeekLabel(week), count }));
}

// ── Tests completed by day (last 30 days) ──

export async function getTestsByDay(): Promise<DailyTests[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const profilesSnap = await getDocs(collection(db, 'userProfiles'));
  const dailyData: Record<string, number> = {};

  profilesSnap.forEach(doc => {
    const data = doc.data();
    const results: Record<string, any> = data.scaleResults ?? {};
    for (const result of Object.values(results)) {
      const date = toDate(result?.completedAt);
      if (date && date >= thirtyDaysAgo) {
        const key = date.toISOString().split('T')[0];
        dailyData[key] = (dailyData[key] || 0) + 1;
      }
    }
  });

  // Fill in missing days with 0
  const allDays: DailyTests[] = [];
  const cursor = new Date(thirtyDaysAgo);
  const today = new Date();
  while (cursor <= today) {
    const key = cursor.toISOString().split('T')[0];
    allDays.push({
      date: key,
      label: cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      count: dailyData[key] || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return allDays;
}

// ── Test popularity ranking ──

export function getTestPopularity(testCounts: Record<string, number>): TestPopularity[] {
  return Object.entries(testCounts)
    .map(([scaleId, count]) => {
      const meta = SCALE_META[scaleId];
      return {
        scaleId,
        name: meta?.label ?? scaleId,
        icon: meta?.icon ?? '📋',
        count,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ── Average scores per test ──

export async function getAverageScores(): Promise<AverageScore[]> {
  const profilesSnap = await getDocs(collection(db, 'userProfiles'));
  const scores: Record<string, {
    total: number;
    count: number;
    maxScore: number;
    severities: Record<string, number>;
  }> = {};

  profilesSnap.forEach(doc => {
    const data = doc.data();
    const results: Record<string, any> = data.scaleResults ?? {};
    for (const [scaleId, result] of Object.entries(results)) {
      if (!scores[scaleId]) {
        scores[scaleId] = { total: 0, count: 0, maxScore: 0, severities: {} };
      }
      const totalScore = result?.totalScore ?? 0;
      scores[scaleId].total += totalScore;
      scores[scaleId].count += 1;
      scores[scaleId].maxScore = Math.max(
        scores[scaleId].maxScore,
        result?.interpretation?.max ?? totalScore
      );
      const severity = result?.interpretation?.severity || 'unknown';
      scores[scaleId].severities[severity] = (scores[scaleId].severities[severity] || 0) + 1;
    }
  });

  return Object.entries(scores)
    .map(([scaleId, data]) => {
      const mostCommonSeverity = Object.entries(data.severities)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
      const meta = SCALE_META[scaleId];
      return {
        scaleId,
        name: meta?.label ?? scaleId,
        icon: meta?.icon ?? '📋',
        avgScore: Math.round((data.total / data.count) * 10) / 10,
        maxScore: data.maxScore,
        mostCommonSeverity,
        count: data.count,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ── Recent alerts (anonymized) ──

export async function getRecentAlerts(maxAlerts: number = 20): Promise<AnonymousAlert[]> {
  const profilesSnap = await getDocs(collection(db, 'userProfiles'));
  const alerts: AnonymousAlert[] = [];

  profilesSnap.forEach(doc => {
    const data = doc.data();
    const results: Record<string, any> = data.scaleResults ?? {};
    for (const [scaleId, result] of Object.entries(results)) {
      const alertLevel = result?.alertLevel ?? result?.interpretation?.alertLevel ?? 0;
      if (alertLevel >= 2) {
        const date = toDate(result?.completedAt);
        const meta = SCALE_META[scaleId];
        alerts.push({
          scaleId,
          scaleName: meta?.label ?? scaleId,
          icon: meta?.icon ?? '📋',
          alertLevel,
          severity: result?.interpretation?.severity || 'unknown',
          date: date?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) || '',
        });
      }
    }
  });

  // Sort by alertLevel desc, then date desc
  return alerts
    .sort((a, b) => b.alertLevel - a.alertLevel || b.date.localeCompare(a.date))
    .slice(0, maxAlerts);
}
