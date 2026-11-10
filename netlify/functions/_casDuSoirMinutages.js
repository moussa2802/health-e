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
    "duree": 163.87,
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
        "t1": 62.33,
        "qui": "Iba",
        "texte": "Un peu, avec l'équipe. Je prends une douche."
      },
      {
        "t0": 62.68,
        "t1": 67.88,
        "qui": "Narrateur",
        "texte": "Le téléphone reste là. Diarra ne le regarde pas. Elle n'est pas comme ça… Elle se le répète."
      },
      {
        "t0": 69.73,
        "t1": 72.13,
        "qui": "Narrateur",
        "texte": "Et puis… l'écran s'allume."
      },
      {
        "t0": 75.46,
        "t1": 77.78,
        "qui": "Narrateur",
        "texte": "Un message. On ne voit que le début."
      },
      {
        "t0": 79.13,
        "t1": 82.97,
        "qui": "Narrateur",
        "texte": "Un nom : Aïcha. Et quatre mots : « Tu n'as pas changé. »"
      },
      {
        "t0": 83.32,
        "t1": 96.2,
        "qui": "Narrateur",
        "texte": "Diarra connaît ce nom. Toute la famille d'Iba connaît ce nom. Aïcha. La fiancée d'avant. Celle qui était partie en Italie, il y a huit ans. Celle que la mère d'Iba appelle encore… « la fille polie »."
      },
      {
        "t0": 97.55,
        "t1": 103.23,
        "qui": "Narrateur",
        "texte": "Quelque chose se serre dans la poitrine de Diarra. Comme une main. Son cœur bat dans ses oreilles."
      },
      {
        "t0": 103.58,
        "t1": 109.26,
        "qui": "Diarra",
        "texte": "Depuis quand ? Pourquoi elle lui écrit à minuit ? Pourquoi il ne m'a rien dit ?"
      },
      {
        "t0": 110.61,
        "t1": 113.73,
        "qui": "Narrateur",
        "texte": "L'écran s'éteint… La douche coule toujours."
      },
      {
        "t0": 116.08,
        "t1": 118.4,
        "qui": "Iba",
        "texte": "Lu xew ? (Qu'est-ce qui se passe ?)… Qu'est-ce qu'il y a ?"
      },
      {
        "t0": 118.75,
        "t1": 120.27,
        "qui": "Diarra",
        "texte": "Rien. Je suis fatiguée."
      },
      {
        "t0": 120.62,
        "t1": 129.66,
        "qui": "Narrateur",
        "texte": "Elle se tourne vers le mur. Iba soupire, prend son téléphone, tape quelque chose… avec un demi-sourire. Puis il éteint la lumière."
      },
      {
        "t0": 131.01,
        "t1": 137.97,
        "qui": "Narrateur",
        "texte": "Diarra garde les yeux ouverts dans le noir. Elle compte les respirations de son mari… Et elle se demande ce qu'il a répondu."
      },
      {
        "t0": 139.82,
        "t1": 145.42,
        "qui": "Narrateur",
        "texte": "Quatre mots. Il a suffi de quatre mots… pour que la nuit change de couleur."
      },
      {
        "t0": 147.27,
        "t1": 154.87,
        "qui": "Narrateur",
        "texte": "Et toi ? À sa place, ce soir-là… qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 159.7,
        "t1": 162.02,
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
        "t": 62.68,
        "image": "cas-vu-de-minuit-ep1-resiste.webp"
      },
      {
        "t": 72.48,
        "image": "cas-vu-de-minuit-ep1.webp"
      },
      {
        "t": 116.08,
        "image": "cas-vu-de-minuit-ep1-froid.webp"
      },
      {
        "t": 120.62,
        "image": "cas-vu-de-minuit-ep1-sourire.webp"
      },
      {
        "t": 130.01,
        "image": "cas-vu-de-minuit-ep1-nuit.webp"
      },
      {
        "t": 147.27,
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
    "duree": 168.88,
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
        "t1": 51.51,
        "qui": "Iba",
        "texte": "Diarra, je suis à trente mètres de haut ! Qu'est-ce qu'il y a ?"
      },
      {
        "t0": 51.86,
        "t1": 54.82,
        "qui": "Diarra",
        "texte": "Rien… Je voulais juste entendre ta voix."
      },
      {
        "t0": 55.17,
        "t1": 57.33,
        "qui": "Iba",
        "texte": "Bon. Je te rappelle."
      },
      {
        "t0": 57.68,
        "t1": 60.16,
        "qui": "Narrateur",
        "texte": "Il ne rappelle pas."
      },
      {
        "t0": 61.31,
        "t1": 68.27,
        "qui": "Narrateur",
        "texte": "Au salon, Coumba tresse une cliente à côté d'elle. Diarra lui a tout raconté, à voix basse. Coumba fait claquer sa langue."
      },
      {
        "t0": 68.62,
        "t1": 77.5,
        "qui": "Coumba",
        "texte": "Aïcha ? La fille d'Italie ? Dafa am lu muy nëbb. (Il cache quelque chose.) Un homme qui ne dit rien, c'est un homme qui prépare quelque chose."
      },
      {
        "t0": 77.85,
        "t1": 78.81,
        "qui": "Diarra",
        "texte": "Il n'est pas comme ça…"
      },
      {
        "t0": 79.16,
        "t1": 83.48,
        "qui": "Coumba",
        "texte": "Ils sont tous « pas comme ça », jusqu'au jour où on t'annonce la deuxième !"
      },
      {
        "t0": 83.83,
        "t1": 86.79,
        "qui": "Narrateur",
        "texte": "La cliente éclate de rire. Diarra, non."
      },
      {
        "t0": 87.14,
        "t1": 92.98,
        "qui": "Narrateur",
        "texte": "En fin d'après-midi, elle passe chez sa belle-mère, juste à côté. Yaay Fatou la regarde longtemps."
      },
      {
        "t0": 93.33,
        "t1": 102.37,
        "qui": "Yaay Fatou",
        "texte": "Tu as la tête de quelqu'un qui n'a pas dormi. Écoute, ma fille. Un foyer, ça tient avec le muñ. (La patience.) Toi, tu restes digne."
      },
      {
        "t0": 102.72,
        "t1": 108.64,
        "qui": "Narrateur",
        "texte": "Diarra hoche la tête. Muñ. Elle ne sait pas si ça veut dire attendre, ou se taire."
      },
      {
        "t0": 113.79,
        "t1": 121.39,
        "qui": "Narrateur",
        "texte": "Iba rentre à vingt-deux heures. Il tient une petite boîte de thiakry, le dessert de mil qu'elle adore. Comme avant. Elle ne la prend pas."
      },
      {
        "t0": 125.74,
        "t1": 129.42,
        "qui": "Narrateur",
        "texte": "Elle sert le repas sans un mot, mange debout, lave son assiette."
      },
      {
        "t0": 129.77,
        "t1": 131.69,
        "qui": "Iba",
        "texte": "Diarra, qu'est-ce que j'ai fait ?"
      },
      {
        "t0": 132.04,
        "t1": 133.64,
        "qui": "Diarra",
        "texte": "Tu sais très bien."
      },
      {
        "t0": 133.99,
        "t1": 138.63,
        "qui": "Iba",
        "texte": "Non, je ne sais pas ! Six appels aujourd'hui, et maintenant le silence ?"
      },
      {
        "t0": 138.98,
        "t1": 146.9,
        "qui": "Narrateur",
        "texte": "Il s'assied devant la télévision. Elle part dans la chambre. Entre eux, le mur de la cuisine. Et quelque chose de plus épais que le mur."
      },
      {
        "t0": 148.75,
        "t1": 153.15,
        "qui": "Narrateur",
        "texte": "Elle voulait qu'il vienne vers elle. Lui ne savait plus comment s'approcher."
      },
      {
        "t0": 155,
        "t1": 159.88,
        "qui": "Narrateur",
        "texte": "Et toi ? Si tu étais à la place de Diarra… qu'est-ce que tu aurais fait ? Vote, juste en dessous."
      },
      {
        "t0": 164.71,
        "t1": 167.03,
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
        "t": 61.31,
        "image": "cas-vu-de-minuit-ep2.webp"
      },
      {
        "t": 87.14,
        "image": "cas-vu-de-minuit-yaay.webp"
      },
      {
        "t": 109.79,
        "image": "cas-vu-de-minuit-ep2-thiakry.webp"
      },
      {
        "t": 121.74,
        "image": "cas-vu-de-minuit-ep2-assiette.webp"
      },
      {
        "t": 129.77,
        "image": "cas-vu-de-minuit-ep2-dispute.webp"
      },
      {
        "t": 138.98,
        "image": "cas-vu-de-minuit-ep2-mur.webp"
      },
      {
        "t": 155,
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  }
};
