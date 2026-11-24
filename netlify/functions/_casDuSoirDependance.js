/**
 * _casDuSoirDependance — « Amour ou dépendance affective » : le cinquième cas du soir (santé mentale, tout public) : apprendre à faire la différence entre aimer et dépendre,
 * les cinq questions, l'enfance, le silence après une rupture, le plan, avec des tests proposés à la fin des épisodes 2, 3, 5 et 6. Écrit le 19/11/2026.
 * 7 épisodes, sans embranchement. Textes et sources : Claude outputs/cas-du-soir/cas5/ (construire_js.py). « cache: true » : en construction, seul le propriétaire le voit.
 */
module.exports = {
  "id": "amour-ou-dependance",
  "titre": "Amour ou dépendance affective",
  "categorie": "mentale",
  "image": "/images/cas-du-soir/dependance-couverture.webp",
  "intrigue": "/audio/cas-du-soir/amour-ou-dependance-intrigue.mp3",
  "intrigueMinutage": "amour-ou-dependance-intrigue",
  "accroche": "Six ans d'amour, et depuis trois semaines pas un mot. Binta ne sait plus si elle aime, ou si elle a peur.",
  "accroches": {
    "1": "Vu à 23 h 12. Il est en ligne. Il ne répond pas.",
    "2": "Cinq questions pour faire la différence entre aimer et dépendre.",
    "3": "« Tu es collante. » Une phrase de sa mère, et une enfance qui revient.",
    "4": "Trois heures du matin. Un appel, deux phrases, un silence.",
    "5": "Elle a disparu de sa propre vie. Un coiffeur avoue la même peur.",
    "6": "Une rechute n'est pas un échec. Un cahier, un plan, une phrase.",
    "7": "Quatre mois plus tard, une absence, et une autre façon de réagir."
  },
  "depart": "2026-11-25",
  "heure": "20:00",
  "programmee": true,
  "debloquer": 30,
  "prixSuite": {
    "2": 4,
    "3": 6,
    "4": 6,
    "5": 8,
    "6": 8,
    "7": 10
  },
  "testLie": "bonus_dependance",
  "testAussi": "ecr_r",
  "avertissement": "Histoire inspirée de faits réels, vus en consultation. Les prénoms, les lieux et les détails ont été changés pour que personne ne puisse être reconnu. Si elle te touche de près, le compagnon est là pour en parler.",
  "episodes": [
    {
      "titre": "Vu à 23 h 12",
      "texte": "Dakar, Fass. Vingt-trois heures douze. Binta est assise sur son lit, le téléphone serré dans les deux mains. Sous son dernier message à Mamadou, deux petites coches bleues : vu. Il est en ligne depuis quatre minutes. Il n'a pas répondu. Il ne répond plus depuis vingt et un jours.\n\nElle écrit : « Je ne t'en veux pas. Dis-moi seulement ce que j'ai fait. » Elle efface. Elle écrit : « Tu me manques. » Elle efface. Elle écrit un point d'interrogation, et le regarde longtemps. Le téléphone vibre. C'est Fanta.\n\nFANTA : Binta ? Tu dors ?\nBINTA : Il est en ligne.\nFANTA : Binta. Pose ce téléphone.\nBINTA : Je ne peux pas. Si je le pose, et qu'il écrit, et que je ne vois pas tout de suite…\nFANTA : Et s'il n'écrit pas ?\n\nBinta ne répond pas. Elle est sage-femme. Toute la journée, elle dit à des femmes qui ont peur : respire, je suis là, ça va aller. Elle ne sait pas se le dire à elle-même.\n\nSix ans avec Mamadou. Les dimanches chez sa mère, le projet de mariage, la date presque fixée. Puis un désaccord, une soirée où les familles devaient se rencontrer. Il avait dit : « Je ne veux plus en parler. » Et depuis, plus rien. Même pas une explication.\n\nSur la table de nuit, sa mère lui avait dit au téléphone, l'autre jour : « Tu l'as étouffé. Tu es trop collante, Binta. » Le mot tourne dans sa tête. Collante. Dépendante. Elle ouvre le navigateur et tape une phrase qu'elle n'a jamais dite à personne. Elle tombe sur la boîte à questions du site de Dr Lô, anonyme, sans nom.\n\nElle écrit : « Comment me débarrasser de ma dépendance affective ? » Son doigt reste au-dessus du bouton. Puis elle appuie sur Déposer. Pour la première fois depuis vingt et un jours, elle a fait autre chose que relire une conversation.",
      "question": "À la place de Binta, que ferais-tu cette nuit ?",
      "choix": [
        {
          "id": "A",
          "label": "Je poserais le téléphone dans une autre pièce, et j'essaierais de dormir.",
          "echo": "Mettre de la distance avec l'écran est un des gestes qui aident le plus. Ça ne supprime pas la peur, mais ça la laisse monter, passer, sans qu'elle décide de tout."
        },
        {
          "id": "B",
          "label": "J'enverrais un dernier message « juste pour comprendre ».",
          "echo": "L'envie est forte, et elle est humaine. Mais un message écrit dans cet état cherche souvent à calmer la peur de celui qui écrit, plus qu'à obtenir une vraie réponse."
        },
        {
          "id": "C",
          "label": "J'en parlerais à une amie demain, sans attendre qu'il écrive.",
          "echo": "Parler à une personne sûre est une des meilleures sorties. Ça rappelle qu'il y a d'autres liens que celui qui fait mal."
        }
      ],
      "minutes": 3,
      "voix": "narrateur posé ; Binta à bout de souffle ; Fanta ferme et douce, au téléphone.",
      "image": "/images/cas-du-soir/dependance-ep1.webp",
      "audio": "casDuSoir/dependance/ep1.mp3",
      "minutage": "dependance-ep1"
    },
    {
      "titre": "Un live à vingt heures",
      "texte": "Le lendemain soir, Fanta arrive chez Binta avec des beignets et son téléphone déjà calé contre un pot de sucre.\n\nFANTA : Dr Lô fait un live à vingt heures. Je ne te dis pas de tout croire. Je te dis juste d'écouter.\n\nSur l'écran, des centaines de petits cœurs montent, des commentaires défilent. Un médecin, face caméra, qui lit une question. Binta la reconnaît tout de suite : c'est presque la sienne.\n\nDans les commentaires, quelqu'un écrit : « Comment on sait si c'est de l'amour ou de la dépendance ? »\n\nDR LÔ : Bonsoir à tous. Aimer, ce n'est pas avoir besoin de l'autre pour respirer. Un lien sain, c'est vouloir le bien de l'autre et le tien. La dépendance, c'est quand l'autre est devenu ton calmant : sans lui, la peur prend toute la place.\n\nUn autre commentaire : « Est-ce que c'est une maladie, docteur ? »\n\nDR LÔ : Non. Ni une maladie ni un défaut : une façon d'aimer apprise, qui peut se desserrer. Voici cinq questions pour t'y retrouver. Un : quand il s'absente, suis-je triste, ou en panique ? Deux : puis-je dire non sans peur qu'il parte ? Trois : ai-je encore ma vie, mes amis, mes projets ? Quatre : est-ce que je veux son bonheur, ou que j'ai besoin qu'il me rassure ? Cinq : ma valeur du jour dépend-elle de son message ? Ça vaut pour les hommes comme pour les femmes.\n\nBinta ne dit rien. Elle regarde les petits cœurs monter, ces inconnus qui, eux aussi, viennent chercher une réponse à la même question. Fanta a sorti un stylo et un vieux cahier de maternité. Elle écrit les cinq questions, une sous l'autre, d'une écriture ronde d'écolière.\n\nFANTA : Ça ne vaut pas que pour toi, tu sais. Moi aussi, quand j'étais avec Ibrahima, je regardais mon téléphone toutes les trois minutes. Je ne le disais à personne. Allez, réponds. Honnêtement. Personne ne te regarde.\nBINTA : Un : panique. Deux : je n'ai jamais dit non à Mamadou. Trois : j'ai arrêté le volley et la chorale. Quatre : les deux, je crois. Cinq…\nFANTA : Cinq ?\nBINTA : Cinq, c'est tous les jours.\n\nLe live se termine. Binta a les yeux humides, mais pas tristes : étonnés. Quelqu'un vient de mettre des mots sur ce qu'elle vit, sans la traiter de folle ni de faible.\n\nFANTA : Tu sais, il y a dans le compagnon un test sur le style d'attachement. Ça ne dit pas qui tu es. Ça dit comment tu aimes quand tu as peur. Tu devrais le faire.",
      "question": "À la place de Binta, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je ferais le test sur mon style d'attachement dès ce soir.",
          "echo": "Un test n'est pas un diagnostic, mais il donne un point de départ et des mots. C'est souvent plus facile de changer ce qu'on a pu nommer."
        },
        {
          "id": "B",
          "label": "Je répondrais d'abord seule aux cinq questions, comme elle, en me notant.",
          "echo": "Écrire ses réponses rend la chose plus claire que de les garder dans la tête. Tu peux les relire dans un mois pour voir ce qui bouge."
        },
        {
          "id": "C",
          "label": "Je me dirais que je n'ai pas besoin de tout ça, que ça passera.",
          "echo": "Ça peut passer, mais ce qu'on ne regarde pas revient souvent sous une autre forme. Regarder, ce n'est pas aggraver."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; live de Dr Lô (tes répliques L2-n, plus ouvert) ; Fanta chaleureuse ; Binta qui répond tout bas.",
      "image": "/images/cas-du-soir/dependance-ep2.webp",
      "audio": "casDuSoir/dependance/ep2.mp3",
      "minutage": "dependance-ep2",
      "tests": [
        "ecr_r"
      ]
    },
    {
      "titre": "Ce que Maman dit tout bas",
      "texte": "Dimanche, déjeuner chez Maman Nafi. Le riz au poisson est parfait. Comme toujours, ce n'est pas assez bien : trop de sel, pas assez de piment, Binta a mal découpé le chou. Maman Nafi parle sans lever les yeux de son assiette.\n\nMAMAN NAFI : Mamadou est parti parce que tu l'as étouffé. Je te l'ai dit cent fois : un homme n'aime pas qu'on lui court après. Tu es comme ça depuis toute petite. Collante.\nBINTA : Maman, je ne cours pas après…\nMAMAN NAFI : Et ton père ? Il t'appelle une fois par mois, et toi tu restes plantée devant le téléphone. Tu n'as jamais su faire autrement.\n\nBinta serre sa fourchette. Elle avale. Elle sourit. C'est ce qu'elle a toujours fait : sourire, aider, débarrasser la table avant qu'on le lui demande. Être irréprochable pour ne pas être laissée.\n\nDeux jours plus tard, elle est assise dans le cabinet de Dr Lô, à Point E. Il y a une plante, une fenêtre qui donne sur un manguier. Elle parle longtemps. De Mamadou. De sa mère. Du père qui téléphone une fois par mois. De la petite fille qui apprenait à tout réussir pour qu'on l'aime un peu.\n\nDR LÔ : Merci de me l'avoir dit. Ce que tu décris est très courant, et tu n'es pas « collante » : tu as appris à aimer en craignant de perdre. Ce que vit un enfant qu'on critique beaucoup, ou à qui on donne peu d'affection, laisse des traces. Ça explique. Ça n'excuse pas, et ça ne te fige pas : un lien peut se desserrer, même à vingt-huit ans.\n\nBINTA : Alors pourquoi je me sens toujours obligée de donner plus que les autres ? Quand je rends service, je me sens exister. Quand je ne le fais pas, j'ai peur qu'on ne me garde plus.\n\nDR LÔ : Parce que, pour toi, donner, c'est te mettre à l'abri d'être laissée. Mais ta valeur n'est pas dans ce que tu donnes, ni dans les messages que tu reçois.\n\nBinta sourit pour la première fois depuis longtemps : un vrai sourire, un peu tremblant. Dans le taxi, en rentrant, elle se souvient que Fanta lui a parlé d'un test d'estime de soi, dans le compagnon. Elle l'ouvrira ce soir. Puis elle note dans son téléphone une phrase qu'elle n'avait jamais osé penser : « Ma mère m'aime. Mais elle ne sait pas le dire. »",
      "question": "À la place de Binta, face à une mère qui critique, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je dirais calmement à ma mère que ses mots me font mal, sans l'accuser.",
          "echo": "Dire « ça me fait mal » est plus entendu que « tu me rabaisses ». Ça ne change pas toujours l'autre, mais ça te fait exister dans la conversation."
        },
        {
          "id": "B",
          "label": "Je me tairais encore, et je ferais encore plus d'efforts.",
          "echo": "C'est le réflexe de celle qui a appris que se taire protège. À la longue, c'est épuisant, et ça confirme l'idée qu'il faut mériter l'amour."
        },
        {
          "id": "C",
          "label": "J'en parlerais à un professionnel pour comprendre d'où ça vient.",
          "echo": "Comprendre son histoire sans la juger aide à desserrer ce qui est devenu automatique. Un accompagnement donne un cadre pour le faire."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; Maman Nafi sèche, sans lever les yeux ; consultation de Dr Lô (C3-n, voix posée de cabinet) ; Binta.",
      "image": "/images/cas-du-soir/dependance-ep3.webp",
      "audio": "casDuSoir/dependance/ep3.mp3",
      "minutage": "dependance-ep3",
      "tests": [
        "rses"
      ]
    },
    {
      "titre": "Trois heures du matin, encore",
      "texte": "La semaine suivante, un soir où tout allait presque bien, Binta tombe sur une photo : Mamadou, au mariage d'un ami, souriant. Elle ne l'a pas cherchée, elle est apparue. Le sol disparaît.\n\nÀ trois heures du matin, elle appelle. Elle ne s'est pas décidée à le faire : son pouce l'a fait.\n\nMAMADOU : Allô ?\nBINTA : Mamadou… Ne raccroche pas. Dis-moi seulement pourquoi.\nMAMADOU : Binta, il est trois heures. Je ne peux pas faire ça maintenant.\nBINTA : Quand alors ? Je ne t'ai rien fait. Dis-moi ce que j'ai fait.\nMAMADOU : Je n'ai pas la force d'en parler. Ne m'appelle plus comme ça.\n\nIl a raccroché. Le téléphone reste dans la main de Binta, chaud, silencieux.\n\nÀ l'autre bout de Dakar, Mamadou est assis au bord de son lit, la tête entre les mains. Il ne la déteste pas. Il ne sait pas quoi lui dire. Chaque fois qu'il essaie, il a peur de dire la mauvaise chose, de la faire souffrir davantage, de ne pas être à la hauteur de six ans et d'une famille entière. Alors il se tait. Il éteint son téléphone. Il se dit qu'un silence est plus doux qu'une dispute. Il ne voit pas que, pour elle, ce silence est une porte qui claque.\n\nBinta cherche, dans son téléphone, le numéro que Dr Lô donne à la fin de ses lives : une ligne de nuit, ouverte et anonyme. Elle compose.\n\nDR LÔ : Bonsoir. Je t'écoute. Prends ton temps.\n\nBINTA : Il a raccroché. Je n'arrive plus à respirer. J'ai envie de le rappeler cent fois.\n\nDR LÔ : Je comprends. Ce que tu vis, un silence sans explication, fait très mal : le cerveau cherche une réponse, et à défaut il en invente cent. Ce n'est pas de la faiblesse, c'est humain. Ce soir, pas de grandes décisions. Écris tout ce que tu veux lui dire dans les notes de ton téléphone, sans l'envoyer. Bois de l'eau. Appelle Fanta. Et demain, on regardera ça à tête reposée.\n\nBinta écrit une page entière dans ses notes. Elle ne l'envoie pas. Elle appelle Fanta, qui décroche à la deuxième sonnerie, sans poser de question.",
      "question": "À la place de Binta, à trois heures du matin, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je rappellerais Mamadou : il a peut-être changé d'avis.",
          "echo": "L'espoir est puissant. Mais rappeler dans l'urgence rend souvent la réponse plus dure. Tu risques de te faire encore plus mal."
        },
        {
          "id": "B",
          "label": "J'écrirais tout ce que je ressens dans mes notes, sans l'envoyer, puis j'appellerais une amie.",
          "echo": "Écrire laisse sortir ce qui déborde, sans conséquence. Appeler quelqu'un de sûr remet un lien vivant à côté du lien qui fait mal."
        },
        {
          "id": "C",
          "label": "Je resterais éveillée à relire toute notre conversation, pour comprendre ce qui s'est passé.",
          "echo": "Relire cherche une réponse qui n'y est pas. Souvent, ça entretient la douleur au lieu de l'apaiser."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; Mamadou froid puis démuni ; appel de nuit de Dr Lô (A4-1, très doux, voix de téléphone) ; Binta.",
      "image": "/images/cas-du-soir/dependance-ep4.webp",
      "audio": "casDuSoir/dependance/ep4.mp3",
      "minutage": "dependance-ep4"
    },
    {
      "titre": "Qui je suis sans lui",
      "texte": "Samedi, au salon de coiffure d'Alioune. Fanta s'installe pour des tresses. Binta, qui n'a pas dormi, s'assoit à côté, sur le banc, avec son thé. Alioune coupe, bavarde, rit. C'est un ami d'enfance. Il est de ceux qui sentent quand quelque chose ne va pas.\n\nFANTA : Tu sais ce qui m'a fait peur, Binta ? Pas Mamadou. Toi. Tu as disparu. Il y a un an, tu étais au volley, à la chorale, tu venais à toutes les soirées. Et maintenant ?\nBINTA : Je n'avais plus le temps. Mamadou avait besoin que je sois disponible.\nFANTA : Il te l'a demandé ?\nBINTA : Non. Je pensais que… s'il était content, il resterait.\n\nAlioune pose ses ciseaux. Un silence. Il regarde Binta dans le miroir.\n\nALIOUNE : Je peux te dire un truc ? Moi aussi, je fais ça. Je vérifie le téléphone de ma copine. Quand elle ne répond pas, j'ai chaud dans la poitrine. Je lui ai demandé son mot de passe, deux fois. J'ai honte. Je me dis que je l'aime trop.\nBINTA : Toi, tu surveilles. Moi, je supplie. Ce n'est pas pareil.\nFANTA : C'est le même poison, des deux côtés : la peur qu'on t'abandonne. Et ça ne veut pas dire que tu aimes trop. Ça veut dire que tu as peur.\n\nAlioune hoche la tête. Binta regarde le cahier de Fanta, ouvert sur la table basse, avec les cinq questions. Elle y ajoute une ligne : ce qu'elle faisait avant. Le volley. La chorale. Les dimanches avec sa cousine. Elle les écrit comme on écrit une liste de courses, puis elle s'aperçoit qu'elle a les larmes aux yeux.\n\nFANTA : Je ne dis pas qu'il faut oublier Mamadou. Je dis qu'il faut te retrouver, toi. Tu as déjà fait le test sur le style d'attachement ?\nBINTA : Hier soir. Je suis plutôt anxieuse, avec la peur d'être laissée.\nFANTA : Il y a aussi un test sur la dépendance affective. Fais-le, ça te dira où tu en es, sans te juger.\nALIOUNE : Et moi, je le fais aussi, ce test. Si un coiffeur peut, une sage-femme peut.",
      "question": "À la place de Binta, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je reprendrais une des activités de ma liste cette semaine, même sans en avoir envie.",
          "echo": "L'envie revient souvent après l'action, pas avant. Reprendre une activité te redonne un endroit où ta valeur ne dépend de personne."
        },
        {
          "id": "B",
          "label": "Je me dirais qu'il faut d'abord que Mamadou revienne, ensuite je verrai.",
          "echo": "Attendre qu'il revienne met ta vie en pause pour quelqu'un qui n'est plus là. Reprendre ta vie n'interdit pas de l'aimer ; ça t'empêche de t'y perdre."
        },
        {
          "id": "C",
          "label": "J'en parlerais à plusieurs personnes pour ne pas rester seule avec ça.",
          "echo": "Plus tu as de liens, moins un seul lien porte tout. C'est un des gestes les plus protecteurs."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; Fanta franche ; Alioune gêné puis sincère ; Binta. Dr Lô absent.",
      "image": "/images/cas-du-soir/dependance-ep5.webp",
      "audio": "casDuSoir/dependance/ep5.mp3",
      "minutage": "dependance-ep5",
      "tests": [
        "bonus_dependance"
      ]
    },
    {
      "titre": "Le plan",
      "texte": "Trois semaines plus tard. Binta est de nouveau dans le cabinet de Dr Lô, avec son cahier sur les genoux. Elle a repris le volley deux soirs sur sept. Elle a fait les trois tests. Elle s'est surprise à passer une soirée sans regarder son téléphone, une seule.\n\nBINTA : J'ai encore craqué hier. J'ai relu toute notre conversation. Je me suis détestée.\n\nDR LÔ : Une rechute n'est pas un échec, c'est une information : elle te dit ce qui se passait hier soir. Regardons ce qui t'aide. Tu n'as pas besoin de dix résolutions : trois ou quatre gestes tenus valent mieux.\n\nIls font la liste ensemble. Binta met le téléphone en sourdine sur la conversation avec Mamadou, sans le bloquer : elle décidera plus tard. Elle fixe une heure où le téléphone dort au salon. Elle écrit sur la première page de son cahier : « Quand j'ai envie d'écrire, j'écris dans mes notes. Et je préviens Fanta. » Et à la fin : « J'ai peur. Mais je ne suis pas ma peur. »\n\nDR LÔ : Une dernière chose. Si un jour ta tristesse devient « je ne veux plus vivre », tu ne restes pas seule avec ça : tu appelles quelqu'un tout de suite, ou le 1515. Et si tu sens que tu n'avances pas, on peut aussi te proposer un accompagnement plus long. La thérapie des schémas et les thérapies cognitivo-comportementales ont montré leur utilité pour ce genre de difficultés.\n\nBinta sort du cabinet. Elle n'est pas guérie, elle le sait. Mais elle a un cahier, un plan, une amie, un jeudi soir de volley, et une phrase.\n\nLe lendemain, à la maternité, une jeune patiente lui dit : « Mon mari m'a quittée enceinte. » Binta se sent trembler. Puis elle se voit dire, calmement, ce qu'elle se dit à elle-même : « Respire. Je suis là. Ça va faire mal, et ça va passer. » Elle comprend qu'elle sait déjà soigner les autres. Il lui reste à s'appliquer la même douceur.\n\nFANTA : Un dernier test pour toi, celui de la confiance en soi. Pas pour te noter. Pour que tu voies où tu as progressé dans trois mois.",
      "question": "À la place de Binta, après une rechute, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "J'abandonnerais : de toute façon, je n'y arriverai pas.",
          "echo": "C'est la pensée de la peur, pas la vérité. La plupart des gens qui avancent ont rechuté plusieurs fois avant."
        },
        {
          "id": "B",
          "label": "Je noterais ce qui m'a fait craquer, et je repartirais le lendemain.",
          "echo": "Chaque rechute dit quelque chose : fatigue, photo, dispute. Le noter, c'est préparer la prochaine fois."
        },
        {
          "id": "C",
          "label": "Je cacherais la rechute à mes proches pour ne pas les décevoir.",
          "echo": "Le secret ajoute de la honte à la douleur. Dire « j'ai craqué hier » à quelqu'un de sûr en enlève une grande partie du poids."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; consultation de suivi de Dr Lô (C6-n) ; Binta ; Fanta.",
      "image": "/images/cas-du-soir/dependance-ep6.webp",
      "audio": "casDuSoir/dependance/ep6.mp3",
      "minutage": "dependance-ep6",
      "tests": [
        "bonus_confiance"
      ]
    },
    {
      "titre": "Aimer sans disparaître",
      "texte": "Quatre mois plus tard. Fass, un jeudi soir. Binta rentre du volley, les cheveux encore humides. Elle a rencontré Souleymane à la chorale : instituteur, drôle, patient. Ils se voient depuis deux mois. Pas de grandes déclarations. Des dîners, des fous rires, des silences qui ne font pas peur.\n\nCe soir-là, il écrit : « Désolé, je ne peux pas te voir demain, j'ai une réunion de parents. » Le vieux frisson revient : la chaleur dans la poitrine, l'envie de répondre « pas de souci », de bouder, de tester s'il propose autre chose. Elle ouvre son cahier. Elle regarde les cinq questions. Elle respire.\n\nElle écrit à Souleymane : « Merci de me prévenir. Ça m'a fait un petit pincement, mais je comprends. Tu veux qu'on se voie samedi plutôt ? » Rien de plus. Elle appuie sur envoyer. Elle ne guette pas la réponse. Elle va préparer son thé.\n\nLa réponse vient dix minutes plus tard : « Samedi, avec plaisir. Merci de me l'avoir dit comme ça. » Binta sourit. Elle ne le sait pas encore, mais c'est exactement ce que veut dire aimer sans disparaître : dire ce qu'on ressent, sans reproche, sans test, sans se perdre.\n\nUn autre message arrive, quelques jours plus tard, d'un numéro qu'elle connaît par cœur. Mamadou : « Je suis désolé de ne pas avoir su te parler. J'avais peur. Tu méritais mieux qu'un silence. » Elle reste longtemps avec le téléphone dans la main. Elle ne répond pas tout de suite. Elle se demande : est-ce que j'en ai envie, ou est-ce la peur qui veut effacer tout ça ? Le lendemain, elle écrit : « Merci. Je te souhaite sincèrement d'aller bien. Je vais prendre soin de moi. » Elle n'attend pas de réponse.\n\nLe soir, elle regarde, avec Fanta, un dernier message de Dr Lô sur les réseaux.\n\nDR LÔ : Un dernier mot, pour toi qui as suivi jusqu'ici. Aimer, ce n'est pas disparaître. Si tu te reconnais dans l'histoire de Binta, retiens trois choses. Un : la peur de perdre ne dit pas combien tu aimes, elle dit que tu as peur. Deux : les cinq questions, relis-les de temps en temps. Trois : si tu n'y arrives pas seul, demande de l'aide. Ce n'est pas honteux. Prends soin de toi.",
      "question": "À la place de Binta, que ferais-tu quand l'ancienne peur revient ?",
      "choix": [
        {
          "id": "A",
          "label": "Je dirais calmement à l'autre ce que je ressens, sans reproche.",
          "echo": "Dire ce qu'on ressent, simplement, évite les tests et les non-dits. C'est ce qui permet un lien sûr."
        },
        {
          "id": "B",
          "label": "Je ferais semblant d'être indifférente pour qu'il s'inquiète.",
          "echo": "Tester l'autre ou jouer l'indifférence fabrique du doute des deux côtés. Dire la vérité calme plus que tout jeu."
        },
        {
          "id": "C",
          "label": "Je relirais mes cinq questions et je choisirais à tête reposée.",
          "echo": "Faire une pause pour te poser les bonnes questions est un geste de soin. Tu n'as pas à répondre à la première vague."
        }
      ],
      "minutes": 3,
      "voix": "narrateur ; Binta apaisée ; vidéo courte de Dr Lô (V7) ; Souleymane (message).",
      "image": "/images/cas-du-soir/dependance-ep7.webp",
      "audio": "casDuSoir/dependance/ep7.mp3",
      "minutage": "dependance-ep7"
    }
  ],
  "fin": {
    "titre": "La leçon de Dr Lô",
    "texte": "Bonsoir, c'est Dr Lô. Tu viens de suivre Binta. Peut-être que, quelque part, tu t'es reconnu, ou tu as reconnu quelqu'un que tu aimes. Voici ce qu'il faut retenir, en dix points.\n\nUn. Aimer et dépendre ne sont pas la même chose, et on peut passer de l'un à l'autre. Aimer, c'est vouloir le bien de l'autre et le tien. Dépendre, c'est avoir besoin de l'autre pour calmer sa peur.\n\nDeux. Dépendre de ceux qu'on aime est normal : on a tous besoin des autres. Ce qui devient un problème, c'est l'excès, la panique au moindre silence, et l'oubli de soi.\n\nTrois. Les cinq questions pour faire la différence : quand l'autre s'absente, suis-je triste ou en panique ? Puis-je dire non sans avoir peur qu'il parte ? Ai-je encore ma vie, mes amis, mes projets ? Est-ce que je veux son bonheur, ou que j'ai besoin qu'il me rassure ? Ma valeur du jour dépend-elle de son message ?\n\nQuatre. Ce n'est pas un diagnostic, ni un défaut de caractère. On parle surtout d'attachement anxieux : la peur d'être abandonné, le besoin de réassurance, la vigilance au moindre signe de rejet.\n\nCinq. Ça vient souvent de l'enfance : critiques répétées, manque de tendresse, absence. Cela explique tes réflexes. Cela ne veut pas dire que tu es condamnée à les garder.\n\nSix. Ça touche les femmes et les hommes, sous des formes différentes : supplier, surveiller, contrôler, ou se faire tout petit. La peur est la même.\n\nSept. Être quitté sans explication fait plus mal, parce que le cerveau cherche une réponse. Ruminer n'est pas de la faiblesse. Ce qui aide : ne pas relire, écrire dans tes notes sans envoyer, et décider toi-même de tes limites, sans attendre une clôture que l'autre ne donnera peut-être jamais.\n\nHuit. Les gestes qui aident : mettre le téléphone loin la nuit, retrouver une activité à toi, garder deux ou trois personnes sûres, dormir, dire ce dont tu as besoin simplement, sans tester l'autre.\n\nNeuf. La bienveillance envers soi n'est pas du laxisme : c'est ce qui fait tenir. Parle-toi comme tu parlerais à une amie. Si tu n'y arrives pas seul, consulte un psychologue : des méthodes comme les thérapies cognitivo-comportementales marchent bien pour ça.\n\nDix. Si ta tristesse devient « je ne veux plus vivre », parle tout de suite à quelqu'un ou appelle le 1515 : ce jour-là, on ne reste pas seul. Prends soin de toi, et à bientôt.\n\nSources : Mickelson, Kessler et Shaver, 1997 (attachement chez l'adulte) ; Knee, Canevello, Bush et Cook, 2008 (estime de soi dépendante de la relation) ; Pinquart, Feußner et Ahnert, 2013 (stabilité de l'attachement) ; Bamelis et coll., 2014 (thérapie des schémas) ; Hill et coll., 2025 (autocompassion et attachement) ; Han et Kim, 2023 (interventions d'autocompassion) ; études sur le ghosting et la rumination.",
    "audio": "casDuSoir/dependance/lecon.mp3",
    "minutage": "dependance-lecon",
    "quiz": [
      {
        "question": "Laquelle de ces situations est un signe de dépendance affective ?",
        "reponses": [
          "Être triste quand l'autre part en voyage une semaine.",
          "Paniquer au moindre silence, et tout accepter pour ne pas être quitté.",
          "Avoir envie de passer du temps avec la personne qu'on aime."
        ],
        "bonne": 1,
        "explication": "être triste d'une absence, aimer le temps partagé, c'est normal. Ce qui doit alerter, c'est la panique, l'oubli de soi, et l'idée qu'on ne vaut quelque chose que si l'autre répond."
      },
      {
        "question": "Tu as été quitté sans explication. Qu'est-ce qui aide le plus ?",
        "reponses": [
          "Relire toute la conversation pour comprendre ce qui s'est passé.",
          "Écrire ce que tu ressens dans tes notes sans l'envoyer, et appeler quelqu'un de sûr.",
          "Rappeler jusqu'à ce qu'il réponde."
        ],
        "bonne": 1,
        "explication": "relire et rappeler entretiennent la douleur. Écrire sans envoyer laisse sortir ce qui déborde, et parler à quelqu'un de sûr remet du lien vivant autour de toi."
      },
      {
        "question": "Peut-on changer sa façon d'aimer quand on a peur d'être abandonné ?",
        "reponses": [
          "Non, c'est comme ça depuis l'enfance et ça ne change pas.",
          "Oui, lentement : avec des relations sûres, de la bienveillance envers soi et un accompagnement si besoin.",
          "Oui, en quelques jours, avec le bon test."
        ],
        "bonne": 1,
        "explication": "l'attachement n'est pas figé. Il bouge, mais lentement, surtout avec des liens qui rassurent et, si besoin, une thérapie. Il n'existe pas de méthode miracle."
      }
    ],
    "apresQuiz": "3 sur 3 ? Tu sais maintenant faire la différence entre aimer et dépendre. Reste à te le dire à toi-même, quand la vague revient."
  }
};
