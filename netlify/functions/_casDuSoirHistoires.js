/**
 * _casDuSoirHistoires — les histoires du « Cas du soir » (données seulement, lues par cas-du-soir.js).
 * Le texte des épisodes payants ne part jamais dans l'appli : le serveur ne l'envoie qu'à qui y a droit.
 *
 * FORMAT D'UNE HISTOIRE
 * {
 *   id, titre,                          identifiant (lettres, chiffres, tirets) et titre. L'id ne change JAMAIS (adresses, votes,
 *                                       achats enregistrés) ; le titre se change ici, et seulement ici (aucun autre fichier ne le recopie)
 *   accroche, accroches: { '1': … },    la ligne de la carte de l'accueil (par épisode paru, sinon « accroche »)
 *   depart: 'AAAA-MM-JJ', heure: 'HH:MM' l'OUVERTURE PUBLIQUE (heure de Dakar = UTC) : à partir de là chaque lecteur a son propre
 *                                       rythme (voir _casDuSoir.js) : l'horloge démarre à sa première ouverture de l'épisode 1 avec
 *                                       un compte, et l'épisode n s'ouvre gratuitement le (n-1)-ième soir après, à cette heure
 *   programmee: true|false              false : aucune date publique (rien ne s'ouvre), seul l'aperçu du propriétaire fonctionne.
 *                                       Le jour où la date est fixée : mettre depart, heure, et programmee: true
 *   decisionJours: 3                    le vote de l'embranchement est UNE décision pour tous, figée à l'ouverture publique + ce
 *                                       nombre de jours (à l'heure ci-dessus). Un lecteur qui commence le jour J vote à l'épisode 3
 *                                       le soir de J+2 : avec 3, seuls ceux qui commencent le jour de l'ouverture votent à temps
 *   embranchement: 3,                   le vote de cet épisode décide de la suite (2 choix, A et B)
 *   egalite: 'B', minVotes: 30          égalité, ou moins de minVotes votes à l'embranchement : cette suite-là
 *   testLie, testAussi                  tests proposés à la fin (identifiants du catalogue)
 *   image,                              la couverture (16:9), un fichier public de public/images/cas-du-soir/ (webp, 150 Ko au plus)
 *   intrigue,                           la bande-annonce audio (40 à 60 s, gratuite, publique) : public/audio/cas-du-soir/{id}-intrigue.mp3
 *                                       (environ 0,5 Mo) ; tant que le fichier n'y est pas, le lecteur ne s'affiche pas
 *   intrigueMinutage,                   la clé du minutage de l'intrigue (_casDuSoirMinutages.js)
 *   avertissement,                      la mention toujours visible en bas
 *   autreFin: { mention },              bonus après la fin : l'autre chemin (prix PRIX.autreFin)
 *   episodes: [                         5 épisodes ; après l'embranchement, deux versions { A: {...}, B: {...} }
 *     { titre, voix, texte, image, audio, minutes, question, choix: [{ id, label, echo }] }
 *       image : l'image en tête de l'épisode (4:3), publique, dans public/images/cas-du-soir/ ; absente : fond dégradé
 *       voix : indications pour l'enregistrement (jamais affichées) ; texte : paragraphes séparés par une ligne vide,
 *       une réplique par ligne ; audio : chemin dans Firebase Storage, casDuSoir/{id}/ep2.mp3 … pour un épisode payant (lien
 *       signé, donné seulement à qui y a droit) ; ou un fichier public « /audio/cas-du-soir/{id}-ep1.mp3 » pour un épisode
 *       gratuit pour tous (l'épisode 1). Fichier absent : le lecteur se masque et le texte s'affiche seul.
 *       minutage : la clé d'un minutage de _casDuSoirMinutages.js (texte surligné pendant l'écoute, images qui changent)
 *       choix : 3 réponses (2 à l'embranchement) ; echo : la phrase montrée après ce choix
 *   ],
 *   fin: { titre, texte, audio, quiz: [{ question, reponses: [3], bonne: index, explication }], apresQuiz }
 * }
 *
 * « Le vu de minuit » : recopié de docs/agents/rapports/2026-11-10-cas-du-soir-pilote.md (direction, 10/11/2026), mot pour mot.
 * Adaptations de forme seulement : le repère « NARRATRICE : » retiré du texte affiché (les autres noms de personnages gardés),
 * les italiques de mise en page retirées (*(traduction)* devient (traduction)), les lettres A/B/C des réponses portées par « id ».
 * Pas encore de date publique (programmee: false) : le propriétaire le parcourt en aperçu.
 */

const VU_DE_MINUIT = {
  "id": "vu-de-minuit",
  "titre": "Le message de minuit",
  "image": "/images/cas-du-soir/cas-vu-de-minuit-couverture.webp",
  "intrigue": "/audio/cas-du-soir/vu-de-minuit-intrigue.mp3",
  "intrigueMinutage": "vu-de-minuit-intrigue",
  "accroche": "Un message s'allume sur le téléphone d'Iba. Diarra n'a lu que quatre mots.",
  "accroches": {
    "1": "Un message s'allume sur le téléphone d'Iba. Diarra n'a lu que quatre mots.",
    "2": "Six appels dans la journée. Un silence le soir.",
    "3": "Le téléphone est sur la table. Ce soir, c'est toi qui décides."
  },
  "depart": "2030-01-01",
  "heure": "20:00",
  "programmee": false,
  "embranchement": 3,
  "decisionJours": 4,
  "egalite": "B",
  "minVotes": 30,
  "testLie": "ecr_r",
  "testAussi": "bonus_jalousie",
  "avertissement": "Histoire inventée. Toute ressemblance avec des personnes réelles serait une coïncidence. Si elle te touche de près, le compagnon est là pour en parler.",
  "autreFin": {
    "mention": "La majorité avait choisi l'autre chemin. Découvre ce qui se serait passé."
  },
  "episodes": [
    {
      "titre": "Quatre mots",
      "voix": "narratrice calme, voix de veillée, avec des pauses. Diarra fatiguée, puis tendue. Iba fatigué mais doux. Monter la tension au moment de l'écran qui s'allume, puis ralentir.",
      "texte": "Il est presque minuit aux Parcelles Assainies. Le salon de Diarra a fermé à 21 heures, mais ses doigts sentent encore le karité. Trois tresses aujourd'hui, une cliente en retard, les pieds qui brûlent. Elle est fatiguée. Mais elle ne dort pas. Elle attend.\n\nIba rentre à 23 h 40. Il répare des antennes pour un opérateur téléphonique : quand une antenne tombe en panne à Keur Massar, c'est lui qu'on appelle. Il pose son casque, son sac, et son téléphone sur la table basse, l'écran vers le haut.\n\nIBA : Nanga def, sama soxna ? (Comment vas-tu, ma femme ?)\nDIARRA : Maa ngi fi. (Je suis là.) Tu as mangé ?\nIBA : Un peu, avec l'équipe. Je prends une douche.\n\nIl disparaît dans le couloir. Le téléphone reste là. Diarra ne le regarde pas. Elle n'est pas comme ça. Elle se le répète.\n\nEt puis l'écran s'allume.\n\nUn message. Juste l'aperçu, quatre mots, et un nom : « Aïcha : Tu n'as pas changé », avec un petit sourire.\n\nDiarra connaît ce nom. Toute la famille d'Iba connaît ce nom. Aïcha, la fiancée d'avant. Celle qui était partie en Italie il y a huit ans. Celle que Yaay Fatou, la mère d'Iba, appelle encore « la fille polie ».\n\nQuelque chose se serre dans la poitrine de Diarra. Comme une main. Son cœur bat dans ses oreilles. Depuis quand ? Pourquoi elle lui écrit à minuit ? Pourquoi il ne m'a rien dit ?\n\nL'écran s'éteint. La douche coule toujours.\n\nQuand Iba revient, il voit tout de suite son visage.\n\nIBA : Lu xew ? (Qu'est-ce qui se passe ?)\nDIARRA : Rien. Je suis fatiguée.\n\nElle se tourne vers le mur. Lui soupire, prend son téléphone, tape quelque chose avec un demi-sourire, et éteint la lumière.\n\nDiarra garde les yeux ouverts dans le noir. Elle compte les respirations de son mari. Elle se demande ce qu'il a répondu.\n\nQuatre mots. Il a suffi de quatre mots pour que la nuit change de couleur.",
      "image": "/images/cas-du-soir/cas-vu-de-minuit-ep1.webp",
      "audio": "/audio/cas-du-soir/vu-de-minuit-ep1.mp3",
      "minutage": "vu-de-minuit-ep1",
      "minutes": 2,
      "question": "Ce soir-là, à la place de Diarra, qu'aurais-tu fait ?",
      "choix": [
        {
          "id": "A",
          "label": "Lui demander tout de suite, calmement : « C'est qui, Aïcha ? »",
          "echo": "Demander tout de suite demande du courage : la peur pousse plutôt à se taire ou à fouiller."
        },
        {
          "id": "B",
          "label": "Ne rien dire, et observer les jours suivants.",
          "echo": "Se taire évite la dispute ce soir, mais la question continue de tourner dans la tête."
        },
        {
          "id": "C",
          "label": "Attendre qu'il dorme, et regarder son téléphone.",
          "echo": "Beaucoup y pensent. Ce geste calme la peur une minute, et la relance souvent ensuite."
        }
      ]
    },
    {
      "titre": "Six appels",
      "voix": "rythme plus rapide au début (l'énumération des heures), presque haché. Coumba vive et moqueuse. Yaay Fatou lente et grave. Fin froide et silencieuse.",
      "texte": "Le lendemain, Diarra n'a rien dit. Mais elle n'a pensé qu'à ça.\n\nÀ 9 heures, elle regarde si Iba est « en ligne ». À 10 heures, elle écrit : « Tu es où ? » Pas de réponse. À 11 heures : « Tu as mangé ? » À midi, un appel. Puis deux. À 14 heures, un message vocal où elle rit un peu trop fort. À 15 heures, encore un appel. Six en tout.\n\nIba finit par décrocher, essoufflé, avec le vent dans le micro.\n\nIBA : Diarra, je suis à trente mètres de haut ! Qu'est-ce qu'il y a ?\nDIARRA : Rien… Je voulais juste entendre ta voix.\nIBA : Bon. Je te rappelle.\n\nIl ne rappelle pas.\n\nAu salon, Coumba tresse une cliente à côté d'elle. Diarra lui a tout raconté, à voix basse. Coumba fait claquer sa langue.\n\nCOUMBA : Aïcha ? La fille d'Italie ? Dafa am lu muy nëbb. (Il cache quelque chose.) Un homme qui ne dit rien, c'est un homme qui prépare quelque chose.\nDIARRA : Il n'est pas comme ça…\nCOUMBA : Ils sont tous « pas comme ça », jusqu'au jour où on t'annonce la deuxième !\n\nLa cliente éclate de rire. Diarra, non.\n\nEn fin d'après-midi, elle passe chez Yaay Fatou, sa belle-mère, qui habite la maison d'à côté. La vieille dame la regarde longtemps.\n\nYAAY FATOU : Tu as la tête de quelqu'un qui n'a pas dormi. Écoute, ma fille. Un foyer, ça tient avec le muñ. (La patience.) Toi, tu restes digne.\n\nDiarra hoche la tête. Muñ. Elle ne sait pas si ça veut dire attendre, ou se taire.\n\nIba rentre à 22 heures. Il tient une petite boîte de thiakry, le dessert de mil qu'elle adore. Comme avant. Elle ne la prend pas. Elle sert le repas sans un mot, mange debout, lave son assiette.\n\nIBA : Diarra, qu'est-ce que j'ai fait ?\nDIARRA : Tu sais très bien.\nIBA : Non, je ne sais pas ! Six appels aujourd'hui, et maintenant le silence ?\n\nIl s'assied devant la télévision. Elle part dans la chambre. Entre eux, le mur de la cuisine. Et quelque chose de plus épais que le mur.\n\nElle voulait qu'il vienne vers elle. Lui ne savait plus comment s'approcher.",
      "image": "/images/cas-du-soir/cas-vu-de-minuit-ep2.webp",
      "audio": "casDuSoir/vu-de-minuit/ep2.mp3",
      "minutage": "vu-de-minuit-ep2",
      "minutes": 2,
      "question": "Ce soir, que devrait faire Diarra ?",
      "choix": [
        {
          "id": "A",
          "label": "Lui dire ce qu'elle a ressenti en voyant le message.",
          "echo": "Dire ce qu'on ressent, c'est le plus simple à écrire, et le plus dur à faire."
        },
        {
          "id": "B",
          "label": "Continuer à bouder jusqu'à ce qu'il comprenne tout seul.",
          "echo": "Bouder, c'est souvent crier « viens me chercher » sans mots. L'autre ne l'entend pas toujours."
        },
        {
          "id": "C",
          "label": "Écrire directement à Aïcha.",
          "echo": "Aller voir l'« autre » donne l'impression d'agir, mais la vraie question est entre Diarra et Iba."
        }
      ]
    },
    {
      "titre": "Le code",
      "voix": "dispute réaliste, des voix qui montent sans hurler. Après la porte, long silence (2 secondes). La dernière partie est chuchotée, intérieure. La phrase sur le vote, à la fin, est dite plus directement, face à l'auditeur.",
      "texte": "Il est une heure du matin. Diarra n'a pas tenu. Elle sort de la chambre.\n\nDIARRA : C'est qui, Aïcha ?\n\nIba lève les yeux de la télé. Une seconde de trop.\n\nIBA : Aïcha… c'est Aïcha. Tu sais bien. C'était il y a huit ans.\nDIARRA : Et pourquoi elle t'écrit à minuit « tu n'as pas changé » ?\nIBA : J'ai mis en statut une vieille photo de l'équipe de foot du quartier. Elle a répondu. C'est tout.\nDIARRA : Et toi, tu lui as répondu quoi ?\n\nIl se frotte le visage.\n\nIBA : Pourquoi je dois toujours tout expliquer ? L'année dernière, avec ma collègue Ndèye, tu m'as fait la tête une semaine. Je n'ai rien dit cette fois, parce que je savais que ça finirait comme ça.\nDIARRA : Comme quoi ? Comme une femme qui demande la vérité ?\nIBA : Comme un tribunal !\n\nSa voix monte. La sienne aussi. Puis Iba se lève, prend une natte, et sort.\n\nIBA : Je dors sur la terrasse. J'ai besoin d'air.\n\nLa porte se ferme. Le silence revient.\n\nEt sur la table basse, il y a le téléphone. Il l'a oublié. Diarra connaît le code : la date de leur mariage. Il le lui avait donné un jour, en riant : « Je n'ai rien à cacher. »\n\nSon propre téléphone vibre. C'est Coumba, réveillée elle aussi.\n\n« Alors ? »\n« Il dit que c'est rien. Il est sorti. Il a laissé son téléphone. »\n« Waaw, xooleu ko ! (Oui, regarde-le !) Maintenant ou jamais. Tu dormiras mieux après. »\n\nDiarra prend le téléphone. Il est encore tiède. Son pouce est juste au-dessus de l'écran. Dehors, elle entend Iba tousser sur la terrasse. Dans sa poitrine, la main serre plus fort que jamais.\n\nSi je regarde, je saurai. Si je ne regarde pas, je ne dormirai pas. Ou peut-être que c'est l'inverse.\n\nCe soir, c'est toi qui décides. Le choix le plus voté sera la suite de l'histoire.",
      "image": "/images/cas-du-soir/cas-vu-de-minuit-ep3.webp",
      "audio": "casDuSoir/vu-de-minuit/ep3.mp3",
      "minutage": "vu-de-minuit-ep3",
      "minutes": 2,
      "question": "Diarra a le téléphone dans la main. Que doit-elle faire ?",
      "choix": [
        {
          "id": "A",
          "label": "Elle tape le code et lit les messages.",
          "echo": "Vouloir savoir, c'est humain. Reste à voir si savoir suffira à calmer la peur."
        },
        {
          "id": "B",
          "label": "Elle pose le téléphone et va le rejoindre sur la terrasse.",
          "echo": "Aller vers l'autre quand on a peur, c'est le geste le plus risqué, et souvent le plus utile."
        }
      ]
    },
    {
      "A": {
        "titre": "Discrets",
        "voix": "les messages lus d'une voix neutre et plus plate (voix « écran »). Soulagement, puis choc sur « discrets ». La dispute est rapide, et les deux ont mal : aucun méchant.",
        "texte": "Elle tape la date de leur mariage. Le téléphone s'ouvre. WhatsApp. La conversation avec Aïcha est la troisième de la liste.\n\nElle lit vite, le cœur dans la gorge.\n\n« Tu n'as pas changé. »\n« Toi non plus. Bon retour au pays. »\n« Merci ! Tu connais un bon garagiste ? Ma voiture fait un bruit bizarre. »\n« Va voir Pape à Grand-Yoff, dis que tu viens de ma part. »\n\nDiarra respire. C'est tout ? Un garagiste ? Elle a presque envie de rire. Puis elle descend encore, et lit le dernier message. Envoyé hier soir, pendant qu'elle faisait semblant de dormir.\n\n« Ma femme est un peu jalouse. Je préfère qu'on reste discrets, pour éviter les histoires. »\n\nDiscrets. Le mot lui brûle les yeux. Discrets pourquoi ? S'il n'y a rien, pourquoi se cacher ? Elle relit dix fois. Chaque fois, le mot grossit.\n\nIBA : Qu'est-ce que tu fais ?\n\nIba est à la porte. Il est revenu chercher son téléphone. Il voit l'écran allumé dans les mains de sa femme. Sur son visage passent la fatigue, puis la honte, puis la colère.\n\nIBA : Tu fouilles mon téléphone ? Maintenant tu me surveilles, Diarra ?\nDIARRA : Tu préfères rester « discret » avec elle ? C'est ça, ton « rien » ?\nIBA : J'ai écrit ça pour qu'elle arrête de m'écrire le soir ! Pour ne pas avoir de problème avec toi !\nDIARRA : Alors pourquoi tu me l'as caché ?\nIBA : Parce que je savais que tu ferais exactement… ça !\n\nIl montre le téléphone, la nuit, elle. Elle montre le message. Chacun a une preuve dans la main. Chacun a raison. Et chacun a mal.\n\nDans la maison d'à côté, une lumière s'allume. Yaay Fatou a entendu.\n\nElle cherchait la vérité dans le téléphone. Elle y a trouvé un mot. Et ce mot parlait aussi d'elle.",
        "image": "/images/cas-du-soir/cas-vu-de-minuit-ep4A.webp",
        "audio": "casDuSoir/vu-de-minuit/ep4A.mp3",
        "minutage": "vu-de-minuit-ep4a",
        "minutes": 2,
        "question": "À ce moment-là, que ferais-tu à la place de Diarra ?",
        "choix": [
          {
            "id": "A",
            "label": "S'excuser d'avoir fouillé.",
            "echo": "Reconnaître sa part n'efface pas la question : ça permet de la poser autrement."
          },
          {
            "id": "B",
            "label": "Lui demander calmement pourquoi « discrets ».",
            "echo": "Une question sans accusation laisse à l'autre une porte pour répondre."
          },
          {
            "id": "C",
            "label": "Partir cette nuit chez ses parents.",
            "echo": "S'éloigner pour se calmer peut aider, si on dit quand on reviendra en parler."
          }
        ]
      },
      "B": {
        "titre": "La terrasse",
        "voix": "intime, presque à voix basse, des sons de nuit en fond si possible (léger vent). Les aveux de Diarra sont hésitants, avec des pauses. Iba d'abord sur la défensive, puis touché. Un petit rire partagé à la fin.",
        "texte": "Diarra pose le téléphone, l'écran contre la table. Ses mains tremblent un peu. Elle répond à Coumba : « Non. Je vais lui parler. » Et elle éteint aussi son téléphone à elle.\n\nDehors, l'air de la nuit sent le sel et le charbon d'un fourneau voisin. Iba est assis sur la natte, le dos contre le mur, les yeux sur les toits. Il ne se retourne pas.\n\nDIARRA : Tu as oublié ton téléphone.\nIBA : Je sais.\n\nElle s'assied à côté de lui. Pas trop près. Elle cherche ses mots. Ils ne viennent pas comme elle voudrait. Alors elle dit la vérité, telle quelle.\n\nDIARRA : Quand j'ai vu le message… j'ai senti comme une main qui me serrait le cœur. J'ai eu peur. Peur de te perdre. Peur de ne pas être assez. C'est pour ça que j'ai appelé six fois. C'est pour ça que j'ai boudé. Ce n'était pas pour te punir. C'était la peur.\n\nIba se tourne enfin vers elle. Il s'attendait à une dispute. Il ne sait pas quoi faire d'une peur.\n\nIBA : Tu as eu peur… de moi ?\nDIARRA : Non. Pour nous.\n\nIl se tait longtemps. Puis :\n\nIBA : Je ne t'ai rien dit parce que, l'année dernière, avec Ndèye, tu m'as fait la tête une semaine. Je me suis dit : si je ne dis rien, il n'y aura pas de problème. Mais c'est le silence qui a fait le problème. Et je vais être honnête aussi. Quand tu appelles six fois, ou quand tu ne parles plus, je me sens comme un voleur. Alors je m'éloigne. Je viens dormir dehors.\nDIARRA : Et moi, quand tu t'éloignes… j'appelle encore plus.\n\nIls se regardent. Pour la première fois de la soirée, Iba sourit, un peu.\n\nIBA : On tourne en rond, hein ?\nDIARRA : Comme deux chèvres autour du même piquet.\n\nIl rit. Elle aussi. Ça ne règle pas tout. Il lui tend son téléphone ; elle secoue la tête : « Je n'en ai pas besoin. Dis-moi, c'est tout. » Il lui raconte : la photo du foot, le garagiste, et ce message bête où il a écrit qu'il préférait « rester discret » pour éviter les histoires. Elle a mal un instant. Puis elle comprend : il ne la cachait pas, elle. Il cachait la dispute.\n\nLa main dans sa poitrine a desserré ses doigts.\n\nIl y a des peurs qui se déguisent en colère. Celle-là, Diarra l'a dite à voix haute.",
        "image": "/images/cas-du-soir/cas-vu-de-minuit-ep4B.webp",
        "audio": "casDuSoir/vu-de-minuit/ep4B.mp3",
        "minutage": "vu-de-minuit-ep4b",
        "minutes": 2,
        "question": "Iba dit que les appels répétés l'étouffent. Que devraient-ils se promettre ?",
        "choix": [
          {
            "id": "A",
            "label": "Diarra arrête d'appeler sans arrêt quand elle a peur.",
            "echo": "Moins d'appels, oui. Mais la peur aura besoin d'un autre chemin pour sortir."
          },
          {
            "id": "B",
            "label": "Iba la rassure plus souvent, sans attendre qu'elle demande.",
            "echo": "Un petit mot avant que la peur monte vaut souvent mieux qu'une longue explication après."
          },
          {
            "id": "C",
            "label": "Les deux : elle dit « j'ai peur » au lieu d'appeler, il répond au lieu de se fermer.",
            "echo": "Quand chacun fait un pas, personne n'a l'impression de céder."
          }
        ]
      }
    },
    {
      "A": {
        "titre": "Le cercle",
        "voix": "Yaay Fatou ferme et apaisante. La badiène lente, avec un sourire dans la voix, sans jamais juger. Les aveux d'Iba et de Diarra sont dits doucement. Fin chaleureuse.",
        "texte": "Cette nuit-là, personne n'est parti. Yaay Fatou est arrivée en boubou de nuit, a fait asseoir tout le monde, et a dit seulement :\n\nYAAY FATOU : Ndank ndank. (Doucement, doucement.) Demain, vous parlez. Ce soir, vous dormez.\n\nLe lendemain soir, ils sont tous les deux chez Tata Ndèye Khady, la badiène d'Iba, à Grand-Yoff. Le thé monte et redescend dans les petits verres. La badiène ne juge personne. Elle pose des questions.\n\nBADIÈNE : Diarra, quand tu as vu ce message, tu as eu peur de quoi ?\nDIARRA : … Qu'il parte. Que je ne compte pas. Que je sois celle qu'on remplace.\nBADIÈNE : Et toi, Iba, pourquoi tu as caché cette conversation ?\nIBA : Parce que j'avais peur qu'elle se fâche. Quand elle a peur, elle appelle, elle boude, elle accuse. Alors je me ferme. Je me tais. Je vais dormir dehors.\nBADIÈNE : Et toi, Diarra, quand il se tait, tu fais quoi ?\nDIARRA : J'appelle plus. Je boude plus. Je cherche plus.\n\nLa badiène pose son verre.\n\nBADIÈNE : Vous voyez ? Elle court après toi parce que tu t'éloignes. Et tu t'éloignes parce qu'elle court. Vous tournez en rond, comme deux enfants autour d'un baobab. Aïcha n'est pas le problème. Aïcha, c'est juste le vent qui a fait bouger les branches.\n\nUn long silence. Puis Iba dit, très bas :\n\nIBA : Je n'aurais pas dû écrire à Aïcha qu'on resterait discrets. J'aurais dû te le dire, à toi.\nDIARRA : Et moi, j'aurais dû te dire « j'ai peur », au lieu de chercher dans ton téléphone.\n\nRien n'est réglé. La confiance ne se recoud pas en une soirée. Diarra sent encore la petite main dans sa poitrine. Mais pour la première fois, elle sait comment elle s'appelle : la peur de perdre.\n\nDans le taxi du retour, Iba lui prend la main. Il ne dit rien. Mais ce silence-là n'est pas un mur.\n\nCe soir-là, ils ont arrêté de se battre l'un contre l'autre. Ils ont commencé à se battre ensemble, contre le cercle.",
        "image": "/images/cas-du-soir/cas-vu-de-minuit-ep5A.webp",
        "audio": "casDuSoir/vu-de-minuit/ep5A.mp3",
        "minutage": "vu-de-minuit-ep5a",
        "minutes": 2,
        "question": "Selon toi, qu'est-ce qui aurait le plus aidé, dès le premier soir ?",
        "choix": [
          {
            "id": "A",
            "label": "Que Diarra dise « j'ai eu peur » au lieu de se taire.",
            "echo": "Dire sa peur tôt, c'est souvent éviter dix appels plus tard."
          },
          {
            "id": "B",
            "label": "Qu'Iba parle d'Aïcha avant que le message arrive.",
            "echo": "Un secret, même innocent, fait plus peur que la vérité dite à temps."
          },
          {
            "id": "C",
            "label": "Que Coumba ne s'en mêle pas.",
            "echo": "Les proches veulent nous protéger ; parfois, ils soufflent sur le feu sans le vouloir."
          }
        ]
      },
      "B": {
        "titre": "Le faire-part",
        "voix": "Coumba excitée au début. Pendant la respiration, la narratrice compte lentement (vrais silences de 4 secondes, raccourcis à 2 si c'est trop long à l'écoute). Les messages lus d'une voix « écran ». Fin lumineuse et posée.",
        "texte": "Trois semaines plus tard. Un samedi, au salon, Coumba arrive avec son téléphone levé comme un trophée.\n\nCOUMBA : Diarra ! Tu as vu ? Aïcha se marie ! Elle a envoyé le faire-part à toute l'équipe de foot du quartier… et à Iba.\n\nDiarra sent la vieille chaleur monter. La main dans la poitrine. Iba invité. Iba qui va la revoir. Iba en grand boubou, à quelques pas de celle d'avant. Ses doigts cherchent déjà son téléphone pour appeler.\n\nElle s'arrête. Elle reconnaît la sensation. Elle lui a donné un nom, cette nuit-là, sur la terrasse : la vieille peur.\n\nElle pose ses ciseaux. Elle inspire, en comptant jusqu'à quatre. Elle souffle, en comptant jusqu'à quatre. Une fois. Deux fois. Puis elle n'appelle pas. Elle écrit un seul message :\n\n« Coumba vient de me parler du mariage d'Aïcha. Je sens la vieille peur qui revient. Rien de grave, je voulais juste te le dire. »\n\nLa réponse arrive deux minutes plus tard. Iba est sur une antenne, à Thiaroye.\n\n« Merci de me le dire. J'allais t'en parler ce soir. On y va ensemble si tu veux, ou on n'y va pas. C'est toi qui choisis. Et je ramène du thiakry. »\n\nDiarra sourit à son écran. Coumba se penche.\n\nCOUMBA : Alors ? Il a dit quoi ? Moi, à ta place…\nDIARRA : Coumba. Merci de veiller sur moi, vraiment. Mais ça, je le règle avec lui.\n\nLe soir, Iba rentre avec la petite boîte de thiakry. Cette fois, elle la prend. Ils parlent du mariage. De ce qu'elle ressent. De ce que lui ressent, à revoir une vieille histoire. Ça ne dure pas longtemps. Ce n'est pas un tribunal. Ce sont juste deux personnes qui se racontent leur journée, y compris la partie qui fait peur.\n\nLa peur reviendra sans doute, un autre soir, avec un autre message. Mais maintenant, Diarra sait la reconnaître. Et elle sait qu'elle a le droit de la dire.\n\nCe n'est pas l'absence de peur qui fait un couple solide. C'est ce qu'on en fait, quand elle arrive.",
        "image": "/images/cas-du-soir/cas-vu-de-minuit-ep5B.webp",
        "audio": "casDuSoir/vu-de-minuit/ep5B.mp3",
        "minutage": "vu-de-minuit-ep5b",
        "minutes": 2,
        "question": "Selon toi, qu'est-ce qui a le plus changé chez Diarra ?",
        "choix": [
          {
            "id": "A",
            "label": "Elle reconnaît sa peur avant d'agir.",
            "echo": "Mettre un nom sur ce qu'on ressent donne quelques secondes pour choisir quoi en faire."
          },
          {
            "id": "B",
            "label": "Elle fait davantage confiance à Iba.",
            "echo": "La confiance a grandi parce qu'Iba a répondu, cette fois. Elle se construit à deux."
          },
          {
            "id": "C",
            "label": "Elle écoute moins les avis des autres.",
            "echo": "On peut aimer ses amies et garder pour soi les décisions de son couple."
          }
        ]
      }
    }
  ],
  "fin": {
    "titre": "La leçon de Dr Lô",
    "texte": "Bonsoir. C'est Dr Lô.\n\nTu viens de suivre Diarra et Iba. Et peut-être que, quelque part, tu t'es reconnu. Dans elle, ou dans lui.\n\nCe qui se jouait entre eux a un nom en psychologie. Chacun de nous a un « style d'attachement » : une façon de réagir quand on a peur de perdre quelqu'un qu'on aime. Il se forme tôt, dans l'enfance, et il se réveille dans le couple.\n\nChez Diarra, la peur fait monter une alarme. Et l'alarme pousse à agir, vite : appeler six fois, bouder, fouiller un téléphone. Ce sont des « comportements de protestation ». Ils ne veulent pas dire « je te contrôle ». Ils veulent dire : « Rassure-moi. Dis-moi que je compte. » Le problème, c'est que l'autre entend surtout le reproche.\n\nChez Iba, la tension fait l'inverse : il se ferme, il se tait, il va dormir dehors. Ce n'est pas de l'indifférence. C'est sa façon à lui de se protéger du conflit.\n\nEt les deux s'entretiennent. Plus elle poursuit, plus il se retire. Plus il se retire, plus elle poursuit. C'est le cercle de la poursuite et du retrait. Aïcha n'en était que le déclencheur.\n\nComment le reconnaître chez toi ? Pose-toi trois questions. Est-ce que, quand j'ai peur dans une relation, j'agis tout de suite : messages, appels, vérifications ? Est-ce qu'au contraire je me ferme et je disparais ? Et est-ce que nos disputes se ressemblent toutes, quel que soit le sujet ?\n\nVoici un geste concret pour cette semaine. Quand la peur monte, avant d'agir, respire : quatre secondes pour inspirer, quatre pour souffler. Puis remplace l'accusation par une phrase en trois morceaux : « Quand j'ai vu… j'ai ressenti… j'ai besoin de… » Par exemple : « Quand j'ai vu ce message, j'ai eu peur de te perdre. J'ai besoin que tu me rassures. » Et si toi, tu es plutôt celui qui se ferme, dis simplement : « J'ai besoin de vingt minutes, et je reviens en parler. » Puis reviens.\n\nUn dernier mot. Ressentir de la jalousie ou de la peur n'est pas une faiblesse. Mais si, dans ton couple, la surveillance, les menaces ou la peur deviennent ton quotidien, ce n'est plus un cercle : c'est une souffrance, et tu mérites d'en parler à quelqu'un.\n\nSi tu veux savoir comment, toi, tu réagis quand tu as peur de perdre quelqu'un, le test du style d'attachement est juste en dessous. Et le compagnon est là, si tu veux en parler.\n\nBonne nuit.",
    "audio": "casDuSoir/vu-de-minuit/lecon.mp3",
    "minutage": "vu-de-minuit-lecon",
    "quiz": [
      {
        "question": "Quand Diarra appelle six fois dans la journée, que cherche-t-elle surtout ?",
        "reponses": [
          "Contrôler les déplacements d'Iba",
          "Être rassurée que le lien tient",
          "Le punir pour le message"
        ],
        "bonne": 1,
        "explication": "derrière les appels répétés, il y a souvent une alarme, celle de la peur de perdre, plus qu'une envie de contrôler."
      },
      {
        "question": "Quand quelqu'un se sent poursuivi dans un conflit, que fait-il le plus souvent ?",
        "reponses": [
          "Il se rapproche pour rassurer",
          "Il se ferme ou s'éloigne",
          "Il pose beaucoup de questions"
        ],
        "bonne": 1,
        "explication": "se retirer est sa manière de se protéger, et ce retrait relance la peur de l'autre : c'est le cercle."
      },
      {
        "question": "Quelle phrase a le plus de chances de calmer le cercle ?",
        "reponses": [
          "« Tu me caches quelque chose, je le sais. »",
          "« Quand j'ai vu ce message, j'ai eu peur. J'ai besoin que tu me rassures. »",
          "« Fais ce que tu veux, ça m'est égal. »"
        ],
        "bonne": 1,
        "explication": "dire sa peur et son besoin, sans accuser, laisse à l'autre une place pour répondre au lieu de se défendre."
      }
    ],
    "apresQuiz": "3 sur 3 ? Tu as compris le cercle. Reste à le repérer chez toi."
  }
};

const GOUMIN = require('./_casDuSoirGoumin');

module.exports = { HISTOIRES: [VU_DE_MINUIT, GOUMIN] };
