/**
 * _casDuSoirMinutages — le minutage des audios du Cas du soir : les phrases (début, fin, qui parle, texte) et les images
 * qui changent pendant l'écoute. Un minutage par audio, référencé par le champ « minutage » des histoires
 * (_casDuSoirHistoires.js). Il est envoyé par le serveur avec l'épisode, et seulement à qui a le droit de le lire :
 * le texte d'un épisode payant ne devient jamais public. Une seule réponse par épisode, aucune requête par phrase.
 *
 * Format : { duree, lignes: [{ t0, t1, qui, texte }], images: [{ t, image }] } ; t en secondes depuis le début de l'audio,
 * image = un nom de fichier de public/images/cas-du-soir/. « Narrateur » s'affiche sans étiquette.
 * Source : Claude outputs/cas-du-soir/v4/*.json (production audio du 10/11/2026), recopiés tels quels.
 */
module.exports = {
  "vu-de-minuit-ep1": {
    "duree": 166.89,
    "lignes": [
      {
        "t0": 2,
        "t1": 4.24,
        "qui": "Diarra",
        "texte": "Quatre mots. Il a suffi de quatre mots."
      },
      {
        "t0": 10.07,
        "t1": 14.55,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode un : Quatre mots."
      },
      {
        "t0": 15.9,
        "t1": 28.94,
        "qui": "Narrateur",
        "texte": "Il est presque minuit, aux Parcelles Assainies. Le salon de coiffure de Diarra a fermé à vingt et une heures, mais ses doigts sentent encore le karité. Trois tresses aujourd'hui. Une cliente en retard. Les pieds qui brûlent."
      },
      {
        "t0": 30.09,
        "t1": 34.49,
        "qui": "Narrateur",
        "texte": "Elle est fatiguée. Mais elle ne dort pas… Elle attend."
      },
      {
        "t0": 38.84,
        "t1": 51.96,
        "qui": "Narrateur",
        "texte": "Iba rentre à vingt-trois heures quarante. Il répare des antennes pour un opérateur téléphonique : quand une antenne tombe en panne à Keur Massar, c'est lui qu'on appelle. Il pose son sac… et son téléphone, sur la table basse. L'écran vers le haut."
      },
      {
        "t0": 53.31,
        "t1": 55.39,
        "qui": "Iba",
        "texte": "Nanga def, sama soxna ? (Comment vas-tu, ma femme ?)"
      },
      {
        "t0": 55.74,
        "t1": 58.62,
        "qui": "Diarra",
        "texte": "Maa ngi fi. (Je suis là.) Tu as mangé ?"
      },
      {
        "t0": 58.97,
        "t1": 61.37,
        "qui": "Iba",
        "texte": "Un peu, avec l'équipe. Je prends une douche."
      },
      {
        "t0": 61.72,
        "t1": 63,
        "qui": "Narrateur",
        "texte": "Il disparaît dans le couloir."
      },
      {
        "t0": 63.35,
        "t1": 68.55,
        "qui": "Narrateur",
        "texte": "Le téléphone reste là. Diarra ne le regarde pas. Elle n'est pas comme ça… Elle se le répète."
      },
      {
        "t0": 70.4,
        "t1": 72.8,
        "qui": "Narrateur",
        "texte": "Et puis… l'écran s'allume."
      },
      {
        "t0": 76.13,
        "t1": 78.45,
        "qui": "Narrateur",
        "texte": "Un message. On ne voit que le début."
      },
      {
        "t0": 79.8,
        "t1": 83.64,
        "qui": "Narrateur",
        "texte": "Un nom : Aïcha. Et quatre mots : « Tu n'as pas changé. »"
      },
      {
        "t0": 83.99,
        "t1": 96.87,
        "qui": "Narrateur",
        "texte": "Diarra connaît ce nom. Toute la famille d'Iba connaît ce nom. Aïcha. La fiancée d'avant. Celle qui était partie en Italie, il y a huit ans. Celle que la mère d'Iba appelle encore… « la fille polie »."
      },
      {
        "t0": 98.22,
        "t1": 103.9,
        "qui": "Narrateur",
        "texte": "Quelque chose se serre dans la poitrine de Diarra. Comme une main. Son cœur bat dans ses oreilles."
      },
      {
        "t0": 104.25,
        "t1": 109.93,
        "qui": "Diarra",
        "texte": "Depuis quand ? Pourquoi elle lui écrit à minuit ? Pourquoi il ne m'a rien dit ?"
      },
      {
        "t0": 111.28,
        "t1": 114.4,
        "qui": "Narrateur",
        "texte": "L'écran s'éteint… La douche coule toujours."
      },
      {
        "t0": 116.75,
        "t1": 119.23,
        "qui": "Narrateur",
        "texte": "Quand Iba revient, il voit tout de suite son visage."
      },
      {
        "t0": 119.58,
        "t1": 121.42,
        "qui": "Iba",
        "texte": "Lu xew ? (Qu'est-ce qui se passe ?)… Qu'est-ce qu'il y a ?"
      },
      {
        "t0": 121.77,
        "t1": 123.29,
        "qui": "Diarra",
        "texte": "Rien. Je suis fatiguée."
      },
      {
        "t0": 123.64,
        "t1": 132.68,
        "qui": "Narrateur",
        "texte": "Elle se tourne vers le mur. Iba soupire, prend son téléphone, tape quelque chose… avec un demi-sourire. Puis il éteint la lumière."
      },
      {
        "t0": 134.03,
        "t1": 140.99,
        "qui": "Narrateur",
        "texte": "Diarra garde les yeux ouverts dans le noir. Elle compte les respirations de son mari… Et elle se demande ce qu'il a répondu."
      },
      {
        "t0": 142.84,
        "t1": 148.44,
        "qui": "Narrateur",
        "texte": "Quatre mots. Il a suffi de quatre mots… pour que la nuit change de couleur."
      },
      {
        "t0": 150.29,
        "t1": 157.89,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, ce soir-là… qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 162.72,
        "t1": 165.04,
        "qui": "Narrateur",
        "texte": "La suite, demain soir, à vingt heures."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep1-vibre.webp"
      },
      {
        "t": 15.9,
        "image": "cas-vu-de-minuit-ep1-attente.webp"
      },
      {
        "t": 34.84,
        "image": "cas-vu-de-minuit-ep1-retour.webp"
      },
      {
        "t": 53.31,
        "image": "cas-vu-de-minuit-ep1-douche.webp"
      },
      {
        "t": 63.35,
        "image": "cas-vu-de-minuit-ep1-resiste.webp"
      },
      {
        "t": 73.15,
        "image": "cas-vu-de-minuit-ep1.webp"
      },
      {
        "t": 116.75,
        "image": "cas-vu-de-minuit-ep1-froid.webp"
      },
      {
        "t": 123.64,
        "image": "cas-vu-de-minuit-ep1-sourire.webp"
      },
      {
        "t": 133.03,
        "image": "cas-vu-de-minuit-ep1-nuit.webp"
      },
      {
        "t": 150.29,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-intrigue": {
    "duree": 53.83,
    "lignes": [
      {
        "t0": 2.6,
        "t1": 8.84,
        "qui": "Narrateur",
        "texte": "Dakar. Il est minuit, dans le quartier des Parcelles Assainies. Diarra, vingt-sept ans, coiffeuse, attend son mari."
      },
      {
        "t0": 9.99,
        "t1": 13.51,
        "qui": "Narrateur",
        "texte": "Iba rentre, pose son téléphone sur la table, et va prendre sa douche."
      },
      {
        "t0": 14.66,
        "t1": 20.34,
        "qui": "Narrateur",
        "texte": "Et là… l'écran s'allume. Un message. Un nom : Aïcha. L'ancienne fiancée d'Iba."
      },
      {
        "t0": 21.69,
        "t1": 30.97,
        "qui": "Narrateur",
        "texte": "Dans les jours qui suivent, tout le monde a un avis. Sa meilleure amie lui dit de se méfier. Sa belle-mère lui demande d'être patiente. Et Iba, lui, ne comprend pas pourquoi elle lui en veut."
      },
      {
        "t0": 32.92,
        "t1": 37.56,
        "qui": "Narrateur",
        "texte": "Une nuit, il s'endort… et laisse son téléphone à côté d'elle. Diarra connaît le code."
      },
      {
        "t0": 39.41,
        "t1": 42.37,
        "qui": "Narrateur",
        "texte": "Est-ce qu'elle va lire ses messages ? C'est toi qui vas décider."
      },
      {
        "t0": 47.2,
        "t1": 52.48,
        "qui": "Narrateur",
        "texte": "Le message de minuit. Une histoire en cinq épisodes, un chaque soir. Écoute le premier, maintenant."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep1-attente.webp"
      },
      {
        "t": 14.66,
        "image": "cas-vu-de-minuit-ep1.webp"
      },
      {
        "t": 21.69,
        "image": "cas-vu-de-minuit-yaay.webp"
      },
      {
        "t": 32.92,
        "image": "cas-vu-de-minuit-ep3.webp"
      },
      {
        "t": 42.72,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep2": {
    "duree": 166.8,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 8.96,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode deux : Six appels."
      },
      {
        "t0": 10.31,
        "t1": 13.51,
        "qui": "Narrateur",
        "texte": "Le lendemain, Diarra n'a rien dit. Mais elle n'a pensé qu'à ça."
      },
      {
        "t0": 14.66,
        "t1": 17.62,
        "qui": "Narrateur",
        "texte": "À neuf heures, elle regarde si Iba est « en ligne »."
      },
      {
        "t0": 17.97,
        "t1": 21.41,
        "qui": "Narrateur",
        "texte": "À dix heures, elle écrit : « Tu es où ? » Pas de réponse."
      },
      {
        "t0": 21.76,
        "t1": 23.2,
        "qui": "Narrateur",
        "texte": "À onze heures : « Tu as mangé ? »"
      },
      {
        "t0": 27.55,
        "t1": 29.79,
        "qui": "Narrateur",
        "texte": "À midi, un appel. Puis deux."
      },
      {
        "t0": 30.14,
        "t1": 33.5,
        "qui": "Narrateur",
        "texte": "À quatorze heures, un message vocal où elle rit un peu trop fort."
      },
      {
        "t0": 37.85,
        "t1": 40.49,
        "qui": "Narrateur",
        "texte": "À quinze heures, encore un appel. Six en tout."
      },
      {
        "t0": 44.84,
        "t1": 48.12,
        "qui": "Narrateur",
        "texte": "Iba finit par décrocher, essoufflé, avec le vent dans le micro."
      },
      {
        "t0": 48.47,
        "t1": 51.27,
        "qui": "Iba",
        "texte": "Diarra, je suis à trente mètres de haut ! Qu'est-ce qu'il y a ?"
      },
      {
        "t0": 51.62,
        "t1": 54.58,
        "qui": "Diarra",
        "texte": "Rien… Je voulais juste entendre ta voix."
      },
      {
        "t0": 54.93,
        "t1": 56.21,
        "qui": "Iba",
        "texte": "Bon. Je te rappelle."
      },
      {
        "t0": 56.56,
        "t1": 59.04,
        "qui": "Narrateur",
        "texte": "Il ne rappelle pas."
      },
      {
        "t0": 60.19,
        "t1": 67.15,
        "qui": "Narrateur",
        "texte": "Au salon, Coumba tresse une cliente à côté d'elle. Diarra lui a tout raconté, à voix basse. Coumba fait claquer sa langue."
      },
      {
        "t0": 67.5,
        "t1": 76.38,
        "qui": "Coumba",
        "texte": "Aïcha ? La fille d'Italie ? Dafa am lu muy nëbb. (Il cache quelque chose.) Un homme qui ne dit rien, c'est un homme qui prépare quelque chose."
      },
      {
        "t0": 76.73,
        "t1": 77.69,
        "qui": "Diarra",
        "texte": "Il n'est pas comme ça…"
      },
      {
        "t0": 78.04,
        "t1": 82.36,
        "qui": "Coumba",
        "texte": "Ils sont tous « pas comme ça », jusqu'au jour où on t'annonce la deuxième !"
      },
      {
        "t0": 82.71,
        "t1": 85.67,
        "qui": "Narrateur",
        "texte": "La cliente éclate de rire. Diarra, non."
      },
      {
        "t0": 86.02,
        "t1": 91.86,
        "qui": "Narrateur",
        "texte": "En fin d'après-midi, elle passe chez sa belle-mère, juste à côté. Yaay Fatou la regarde longtemps."
      },
      {
        "t0": 92.21,
        "t1": 101.25,
        "qui": "Yaay Fatou",
        "texte": "Tu as la tête de quelqu'un qui n'a pas dormi. Écoute, ma fille. Un foyer, ça tient avec le muñ. (La patience.) Toi, tu restes digne."
      },
      {
        "t0": 101.6,
        "t1": 107.52,
        "qui": "Narrateur",
        "texte": "Diarra hoche la tête. Muñ. Elle ne sait pas si ça veut dire attendre, ou se taire."
      },
      {
        "t0": 112.67,
        "t1": 120.27,
        "qui": "Narrateur",
        "texte": "Iba rentre à vingt-deux heures. Il tient une petite boîte de thiakry, le dessert de mil qu'elle adore. Comme avant. Elle ne la prend pas."
      },
      {
        "t0": 124.62,
        "t1": 128.3,
        "qui": "Narrateur",
        "texte": "Elle sert le repas sans un mot, mange debout, lave son assiette."
      },
      {
        "t0": 128.65,
        "t1": 130.25,
        "qui": "Iba",
        "texte": "Diarra, qu'est-ce que j'ai fait ?"
      },
      {
        "t0": 130.6,
        "t1": 132.2,
        "qui": "Diarra",
        "texte": "Tu sais très bien."
      },
      {
        "t0": 132.55,
        "t1": 136.55,
        "qui": "Iba",
        "texte": "Non, je ne sais pas ! Six appels aujourd'hui, et maintenant le silence ?"
      },
      {
        "t0": 136.9,
        "t1": 144.82,
        "qui": "Narrateur",
        "texte": "Il s'assied devant la télévision. Elle part dans la chambre. Entre eux, le mur de la cuisine. Et quelque chose de plus épais que le mur."
      },
      {
        "t0": 146.67,
        "t1": 151.07,
        "qui": "Narrateur",
        "texte": "Elle voulait qu'il vienne vers elle. Lui ne savait plus comment s'approcher."
      },
      {
        "t0": 152.92,
        "t1": 157.8,
        "qui": "Narrateur",
        "texte": "Et toi ? Si tu étais à la place de Diarra… qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 162.63,
        "t1": 164.95,
        "qui": "Narrateur",
        "texte": "La suite, demain soir, à vingt heures."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep2-matin.webp"
      },
      {
        "t": 40.84,
        "image": "cas-vu-de-minuit-ep2-pylone.webp"
      },
      {
        "t": 60.19,
        "image": "cas-vu-de-minuit-ep2.webp"
      },
      {
        "t": 86.02,
        "image": "cas-vu-de-minuit-yaay.webp"
      },
      {
        "t": 108.67,
        "image": "cas-vu-de-minuit-ep2-thiakry.webp"
      },
      {
        "t": 120.62,
        "image": "cas-vu-de-minuit-ep2-assiette.webp"
      },
      {
        "t": 128.65,
        "image": "cas-vu-de-minuit-ep2-dispute.webp"
      },
      {
        "t": 136.9,
        "image": "cas-vu-de-minuit-ep2-mur.webp"
      },
      {
        "t": 152.92,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep3": {
    "duree": 147.14,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 10.64,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode trois : Le code."
      },
      {
        "t0": 11.99,
        "t1": 15.83,
        "qui": "Narrateur",
        "texte": "Il est une heure du matin. Diarra n'a pas tenu. Elle sort de la chambre."
      },
      {
        "t0": 16.18,
        "t1": 18.34,
        "qui": "Diarra",
        "texte": "C'est qui, Aïcha ?"
      },
      {
        "t0": 18.69,
        "t1": 21.57,
        "qui": "Narrateur",
        "texte": "Iba lève les yeux de la télé. Une seconde de trop."
      },
      {
        "t0": 21.92,
        "t1": 26.88,
        "qui": "Iba",
        "texte": "Aïcha… c'est Aïcha. Tu sais bien. C'était il y a huit ans."
      },
      {
        "t0": 27.23,
        "t1": 30.11,
        "qui": "Diarra",
        "texte": "Et pourquoi elle t'écrit à minuit : tu n'as pas changé ?"
      },
      {
        "t0": 30.46,
        "t1": 36.06,
        "qui": "Iba",
        "texte": "J'ai mis en statut une vieille photo de l'équipe de foot du quartier. Elle a répondu. C'est tout."
      },
      {
        "t0": 36.41,
        "t1": 38.41,
        "qui": "Diarra",
        "texte": "Et toi, tu lui as répondu quoi ?"
      },
      {
        "t0": 38.76,
        "t1": 40.04,
        "qui": "Narrateur",
        "texte": "Il se frotte le visage."
      },
      {
        "t0": 40.39,
        "t1": 50.07,
        "qui": "Iba",
        "texte": "Pourquoi je dois toujours tout expliquer ? L'année dernière, avec ma collègue Ndèye, tu m'as fait la tête une semaine. Cette fois, je n'ai rien dit, parce que je savais que ça finirait comme ça."
      },
      {
        "t0": 50.42,
        "t1": 52.98,
        "qui": "Diarra",
        "texte": "Comme quoi ? Comme une femme qui demande la vérité ?"
      },
      {
        "t0": 53.33,
        "t1": 55.09,
        "qui": "Iba",
        "texte": "Comme un tribunal !"
      },
      {
        "t0": 55.44,
        "t1": 60.24,
        "qui": "Narrateur",
        "texte": "Sa voix monte. La sienne aussi. Puis Iba se lève, prend une natte, et sort."
      },
      {
        "t0": 60.59,
        "t1": 63.55,
        "qui": "Iba",
        "texte": "Je dors sur la terrasse. J'ai besoin d'air."
      },
      {
        "t0": 68.9,
        "t1": 76.26,
        "qui": "Narrateur",
        "texte": "La porte se ferme. Le silence revient. Et sur la table basse, il y a le téléphone. Il l'a oublié."
      },
      {
        "t0": 76.61,
        "t1": 83.89,
        "qui": "Narrateur",
        "texte": "Diarra connaît le code : la date de leur mariage. Il le lui avait donné un jour, en riant : « Je n'ai rien à cacher. »"
      },
      {
        "t0": 85.72,
        "t1": 89.24,
        "qui": "Narrateur",
        "texte": "Son propre téléphone vibre. C'est Coumba, réveillée elle aussi."
      },
      {
        "t0": 89.59,
        "t1": 91.11,
        "qui": "Coumba",
        "texte": "Alors ?"
      },
      {
        "t0": 91.46,
        "t1": 96.26,
        "qui": "Diarra",
        "texte": "Il dit que c'est rien. Il est sorti. Il a laissé son téléphone."
      },
      {
        "t0": 96.61,
        "t1": 102.69,
        "qui": "Coumba",
        "texte": "Waaw, xooleu ko ! (Oui, regarde-le !) Maintenant ou jamais. Tu dormiras mieux après."
      },
      {
        "t0": 103.04,
        "t1": 105.76,
        "qui": "Narrateur",
        "texte": "Diarra prend le téléphone. Il est encore tiède."
      },
      {
        "t0": 106.11,
        "t1": 108.19,
        "qui": "Narrateur",
        "texte": "Son pouce est juste au-dessus de l'écran."
      },
      {
        "t0": 111.54,
        "t1": 117.06,
        "qui": "Narrateur",
        "texte": "Dehors, elle entend Iba tousser sur la terrasse. Dans sa poitrine, la main serre plus fort que jamais."
      },
      {
        "t0": 117.41,
        "t1": 125.65,
        "qui": "Diarra",
        "texte": "Si je regarde, je saurai. Si je ne regarde pas, je ne dormirai pas. Ou peut-être que c'est l'inverse."
      },
      {
        "t0": 127.5,
        "t1": 135.1,
        "qui": "Narrateur",
        "texte": "Ce soir, c'est toi qui décides. Le choix le plus voté sera la suite de l'histoire. À sa place, qu'est-ce que tu fais ? Vote, juste en dessous."
      },
      {
        "t0": 139.93,
        "t1": 145.29,
        "qui": "Narrateur",
        "texte": "La suite dépend de ton vote, et de celui de tous les autres. À demain soir, à vingt heures."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep3-couloir.webp"
      },
      {
        "t": 21.92,
        "image": "cas-vu-de-minuit-ep3-photo.webp"
      },
      {
        "t": 40.39,
        "image": "cas-vu-de-minuit-ep3-tribunal.webp"
      },
      {
        "t": 60.59,
        "image": "cas-vu-de-minuit-ep3-natte.webp"
      },
      {
        "t": 68.9,
        "image": "cas-vu-de-minuit-ep3-table.webp"
      },
      {
        "t": 84.24,
        "image": "cas-vu-de-minuit-ep3-coumba.webp"
      },
      {
        "t": 103.04,
        "image": "cas-vu-de-minuit-ep3.webp"
      },
      {
        "t": 106.11,
        "image": "cas-vu-de-minuit-ep3-pouce.webp"
      },
      {
        "t": 127.5,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep4a": {
    "duree": 133.53,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 8.88,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode quatre : Discrets."
      },
      {
        "t0": 10.23,
        "t1": 17.59,
        "qui": "Narrateur",
        "texte": "Elle tape la date de leur mariage. Le téléphone s'ouvre. WhatsApp. La conversation avec Aïcha est la troisième de la liste."
      },
      {
        "t0": 17.94,
        "t1": 20.02,
        "qui": "Narrateur",
        "texte": "Elle lit vite, le cœur dans la gorge."
      },
      {
        "t0": 21.37,
        "t1": 22.49,
        "qui": "Aïcha",
        "texte": "« Tu n'as pas changé. »"
      },
      {
        "t0": 23.84,
        "t1": 26,
        "qui": "Iba",
        "texte": "« Toi non plus. Bon retour au pays. »"
      },
      {
        "t0": 27.35,
        "t1": 31.35,
        "qui": "Aïcha",
        "texte": "« Merci ! Tu connais un bon garagiste ? Ma voiture fait un bruit bizarre. »"
      },
      {
        "t0": 32.7,
        "t1": 36.78,
        "qui": "Iba",
        "texte": "« Va voir Pape, au garage de Grand-Yoff. Dis que tu viens de ma part. »"
      },
      {
        "t0": 37.13,
        "t1": 41.93,
        "qui": "Narrateur",
        "texte": "Diarra respire. C'est tout ? Un garagiste ? Elle a presque envie de rire."
      },
      {
        "t0": 43.08,
        "t1": 49.08,
        "qui": "Narrateur",
        "texte": "Puis elle descend encore, et lit le dernier message. Envoyé hier soir, pendant qu'elle faisait semblant de dormir."
      },
      {
        "t0": 50.43,
        "t1": 56.91,
        "qui": "Iba",
        "texte": "« Ma femme est un peu jalouse. Je préfère qu'on reste discrets, pour éviter les histoires. »"
      },
      {
        "t0": 58.76,
        "t1": 68.44,
        "qui": "Narrateur",
        "texte": "Discrets. Le mot lui brûle les yeux. Discrets pourquoi ? S'il n'y a rien, pourquoi se cacher ? Elle relit dix fois. Chaque fois, le mot grossit."
      },
      {
        "t0": 69.79,
        "t1": 71.15,
        "qui": "Iba",
        "texte": "Qu'est-ce que tu fais ?"
      },
      {
        "t0": 71.5,
        "t1": 80.94,
        "qui": "Narrateur",
        "texte": "Iba est à la porte. Il est revenu chercher son téléphone. Il voit l'écran allumé dans les mains de sa femme. Sur son visage passent la fatigue, puis la honte, puis la colère."
      },
      {
        "t0": 81.29,
        "t1": 85.05,
        "qui": "Iba",
        "texte": "Tu fouilles mon téléphone ? Maintenant tu me surveilles, Diarra ?"
      },
      {
        "t0": 85.4,
        "t1": 88.76,
        "qui": "Diarra",
        "texte": "Tu préfères rester discret avec elle ? C'est ça, ton rien ?"
      },
      {
        "t0": 89.11,
        "t1": 93.83,
        "qui": "Iba",
        "texte": "J'ai écrit ça pour qu'elle arrête de m'écrire le soir ! Pour ne pas avoir de problème avec toi !"
      },
      {
        "t0": 94.18,
        "t1": 95.54,
        "qui": "Diarra",
        "texte": "Alors pourquoi tu me l'as caché ?"
      },
      {
        "t0": 95.89,
        "t1": 99.25,
        "qui": "Iba",
        "texte": "Parce que je savais que tu ferais exactement… ça !"
      },
      {
        "t0": 99.6,
        "t1": 107.6,
        "qui": "Narrateur",
        "texte": "Il montre le téléphone, la nuit, elle. Elle montre le message. Chacun a une preuve dans la main. Chacun a raison. Et chacun a mal."
      },
      {
        "t0": 107.95,
        "t1": 111.79,
        "qui": "Narrateur",
        "texte": "Dans la maison d'à côté, une lumière s'allume. Yaay Fatou a entendu."
      },
      {
        "t0": 113.64,
        "t1": 118.6,
        "qui": "Narrateur",
        "texte": "Elle cherchait la vérité dans le téléphone. Elle y a trouvé un mot. Et ce mot parlait aussi d'elle."
      },
      {
        "t0": 120.45,
        "t1": 124.53,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 129.36,
        "t1": 131.68,
        "qui": "Narrateur",
        "texte": "La suite, demain soir, à vingt heures."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep4a-code.webp"
      },
      {
        "t": 17.94,
        "image": "cas-vu-de-minuit-ep4a-lecture.webp"
      },
      {
        "t": 37.13,
        "image": "cas-vu-de-minuit-ep4a-soulagement.webp"
      },
      {
        "t": 49.43,
        "image": "cas-vu-de-minuit-ep4a-discrets.webp"
      },
      {
        "t": 69.79,
        "image": "cas-vu-de-minuit-ep4A.webp"
      },
      {
        "t": 81.29,
        "image": "cas-vu-de-minuit-ep4a-preuves.webp"
      },
      {
        "t": 107.95,
        "image": "cas-vu-de-minuit-ep4a-lumiere.webp"
      },
      {
        "t": 120.45,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep4b": {
    "duree": 162.96,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 9.2,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode quatre : La terrasse."
      },
      {
        "t0": 10.55,
        "t1": 17.19,
        "qui": "Narrateur",
        "texte": "Diarra pose le téléphone, l'écran contre la table. Ses mains tremblent un peu. Elle répond à Coumba."
      },
      {
        "t0": 18.54,
        "t1": 20.22,
        "qui": "Diarra",
        "texte": "« Non. Je vais lui parler. »"
      },
      {
        "t0": 20.57,
        "t1": 22.41,
        "qui": "Narrateur",
        "texte": "Et elle éteint aussi son téléphone à elle."
      },
      {
        "t0": 23.56,
        "t1": 33.96,
        "qui": "Narrateur",
        "texte": "Dehors, l'air de la nuit sent le sel et le charbon d'un fourneau voisin. Iba est assis sur la natte, le dos contre le mur, les yeux sur les toits. Il ne se retourne pas."
      },
      {
        "t0": 34.31,
        "t1": 35.91,
        "qui": "Diarra",
        "texte": "Tu as oublié ton téléphone."
      },
      {
        "t0": 36.26,
        "t1": 37.7,
        "qui": "Iba",
        "texte": "Je sais."
      },
      {
        "t0": 38.05,
        "t1": 45.41,
        "qui": "Narrateur",
        "texte": "Elle s'assied à côté de lui. Pas trop près. Elle cherche ses mots. Ils ne viennent pas comme elle voudrait. Alors elle dit la vérité, telle quelle."
      },
      {
        "t0": 45.76,
        "t1": 64.4,
        "qui": "Diarra",
        "texte": "Quand j'ai vu le message… j'ai senti comme une main qui me serrait le cœur. J'ai eu peur. Peur de te perdre. Peur de ne pas être assez. C'est pour ça que j'ai appelé six fois. C'est pour ça que j'ai boudé. Ce n'était pas pour te punir. C'était la peur."
      },
      {
        "t0": 65.55,
        "t1": 70.83,
        "qui": "Narrateur",
        "texte": "Iba se tourne enfin vers elle. Il s'attendait à une dispute. Il ne sait pas quoi faire d'une peur."
      },
      {
        "t0": 71.18,
        "t1": 73.58,
        "qui": "Iba",
        "texte": "Tu as eu peur… de moi ?"
      },
      {
        "t0": 73.93,
        "t1": 74.81,
        "qui": "Diarra",
        "texte": "Non. Pour nous."
      },
      {
        "t0": 75.16,
        "t1": 76.84,
        "qui": "Narrateur",
        "texte": "Il se tait longtemps. Puis :"
      },
      {
        "t0": 78.19,
        "t1": 101.15,
        "qui": "Iba",
        "texte": "Je ne t'ai rien dit parce que, l'année dernière, avec Ndèye, tu m'as fait la tête une semaine. Je me suis dit : si je ne dis rien, il n'y aura pas de problème. Mais c'est le silence qui a fait le problème. Et je vais être honnête aussi. Quand tu appelles six fois, ou quand tu ne parles plus, je me sens comme un voleur. Alors je m'éloigne. Je viens dormir dehors."
      },
      {
        "t0": 101.5,
        "t1": 104.94,
        "qui": "Diarra",
        "texte": "Et moi, quand tu t'éloignes… j'appelle encore plus."
      },
      {
        "t0": 106.09,
        "t1": 109.93,
        "qui": "Narrateur",
        "texte": "Ils se regardent. Pour la première fois de la soirée, Iba sourit, un peu."
      },
      {
        "t0": 110.28,
        "t1": 112.2,
        "qui": "Iba",
        "texte": "On tourne en rond, hein ?"
      },
      {
        "t0": 112.55,
        "t1": 114.55,
        "qui": "Diarra",
        "texte": "Comme deux chèvres autour du même piquet."
      },
      {
        "t0": 114.9,
        "t1": 118.02,
        "qui": "Narrateur",
        "texte": "Il rit. Elle aussi. Ça ne règle pas tout."
      },
      {
        "t0": 118.37,
        "t1": 121.09,
        "qui": "Narrateur",
        "texte": "Il lui tend son téléphone ; elle secoue la tête."
      },
      {
        "t0": 121.44,
        "t1": 123.44,
        "qui": "Diarra",
        "texte": "Je n'en ai pas besoin. Dis-moi, c'est tout."
      },
      {
        "t0": 123.79,
        "t1": 138.03,
        "qui": "Narrateur",
        "texte": "Il lui raconte : la photo du foot, le garagiste, et ce message bête où il a écrit qu'il préférait rester discret, pour éviter les histoires. Elle a mal un instant. Puis elle comprend : il ne la cachait pas, elle. Il cachait la dispute."
      },
      {
        "t0": 139.38,
        "t1": 141.7,
        "qui": "Narrateur",
        "texte": "La main dans sa poitrine a desserré ses doigts."
      },
      {
        "t0": 143.55,
        "t1": 148.03,
        "qui": "Narrateur",
        "texte": "Il y a des peurs qui se déguisent en colère. Celle-là, Diarra l'a dite à voix haute."
      },
      {
        "t0": 149.88,
        "t1": 153.96,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 158.79,
        "t1": 161.11,
        "qui": "Narrateur",
        "texte": "La suite, demain soir, à vingt heures."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep4b-pose.webp"
      },
      {
        "t": 23.56,
        "image": "cas-vu-de-minuit-ep4b-porte.webp"
      },
      {
        "t": 38.05,
        "image": "cas-vu-de-minuit-ep4B.webp"
      },
      {
        "t": 45.76,
        "image": "cas-vu-de-minuit-ep4b-peur.webp"
      },
      {
        "t": 75.16,
        "image": "cas-vu-de-minuit-ep4b-silence.webp"
      },
      {
        "t": 78.19,
        "image": "cas-vu-de-minuit-ep4b-aveux.webp"
      },
      {
        "t": 106.09,
        "image": "cas-vu-de-minuit-ep4b-rire.webp"
      },
      {
        "t": 139.38,
        "image": "cas-vu-de-minuit-ep4b-aube.webp"
      },
      {
        "t": 149.88,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep5b": {
    "duree": 164.28,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 9.28,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode cinq : Le faire-part."
      },
      {
        "t0": 10.63,
        "t1": 16.47,
        "qui": "Narrateur",
        "texte": "Trois semaines plus tard. Un samedi, au salon, Coumba arrive avec son téléphone levé comme un trophée."
      },
      {
        "t0": 16.82,
        "t1": 24.34,
        "qui": "Coumba",
        "texte": "Diarra ! Tu as vu ? Aïcha se marie ! Elle a envoyé le faire-part à toute l'équipe de foot du quartier… et à Iba."
      },
      {
        "t0": 24.69,
        "t1": 38.05,
        "qui": "Narrateur",
        "texte": "Diarra sent la vieille chaleur monter. La main dans la poitrine. Iba invité. Iba qui va la revoir. Iba en grand boubou, à quelques pas de celle d'avant. Ses doigts cherchent déjà son téléphone pour appeler."
      },
      {
        "t0": 39.4,
        "t1": 46.12,
        "qui": "Narrateur",
        "texte": "Elle s'arrête. Elle reconnaît la sensation. Elle lui a donné un nom, cette nuit-là, sur la terrasse : la vieille peur."
      },
      {
        "t0": 47.27,
        "t1": 52.23,
        "qui": "Narrateur",
        "texte": "Elle pose ses ciseaux. Elle inspire, en comptant jusqu'à quatre."
      },
      {
        "t0": 52.58,
        "t1": 55.78,
        "qui": "Narrateur",
        "texte": "Un… deux… trois… quatre."
      },
      {
        "t0": 56.93,
        "t1": 59.01,
        "qui": "Narrateur",
        "texte": "Elle souffle, en comptant jusqu'à quatre."
      },
      {
        "t0": 59.36,
        "t1": 62.56,
        "qui": "Narrateur",
        "texte": "Un… deux… trois… quatre."
      },
      {
        "t0": 63.71,
        "t1": 65.87,
        "qui": "Narrateur",
        "texte": "Une fois. Deux fois."
      },
      {
        "t0": 67.72,
        "t1": 68.6,
        "qui": "Narrateur",
        "texte": "Puis elle n'appelle pas."
      },
      {
        "t0": 68.95,
        "t1": 70.63,
        "qui": "Narrateur",
        "texte": "Elle écrit un seul message :"
      },
      {
        "t0": 71.98,
        "t1": 79.98,
        "qui": "Diarra",
        "texte": "« Coumba vient de me parler du mariage d'Aïcha. Je sens la vieille peur qui revient. Rien de grave, je voulais juste te le dire. »"
      },
      {
        "t0": 81.13,
        "t1": 84.97,
        "qui": "Narrateur",
        "texte": "La réponse arrive deux minutes plus tard. Iba est sur une antenne, à Thiaroye."
      },
      {
        "t0": 86.32,
        "t1": 96.08,
        "qui": "Iba",
        "texte": "« Merci de me le dire. J'allais t'en parler ce soir. On y va ensemble si tu veux, ou on n'y va pas. C'est toi qui choisis. Et je ramène du thiakry. »"
      },
      {
        "t0": 96.43,
        "t1": 99.39,
        "qui": "Narrateur",
        "texte": "Diarra sourit à son écran. Coumba se penche."
      },
      {
        "t0": 99.74,
        "t1": 103.58,
        "qui": "Coumba",
        "texte": "Alors ? Il a dit quoi ? Moi, à ta place…"
      },
      {
        "t0": 103.93,
        "t1": 109.69,
        "qui": "Diarra",
        "texte": "Coumba. Merci de veiller sur moi, vraiment. Mais ça, je le règle avec lui."
      },
      {
        "t0": 115.04,
        "t1": 119.44,
        "qui": "Narrateur",
        "texte": "Le soir, Iba rentre avec la petite boîte de thiakry. Cette fois, elle la prend."
      },
      {
        "t0": 120.39,
        "t1": 132.79,
        "qui": "Narrateur",
        "texte": "Ils parlent du mariage. De ce qu'elle ressent. De ce que lui ressent, à revoir une vieille histoire. Ça ne dure pas longtemps. Ce n'est pas un tribunal. Ce sont juste deux personnes qui se racontent leur journée, y compris la partie qui fait peur."
      },
      {
        "t0": 134.14,
        "t1": 142.62,
        "qui": "Narrateur",
        "texte": "La peur reviendra sans doute, un autre soir, avec un autre message. Mais maintenant, Diarra sait la reconnaître. Et elle sait qu'elle a le droit de la dire."
      },
      {
        "t0": 144.47,
        "t1": 149.03,
        "qui": "Narrateur",
        "texte": "Ce n'est pas l'absence de peur qui fait un couple solide. C'est ce qu'on en fait, quand elle arrive."
      },
      {
        "t0": 150.88,
        "t1": 155.2,
        "qui": "Narrateur",
        "texte": "Et toi ? Selon toi, qu'est-ce qui a le plus changé chez Diarra ? Vote, juste en dessous."
      },
      {
        "t0": 160.03,
        "t1": 162.43,
        "qui": "Narrateur",
        "texte": "La leçon de Dr Lô t'attend juste après."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep5b-trophee.webp"
      },
      {
        "t": 24.69,
        "image": "cas-vu-de-minuit-ep5b-peur.webp"
      },
      {
        "t": 47.27,
        "image": "cas-vu-de-minuit-ep5B.webp"
      },
      {
        "t": 68.95,
        "image": "cas-vu-de-minuit-ep5b-message.webp"
      },
      {
        "t": 81.13,
        "image": "cas-vu-de-minuit-ep5b-antenne.webp"
      },
      {
        "t": 96.43,
        "image": "cas-vu-de-minuit-ep5b-coumba.webp"
      },
      {
        "t": 111.04,
        "image": "cas-vu-de-minuit-ep5b-thiakry.webp"
      },
      {
        "t": 120.39,
        "image": "cas-vu-de-minuit-ep5b-discussion.webp"
      },
      {
        "t": 150.88,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-ep5a": {
    "duree": 143.82,
    "lignes": [
      {
        "t0": 4.48,
        "t1": 9.28,
        "qui": "Narrateur",
        "texte": "Le cas du soir. Le message de minuit. Épisode cinq : Le cercle."
      },
      {
        "t0": 10.63,
        "t1": 16.95,
        "qui": "Narrateur",
        "texte": "Cette nuit-là, personne n'est parti. Yaay Fatou est arrivée en boubou de nuit, a fait asseoir tout le monde, et a dit seulement :"
      },
      {
        "t0": 17.3,
        "t1": 23.7,
        "qui": "Yaay Fatou",
        "texte": "Ndank ndank. (Doucement, doucement.) Demain, vous parlez. Ce soir, vous dormez."
      },
      {
        "t0": 25.05,
        "t1": 35.45,
        "qui": "Narrateur",
        "texte": "Le lendemain soir, ils sont tous les deux chez Tata Ndèye Khady, la badiène d'Iba, à Grand-Yoff. Le thé monte et redescend dans les petits verres. La badiène ne juge personne. Elle pose des questions."
      },
      {
        "t0": 35.8,
        "t1": 39.64,
        "qui": "La badiène",
        "texte": "Diarra, quand tu as vu ce message, tu as eu peur de quoi ?"
      },
      {
        "t0": 39.99,
        "t1": 45.51,
        "qui": "Diarra",
        "texte": "… Qu'il parte. Que je ne compte pas. Que je sois celle qu'on remplace."
      },
      {
        "t0": 45.86,
        "t1": 49.22,
        "qui": "La badiène",
        "texte": "Et toi, Iba, pourquoi tu as caché cette conversation ?"
      },
      {
        "t0": 49.57,
        "t1": 59.57,
        "qui": "Iba",
        "texte": "Parce que j'avais peur qu'elle se fâche. Quand elle a peur, elle appelle, elle boude, elle accuse. Alors je me ferme. Je me tais. Je vais dormir dehors."
      },
      {
        "t0": 59.92,
        "t1": 63.04,
        "qui": "La badiène",
        "texte": "Et toi, Diarra, quand il se tait, tu fais quoi ?"
      },
      {
        "t0": 63.39,
        "t1": 66.99,
        "qui": "Diarra",
        "texte": "J'appelle plus. Je boude plus. Je cherche plus."
      },
      {
        "t0": 67.34,
        "t1": 68.94,
        "qui": "Narrateur",
        "texte": "La badiène pose son verre."
      },
      {
        "t0": 69.29,
        "t1": 85.05,
        "qui": "La badiène",
        "texte": "Vous voyez ? Elle court après toi parce que tu t'éloignes. Et tu t'éloignes parce qu'elle court. Vous tournez en rond, comme deux enfants autour d'un baobab. Aïcha n'est pas le problème. Aïcha, c'est juste le vent qui a fait bouger les branches."
      },
      {
        "t0": 86.2,
        "t1": 89.48,
        "qui": "Narrateur",
        "texte": "Un long silence. Puis Iba dit, très bas :"
      },
      {
        "t0": 91.03,
        "t1": 97.03,
        "qui": "Iba",
        "texte": "Je n'aurais pas dû écrire à Aïcha qu'on resterait discrets. J'aurais dû te le dire, à toi."
      },
      {
        "t0": 97.38,
        "t1": 101.06,
        "qui": "Diarra",
        "texte": "Et moi, j'aurais dû te dire « j'ai peur », au lieu de chercher dans ton téléphone."
      },
      {
        "t0": 102.41,
        "t1": 112.41,
        "qui": "Narrateur",
        "texte": "Rien n'est réglé. La confiance ne se recoud pas en une soirée. Diarra sent encore la petite main dans sa poitrine. Mais pour la première fois, elle sait comment elle s'appelle : la peur de perdre."
      },
      {
        "t0": 113.76,
        "t1": 119.76,
        "qui": "Narrateur",
        "texte": "Dans le taxi du retour, Iba lui prend la main. Il ne dit rien. Mais ce silence-là n'est pas un mur."
      },
      {
        "t0": 121.61,
        "t1": 128.09,
        "qui": "Narrateur",
        "texte": "Ce soir-là, ils ont arrêté de se battre l'un contre l'autre. Ils ont commencé à se battre ensemble, contre le cercle."
      },
      {
        "t0": 129.94,
        "t1": 134.74,
        "qui": "Narrateur",
        "texte": "Et toi ? Selon toi, qu'est-ce qui aurait le plus aidé, dès le premier soir ? Vote, juste en dessous."
      },
      {
        "t0": 139.57,
        "t1": 141.97,
        "qui": "Narrateur",
        "texte": "La leçon de Dr Lô t'attend juste après."
      }
    ],
    "images": [
      {
        "t": 0,
        "image": "cas-vu-de-minuit-ep5a-nuit.webp"
      },
      {
        "t": 25.05,
        "image": "cas-vu-de-minuit-ep5A.webp"
      },
      {
        "t": 39.99,
        "image": "cas-vu-de-minuit-ep5a-peur.webp"
      },
      {
        "t": 49.57,
        "image": "cas-vu-de-minuit-ep5a-iba.webp"
      },
      {
        "t": 69.29,
        "image": "cas-vu-de-minuit-ep5a-baobab.webp"
      },
      {
        "t": 91.03,
        "image": "cas-vu-de-minuit-ep5a-excuses.webp"
      },
      {
        "t": 113.76,
        "image": "cas-vu-de-minuit-ep5a-taxi.webp"
      },
      {
        "t": 129.94,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  },
  "vu-de-minuit-lecon": {
    "duree": 159.24,
    "lignes": [
      {
        "t0": 5.25,
        "t1": 6.03,
        "qui": "Narrateur",
        "texte": "Bonsoir."
      },
      {
        "t0": 6.03,
        "t1": 6.4,
        "qui": "Narrateur",
        "texte": "C'est Dr Lô."
      },
      {
        "t0": 7.25,
        "t1": 9.26,
        "qui": "Narrateur",
        "texte": "Tu viens de suivre Diarra et Iba."
      },
      {
        "t0": 9.59,
        "t1": 12.38,
        "qui": "Narrateur",
        "texte": "Et peut-être que, quelque part, tu t'es reconnu."
      },
      {
        "t0": 12.47,
        "t1": 14.14,
        "qui": "Narrateur",
        "texte": "Dans elle, ou dans lui."
      },
      {
        "t0": 14.57,
        "t1": 17.68,
        "qui": "Narrateur",
        "texte": "Ce qui se jouait entre eux a un nom en psychologie."
      },
      {
        "t0": 18.07,
        "t1": 24.12,
        "qui": "Narrateur",
        "texte": "Chacun de nous a un « style d'attachement » : une façon de réagir quand on a peur de perdre quelqu'un qu'on aime."
      },
      {
        "t0": 24.39,
        "t1": 28.16,
        "qui": "Narrateur",
        "texte": "Il se forme tôt, dans l'enfance, et il se réveille dans le couple."
      },
      {
        "t0": 28.63,
        "t1": 31.56,
        "qui": "Narrateur",
        "texte": "Chez Diarra, la peur fait monter une alarme."
      },
      {
        "t0": 31.83,
        "t1": 37.54,
        "qui": "Narrateur",
        "texte": "Et l'alarme pousse à agir, vite : appeler six fois, bouder, fouiller un téléphone."
      },
      {
        "t0": 37.85,
        "t1": 40.1,
        "qui": "Narrateur",
        "texte": "Ce sont des « comportements de protestation »."
      },
      {
        "t0": 40.87,
        "t1": 43.16,
        "qui": "Narrateur",
        "texte": "Ils ne veulent pas dire « je te contrôle »."
      },
      {
        "t0": 43.43,
        "t1": 45.14,
        "qui": "Narrateur",
        "texte": "Ils veulent dire : « Rassure-moi."
      },
      {
        "t0": 45.33,
        "t1": 46.7,
        "qui": "Narrateur",
        "texte": "Dis-moi que je compte. »"
      },
      {
        "t0": 47.05,
        "t1": 50.74,
        "qui": "Narrateur",
        "texte": "Le problème, c'est que l'autre entend surtout le reproche."
      },
      {
        "t0": 51.51,
        "t1": 57.26,
        "qui": "Narrateur",
        "texte": "Chez Iba, la tension fait l'inverse : il se ferme, il se tait, il va dormir dehors."
      },
      {
        "t0": 57.83,
        "t1": 59.38,
        "qui": "Narrateur",
        "texte": "Ce n'est pas de l'indifférence."
      },
      {
        "t0": 59.77,
        "t1": 62.94,
        "qui": "Narrateur",
        "texte": "C'est sa façon à lui de se protéger du conflit."
      },
      {
        "t0": 63.55,
        "t1": 65,
        "qui": "Narrateur",
        "texte": "Et les deux s'entretiennent."
      },
      {
        "t0": 65.01,
        "t1": 67.54,
        "qui": "Narrateur",
        "texte": "Plus elle poursuit, plus il se retire."
      },
      {
        "t0": 67.54,
        "t1": 69.94,
        "qui": "Narrateur",
        "texte": "Plus il se retire, plus elle poursuit."
      },
      {
        "t0": 70.07,
        "t1": 72.9,
        "qui": "Narrateur",
        "texte": "C'est le cercle de la poursuite et du retrait."
      },
      {
        "t0": 73.27,
        "t1": 75.58,
        "qui": "Narrateur",
        "texte": "Aïcha n'en était que le déclencheur."
      },
      {
        "t0": 76.01,
        "t1": 77.62,
        "qui": "Narrateur",
        "texte": "Comment le reconnaître chez toi ?"
      },
      {
        "t0": 77.97,
        "t1": 79.44,
        "qui": "Narrateur",
        "texte": "Pose-toi trois questions."
      },
      {
        "t0": 79.73,
        "t1": 83.06,
        "qui": "Narrateur",
        "texte": "Est-ce que, quand j'ai peur dans une relation, j'agis tout de suite : messages, appels, vérifications ?"
      },
      {
        "t0": 86.01,
        "t1": 89.48,
        "qui": "Narrateur",
        "texte": "Est-ce qu'au contraire je me ferme et je disparais ?"
      },
      {
        "t0": 90.25,
        "t1": 94.2,
        "qui": "Narrateur",
        "texte": "Et est-ce que nos disputes se ressemblent toutes, quel que soit le sujet ?"
      },
      {
        "t0": 94.75,
        "t1": 97.46,
        "qui": "Narrateur",
        "texte": "Voici un geste concret pour cette semaine."
      },
      {
        "t0": 97.75,
        "t1": 103.78,
        "qui": "Narrateur",
        "texte": "Quand la peur monte, avant d'agir, respire : quatre secondes pour inspirer, quatre pour souffler."
      },
      {
        "t0": 104.23,
        "t1": 116.52,
        "qui": "Narrateur",
        "texte": "Puis remplace l'accusation par une phrase en trois morceaux : « Quand j'ai vu… j'ai ressenti… j'ai besoin de… » Par exemple : « Quand j'ai vu ce message, j'ai eu peur de te perdre."
      },
      {
        "t0": 116.67,
        "t1": 118.34,
        "qui": "Narrateur",
        "texte": "J'ai besoin que tu me rassures. »"
      },
      {
        "t0": 118.73,
        "t1": 125.58,
        "qui": "Narrateur",
        "texte": "Et si toi, tu es plutôt celui qui se ferme, dis simplement : « J'ai besoin de vingt minutes, et je reviens en parler. »"
      },
      {
        "t0": 125.65,
        "t1": 126.96,
        "qui": "Narrateur",
        "texte": "Puis reviens."
      },
      {
        "t0": 127.47,
        "t1": 128.56,
        "qui": "Narrateur",
        "texte": "Un dernier mot."
      },
      {
        "t0": 128.63,
        "t1": 131.94,
        "qui": "Narrateur",
        "texte": "Ressentir de la jalousie ou de la peur n'est pas une faiblesse."
      },
      {
        "t0": 132.17,
        "t1": 142.32,
        "qui": "Narrateur",
        "texte": "Mais si, dans ton couple, la surveillance, les menaces ou la peur deviennent ton quotidien, ce n'est plus un cercle : c'est une souffrance, et tu mérites d'en parler à quelqu'un."
      },
      {
        "t0": 142.69,
        "t1": 149.26,
        "qui": "Narrateur",
        "texte": "Si tu veux savoir comment, toi, tu réagis quand tu as peur de perdre quelqu'un, le test du style d'attachement est juste en dessous."
      },
      {
        "t0": 149.61,
        "t1": 152.12,
        "qui": "Narrateur",
        "texte": "Et le compagnon est là, si tu veux en parler."
      },
      {
        "t0": 152.63,
        "t1": 153.54,
        "qui": "Narrateur",
        "texte": "Bonne nuit."
      }
    ]
  }
};
