/** Commentaire de Dr Lô sur un résultat (appel gratuit à drlo-result). Renvoie null en cas d'échec : le texte par défaut prend le relais. */
import { getAuth } from 'firebase/auth';

export interface ResultCommentInput {
  scaleId: string;
  scaleLabel: string;
  resultLabel: string;
  severity: string;
  description?: string;
  subscales?: Record<string, number>;
  prenom?: string;
  genre?: string;
  guest: boolean;
  alertLevel?: number;
  referralRequired?: boolean;
}

export async function fetchResultComment(input: ResultCommentInput, timeoutMs = 7000): Promise<string | null> {
  if ((input.alertLevel ?? 0) >= 2 || input.referralRequired || ['severe', 'alert'].includes(input.severity)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch { /* invité */ }
    const res = await fetch('/.netlify/functions/drlo-result', {
      method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({ ...input, subscales: input.subscales ?? {} }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
