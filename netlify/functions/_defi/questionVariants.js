// Question variants v4 — scenes by audience
// Each dimension key maps to { scaleId, subscaleKey, theme, variants[] }
// Each variant: { id, audiences[], stem, options: { bas, moyen, haut } }

const QUESTION_DEFS_V4 = {
  'big_five.extraversion': {
    scaleId: 'big_five', subscaleKey: 'extraversion', theme: 'Sociabilité',
    variants: [
      {
        id: 'extra_ngente', audiences: ['tous', 'amis'],
        stem: "C'est un ngénte (baptême). {prenom}, on {{le|la}} trouve où ?",
        options: {
          bas: "Passe saluer, mange un peu, puis s'éclipse",
          moyen: "Avec sa petite bande, tranquille dans un coin",
          haut: "Au milieu de la fête — c'est {{lui|elle}} l'ambiance",
        },
      },
      {
        id: 'extra_tabaski', audiences: ['famille'],
        stem: "Grand repas de Tabaski chez les parents. {prenom}, c'est…",
        options: {
          bas: "{{Celui|Celle}} qui aide en cuisine, loin du bruit",
          moyen: "Salue tout le monde, puis va se poser",
          haut: "{{Celui|Celle}} qui raconte les histoires et fait rire",
        },
      },
      {
        id: 'extra_weekend', audiences: ['couple', 'collegues'],
        stem: "Un week-end libre devant {{lui|elle}}, {prenom} préfère…",
        options: {
          bas: "Rester à la maison, série et repos",
          moyen: "Un petit programme avec 2 ou 3 proches",
          haut: "Sortir, voir du monde, bouger partout",
        },
      },
    ],
  },

  'big_five.agreeableness': {
    scaleId: 'big_five', subscaleKey: 'agreeableness', theme: 'Caractère',
    variants: [
      {
        id: 'agre_whatsapp', audiences: ['tous', 'famille', 'amis'],
        stem: "Ça chauffe dans le groupe WhatsApp de la famille. {prenom}…",
        options: {
          bas: "Dit sa vérité, tant pis si ça pique",
          moyen: "Donne son avis, mais avec des gants",
          haut: "Calme tout le monde — {{le roi|la reine}} du massla",
        },
      },
      {
        id: 'agre_dispute', audiences: ['couple'],
        stem: "Pendant une dispute, {prenom} c'est plutôt…",
        options: {
          bas: "Défend son point jusqu'au bout",
          moyen: "Dit ce qu'{{il|elle}} pense, puis cherche un accord",
          haut: "Cède vite pour que la paix revienne",
        },
      },
      {
        id: 'agre_reunion', audiences: ['collegues'],
        stem: "En réunion, quelqu'un propose une idée bancale. {prenom}…",
        options: {
          bas: "Le dit franchement, devant tout le monde",
          moyen: "Le dit, mais avec diplomatie",
          haut: "Trouve quand même un point positif à souligner",
        },
      },
    ],
  },

  'big_five.conscientiousness': {
    scaleId: 'big_five', subscaleKey: 'conscientiousness', theme: 'Organisation',
    variants: [
      {
        id: 'consc_rdv', audiences: ['tous', 'amis', 'famille'],
        stem: "Rendez-vous fixé à 15 h. {prenom} arrive…",
        options: {
          bas: "« J'arrive »… à 16 h passées 😅",
          moyen: "Vers 15 h 15 — le quart d'heure sénégalais",
          haut: "À 14 h 50, et {{il|elle}} t'attend déjà",
        },
      },
      {
        id: 'consc_dossier', audiences: ['collegues'],
        stem: "Un dossier à rendre vendredi. {prenom}…",
        options: {
          bas: "Fait tout jeudi soir, en mode pompier",
          moyen: "Avance un peu, finit sous pression mais à l'heure",
          haut: "A fini mardi, relu et classé",
        },
      },
      {
        id: 'consc_chambre', audiences: ['famille', 'couple'],
        stem: "La chambre de {prenom}, c'est plutôt…",
        options: {
          bas: "Un joyeux désordre — mais {{il|elle}} s'y retrouve",
          moyen: "Rangée… quand il y a de la visite",
          haut: "Impeccable, chaque chose à sa place",
        },
      },
    ],
  },

  'big_five.emotional_stability': {
    scaleId: 'big_five', subscaleKey: 'emotional_stability', theme: 'Gestion du stress',
    variants: [
      {
        id: 'stab_courant', audiences: ['tous', 'famille', 'amis'],
        stem: "Coupure de courant, canicule, téléphone à 3 %. {prenom}…",
        options: {
          bas: "S'énerve direct — toute la maison le sait",
          moyen: "Râle un peu, puis passe à autre chose",
          haut: "Reste zen, sort l'éventail et attend",
        },
      },
      {
        id: 'stab_bouchon', audiences: ['collegues', 'amis'],
        stem: "{{Coincé|Coincée}} dans les embouteillages, déjà en retard. {prenom}…",
        options: {
          bas: "Souffle, klaxonne, appelle tout le monde",
          moyen: "S'agace, puis met de la musique",
          haut: "Prend son mal en patience, tranquille",
        },
      },
      {
        id: 'stab_nouvelle', audiences: ['couple', 'famille'],
        stem: "Une mauvaise nouvelle tombe. {prenom}…",
        options: {
          bas: "Le vit très fort, ça se voit tout de suite",
          moyen: "Accuse le coup, puis se reprend",
          haut: "Garde son calme et cherche une solution",
        },
      },
    ],
  },

  'big_five.openness': {
    scaleId: 'big_five', subscaleKey: 'openness', theme: 'Curiosité',
    variants: [
      {
        id: 'ouv_resto', audiences: ['tous', 'couple', 'amis'],
        stem: "Au restaurant, {prenom} commande…",
        options: {
          bas: "Son plat habituel — on ne change pas une équipe qui gagne",
          moyen: "Son classique… sauf si le serveur {{le|la}} convainc",
          haut: "Le plat le plus étrange de la carte, pour goûter",
        },
      },
      {
        id: 'ouv_voyage', audiences: ['tous', 'famille'],
        stem: "Un voyage offert, destination au choix. {prenom} choisit…",
        options: {
          bas: "Un endroit connu où {{il|elle}} aime aller",
          moyen: "Un pays voisin, entre découverte et confort",
          haut: "Le bout du monde, l'inconnu total",
        },
      },
      {
        id: 'ouv_idee', audiences: ['amis', 'collegues'],
        stem: "Une idée un peu folle arrive dans la discussion. {prenom}…",
        options: {
          bas: "« Restons concrets, ça ne marchera pas »",
          moyen: "Écoute, pose des questions, puis tranche",
          haut: "Rebondit et en propose trois encore plus folles",
        },
      },
    ],
  },

  'ecr_r.anxiety': {
    scaleId: 'ecr_r', subscaleKey: 'anxiety', theme: 'Attachement',
    variants: [
      {
        id: 'att_vu', audiences: ['couple'],
        stem: "{prenom} envoie un message à sa moitié. Pas de réponse depuis 3 h. {{Il|Elle}}…",
        options: {
          bas: "N'y pense même pas — sa moitié est occupée",
          moyen: "Jette un œil au téléphone de temps en temps",
          haut: "Vérifie le « vu » toutes les 5 minutes",
        },
      },
      {
        id: 'att_soiree', audiences: ['amis', 'famille'],
        stem: "Après une soirée, {prenom} se demande parfois…",
        options: {
          bas: "Rien du tout — {{il|elle}} dort tranquille",
          moyen: "Si une de ses blagues est mal passée",
          haut: "Si les autres l'apprécient vraiment",
        },
      },
      {
        id: 'att_besoin', audiences: ['couple'],
        stem: "En amour, {prenom} a surtout besoin…",
        options: {
          bas: "D'espace — la confiance suffit",
          moyen: "D'un petit « tu me manques » de temps en temps",
          haut: "De preuves — {{il|elle}} aime être {{rassuré|rassurée}}",
        },
      },
    ],
  },

  'ecr_r.avoidance': {
    scaleId: 'ecr_r', subscaleKey: 'avoidance', theme: 'Intimité',
    variants: [
      {
        id: 'evit_souci', audiences: ['tous', 'famille', 'amis'],
        stem: "Quand {prenom} a un gros souci, {{il|elle}}…",
        options: {
          bas: "En parle tout de suite à ses proches",
          moyen: "Se confie à une personne de confiance, pas plus",
          haut: "Garde tout pour {{lui|elle}} — sutura",
        },
      },
      {
        id: 'evit_mots', audiences: ['couple'],
        stem: "Les « je t'aime » et mots doux, pour {prenom} c'est…",
        options: {
          bas: "Naturel — {{il|elle}} les dit sans compter",
          moyen: "Sincère, mais au bon moment",
          haut: "Gênant — {{il|elle}} préfère le montrer autrement",
        },
      },
      {
        id: 'evit_calin', audiences: ['famille', 'amis'],
        stem: "Un câlin surprise devant tout le monde. {prenom}…",
        options: {
          bas: "Adore ça et en redemande",
          moyen: "Accepte, avec un petit sourire gêné",
          haut: "Se raidit — pas trop son truc",
        },
      },
    ],
  },

  brs: {
    scaleId: 'brs', subscaleKey: null, theme: 'Résilience',
    variants: [
      {
        id: 'res_echec', audiences: ['tous', 'amis', 'famille'],
        stem: "Après un gros échec (examen, projet, rupture), {prenom}…",
        options: {
          bas: "Met du temps à s'en remettre",
          moyen: "Digère quelques jours, puis repart",
          haut: "Se relève vite et repart de plus belle",
        },
      },
      {
        id: 'res_arbre', audiences: ['tous', 'couple', 'famille'],
        stem: "Quand la vie secoue, {prenom} c'est…",
        options: {
          bas: "Un cœur sensible qui a besoin de temps",
          moyen: "Un roseau — plie, mais ne casse pas",
          haut: "Un baobab — solide quoi qu'il arrive",
        },
      },
      {
        id: 'res_projet', audiences: ['collegues'],
        stem: "{prenom} voit un de ses projets tomber à l'eau. Le lendemain…",
        options: {
          bas: "{{Il|Elle}} a besoin d'une pause pour encaisser",
          moyen: "{{Il|Elle}} en parle, puis prépare un plan B",
          haut: "{{Il|Elle}} a déjà un nouveau projet en tête",
        },
      },
    ],
  },

  bonus_tdah: {
    scaleId: 'bonus_tdah', subscaleKey: null, theme: 'Concentration',
    variants: [
      {
        id: 'tdah_cles', audiences: ['tous', 'famille', 'couple'],
        stem: "{prenom} cherche ses clés. En général…",
        options: {
          bas: "Les trouve direct — toujours au même endroit",
          moyen: "Cherche deux minutes, puis les retrouve",
          haut: "Fouille toute la maison… elles étaient dans sa poche",
        },
      },
      {
        id: 'tdah_groupe', audiences: ['amis'],
        stem: "Une conversation de groupe s'éternise. {prenom}…",
        options: {
          bas: "Suit jusqu'au bout, sans décrocher",
          moyen: "Décroche un peu, puis revient",
          haut: "Est déjà {{parti|partie}} sur trois autres sujets",
        },
      },
      {
        id: 'tdah_travail', audiences: ['collegues'],
        stem: "Au travail, {prenom} c'est…",
        options: {
          bas: "Une tâche à la fois, du début à la fin",
          moyen: "{{Concentré|Concentrée}}, mais les notifs {{le|la}} distraient",
          haut: "Dix onglets ouverts, mille idées à la fois",
        },
      },
    ],
  },

  bonus_hsp: {
    scaleId: 'bonus_hsp', subscaleKey: null, theme: 'Sensibilité',
    variants: [
      {
        id: 'hsp_film', audiences: ['tous', 'couple', 'famille'],
        stem: "Devant un film triste, {prenom}…",
        options: {
          bas: "Reste de marbre — « c'est du cinéma »",
          moyen: "A la gorge serrée, mais tient bon",
          haut: "Pleure… et y repense pendant des jours",
        },
      },
      {
        id: 'hsp_tension', audiences: ['famille', 'amis', 'collegues'],
        stem: "Il y a une tension dans la pièce. {prenom}…",
        options: {
          bas: "Ne remarque rien du tout",
          moyen: "Sent que quelque chose cloche",
          haut: "Capte tout, avant même qu'on parle",
        },
      },
      {
        id: 'hsp_sono', audiences: ['amis'],
        stem: "Mariage, sono à fond, foule. {prenom}…",
        options: {
          bas: "Est dans son élément",
          moyen: "Profite, puis prend l'air dehors",
          haut: "Sature vite, a besoin de calme",
        },
      },
    ],
  },

  bonus_hpi: {
    scaleId: 'bonus_hpi', subscaleKey: null, theme: 'Esprit',
    variants: [
      {
        id: 'hpi_apprendre', audiences: ['tous', 'amis'],
        stem: "Quand {prenom} découvre un sujet nouveau…",
        options: {
          bas: "Va droit au but : à quoi ça sert ?",
          moyen: "Veut comprendre comment ça marche",
          haut: "Creuse jusqu'à 2 h du matin, de lien en lien",
        },
      },
      {
        id: 'hpi_debat', audiences: ['collegues', 'famille'],
        stem: "Dans une discussion, {prenom}…",
        options: {
          bas: "Reste simple et concret",
          moyen: "Aime débattre et argumenter",
          haut: "Fait des liens que personne n'avait vus",
        },
      },
      {
        id: 'hpi_cerveau', audiences: ['tous', 'couple'],
        stem: "Le cerveau de {prenom}, c'est plutôt…",
        options: {
          bas: "Une route droite — efficace, sans détour",
          moyen: "Un carrefour — curieux de tout",
          haut: "Une autoroute à 200 à l'heure, jour et nuit",
        },
      },
    ],
  },

  bonus_jalousie: {
    scaleId: 'bonus_jalousie', subscaleKey: null, theme: 'Jalousie',
    variants: [
      {
        id: 'jal_minuit', audiences: ['couple'],
        stem: "Message à minuit sur le téléphone de sa moitié. {prenom}…",
        options: {
          bas: "Ne pose même pas la question",
          moyen: "Demande l'air de rien : « c'est qui ? »",
          haut: "Fait semblant de dormir… mais n'en pense pas moins",
        },
      },
      {
        id: 'jal_pote', audiences: ['amis'],
        stem: "Son ou sa best sort sans {{lui|elle}}. {prenom}…",
        options: {
          bas: "Est {{content|contente}} pour eux",
          moyen: "Fait une petite remarque, pour la forme",
          haut: "Boude un peu, même sans le dire",
        },
      },
      {
        id: 'jal_mariage', audiences: ['couple'],
        stem: "Au mariage d'un cousin, sa moitié danse avec quelqu'un d'autre. {prenom}…",
        options: {
          bas: "Applaudit et filme",
          moyen: "Sourit… mais surveille du coin de l'œil",
          haut: "Vient vite récupérer sa place",
        },
      },
    ],
  },

  bonus_eq: {
    scaleId: 'bonus_eq', subscaleKey: null, theme: 'Émotions',
    variants: [
      {
        id: 'eq_cava', audiences: ['tous', 'amis'],
        stem: "Un ami a l'air triste mais dit « ça va ». {prenom}…",
        options: {
          bas: "{{Le|La}} croit sur parole et passe à autre chose",
          moyen: "Sent que non et lui laisse la porte ouverte",
          haut: "Comprend tout et trouve les mots justes",
        },
      },
      {
        id: 'eq_famille', audiences: ['famille'],
        stem: "Tension entre deux membres de la famille. {prenom}…",
        options: {
          bas: "Préfère rester en dehors",
          moyen: "Essaie de comprendre les deux côtés",
          haut: "Sait exactement à qui parler, et comment",
        },
      },
      {
        id: 'eq_colere', audiences: ['couple', 'collegues'],
        stem: "Quand {prenom} est en colère…",
        options: {
          bas: "Ça sort tout de suite, sans filtre",
          moyen: "Se calme, puis explique ce qui l'a {{blessé|blessée}}",
          haut: "Met des mots justes sur ce qu'{{il|elle}} ressent",
        },
      },
    ],
  },

  bonus_confiance: {
    scaleId: 'bonus_confiance', subscaleKey: null, theme: 'Confiance',
    variants: [
      {
        id: 'conf_micro', audiences: ['tous', 'famille', 'amis'],
        stem: "On tend le micro à {prenom} devant 200 personnes. {{Il|Elle}}…",
        options: {
          bas: "Refuse poliment — très peu pour {{lui|elle}}",
          moyen: "Accepte, le cœur qui bat",
          haut: "Prend le micro avant la fin de la phrase",
        },
      },
      {
        id: 'conf_seduction', audiences: ['couple', 'amis'],
        stem: "Au début d'une histoire, {prenom}…",
        options: {
          bas: "Attend que l'autre fasse le premier pas",
          moyen: "Envoie des signaux… en douceur",
          haut: "Fonce et se déclare",
        },
      },
      {
        id: 'conf_poste', audiences: ['collegues'],
        stem: "Un poste à responsabilité se libère. {prenom}…",
        options: {
          bas: "Hésite — et si {{il|elle}} n'était pas à la hauteur ?",
          moyen: "Postule, après avoir bien réfléchi",
          haut: "Postule le jour même",
        },
      },
    ],
  },

  bonus_narcissisme: {
    scaleId: 'bonus_narcissisme', subscaleKey: null, theme: 'Aura',
    variants: [
      {
        id: 'narc_photo', audiences: ['tous', 'amis'],
        stem: "Les photos de profil de {prenom}…",
        options: {
          bas: "Presque aucune — ou un paysage",
          moyen: "Quelques belles photos, sans en faire trop",
          haut: "Toujours {{sapé|sapée}} — le shooting est assumé",
        },
      },
      {
        id: 'narc_ceremonie', audiences: ['famille', 'amis'],
        stem: "À une cérémonie, {prenom} arrive…",
        options: {
          bas: "Sans bruit, en tenue simple",
          moyen: "Bien {{habillé|habillée}}, sans voler la vedette",
          haut: "En grande tenue — tous les regards sur {{lui|elle}}",
        },
      },
      {
        id: 'narc_compliment', audiences: ['tous', 'couple'],
        stem: "Quand on complimente {prenom}…",
        options: {
          bas: "{{Il|Elle}} rougit et change de sujet",
          moyen: "{{Il|Elle}} dit merci, simplement",
          haut: "« Je sais 😎 »",
        },
      },
    ],
  },

  bonus_manipulation: {
    scaleId: 'bonus_manipulation', subscaleKey: null, theme: 'Stratégie',
    variants: [
      {
        id: 'mach_parents', audiences: ['famille', 'tous'],
        stem: "Pour obtenir quelque chose de ses parents, {prenom}…",
        options: {
          bas: "Demande directement, sans détour",
          moyen: "Choisit le bon moment pour demander",
          haut: "Prépare le terrain plusieurs jours avant",
        },
      },
      {
        id: 'mach_jeu', audiences: ['amis'],
        stem: "Aux cartes ou au ludo, {prenom}…",
        options: {
          bas: "Joue pour rire, sans calcul",
          moyen: "Réfléchit quand il y a un enjeu",
          haut: "A trois coups d'avance — redoutable",
        },
      },
      {
        id: 'mach_idee', audiences: ['collegues'],
        stem: "Pour faire passer une idée au travail, {prenom}…",
        options: {
          bas: "La propose franchement en réunion",
          moyen: "En parle d'abord aux bonnes personnes",
          haut: "Fait croire au chef que c'est son idée à lui",
        },
      },
    ],
  },

  gad7: {
    scaleId: 'gad7', subscaleKey: null, theme: 'Inquiétude',
    variants: [
      {
        id: 'anx_veille', audiences: ['tous'],
        stem: "La veille d'un grand jour (examen, entretien), {prenom}…",
        options: {
          bas: "Dort comme un bébé",
          moyen: "A un petit nœud au ventre, puis s'endort",
          haut: "Refait tous les scénarios dans sa tête",
        },
      },
      {
        id: 'anx_telephone', audiences: ['famille', 'couple'],
        stem: "Un proche ne répond pas au téléphone. {prenom}…",
        options: {
          bas: "Se dit qu'il rappellera",
          moyen: "Rappelle une fois, au cas où",
          haut: "Imagine déjà le pire",
        },
      },
    ],
  },

  rses: {
    scaleId: 'rses', subscaleKey: null, theme: 'Estime de soi',
    variants: [
      {
        id: 'est_miroir', audiences: ['tous', 'couple'],
        stem: "Devant le miroir le matin, {prenom} se dit plutôt…",
        options: {
          bas: "« Je peux mieux faire »",
          moyen: "« Ça ira bien »",
          haut: "« Pas mal du tout, comme d'hab »",
        },
      },
      {
        id: 'est_reussite', audiences: ['famille', 'amis'],
        stem: "Quand {prenom} réussit quelque chose…",
        options: {
          bas: "Pense que c'était de la chance",
          moyen: "Est {{content|contente}}, sans s'emballer",
          haut: "Sait qu'{{il|elle}} l'a mérité",
        },
      },
    ],
  },

  pss10: {
    scaleId: 'pss10', subscaleKey: null, theme: 'Charge mentale',
    variants: [
      {
        id: 'pss_pirogue', audiences: ['tous'],
        stem: "En ce moment, la vie de {prenom} ressemble à…",
        options: {
          bas: "Une pirogue sur une mer calme",
          moyen: "Une pirogue avec quelques vagues",
          haut: "Une pirogue en pleine tempête — {{il|elle}} rame fort",
        },
      },
      {
        id: 'pss_soir', audiences: ['famille', 'couple'],
        stem: "Le soir, {prenom} se couche…",
        options: {
          bas: "L'esprit léger",
          moyen: "Avec deux ou trois soucis en tête",
          haut: "Avec une liste interminable de choses à gérer",
        },
      },
    ],
  },

  social_pressure: {
    scaleId: 'social_pressure', subscaleKey: null, theme: 'Regard des autres',
    variants: [
      {
        id: 'pres_tenue', audiences: ['tous', 'famille'],
        stem: "Pour s'habiller pour une cérémonie, {prenom} pense surtout à…",
        options: {
          bas: "Son confort — peu importe ce qu'on dira",
          moyen: "Être correct aux yeux de la famille",
          haut: "Ce que les gens vont dire et penser",
        },
      },
      {
        id: 'pres_tata', audiences: ['amis', 'famille'],
        stem: "Une tante lance : « Alors, c'est pour quand ? » {prenom}…",
        options: {
          bas: "Rigole — c'est son affaire à {{lui|elle}}",
          moyen: "Répond poliment, ça l'agace un peu",
          haut: "Y repense pendant plusieurs jours",
        },
      },
    ],
  },

  bonus_burnout: {
    scaleId: 'bonus_burnout', subscaleKey: null, theme: 'Énergie',
    variants: [
      {
        id: 'burn_vendredi', audiences: ['tous', 'amis', 'collegues'],
        stem: "Vendredi soir, après la semaine, {prenom}…",
        options: {
          bas: "Est encore en forme, {{prêt|prête}} à sortir",
          moyen: "Est {{fatigué|fatiguée}}, mais une nuit suffit",
          haut: "Est {{vidé|vidée}} — direction le lit",
        },
      },
      {
        id: 'burn_dimanche', audiences: ['collegues', 'couple'],
        stem: "Le dimanche soir, en pensant au lundi, {prenom}…",
        options: {
          bas: "Est {{motivé|motivée}} pour la semaine",
          moyen: "Soupire un peu, puis s'organise",
          haut: "A le moral qui baisse",
        },
      },
    ],
  },

  bonus_dependance: {
    scaleId: 'bonus_dependance', subscaleKey: null, theme: 'Lien aux autres',
    variants: [
      {
        id: 'dep_seul', audiences: ['amis', 'famille'],
        stem: "Un week-end {{seul|seule}} à la maison, pour {prenom} c'est…",
        options: {
          bas: "Le paradis — enfin du calme",
          moyen: "Agréable un jour, puis {{il|elle}} appelle quelqu'un",
          haut: "Long — {{il|elle}} a vite besoin de compagnie",
        },
      },
      {
        id: 'dep_voyage', audiences: ['couple'],
        stem: "Sa moitié part en voyage une semaine. {prenom}…",
        options: {
          bas: "Profite de ce temps pour {{lui|elle}}",
          moyen: "Appelle chaque soir, sans en faire trop",
          haut: "Compte les jours jusqu'au retour",
        },
      },
    ],
  },
};

// Dimensions excluded per audience (section 3.3)
const AUDIENCE_EXCLUSIONS = {
  famille: new Set(['bonus_jalousie', 'bonus_dependance']),
  amis: new Set(),
  couple: new Set(),
  collegues: new Set(['ecr_r.anxiety', 'ecr_r.avoidance', 'bonus_jalousie', 'bonus_dependance', 'rses']),
  tous: new Set(['bonus_dependance']),
};

// Themes used in preview (updated v4 labels)
const DIMENSION_THEMES = {};
for (const [key, def] of Object.entries(QUESTION_DEFS_V4)) {
  DIMENSION_THEMES[key] = def.theme;
}

// Result titles based on score (section 7.1)
const RESULT_TITLES = [
  { min: 0,  max: 39,  title: 'Tu {{le|la}} découvres encore 👀',  subtitle: '{prenom} a encore des secrets pour toi' },
  { min: 40, max: 69,  title: 'Tu {{le|la}} connais bien 🤝',      subtitle: 'Pas mal… mais pas tout' },
  { min: 70, max: 89,  title: 'Tu {{le|la}} connais par cœur 🔥',  subtitle: 'Tu fais partie du premier cercle' },
  { min: 90, max: 100, title: 'Doomu ndey ! 🏆',                    subtitle: 'Tu {{le|la}} connais comme {{un frère|une sœur}}' },
];

// Personal questions bank (section 5)
const PERSO_QUESTIONS = {
  tous: [
    { id: 'perso_plat', stem: 'Le plat préféré de {prenom} ?', options: ['Thiéboudienne', 'Yassa', 'Mafé', 'Dibi'] },
    { id: 'perso_rythme', stem: "{prenom}, c'est plutôt…", options: ['Lève-tôt', 'Couche-tard', 'Les deux (ne dort jamais)'] },
    { id: 'perso_million', stem: 'Avec 1 million de FCFA, {prenom}…', options: ['Épargne tout', 'Voyage', 'Aide la famille', 'Se fait plaisir'] },
    { id: 'perso_enerve', stem: 'Ce qui énerve le plus {prenom}', options: ['Le retard', 'Le mensonge', 'Le bruit', "Qu'on touche à son assiette"] },
    { id: 'perso_musique', stem: 'La musique de {prenom}', options: ['Mbalax', 'Rap galsen', 'Afrobeats', 'Zouk/R&B'] },
    { id: 'perso_attaya', stem: "L'attaya, pour {prenom}…", options: ['Fait le meilleur 3e verre', 'Boit, ne prépare jamais', 'Pas son truc'] },
    { id: 'perso_talent', stem: 'Le talent caché de {prenom}', options: ['Cuisiner', 'Imiter les gens', 'Négocier au marché', 'Danser'] },
  ],
  famille: [
    { id: 'perso_role', stem: "Dans la famille, {prenom} c'est…", options: ['{{Le conseiller|La conseillère}}', '{{Le comique|La comique}}', '{{Le médiateur|La médiatrice}}', '{{Le chouchou|La chouchoute}}'] },
    { id: 'perso_maman', stem: 'Quand maman appelle, {prenom}…', options: ['Décroche à la 1re sonnerie', 'Rappelle plus tard', "« Oui maman, j'arrive ! » (et n'arrive pas)"] },
    { id: 'perso_tabaski', stem: 'À Tabaski, {prenom} est…', options: ['En cuisine', 'Avec le mouton', 'En visite partout', 'En sieste après le repas'] },
  ],
  amis: [
    { id: 'perso_soiree', stem: "En soirée, {prenom} c'est…", options: ['Sur la piste', 'Près du buffet', 'Sur son téléphone', '{{Le DJ|La DJ}}'] },
    { id: 'perso_groupe', stem: 'Dans le groupe WhatsApp, {prenom}…', options: ['Envoie 100 vocaux', 'Lit sans répondre', 'Que des stickers', 'Répond 3 jours après'] },
    { id: 'perso_defaut', stem: 'Le défaut assumé de {prenom}', options: ['Toujours en retard', 'Jamais de batterie', 'Emprunte et oublie', 'Parle trop'] },
  ],
  couple: [
    { id: 'perso_langage', stem: "Le langage d'amour de {prenom}", options: ['Les mots doux', 'Les cadeaux', 'Le temps ensemble', 'Les gestes tendres'] },
    { id: 'perso_dispute', stem: 'Après une dispute, qui fait le premier pas ?', options: ['{prenom}', "L'autre", 'Personne 😅'] },
    { id: 'perso_rdv', stem: 'Le rendez-vous idéal pour {prenom}', options: ['Dîner en tête-à-tête', 'Balade sur la Corniche', 'Film à la maison', 'Sortie entre amis'] },
    { id: 'perso_craque', stem: 'Ce qui fait craquer {prenom} en premier', options: ['Le sourire', "L'humour", "L'élégance", "L'intelligence"] },
    { id: 'perso_recevoir', stem: '{prenom} préfère recevoir…', options: ['Un long vocal', 'Un message écrit', 'Un appel', 'Une surprise en vrai'] },
  ],
  collegues: [
    { id: 'perso_bureau', stem: "Au bureau, {prenom} c'est {{le roi|la reine}}…", options: ['Des pauses café', 'Des tableaux Excel', 'Des réunions', 'Des blagues'] },
    { id: 'perso_matin', stem: 'En arrivant au travail, {prenom}…', options: ['Prend un café', 'Ouvre ses mails', 'Salue tout le monde', 'Regarde son téléphone'] },
    { id: 'perso_paie', stem: 'Le jour de paie, {prenom}…', options: ['Épargne', 'Rembourse ses dettes', 'Se fait plaisir', "La famille d'abord"] },
  ],
};

const AUDIENCE_PRIORITIES = {
  couple: [
    'ecr_r.anxiety', 'ecr_r.avoidance', 'bonus_jalousie',
    'big_five.emotional_stability', 'big_five.agreeableness', 'bonus_confiance',
    'bonus_eq', 'bonus_dependance',
  ],
  famille: [
    'big_five.agreeableness', 'big_five.emotional_stability', 'bonus_eq',
    'bonus_confiance', 'social_pressure', 'big_five.conscientiousness',
  ],
  amis: [
    'big_five.extraversion', 'big_five.agreeableness', 'bonus_confiance',
    'bonus_eq', 'big_five.openness', 'bonus_hsp',
  ],
  collegues: [
    'big_five.conscientiousness', 'big_five.agreeableness', 'big_five.emotional_stability',
    'bonus_confiance', 'bonus_burnout', 'bonus_eq',
  ],
  tous: [],
};

module.exports = {
  QUESTION_DEFS_V4,
  AUDIENCE_EXCLUSIONS,
  AUDIENCE_PRIORITIES,
  DIMENSION_THEMES,
  RESULT_TITLES,
  PERSO_QUESTIONS,
};
