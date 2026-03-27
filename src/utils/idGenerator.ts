/**
 * Génère un ID de compatibilité unique au format HE-XXXX-NNNN
 * Ex: HE-2026-A3F7
 */
export function generateCompatibilityId(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HE-${year}-${suffix}`;
}
