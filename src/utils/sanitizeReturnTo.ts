const ALLOWED_PREFIXES = [
  '/defi',
  '/assessment',
  '/mon-espace',
  '/journal',
  '/d/',
  '/api/d/',
];

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/assessment';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return '/assessment';
  if (trimmed.startsWith('//')) return '/assessment';
  if (trimmed.startsWith('/\\')) return '/assessment';
  if (trimmed.includes(':')) return '/assessment';
  if (!ALLOWED_PREFIXES.some(p => trimmed === p || trimmed.startsWith(p.endsWith('/') ? p : p + '/') || trimmed.startsWith(p + '?'))) {
    return '/assessment';
  }
  return trimmed;
}
