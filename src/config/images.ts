/**
 * Les images de l'appli (fichiers posés par Papa Moussa dans public/images/…). Une image n'est pas un contenu payant :
 * elle est publique. Format webp, 150 Ko au plus, 16:9 pour les cartes et les couvertures, 4:3 pour les épisodes.
 * Tant qu'un fichier manque, l'écran affiche un fond dégradé (jamais une icône d'image cassée) : on peut mettre en ligne avant.
 * Les images des épisodes du Cas du soir sont déclarées dans netlify/functions/_casDuSoirHistoires.js (champ « image »).
 */
export const IMAGES = {
  /** Accueil, carte « Pénc mi » (16:9) */
  penc: '/images/accueil/accueil-penc.webp',
  /** Accueil, carte « Le cas du soir » (16:9) */
  casDuSoir: '/images/accueil/accueil-cas-du-soir.webp',
  /** Accueil, carte du compagnon et des tests : « Commence ici » (visiteur), « Ta suite » (connecté) (16:9) */
  compagnon: '/images/accueil/accueil-compagnon.webp',
} as const;
