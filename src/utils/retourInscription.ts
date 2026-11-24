/**
 * retourInscription — « Crée ton espace » depuis une page (un cas du soir…) : on retient la page, et après l'inscription
 * (ou la connexion) on y ramène la personne au lieu de la laisser dans le compagnon. Valable 1 heure.
 */
const CLE = 'he_retour_inscription';
const DUREE = 60 * 60 * 1000;

export function retenirRetour(chemin: string): void {
  if (!chemin.startsWith('/') || chemin.startsWith('//')) return;
  try { localStorage.setItem(CLE, JSON.stringify({ chemin, at: Date.now() })); } catch { /* sans stockage : pas de retour, rien de cassé */ }
}

/** Le chemin retenu (une seule fois : il est effacé), ou null s'il n'y en a pas ou s'il est trop ancien. */
export function prendreRetour(now = Date.now()): string | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    localStorage.removeItem(CLE);
    const r = JSON.parse(brut) as { chemin?: unknown; at?: unknown };
    if (typeof r.chemin !== 'string' || !r.chemin.startsWith('/') || r.chemin.startsWith('//')) return null;
    if (typeof r.at !== 'number' || now - r.at > DUREE || r.at > now + 60000) return null;
    return r.chemin;
  } catch { return null; }
}
