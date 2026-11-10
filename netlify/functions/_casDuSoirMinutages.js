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
        "image": "cas-vu-de-minuit-ep1-attente.webp"
      },
      {
        "t": 34.84,
        "image": "cas-vu-de-minuit-ep1-retour.webp"
      },
      {
        "t": 72.48,
        "image": "cas-vu-de-minuit-ep1.webp"
      },
      {
        "t": 130.01,
        "image": "cas-vu-de-minuit-ep1-nuit.webp"
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
        "image": "cas-vu-de-minuit-couverture.webp"
      }
    ]
  }
};
