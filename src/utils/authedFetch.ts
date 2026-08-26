import { auth } from './firebase';
import { recordAiSuccess, recordAiFailure } from './aiCircuitBreaker';

const AI_ENDPOINTS = [
  '/dr-lo-chat', '/dr-lo-analysis', '/dr-lo-conseils',
  '/dr-lo-journal', '/dr-lo-synthesis', '/compatibility-analysis',
];

export async function authedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Non authentifié');
  }
  const token = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });

  if (AI_ENDPOINTS.some(ep => url.includes(ep))) {
    if (response.ok) {
      recordAiSuccess();
    } else if (response.status >= 500 || response.status === 502) {
      recordAiFailure();
    }
  }

  return response;
}
