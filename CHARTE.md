# Charte graphique Health-e

Source unique dans le code : `src/design/charte.ts` (couleurs, tailles, arrondis).
Composants : `src/components/ui/Btn.tsx` (boutons), `Card.tsx` (cartes), `Fold.tsx` (section repliable), `PageHeader.tsx` (en-tête des pages hors DrLoShell), `InfoShell.tsx` (pages publiques : FAQ, contact, légal), `src/components/accueil/AudioPlayer.tsx` (vocaux), en-tête `DrLoShell` (pages de l'espace).
Les anciennes pages à classes Tailwind claires sont habillées en sombre par `.drl-screen` / `.drl-page` (accueil.css) : le bouton `bg-gold` / `bg-accent` y prend le dégradé ambre du moment (`--he-action`).
Garde-fou : `tests/unit/charte.test.ts` (texte < 13 px, Georgia seule ou police mono = test en échec).

## Identité : « la veillée » (validée le 3 nov. 2026)
Health-e, c'est la conversation du soir autour du feu avec quelqu'un qui s'y connaît et ne juge pas : nuit chaude pour l'intimité, une seule lumière ambre pour agir, le cercle comme signature (le compagnon rond, le médaillon de l'animal, le motif de Pénc mi).
Thème sombre et chaud, palettes selon l'heure de la journée, Fraunces (titres, dès 20 px) + Plus Jakarta Sans (texte).
Personnalité : grand frère / grande sœur médecin — chaleureux, franc, digne, d'ici. Jamais froid comme un hôpital, jamais enfantin, jamais racoleur.
Une seule carte vedette par écran ; un seul bouton ambre par écran.
L'IA Dr Lô = avatar dessiné. Le vrai Dr Lô = sa photo (initiale « L » si elle ne charge pas, jamais un cercle vide).

## Couleurs : un rôle par couleur
| Rôle | Valeur | Usage |
|---|---|---|
| Action | dégradé ambre du moment (`palette.primary`) | La seule couleur des boutons principaux (`<Btn>` la prend toute seule) |
| Or | #E9C88F | Étincelles, mises en avant dorées (jamais un 2e style de bouton principal) |
| Sur action | #1C140D | Texte posé sur un bouton principal |
| Titre | #FBF5EA | Titres |
| Texte | #F4EEE4 | Corps de texte |
| Texte secondaire | #CFC6B8 | Le plus clair autorisé pour une phrase |
| Légende | #A79E90 | Dates, étiquettes de 13 px et plus, jamais une phrase |
| Mental | #9DBFAF | Repère d'univers (icône, pastille, bordure), jamais un bouton |
| Intime | #E8A0B8 | idem |
| Social | #F09A7A | idem |
| Journal | #C9B8E4 | idem |
| Bien | #7FD1A0 | Confirmations (« Enregistré »), jamais un résultat |
| Attention | #F08A7A | Alertes, suppression, crise — jamais un résultat |

## Résultats et jauges : un état, jamais une note
`SEVERITY` / `severityColor()` dans `charte.ts`, partout où un résultat est coloré :
sauge #9DBFAF « ça tient » (minimal) → or #E9C88F (léger) → ambre #F2B66D « à surveiller » (modéré) → lavande #C9B8E4 « à prendre soin » (sévère).
Pas de vert « bon » ni de rouge « mauvais » sur un résultat. Toujours un mot à côté de la couleur.

Tailwind : `text-he-action`, `bg-he-action`, `text-he-muted`… (couleurs `he.*` dans tailwind.config.js).

## Texte : rien sous 13 px
| Rôle | Taille | Police |
|---|---|---|
| Moment fort (totem, score) | 34 | Fraunces |
| Titre de page | 26 | Fraunces |
| Titre de section | 20 | Fraunces |
| Titre de carte, bouton principal | 17 (gras) | Plus Jakarta Sans |
| Texte courant | 15 | Plus Jakarta Sans |
| Interface (onglets, boutons secondaires, pastilles) | 14 | Plus Jakarta Sans |
| Légende, date, étiquette (minimum) | 13 | Plus Jakarta Sans |

- Fraunces seulement à partir de 20 px.
- Pas de police mono : les codes s'écrivent en Plus Jakarta Sans avec `tabular-nums`.
- `text-xs` vaut 13 px (réglé dans tailwind.config.js).
- Seules exceptions : les étiquettes de l'échelle segmentée dans ResultCard (12 px, place limitée) et les cartes exportées en image (ResultShareCard, ShareableCompatibilityCard).

## Boutons : 3 niveaux, un seul principal par écran
- Principal : plein, couleur Action, 52 px de haut (`<Btn>`).
- Secondaire : contour (`<Btn variant="secondary">`).
- Tertiaire : lien souligné (`<Btn variant="tertiary">`).
- Supprimer / quitter : `<Btn variant="danger">` (contour rouge), jamais un petit lien rouge.

## Le reste
- Arrondis : 12 (petits éléments), 20 (cartes), pilule. Trois valeurs.
- En-tête : `DrLoShell` (retour rond + « Visible par toi seul » + masquer l'écran) sur toutes les pages.
- Icônes : lucide (au trait) uniquement. Les emoji restent dans les messages de Dr Lô, pas dans l'interface.
- Vocaux : `AudioPlayer`, jamais le lecteur `<audio controls>` du navigateur.
- Longueur : le moment fort en haut, le détail replié. 3 écrans maximum par page.
- Le bas de page garde une marge pour la pastille flottante Dr Lô (déjà dans DrLoShell).
- Tutoiement partout, pas d'écriture inclusive (test noInclusive).
