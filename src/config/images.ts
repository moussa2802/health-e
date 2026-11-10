/**
 * Les images de l'appli (fichiers posés par Papa Moussa dans public/images/…). Une image n'est pas un contenu payant :
 * elle est publique. Format webp, 150 Ko au plus. Cartes de l'accueil : affichées sur 150 px de haut, recadrées au centre
 * (prévoir du 16:9, sujet au milieu) ; couverture du Cas du soir : 16:9 ; épisodes : 4:3.
 * Tant qu'un fichier manque, l'écran affiche un fond dégradé (jamais une icône d'image cassée) : on peut mettre en ligne avant.
 * Les images des épisodes du Cas du soir sont déclarées dans netlify/functions/_casDuSoirHistoires.js (champ « image »).
 */
export const IMAGES = {
  /** Accueil : la carte d'entrée de Pénc mi et chaque carte de Pénc à venir (même image pour tous) */
  penc: '/images/accueil/accueil-penc.webp',
  /** Accueil, carte « Le cas du soir » (16:9) */
  casDuSoir: '/images/accueil/accueil-cas-du-soir.webp',
  /**
   * Le compagnon : seulement sur une carte qui mène au compagnon lui-même (aucune aujourd'hui). Les cartes de test
   * (« Commence ici », « Vu dans la vidéo », « Ta suite », « Ça a bougé ? ») gardent leur icône : une image de test
   * demanderait une image dédiée (nom proposé : accueil-test.webp).
   */
  compagnon: '/images/accueil/accueil-compagnon.webp',
} as const;
