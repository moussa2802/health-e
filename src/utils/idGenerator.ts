const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSuffix(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

/** @deprecated Use generateMentalCompatibilityId or generateSexualCompatibilityId */
export function generateCompatibilityId(): string {
  return `HE-${new Date().getFullYear()}-${randomSuffix(4)}`;
}

/** Code profil mental — format HE-MNT-YYYY-XXXX */
export function generateMentalCompatibilityId(): string {
  return `HE-MNT-${new Date().getFullYear()}-${randomSuffix(4)}`;
}

/** Code profil sexuel — format HE-SEX-YYYY-XXXX */
export function generateSexualCompatibilityId(): string {
  return `HE-SEX-${new Date().getFullYear()}-${randomSuffix(4)}`;
}
