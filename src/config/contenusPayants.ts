/**
 * Contenus payants : valeurs proposées par défaut dans les formulaires de l'espace pro.
 * Chaque prix reste modifiable à chaque création ; ces valeurs ne changent aucun prix déjà publié.
 * LES PRIX SONT LA DÉCISION DE PAPA MOUSSA. Valeur proposée par la direction (rapport du 10/11/2026) :
 * Pénc mi payant, 10 à 15 étincelles.
 */
export const PENC_PRIX_PAR_DEFAUT = 10;

/**
 * « Le cas du soir » : la suite tout de suite (sinon gratuite le lendemain soir), le détail des votes par animal,
 * et l'autre fin (après la fin de l'histoire).
 * Le serveur fait foi pour le débit : garder la même valeur dans PRIX de netlify/functions/_casDuSoir.js
 * (un test vérifie que les deux sont identiques).
 */
export const CAS_DU_SOIR_PRIX = { suite: 1, bonus: 1, autreFin: 2 } as const;

/**
 * La carte du « Cas du soir » sur l'accueil des visiteurs (sans compte). Coupée tant que le cas du soir est masqué :
 * les visiteurs ne demandent rien au serveur. À passer à true en même temps que CAS_DU_SOIR_PUBLIC (_casDuSoir.js).
 */
export const CAS_DU_SOIR_CARTE_VISITEURS: boolean = false;
