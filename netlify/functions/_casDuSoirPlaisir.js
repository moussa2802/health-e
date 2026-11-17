/**
 * _casDuSoirPlaisir — « Le plaisir féminin » : le troisième cas du soir (éducation sexuelle directe, réservé aux adultes). Écrit le 17/11/2026.
 * 7 épisodes, sans embranchement. Texte et vocaux de Dr Lô : Claude outputs/cas-du-soir/cas3/ (construire_js.py). Aucune date publique
 * (programmee: false) : seul le propriétaire le voit. Images : public/images/cas-du-soir/plaisir-*.webp ; audios à venir (Storage casDuSoir/plaisir/).
 */
module.exports = {
  "id": "plaisir-feminin",
  "titre": "Le plaisir féminin",
  "image": "/images/cas-du-soir/plaisir-couverture.webp",
  "accroche": "Fatou dit « oui, tu es fou » depuis cinq ans. Elle n'a jamais rien ressenti.",
  "accroches": {
    "1": "Fatou dit « oui, tu es fou » depuis cinq ans. Elle n'a jamais rien ressenti.",
    "2": "Un miroir, à trois heures du matin. Pour la première fois, elle regarde.",
    "3": "« Pas ce soir. » Pour la troisième fois cette semaine.",
    "4": "Un gel acheté sur WhatsApp, une poudre glissée par sa tante. Et la douleur.",
    "5": "Ce que son corps a appris, il peut le désapprendre.",
    "6": "Aminata porte un secret depuis qu'elle a six ans.",
    "7": "Elle va tout dire à Modou, ce soir."
  },
  "depart": "2030-01-01",
  "heure": "20:00",
  "programmee": false,
  "debloquer": 30,
  "adultes": true,
  "prixSuite": {
    "2": 4,
    "3": 6,
    "4": 6,
    "5": 8,
    "6": 8,
    "7": 10
  },
  "testLie": "fsfi",
  "testAussi": "sise",
  "avertissement": "Histoire inventée, réservée aux adultes (18 ans et plus). Elle parle du corps et de la sexualité avec des mots directs, sans scène explicite. Toute ressemblance avec des personnes réelles serait une coïncidence. Si elle te touche de près, le compagnon est là pour en parler.",
  "episodes": [
    {
      "titre": "Je simule",
      "texte": "Dakar, Grand-Yoff. Dix heures du soir. Aïda dort enfin. Fatou, trente-deux ans, est allongée dans le noir, les yeux ouverts. À côté d'elle, son mari reprend son souffle.\n\nMODOU : Tu as aimé ?\nFATOU : Oui. Tu es fou.\n\nC'est la phrase. Celle qu'elle dit depuis cinq ans. Elle la dit avec le bon petit rire, au bon moment. Modou sourit dans le noir, se retourne, et s'endort en dix minutes. Fatou, elle, regarde le plafond.\n\nElle n'a jamais su. Le soir de leur mariage, elle attendait « quelque chose ». Une vague, un feu, ce que décrivaient les chansons et les amies. Il ne s'est rien passé, alors elle a fait ce que font des millions de femmes : elle a fait comme si. Elle s'est dit que ça viendrait. Cinq ans plus tard, ça n'est pas venu.\n\nLe lendemain, Aminata arrive avec des beignets et sa franchise habituelle. Aïda joue dans la pièce d'à côté.\n\nAMINATA : Toi, tu as une tête de nuit blanche. Qu'est-ce qui se passe ?\nFATOU : Rien. Enfin… si. Mais je ne peux pas le dire.\nAMINATA : Tu peux tout me dire. Je t'ai connue à douze ans, avec un appareil dentaire et une frange.\nFATOU : Aminata… je fais semblant. Avec Modou. Depuis toujours.\n\nUn silence. Aminata pose son beignet. Elle ne rit pas, elle ne s'étonne pas.\n\nAMINATA : Moi aussi, pendant trois ans.\nFATOU : Quoi ?\nAMINATA : Avec mon ex. Trois ans à dire « oui » en regardant la fissure au plafond. Je me croyais cassée. Et puis une cousine m'a fait écouter les vocaux d'un médecin. Dr Lô. Il parle de ça comme personne.\nFATOU : Un homme ? Qui parle de ça ?\nAMINATA : Un médecin qui travaille en santé mentale et en santé sexuelle. Et crois-moi, ça n'a rien de honteux. Écoute juste le premier. Ce soir, quand Aïda dort.\n\nLe soir, dans la salle de bain, Fatou s'assoit sur le rebord de la baignoire. Elle met le téléphone contre son oreille.\n\nDR LÔ : Salut. Avant tout, je vais te dire quelque chose que presque personne ne te dit : simuler, ce n'est pas un défaut. Des millions de femmes le font. Parce qu'on leur a appris que le plaisir arrive tout seul, et que s'il n'arrive pas, c'est qu'elles ont un problème. C'est faux.\n\nDR LÔ : Le plaisir féminin ne se devine pas. Il s'apprend. Et personne ne nous l'a jamais expliqué : ni à l'école, ni à la maison, ni à la mosquée ou à l'église. Alors on fait semblant, on se tait, et on croit être la seule.\n\nDR LÔ : Je suis médecin, je travaille en santé mentale et en santé sexuelle. Ce que tu vas entendre dans ces vocaux, je te le dis sans détour, avec les vrais mots : clitoris, vagin, cyprine, orgasme. Ce ne sont pas des gros mots. Ce sont des mots de médecine. Ici, pas de honte.\n\nDR LÔ : Trois choses à garder. Un : ton corps n'est pas cassé. Deux : presque toujours, ce que tu vis a une explication, et presque toujours, il y a des solutions. Trois : tu as le droit de savoir comment fonctionne ton corps.\n\nDR LÔ : On commence par le début. Écoute la suite.\n\nQuand le vocal se termine, Fatou ne bouge pas. Pour la première fois depuis cinq ans, quelqu'un vient de lui dire que ce n'est pas elle.",
      "question": "À la place de Fatou, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je dirais la vérité à mon mari dès demain.",
          "echo": "Dire la vérité est courageux et peut libérer. Mais mieux vaut le faire avec des mots préparés, et pas sous le coup de l'émotion."
        },
        {
          "id": "B",
          "label": "Je continuerais à faire semblant pour ne pas le blesser.",
          "echo": "Protéger l'autre est un réflexe d'amour. Mais simuler enferme les deux : lui ne sait pas, et toi, tu ne peux pas progresser."
        },
        {
          "id": "C",
          "label": "J'en parlerais d'abord à une amie de confiance.",
          "echo": "Se confier à une personne sûre est souvent la première marche. On voit plus clair après l'avoir dit à voix haute."
        }
      ],
      "minutes": 4,
      "voix": "narrateur posé ; Fatou fatiguée, qui sourit trop ; Modou doux ; Aminata directe et chaleureuse ; vocal de Dr Lô comme un message WhatsApp.",
      "image": "/images/cas-du-soir/plaisir-ep1.webp",
      "audio": "casDuSoir/plaisir/ep1.mp3",
      "minutage": null
    },
    {
      "titre": "Ce qu'on ne t'a jamais montré",
      "texte": "Trois heures du matin. Modou dort. Fatou se lève sans bruit, ferme la porte de la salle de bain à clé, pose un petit miroir à main sur le rebord du lavabo. Elle n'a jamais regardé. À trente-deux ans, elle ne s'est jamais vraiment regardée.\n\nAu collège, en cours de sciences naturelles, on lui a montré la reproduction : l'utérus, les trompes, les ovaires. Et rien, jamais, pour ce qui sert à ressentir. Elle se souvient du rire gêné de la classe et du mot que la professeure n'a pas prononcé.\n\nElle ouvre le deuxième vocal de Dr Lô. Elle le lance avec le miroir dans l'autre main.\n\nDR LÔ : On va faire connaissance avec ton corps, parce que beaucoup de femmes n'ont jamais regardé ce qu'elles ont entre les jambes.\n\nDR LÔ : Ce qu'on voit de l'extérieur, c'est la vulve. Ce n'est pas le vagin : le vagin est à l'intérieur. La vulve, ce sont les grandes lèvres, les petites lèvres, et en haut, un petit capuchon de peau. Sous ce capuchon, il y a le gland du clitoris : un petit bouton, de la taille d'un petit pois. Et il porte à lui seul des milliers de terminaisons nerveuses, plus que le gland du pénis.\n\nDR LÔ : Mais ce qu'on voit n'est que le sommet de l'iceberg. Le clitoris est un organe d'une dizaine de centimètres. À l'intérieur du corps, il se prolonge en deux branches, un peu comme un « Y » renversé, qui entourent l'entrée du vagin. Quand tu es excitée, tout ce tissu se remplit de sang et gonfle, exactement comme une érection. Le clitoris est le seul organe du corps humain dont la seule fonction est le plaisir.\n\nDR LÔ : Le vagin, lui, est un canal souple, d'une dizaine de centimètres au repos, qui peut s'allonger et s'élargir quand tu es excitée. Les nerfs y sont surtout près de l'entrée, dans le premier tiers. Au fond, il y en a très peu. C'est pour ça que beaucoup de femmes ne ressentent presque rien quand on pousse « loin ».\n\nDR LÔ : Retiens ça : la plus grande partie du plaisir féminin passe par le clitoris, de l'extérieur comme de l'intérieur. Ce n'est pas un défaut de ton corps. C'est ainsi qu'il est fait. Et si ton partenaire cherchait au mauvais endroit, ce n'est la faute de personne : on ne leur a pas appris non plus.\n\nFatou suit les mots comme on suit une carte. Les grandes lèvres. Les petites. Le capuchon. Le petit bouton dessous, de la taille d'un petit pois. Puis la phrase qui la fait s'arrêter : « Ce qu'on voit n'est que le sommet de l'iceberg. Il fait une dizaine de centimètres. »\n\nFATOU : Dix centimètres ?\n\nElle reste longtemps, le miroir sur les genoux. Elle ne ressent ni honte ni dégoût. Quelque chose d'autre, qu'elle met du temps à nommer : de la colère, douce. Cinq ans à se croire défectueuse, et personne ne lui avait montré la carte.\n\nLe lendemain, chez Aminata, avec un thé à la menthe.\n\nAMINATA : Alors ? Tu as écouté ?\nFATOU : J'ai regardé, aussi.\nAMINATA : Avec un miroir ?\nFATOU : Avec un miroir.\nAMINATA : Moi, j'ai pleuré, la première fois. Après, j'ai ri. Et là, j'ai su qu'on pouvait m'apprendre.\nFATOU : Aminata… il faut que je le dise à Modou. Mais comment ? Il va croire que je lui reproche tout.\nAMINATA : Un pas à la fois. D'abord, toi. Ensuite, lui.",
      "question": "À la place de Fatou, avec ce qu'elle vient d'apprendre, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "J'en parlerais à Modou tout de suite.",
          "echo": "L'impatience est compréhensible. Mais l'annoncer à chaud peut être pris pour un reproche. Quelques jours pour trouver tes mots peuvent aider."
        },
        {
          "id": "B",
          "label": "Je prendrais le temps d'apprendre à mieux connaître mon corps d'abord.",
          "echo": "Connaître son corps est la base. Plus on sait ce qu'on aime, plus on peut le dire, et plus le dialogue devient simple."
        },
        {
          "id": "C",
          "label": "Je lui ferais écouter le vocal pour qu'il comprenne.",
          "echo": "Un avis médical peut éviter les malentendus. Mais attention à ne pas laisser l'audio remplacer la conversation à deux."
        }
      ],
      "minutes": 4,
      "voix": "narrateur ; Fatou à voix basse, la nuit ; Aminata qui rit ; vocal de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep2.webp",
      "audio": "casDuSoir/plaisir/ep2.mp3",
      "minutage": null
    },
    {
      "titre": "Le désir et la cyprine",
      "texte": "Jeudi soir. Aïda dort. Fatou range la cuisine. Elle sent la main de Modou dans son dos, ses lèvres dans son cou. Son corps se raidit avant même qu'elle y pense.\n\nMODOU : Tu viens ?\nFATOU : Pas ce soir. Je suis fatiguée.\nMODOU : C'est la troisième fois cette semaine.\n\nElle s'en veut aussitôt. Il se détourne, vexé, et va s'allonger devant la télévision. Elle reste là, à frotter une casserole propre.\n\nLe dimanche, Tante Rama arrive avec un sac de fruits et ses conseils. Soixante ans de mariage, trois maris enterrés, et une conviction.\n\nTANTE RAMA : Une femme ne refuse pas son mari. Tu fais ton devoir, tu fermes les yeux, ça passe vite. Et surtout, tu ne demandes rien : une femme qui demande, c'est une femme qu'on regarde de travers.\nFATOU : Mais, ma tante… et si ça fait mal, ou si on ne ressent rien ?\nTANTE RAMA : On ne ressent pas. On donne. C'est la différence entre l'homme et la femme.\n\nFatou n'insiste pas. Le soir même, elle écoute le troisième vocal.\n\nDR LÔ : Le désir, on nous fait croire qu'il doit tomber du ciel, d'un coup, comme dans les films. Pour beaucoup de femmes, ce n'est pas comme ça.\n\nDR LÔ : Il existe deux sortes de désir. Le désir spontané : l'envie arrive toute seule. Et le désir qui vient après : tu n'as pas envie au départ, mais quand on te touche, quand tu te détends, quand l'ambiance est bonne, l'envie arrive. Les deux sont normaux. Et chez beaucoup de femmes, surtout quand on est fatiguée, quand on a un enfant, c'est la deuxième sorte qui domine. Si tu attends d'avoir envie avant, tu peux attendre longtemps.\n\nDR LÔ : Maintenant, ce qui se passe dans ton corps quand tu t'excites. Le sang afflue dans le clitoris et autour du vagin. Le vagin devient humide : c'est la cyprine, la lubrification naturelle. Et le fond du vagin s'élargit pour faire de la place. Tout ça prend du temps : entre dix et vingt minutes de caresses, souvent. Pas trois minutes.\n\nDR LÔ : Deux choses importantes. Un : être mouillée, ce n'est pas la même chose que vouloir. Le corps peut réagir sans que tu aies envie, et l'inverse : avoir très envie sans être mouillée. Mouillée ne veut pas dire « oui ». Deux : si la pénétration arrive avant que ton corps soit prêt, ça fait mal, ça ne donne rien, et tu apprends à ne plus aimer. Ce n'est pas toi qui es « froide ». C'est que tu n'as pas eu le temps.\n\nDR LÔ : Alors le plaisir, ce n'est pas un interrupteur. C'est une montée. Et tu as le droit de dire : « Attends. »\n\nElle réécoute deux fois : « Le plaisir n'est pas un interrupteur, c'est une montée. » « Tu as le droit de dire : attends. » Elle se demande combien de fois elle aurait dû le dire.\n\nVendredi soir. Modou s'approche. Cette fois, Fatou respire, et se retourne.\n\nFATOU : Modou. J'ai envie de toi, mais pas comme ça, pas d'un coup. J'ai besoin de temps. De caresses. Dix, vingt minutes. Pas trois.\nMODOU : Vingt minutes ? Mais… je croyais que…\nFATOU : Je sais ce que tu croyais. Moi aussi, je croyais.\n\nIl hésite, vexé, puis il comprend qu'elle ne lui reproche rien : elle lui offre une règle. Il lâche son souffle.\n\nMODOU : D'accord. On essaie. Mais dis-moi si je me trompe.",
      "question": "À la place de Fatou, face à Tante Rama, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je l'écouterais poliment, sans changer ma façon de faire.",
          "echo": "Respecter une aînée n'oblige pas à suivre ses conseils. On peut écouter, puis choisir ce qui est bon pour soi."
        },
        {
          "id": "B",
          "label": "Je lui dirais que j'ai appris d'autres choses et que je vois les choses autrement.",
          "echo": "Dire sa différence avec respect est possible. La personne n'est pas forcée de changer, mais elle saura que tu as ton avis."
        },
        {
          "id": "C",
          "label": "Je changerais de sujet pour éviter le conflit.",
          "echo": "Éviter le conflit protège la paix, mais pas toujours la vérité. À chacun de choisir ses batailles."
        }
      ],
      "minutes": 4,
      "voix": "narrateur ; Fatou et Modou, tendus puis apaisés ; Tante Rama sûre d'elle ; vocal de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep3.webp",
      "audio": "casDuSoir/plaisir/ep3.mp3",
      "minutage": null
    },
    {
      "titre": "Quand c'est sec, quand ça fait mal",
      "texte": "Un mois plus tôt, avant tout cela. Après la naissance d'Aïda, Fatou n'avait plus envie de rien. Et ce qu'il y avait à l'intérieur lui faisait mal, était sec, tirait. Personne ne lui avait parlé de ça à la maternité.\n\nUn soir, dans un groupe WhatsApp de femmes, elle tombe sur « Sokhna Astuces ». Des vocaux, des photos, des promesses : « Resserre ton vagin en trois jours. » « Retrouve la fraîcheur de tes vingt ans. » « Ton mari ne voudra plus te lâcher. » Elle commande un gel et une poudre, pour quinze mille francs.\n\nTante Rama, de son côté, lui avait glissé un petit sachet, en cachette : « Mets ça, ma fille. Les hommes aiment quand c'est sec et serré. »\n\nFatou a tout essayé, pendant deux semaines. Le gel qui brûle. La poudre qui pique. Elle a serré les dents, en se disant que c'était normal.\n\nCe samedi-là, Modou la touche à peine, et Fatou sursaute, les larmes aux yeux.\n\nMODOU : Qu'est-ce qu'il y a ? Tu as mal ?\nFATOU : Ce n'est rien.\nMODOU : Tu me dis « ce n'est rien » à chaque fois. Tu as mal à chaque fois, n'est-ce pas ?\n\nElle éclate en larmes. Modou, désarmé, la prend dans ses bras sans rien demander de plus. Le lendemain, Aminata l'accompagne chez une sage-femme.\n\nLe soir, elle écoute le quatrième vocal, assise sur le lit.\n\nDR LÔ : On va parler de sécheresse, de douleur, et de ce qu'on vend aux femmes pour « arranger ça ».\n\nDR LÔ : D'abord la sécheresse vaginale. Elle est fréquente, et elle a des causes. Un manque de temps avant la pénétration, comme je te l'ai expliqué. Le stress, la fatigue. La pilule ou l'implant, qui peuvent diminuer la lubrification. L'allaitement et l'après-accouchement, parce que les hormones baissent : c'est très courant, et ça passe en général. Certains médicaments, comme des antihistaminiques ou des antidépresseurs. Le tabac. La ménopause. Et des produits qu'on met sur la zone intime, j'y reviens dans un instant.\n\nDR LÔ : Ce qui t'aide : des préliminaires plus longs. Un lubrifiant à base d'eau, sans parfum, sans colorant : ce n'est pas un échec, c'est un outil, comme une paire de lunettes. Attention, pas d'huile si vous utilisez un préservatif en latex. Et en parler à un médecin ou à une sage-femme si ça dure, car il existe des traitements simples.\n\nDR LÔ : Si la pénétration fait mal à chaque fois, et que ton corps se ferme tout seul, comme un mur, ça s'appelle le vaginisme. Ce n'est pas dans ta tête, et ce n'est pas un caprice : c'est une contraction involontaire des muscles, souvent liée à la peur. Ça se soigne très bien, avec un professionnel.\n\nDR LÔ : Maintenant, ce qu'on te vend. Sur les réseaux, des femmes proposent des « astuces de femmes » : des gels, des poudres, des plantes, du citron, de l'alun, des produits pour « resserrer » le vagin ou pour le « sécher » parce qu'il paraît que les hommes aiment ça. Écoute-moi bien : ça ne marche pas, et c'est dangereux. Ces produits brûlent, abîment la muqueuse, détruisent la flore qui te protège, donnent des infections, et augmentent le risque d'attraper des maladies, parce que la peau abîmée laisse passer les microbes. Et ils rendent le rapport douloureux pour toi.\n\nDR LÔ : Le vagin n'a pas besoin d'être « resserré » : c'est un organe élastique, qui reprend sa forme tout seul après un accouchement. Si tu veux le renforcer, il existe de vrais exercices : la rééducation du plancher pelvien, avec une sage-femme ou un kiné. Et il n'a pas besoin d'être « sec ». Un vagin sec fait mal, aux deux.\n\n« Ça ne marche pas, et c'est dangereux. » Fatou regarde le sachet de Tante Rama et le gel de Sokhna. La sage-femme avait dit la même chose : irritation, flore abîmée, infection. Elle les met dans un sac, et les jette dans la poubelle de la cour.\n\nPuis elle pose la main sur son ventre, et pour la première fois, elle ne se juge plus.",
      "question": "À la place de Fatou, après ce qu'elle a vécu, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je jetterais les produits et je verrais une sage-femme.",
          "echo": "C'est le bon réflexe : arrêter ce qui irrite, et se faire examiner. La plupart des problèmes de sécheresse se soignent simplement."
        },
        {
          "id": "B",
          "label": "J'arrêterais les produits, mais je n'irais pas consulter.",
          "echo": "Arrêter est déjà essentiel. Mais si la douleur ou la sécheresse persistent, mieux vaut un avis médical pour vérifier qu'il n'y a pas d'infection."
        },
        {
          "id": "C",
          "label": "Je ferais confiance à ma tante et je continuerais.",
          "echo": "On aime ses proches, mais certains produits traditionnels ou vendus sur les réseaux abîment la peau et exposent aux infections. La santé passe avant la tradition."
        }
      ],
      "minutes": 5,
      "voix": "narrateur ; Fatou qui serre les dents ; Modou désarmé ; Tante Rama ; vocal de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep4.webp",
      "audio": "casDuSoir/plaisir/ep4.mp3",
      "minutage": null
    },
    {
      "titre": "Ce que nos habitudes font au plaisir",
      "texte": "Fatou a un secret, et il n'est pas honteux. Il l'est devenu à force d'être tu. Depuis ses dix-neuf ans, elle se donne du plaisir seule, vite, fort, dans la salle de bain, avec un petit appareil qu'une amie de la fac lui avait offert, en rigolant, avant le mariage. Cinq minutes, le volume à fond, et c'est fini.\n\nAvec Modou, rien. Pas même l'ombre de ce qu'elle trouve seule.\n\nCe soir-là, elle écoute le cinquième vocal. Elle se sent rougir, même seule.\n\nDR LÔ : Celui-ci, beaucoup de femmes n'osent pas le dire, alors je le dis pour toi : la masturbation est normale, saine, et c'est même une bonne façon de découvrir son corps. Mais la manière dont on la pratique peut avoir un effet sur le plaisir avec un partenaire.\n\nDR LÔ : Voilà ce qui peut arriver. Si, depuis des années, tu te donnes du plaisir toujours de la même manière : très vite, très fort, au même endroit, parfois avec un vibromasseur à pleine puissance, ton corps apprend. Il apprend qu'il ne s'excite que dans ces conditions-là. Et quand ton partenaire te touche plus doucement, ou quand il y a la pénétration, ton corps ne réagit presque pas. Ce n'est pas que tu es « abîmée ». Les nerfs ne sont pas détruits. C'est une habitude, un conditionnement, et ça peut se changer.\n\nDR LÔ : Il en va de même avec la pornographie. Elle montre des femmes qui jouissent en deux minutes, par la pénétration seule, dans des positions impossibles. Ce n'est pas la réalité : on t'apprend un scénario faux.\n\nDR LÔ : Alors, comment réapprendre la sensibilité ? Un : fais une pause de deux à trois semaines des stimulations très fortes. Deux : explore doucement, avec les doigts ou la main, plus lentement, plus légèrement, sur tout le corps : le cou, le ventre, l'intérieur des cuisses, la vulve, l'entrée du vagin. Trois : varie la pression et le rythme. Quatre : si tu utilises un vibromasseur, essaie une intensité plus faible. Cinq : prends ton temps, sans objectif de jouir. Le but, c'est de ressentir.\n\nDR LÔ : Ça demande de la patience. Mais ton corps sait réapprendre. Et si tu te sens bloquée malgré tout, un médecin ou un sexologue peut t'accompagner.\n\n« Ton corps apprend qu'il ne s'excite que dans ces conditions-là. Ce n'est pas que tu es abîmée. C'est une habitude. Ça peut se changer. » Elle repose le téléphone, soulagée et inquiète à la fois.\n\nAlors elle décide d'essayer. Une pause de trois semaines. Pas d'appareil, pas de rapidité. Chaque soir, elle apprend à toucher son corps autrement : le cou, les épaules, le ventre, l'intérieur des cuisses. Doucement. Sans but.\n\nLes premiers jours, rien. Ou presque. Une impatience, un doute. La troisième semaine, un soir, elle sent quelque chose changer : une chaleur plus lente, plus large, qui ne ressemble à rien de ce qu'elle connaissait.\n\nFATOU : C'est ça.\n\nElle sourit, seule, dans le noir. Elle n'a pas encore tout compris. Mais elle sait maintenant que son corps sait faire autre chose.",
      "question": "À la place de Fatou, que ferais-tu ?",
      "choix": [
        {
          "id": "A",
          "label": "Je ferais la pause et j'explorerais lentement, comme elle.",
          "echo": "La patience est le meilleur outil. En trois semaines, le corps réapprend déjà beaucoup, sans objectif de performance."
        },
        {
          "id": "B",
          "label": "Je continuerais comme avant : ça marche pour moi.",
          "echo": "Si ça te convient, c'est ton droit. Mais si tu ressens peu avec un partenaire, c'est un signal : varier peut ouvrir d'autres sensations."
        },
        {
          "id": "C",
          "label": "J'en parlerais à un médecin ou à un sexologue.",
          "echo": "C'est une très bonne idée si tu te sens bloquée ou si ça t'inquiète. Un professionnel donne des repères précis."
        }
      ],
      "minutes": 4,
      "voix": "narrateur ; Fatou seule, qui apprend à se découvrir ; vocal de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep5.webp",
      "audio": "casDuSoir/plaisir/ep5.mp3",
      "minutage": null
    },
    {
      "titre": "Ce qu'on nous a appris à taire",
      "texte": "Un soir de pluie. On sonne à la porte. C'est Aminata, trempée, sans parapluie, les yeux rouges. Fatou la fait entrer, la sèche, lui sert un thé.\n\nAMINATA : Je dois te dire quelque chose. Je ne l'ai jamais dit à personne.\nFATOU : Je t'écoute.\nAMINATA : J'avais six ans. C'était pendant les vacances, au village. Ma grand-mère m'a emmenée. Il y avait d'autres petites filles. Je ne savais pas où on allait. Quand je suis revenue, je ne pouvais plus marcher normalement pendant plusieurs jours. Personne ne m'a rien expliqué.\n\nFatou comprend avant qu'Aminata ne finisse. Elle pose sa main sur la sienne.\n\nAMINATA : Je l'ai appris à vingt ans, dans un livre, le mot : excision. On m'avait coupé le clitoris. Voilà pourquoi, pendant trois ans, avec mon ex, je ne ressentais presque rien. Je croyais que j'étais cassée. Mais c'était déjà fait avant moi.\nFATOU : Aminata… je suis désolée.\nAMINATA : Ce n'est pas toi. Ce n'est même pas ma grand-mère, au fond. Elle croyait bien faire. Elle l'a vécu aussi.\n\nDehors, la pluie bat sur les volets. Fatou pense à sa propre mère, à son silence quand elle posait des questions : « Ça ne se dit pas. » Elle comprend que ce silence aussi est une blessure héritée.\n\nElle prend son téléphone. Elle lance le sixième vocal. Cette fois, elles l'écoutent toutes les deux, serrées l'une contre l'autre.\n\nDR LÔ : Cet épisode est plus grave, et je te demande de l'écouter doucement.\n\nDR LÔ : Il y a des femmes à qui on a coupé le clitoris quand elles étaient petites. C'est l'excision. Selon les cas, on retire le gland du clitoris, les petites lèvres, parfois on referme presque tout. Au Sénégal, elle est interdite par la loi depuis 1999. Les mères, les grand-mères qui l'ont fait l'ont souvent fait par tradition, par peur du regard des autres, parfois sans savoir ce que ça faisait. Ce n'est pas une raison pour juger ces femmes : beaucoup ont subi ça elles aussi.\n\nDR LÔ : Ce que l'excision peut causer : des douleurs, des cicatrices, des infections, des difficultés pendant l'accouchement, et une perte de sensibilité, plus ou moins grande selon le type. Si c'est ton cas, écoute bien : tu as le droit de ressentir du plaisir. Le clitoris ne se limite pas à la partie visible : ses branches, à l'intérieur, restent souvent présentes. Le plaisir passe aussi par la peau, par le cerveau, par la confiance. Il peut être différent, plus lent, plus difficile, mais il est possible pour beaucoup de femmes. Un médecin, une sage-femme ou un sexologue peut t'accompagner, et dans certains pays, il existe même une chirurgie de réparation.\n\nDR LÔ : Et puis, il y a toutes les autres blessures qu'on ne voit pas. La honte, la peur, les paroles qu'on t'a répétées : « une femme bien ne demande pas », « ça ne se dit pas », « ça fait mal la première fois, c'est normal ». Ou une agression, un viol, des attouchements, qui laissent le corps en alerte, même des années après. Si c'est ton histoire, ce n'est pas ta faute, et ça se soigne avec un professionnel formé.\n\nDR LÔ : Une dernière chose, importante pour tout le monde : le consentement. Le plaisir ne peut exister que si tu as dit oui, que tu peux dire non, et que tu peux changer d'avis à tout moment, même en plein milieu. Un « non » n'a pas besoin d'être justifié.\n\n« Tu as le droit de ressentir du plaisir. Le clitoris ne se limite pas à la partie visible. » Aminata ne dit rien. Mais elle serre la main de Fatou, très fort.\n\nAMINATA : Tu crois qu'un médecin pourrait m'aider ?\nFATOU : Je crois que oui. On ira ensemble.",
      "question": "À la place de Fatou, que ferais-tu pour Aminata ?",
      "choix": [
        {
          "id": "A",
          "label": "Je l'écouterais sans juger, et je serais là.",
          "echo": "Être écoutée sans jugement est déjà un soin. La première chose dont elle a besoin, c'est de ne plus être seule avec ça."
        },
        {
          "id": "B",
          "label": "Je l'encouragerais à voir un médecin ou une sage-femme.",
          "echo": "Un professionnel peut lui donner des réponses précises et des pistes de soin. L'accompagner jusque-là, c'est lui montrer qu'elle n'est pas seule."
        },
        {
          "id": "C",
          "label": "J'en parlerais à sa famille pour qu'ils l'aident.",
          "echo": "Attention : c'est son histoire, et c'est à elle de décider de qui doit savoir. Sans son accord, on risquerait de la blesser."
        }
      ],
      "minutes": 5,
      "voix": "narrateur ; Aminata bouleversée, la pluie ; Fatou qui écoute ; vocal de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep6.webp",
      "audio": "casDuSoir/plaisir/ep6.mp3",
      "minutage": null
    },
    {
      "titre": "Parler, guider, apprendre ensemble",
      "texte": "Samedi soir. Aïda dort chez sa grand-mère. Dans la salle de bain, Fatou est assise sur le bord de la baignoire, le téléphone à la main. Elle réécoute le dernier vocal de Dr Lô, une dernière fois, avant de sortir.\n\nDR LÔ : Maintenant, on arrive à l'essentiel : le plaisir, ça se construit à deux. Et ça commence par des mots.\n\nDR LÔ : Comment commencer. Choisis un moment calme, pas au lit, pas pendant ou juste après un rapport. Dis-lui d'abord ce que tu aimes chez lui : ça le rassure. Puis dis-lui : « J'ai appris des choses sur mon corps. J'aimerais qu'on les découvre ensemble. » Pas de reproche : « Tu ne fais pas ça bien », mais une invitation : « Essaie comme ça. »\n\nDR LÔ : Ensuite, guide-le. Prends sa main et montre-lui. Une pression plus légère, un rythme plus lent, un endroit précis. Dis « oui », dis « plus doucement », dis « là ». Avec des mots simples, ou avec un souffle. Donne-lui le temps de s'entraîner.\n\nElle range le téléphone. Dans le salon, Modou attend, un verre de thé devant lui. Il sent depuis des semaines que quelque chose a changé. Elle dit « pas ce soir », elle ne dit plus « oui, tu es fou ». Il a peur de ce qu'elle va dire.\n\nFATOU : Modou. Avant tout, je veux te dire ce que j'aime chez toi. Tu es doux. Tu t'occupes d'Aïda comme personne. Tu as toujours voulu que je sois bien.\nMODOU : Ça commence mal, cette phrase.\nFATOU : Elle commence bien. Écoute-moi jusqu'au bout. Depuis cinq ans… je simule.\n\nIl ne dit rien. Le thé refroidit. Il regarde ses mains.\n\nMODOU : Depuis quand ?\nFATOU : Depuis notre nuit de noces.\nMODOU : Cinq ans. Je croyais que… je croyais bien faire. Je pensais que tu étais heureuse.\nFATOU : Tu faisais ce qu'on t'avait appris, Modou. Moi, je faisais ce qu'on m'avait appris à taire. Personne ne nous a jamais expliqué comment ça marche. Ni à toi, ni à moi.\n\nElle sort son téléphone, ouvre un schéma que Dr Lô lui a envoyé. Le clitoris, vu de côté : ce petit bouton visible, et tout le reste, caché, qui s'étend de chaque côté.\n\nFATOU : Regarde. Ce n'est pas là-dedans que ça se passe, pas seulement. C'est ici. Et ça, c'est la plus grande partie du plaisir d'une femme.\nMODOU : C'est… c'est aussi grand que ça ?\nFATOU : Dix centimètres. À l'intérieur.\n\nModou la regarde, puis le schéma. Puis, pour la première fois depuis longtemps, il rit, un petit rire gêné, presque soulagé.\n\nMODOU : Cinq ans que je cherche au mauvais endroit.\nFATOU : Et moi, cinq ans que je ne t'ai pas dit où chercher.\n\nIl pose la main sur la table, la paume vers le haut. Elle hésite, puis elle prend ses doigts.\n\nFATOU : Là, la pulpe de tes doigts. Doucement. Moins fort. Comme si tu caressais la joue d'Aïda. Plus lent… voilà.\nMODOU : Comme ça ?\nFATOU : Comme ça. Et si je dis « stop », tu t'arrêtes. Sans te vexer. Et si je dis « plus doucement », ce n'est pas un reproche.\nMODOU : Promis. Et toi, tu me dis tout. Même si c'est difficile à entendre.\nFATOU : Ce soir, on ne cherche rien. Pas de pénétration. Pas de performance. On apprend.\n\nCe qui se passe ensuite est leur affaire. Il y a des silences, des rires, un « oui » dit pour de vrai, un « attends » respecté, un « plus doucement » entendu.\n\nAu matin, le téléphone de Fatou sonne : c'est sa belle-mère, qui ramène Aïda. Modou prépare le thé. Fatou n'a pas encore tout compris, elle n'a pas encore tout trouvé. Mais pour la première fois depuis cinq ans, elle n'a pas fait semblant.",
      "question": "Si tu étais à la place de Fatou, comment commencerais-tu cette conversation ?",
      "choix": [
        {
          "id": "A",
          "label": "Je choisirais un moment calme, loin du lit, et je commencerais par lui dire ce que j'aime chez lui.",
          "echo": "Commencer par ce qui va bien rassure l'autre, et lui permet d'entendre le reste sans se défendre. C'est souvent la meilleure porte d'entrée."
        },
        {
          "id": "B",
          "label": "Je lui ferais d'abord écouter un des vocaux, pour que ce soit une médecin qui explique.",
          "echo": "Laisser un professionnel poser les bases peut éviter les reproches. Mais ensuite, ce sont vos mots à vous deux qui comptent."
        },
        {
          "id": "C",
          "label": "J'attendrais d'être plus sûre de moi.",
          "echo": "Prendre le temps est légitime, mais attendre d'être « sûre » peut durer longtemps. Un premier pas imparfait vaut mieux que cinq ans de silence."
        }
      ],
      "minutes": 5,
      "voix": "narrateur ; Fatou et Modou, la vérité enfin dite ; fin chaude ; vocal court de Dr Lô.",
      "image": "/images/cas-du-soir/plaisir-ep7.webp",
      "audio": "casDuSoir/plaisir/ep7.mp3",
      "minutage": null
    }
  ],
  "fin": {
    "titre": "La leçon de Dr Lô",
    "texte": "Bonsoir, c'est Dr Lô. Tu viens de suivre Fatou et Modou. Et peut-être que quelque part, tu t'es reconnue, ou tu as reconnu ton couple. Je vais te résumer ce qu'il faut retenir, en dix points.\n\nUn. Le plaisir féminin s'apprend. On ne naît pas en sachant, et personne ne nous l'a enseigné.\n\nDeux. Le clitoris est le centre du plaisir. Ce qu'on voit n'est que le sommet : à l'intérieur, il fait une dizaine de centimètres et entoure l'entrée du vagin.\n\nTrois. La plupart des femmes, entre une sur dix et une sur cinq, jouissent par la pénétration seule. Les autres ont besoin d'une stimulation du clitoris. Ce n'est pas un défaut, c'est l'anatomie.\n\nQuatre. Le désir peut venir avant ou après. Les deux sont normaux. Et la cyprine met du temps à venir : dix à vingt minutes de caresses.\n\nCinq. La sécheresse a des causes : le manque de temps, le stress, les hormones, la contraception, l'allaitement, certains médicaments. Un lubrifiant à base d'eau est un outil, pas un échec.\n\nSix. Ne mets rien d'agressif dans ton vagin : ni citron, ni alun, ni poudres, ni gels « resserrants » vendus sur les réseaux. Ils brûlent, abîment ta flore, et augmentent le risque d'infections.\n\nSept. Le vagin n'a pas besoin d'être resserré ni séché. Pour le renforcer, il existe la rééducation du plancher pelvien.\n\nHuit. Des stimulations toujours très fortes, très rapides, ou la pornographie, peuvent habituer ton corps à une seule façon de s'exciter. Ça se corrige : pause, douceur, patience.\n\nNeuf. L'excision et les traumatismes ne condamnent pas le plaisir. Un professionnel peut t'accompagner. Et le consentement, le droit de dire non, est la base de tout.\n\nDix. Parlez. Guidez. Essayez sans pression. Les caresses, les mains, la bouche, ce ne sont pas des préliminaires : c'est du sexe à part entière, et la pénétration n'est pas le but. Et tu as toujours le droit de dire : aujourd'hui, j'ai juste envie de câlins. Le plaisir se construit à deux, avec des mots.\n\nSi tu as mal à chaque rapport, si ton corps se ferme, si tu ne ressens jamais rien malgré le temps, ou si une blessure du passé te revient, va voir un médecin, une sage-femme ou un sexologue. Ce n'est pas honteux. C'est prendre soin de toi. Prends soin de toi, et à bientôt.",
    "audio": "casDuSoir/plaisir/lecon.mp3",
    "minutage": null,
    "quiz": [
      {
        "question": "Où se trouve la plus grande partie du plaisir féminin ?",
        "reponses": [
          "Au fond du vagin",
          "Dans le clitoris, visible et caché",
          "Ça dépend des jours, on ne sait pas"
        ],
        "bonne": 1,
        "explication": "le clitoris fait une dizaine de centimètres, presque tous à l'intérieur du corps. Seulement une femme sur dix à une sur cinq jouit par la pénétration seule : les autres ont besoin de la stimulation du clitoris. Ce n'est pas un défaut, c'est l'anatomie."
      },
      {
        "question": "Un gel « resserrant » ou une poudre pour « sécher », achetés sur les réseaux, c'est…",
        "reponses": [
          "Sans risque s'il est naturel",
          "Dangereux : brûlures, infections, flore abîmée",
          "Utile après un accouchement"
        ],
        "bonne": 1,
        "explication": "le vagin est élastique : il n'a besoin ni d'être resserré ni d'être séché. Ces produits irritent, abîment la flore qui protège et augmentent le risque d'infections. Pour le renforcer, il existe la rééducation du plancher pelvien, avec une sage-femme ou un kiné."
      },
      {
        "question": "Si ton corps ne s'excite plus que par une stimulation très forte et très rapide, que peux-tu faire ?",
        "reponses": [
          "Rien : c'est définitif",
          "Faire une pause, varier la pression et le rythme, explorer doucement",
          "Augmenter encore l'intensité"
        ],
        "bonne": 1,
        "explication": "ce n'est pas définitif : c'est une habitude, un conditionnement. Une pause de quelques semaines, des caresses plus lentes sur tout le corps et plus de patience permettent de retrouver de la sensibilité."
      }
    ],
    "apresQuiz": "3 sur 3 ? Tu en sais maintenant plus que beaucoup d'adultes sur le plaisir féminin. Reste à en parler, avec des mots simples."
  }
};
