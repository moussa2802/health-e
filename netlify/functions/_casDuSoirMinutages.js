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
    "duree": 162.43,
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
        "t1": 66.92,
        "qui": "Narrateur",
        "texte": "Le téléphone reste là. Diarra ne le regarde pas. Elle n'est pas comme ça… Elle se le répète."
      },
      {
        "t0": 68.77,
        "t1": 71.17,
        "qui": "Narrateur",
        "texte": "Et puis… l'écran s'allume."
      },
      {
        "t0": 74.5,
        "t1": 76.82,
        "qui": "Narrateur",
        "texte": "Un message. On ne voit que le début."
      },
      {
        "t0": 78.17,
        "t1": 82.01,
        "qui": "Narrateur",
        "texte": "Un nom : Aïcha. Et quatre mots : « Tu n'as pas changé. »"
      },
      {
        "t0": 82.36,
        "t1": 95.24,
        "qui": "Narrateur",
        "texte": "Diarra connaît ce nom. Toute la famille d'Iba connaît ce nom. Aïcha. La fiancée d'avant. Celle qui était partie en Italie, il y a huit ans. Celle que la mère d'Iba appelle encore… « la fille polie »."
      },
      {
        "t0": 96.59,
        "t1": 102.27,
        "qui": "Narrateur",
        "texte": "Quelque chose se serre dans la poitrine de Diarra. Comme une main. Son cœur bat dans ses oreilles."
      },
      {
        "t0": 102.62,
        "t1": 108.3,
        "qui": "Diarra",
        "texte": "Depuis quand ? Pourquoi elle lui écrit à minuit ? Pourquoi il ne m'a rien dit ?"
      },
      {
        "t0": 109.65,
        "t1": 112.77,
        "qui": "Narrateur",
        "texte": "L'écran s'éteint… La douche coule toujours."
      },
      {
        "t0": 115.12,
        "t1": 116.96,
        "qui": "Iba",
        "texte": "Lu xew ? (Qu'est-ce qui se passe ?)… Qu'est-ce qu'il y a ?"
      },
      {
        "t0": 117.31,
        "t1": 118.83,
        "qui": "Diarra",
        "texte": "Rien. Je suis fatiguée."
      },
      {
        "t0": 119.18,
        "t1": 128.22,
        "qui": "Narrateur",
        "texte": "Elle se tourne vers le mur. Iba soupire, prend son téléphone, tape quelque chose… avec un demi-sourire. Puis il éteint la lumière."
      },
      {
        "t0": 129.57,
        "t1": 136.53,
        "qui": "Narrateur",
        "texte": "Diarra garde les yeux ouverts dans le noir. Elle compte les respirations de son mari… Et elle se demande ce qu'il a répondu."
      },
      {
        "t0": 138.38,
        "t1": 143.98,
        "qui": "Narrateur",
        "texte": "Quatre mots. Il a suffi de quatre mots… pour que la nuit change de couleur."
      },
      {
        "t0": 145.83,
        "t1": 153.43,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, ce soir-là… qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 158.26,
        "t1": 160.58,
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
        "t": 61.72,
        "image": "cas-vu-de-minuit-ep1-resiste.webp"
      },
      {
        "t": 71.52,
        "image": "cas-vu-de-minuit-ep1.webp"
      },
      {
        "t": 115.12,
        "image": "cas-vu-de-minuit-ep1-froid.webp"
      },
      {
        "t": 119.18,
        "image": "cas-vu-de-minuit-ep1-sourire.webp"
      },
      {
        "t": 128.57,
        "image": "cas-vu-de-minuit-ep1-nuit.webp"
      },
      {
        "t": 145.83,
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
    "duree": 145.86,
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
        "t1": 49.91,
        "qui": "Iba",
        "texte": "Pourquoi je dois toujours tout expliquer ? L'année dernière, ma collègue Ndéye, tu m'as fait la tête une semaine. Cette fois, je n'ai rien dit, parce que je savais que ça finirait comme ça."
      },
      {
        "t0": 50.26,
        "t1": 52.82,
        "qui": "Diarra",
        "texte": "Comme quoi ? Comme une femme qui demande la vérité ?"
      },
      {
        "t0": 53.17,
        "t1": 54.93,
        "qui": "Iba",
        "texte": "Comme un tribunal !"
      },
      {
        "t0": 55.28,
        "t1": 60.08,
        "qui": "Narrateur",
        "texte": "Sa voix monte. La sienne aussi. Puis Iba se lève, prend une natte, et sort."
      },
      {
        "t0": 60.43,
        "t1": 63.39,
        "qui": "Iba",
        "texte": "Je dors sur la terrasse. J'ai besoin d'air."
      },
      {
        "t0": 68.74,
        "t1": 76.1,
        "qui": "Narrateur",
        "texte": "La porte se ferme. Le silence revient. Et sur la table basse, il y a le téléphone. Il l'a oublié."
      },
      {
        "t0": 76.45,
        "t1": 83.73,
        "qui": "Narrateur",
        "texte": "Diarra connaît le code : la date de leur mariage. Il le lui avait donné un jour, en riant : « Je n'ai rien à cacher. »"
      },
      {
        "t0": 85.56,
        "t1": 89.08,
        "qui": "Narrateur",
        "texte": "Son propre téléphone vibre. C'est Coumba, réveillée elle aussi."
      },
      {
        "t0": 89.43,
        "t1": 90.95,
        "qui": "Coumba",
        "texte": "Alors ?"
      },
      {
        "t0": 91.3,
        "t1": 96.1,
        "qui": "Diarra",
        "texte": "Il dit que c'est rien. Il est sorti. Il a laissé son téléphone."
      },
      {
        "t0": 96.45,
        "t1": 102.53,
        "qui": "Coumba",
        "texte": "Waaw, xooleu ko ! (Oui, regarde-le !) Maintenant ou jamais. Tu dormiras mieux après."
      },
      {
        "t0": 102.88,
        "t1": 105.6,
        "qui": "Narrateur",
        "texte": "Diarra prend le téléphone. Il est encore tiède."
      },
      {
        "t0": 105.95,
        "t1": 108.03,
        "qui": "Narrateur",
        "texte": "Son pouce est juste au-dessus de l'écran."
      },
      {
        "t0": 111.38,
        "t1": 116.9,
        "qui": "Narrateur",
        "texte": "Dehors, elle entend Iba tousser sur la terrasse. Dans sa poitrine, la main serre plus fort que jamais."
      },
      {
        "t0": 117.25,
        "t1": 125.49,
        "qui": "Diarra",
        "texte": "Si je regarde, je saurai. Si je ne regarde pas, je ne dormirai pas. Ou peut-être que c'est l'inverse."
      },
      {
        "t0": 127.34,
        "t1": 134.94,
        "qui": "Narrateur",
        "texte": "Ce soir, c'est toi qui décides. Le choix le plus voté sera la suite de l'histoire. À sa place, qu'est-ce que tu fais ? Vote, juste en dessous."
      },
      {
        "t0": 139.77,
        "t1": 144.01,
        "qui": "Narrateur",
        "texte": "La suite dépend de vous. Rendez-vous demain soir, à vingt heures."
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
        "t": 60.43,
        "image": "cas-vu-de-minuit-ep3-natte.webp"
      },
      {
        "t": 68.74,
        "image": "cas-vu-de-minuit-ep3-table.webp"
      },
      {
        "t": 84.08,
        "image": "cas-vu-de-minuit-ep3-coumba.webp"
      },
      {
        "t": 102.88,
        "image": "cas-vu-de-minuit-ep3.webp"
      },
      {
        "t": 105.95,
        "image": "cas-vu-de-minuit-ep3-pouce.webp"
      },
      {
        "t": 127.34,
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
    "duree": 164.48,
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
        "t1": 102.67,
        "qui": "Iba",
        "texte": "Je ne t'ai rien dit parce que, l'année dernière, avec Ndeye, tu m'as fait la tête une semaine. Je me suis dit : si je ne dis rien, il n'y aura pas de problème. Mais c'est le silence qui a fait le problème. Et je vais être honnête aussi. Quand tu appelles six fois, ou quand tu ne parles plus, je me sens comme un voleur. Alors je m'éloigne. Je viens dormir dehors."
      },
      {
        "t0": 103.02,
        "t1": 106.46,
        "qui": "Diarra",
        "texte": "Et moi, quand tu t'éloignes… j'appelle encore plus."
      },
      {
        "t0": 107.61,
        "t1": 111.45,
        "qui": "Narrateur",
        "texte": "Ils se regardent. Pour la première fois de la soirée, Iba sourit, un peu."
      },
      {
        "t0": 111.8,
        "t1": 113.72,
        "qui": "Iba",
        "texte": "On tourne en rond, hein ?"
      },
      {
        "t0": 114.07,
        "t1": 116.07,
        "qui": "Diarra",
        "texte": "Comme deux chèvres autour du même piquet."
      },
      {
        "t0": 116.42,
        "t1": 119.54,
        "qui": "Narrateur",
        "texte": "Il rit. Elle aussi. Ça ne règle pas tout."
      },
      {
        "t0": 119.89,
        "t1": 122.61,
        "qui": "Narrateur",
        "texte": "Il lui tend son téléphone ; elle secoue la tête."
      },
      {
        "t0": 122.96,
        "t1": 124.96,
        "qui": "Diarra",
        "texte": "Je n'en ai pas besoin. Dis-moi, c'est tout."
      },
      {
        "t0": 125.31,
        "t1": 139.55,
        "qui": "Narrateur",
        "texte": "Il lui raconte : la photo du foot, le garagiste, et ce message bête où il a écrit qu'il préférait rester discret, pour éviter les histoires. Elle a mal un instant. Puis elle comprend : il ne la cachait pas, elle. Il cachait la dispute."
      },
      {
        "t0": 140.9,
        "t1": 143.22,
        "qui": "Narrateur",
        "texte": "La main dans sa poitrine a desserré ses doigts."
      },
      {
        "t0": 145.07,
        "t1": 149.55,
        "qui": "Narrateur",
        "texte": "Il y a des peurs qui se déguisent en colère. Celle-là, Diarra l'a dite à voix haute."
      },
      {
        "t0": 151.4,
        "t1": 155.48,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 160.31,
        "t1": 162.63,
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
        "t": 107.61,
        "image": "cas-vu-de-minuit-ep4b-rire.webp"
      },
      {
        "t": 140.9,
        "image": "cas-vu-de-minuit-ep4b-aube.webp"
      },
      {
        "t": 151.4,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  }
};
