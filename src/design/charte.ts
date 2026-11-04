/**
 * charte.ts — la charte graphique de Health-e, en un seul endroit (voir CHARTE.md à la racine).
 * Toute nouvelle page ou refonte prend ses couleurs, tailles et arrondis ICI, pas en dur.
 */

/** Couleurs par RÔLE. Une couleur = un rôle. */
export const COLOR = {
  /** Boutons principaux : le dégradé ambre du moment (palette.primary de drloMoment). Ceci est la valeur de repli
   *  et la couleur des étincelles / mises en avant dorées. */
  action: '#E9C88F',
  /** Texte posé sur la couleur d'action. */
  onAction: '#1C140D',
  title: '#FBF5EA',
  text: '#F4EEE4',
  soft: '#DCD3C5',
  /** Le plus clair autorisé pour une phrase à lire. */
  muted: '#CFC6B8',
  /** Légendes de 13 px et plus seulement (dates, étiquettes), jamais une phrase. */
  faint: '#A79E90',
  /** Couleurs d'univers : repères (icônes, pastilles, bordures), JAMAIS des boutons. */
  univers: { mental: '#9DBFAF', intime: '#E8A0B8', social: '#F09A7A', journal: '#C9B8E4' },
  /** Sémantique. */
  ok: '#7FD1A0',
  attention: '#F08A7A',
  line: 'rgba(255,255,255,.12)',
  lineStrong: 'rgba(255,255,255,.28)',
  glass: 'rgba(255,255,255,.05)',
} as const;

/** Échelle de texte. Rien sous 13 px. Fraunces seulement à partir de 20 px. */
export const FS = {
  display: 34, // Fraunces : moments forts (totem, score)
  page: 26,    // Fraunces : titre de page
  section: 20, // Fraunces : titre de section
  strong: 17,  // gras : titre de carte, bouton principal
  body: 15,    // texte courant : questions, analyses, messages
  ui: 14,      // interface : boutons secondaires, onglets, pastilles
  small: 13,   // minimum : légende, date, étiquette
} as const;

export const FONT = {
  display: "'Fraunces', Georgia, serif",
  body: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

/** Trois arrondis. */
export const RADIUS = { sm: 12, card: 20, pill: 999 } as const;

/** Hauteurs tactiles. */
export const TAP = { primary: 52, secondary: 46, min: 44 } as const;

/**
 * Repères de résultat : un ÉTAT, jamais une note (charte du 3 nov. 2026).
 * Pas de vert « bon » ni de rouge « mauvais » : sauge « ça tient » → or → ambre → lavande « à prendre soin ».
 * Le rouge brique (COLOR.attention) reste réservé à la détresse et aux erreurs.
 */
export const SEVERITY: Record<string, string> = {
  none: '#9DBFAF', minimal: '#9DBFAF', positive: '#9DBFAF',
  mild: '#E9C88F', moderate: '#F2B66D',
  severe: '#C9B8E4', alert: '#C9B8E4', high: '#C9B8E4',
};
export const severityColor = (sev?: string | null, fallback = '#E9C88F') => (sev && SEVERITY[sev]) || fallback;
