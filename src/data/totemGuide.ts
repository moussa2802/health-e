/**
 * totemGuide.ts — À quoi sert ton animal intérieur, au quotidien.
 * Pour chaque animal : ta force, ton piège quand ça chauffe, ce qui te recharge,
 * comment tu aimes, et un défi concret pour la semaine.
 * Textes à valider par Papa Moussa (bien-être, pas de diagnostic, tutoiement neutre).
 * L'animal intérieur vient du tempérament (Big Five, attachement, résilience) : ces repères en découlent.
 */
import type { TotemAnimal } from '../utils/totemAlgorithm';

export interface TotemGuide {
  force: string;
  piege: string;
  recharge: string;
  lien: string;
  defi: string;
}

export const TOTEM_GUIDE: Record<TotemAnimal, TotemGuide> = {
  lion: {
    force: 'Tu prends les choses en main quand les autres hésitent. Dans un groupe, ta confiance donne du courage.',
    piege: 'Quand ça chauffe, tu veux tout porter et tout décider {{seul|seule}}. Demander de l\'aide te paraît être une faiblesse.',
    recharge: 'Un projet qui avance, des gens qui comptent sur toi, et un vrai moment où personne ne te demande rien.',
    lien: 'Tu protèges et tu donnes beaucoup. Tu as besoin d\'être {{admiré|admirée}} pour ce que tu es, pas seulement pour ce que tu fais.',
    defi: 'Cette semaine, délègue une chose que tu fais d\'habitude toi-même, et laisse-la être faite autrement.',
  },
  aigle: {
    force: 'Tu prends de la hauteur. Là où les autres voient un problème, tu vois la route et le but.',
    piege: 'Sous pression, tu t\'isoles dans ta tête et tu décides {{seul|seule}}. Les autres peuvent te trouver distant.',
    recharge: 'Du temps pour toi, de l\'espace pour réfléchir, et un objectif qui a du sens.',
    lien: 'Tu as besoin de liberté dans tes relations. Tu aimes profondément, mais à ta façon, sans être {{étouffé|étouffée}}.',
    defi: 'Cette semaine, partage un de tes projets avec un proche avant qu\'il soit fini, et écoute son avis.',
  },
  cheval: {
    force: 'Ton énergie entraîne les autres. Tu oses, tu découvres, tu remets du mouvement là où ça stagne.',
    piege: 'Quand ça coince, tu fuis vers autre chose : un nouveau projet, une sortie, une distraction. Les problèmes restent.',
    recharge: 'Bouger, voir du monde, apprendre quelque chose de nouveau. La routine te vide.',
    lien: 'Tu aimes avec passion et spontanéité. Tu as besoin d\'un partenaire qui suit ton rythme sans te retenir.',
    defi: 'Cette semaine, termine une chose commencée avant d\'en lancer une nouvelle.',
  },
  loup: {
    force: 'Ta loyauté est rare. Pour ta famille, tes amis, ton couple, tu es là, toujours.',
    piege: 'Quand un lien est menacé, tu t\'inquiètes beaucoup et tu peux t\'oublier pour garder la paix.',
    recharge: 'Les moments avec ta « meute » : un repas, un thé, une causerie avec ceux qui comptent.',
    lien: 'Tu t\'attaches fort et pour longtemps. Tu as besoin de sentir que l\'autre est aussi fidèle que toi.',
    defi: 'Cette semaine, dis non une fois à une demande, gentiment, et vois que le lien tient quand même.',
  },
  dauphin: {
    force: 'Ta joie et ton écoute mettent les gens à l\'aise. Tu crées des liens partout où tu passes.',
    piege: 'Tu caches tes soucis derrière ton sourire pour ne pas peser sur les autres. À force, tu portes {{seul|seule}}.',
    recharge: 'Les rires, la musique, les gens. Mais aussi un vrai confident à qui tu peux tout dire.',
    lien: 'Tu aimes en partageant tout. Tu as besoin de complicité et que l\'autre s\'intéresse aussi à toi.',
    defi: 'Cette semaine, raconte à quelqu\'un de confiance une chose qui te pèse, même petite.',
  },
  elephant: {
    force: 'On peut compter sur toi. Tu es le pilier de ta famille ou de ton groupe, fiable et bienveillant.',
    piege: 'Tu portes les problèmes de tout le monde et tu passes après. La fatigue s\'accumule sans bruit.',
    recharge: 'Le calme, la stabilité, et des moments où c\'est toi qu\'on prend en charge.',
    lien: 'Tu aimes en protégeant et en donnant. Tu as besoin de reconnaissance, d\'un « merci » sincère.',
    defi: 'Cette semaine, accepte qu\'on t\'aide une fois, sans te justifier.',
  },
  cerf: {
    force: 'Tu sens les ambiances, les émotions, les non-dits. Ta finesse te rend très juste avec les autres.',
    piege: 'Tu absorbes les émotions des autres et tu ressens tout plus fort. Les conflits et le bruit t\'épuisent vite.',
    recharge: 'Le calme, la nature, la musique douce, et du temps seul après les journées chargées.',
    lien: 'Tu aimes avec délicatesse et profondeur. Tu as besoin de douceur et qu\'on prenne tes émotions au sérieux.',
    defi: 'Cette semaine, avant de répondre à une tension, prends trois respirations lentes et demande-toi : « c\'est mon émotion ou celle de l\'autre ? »',
  },
  hibou: {
    force: 'Tu observes, tu analyses, tu comprends en profondeur. Tes conseils sont réfléchis et justes.',
    piege: 'Quand tu doutes, tu réfléchis en boucle sans agir. Tu peux rester {{coincé|coincée}} dans ta tête.',
    recharge: 'Lire, apprendre, des conversations profondes, et du silence.',
    lien: 'Tu t\'ouvres lentement, mais vraiment. Tu as besoin d\'échanges sincères plus que de beaucoup de monde.',
    defi: 'Cette semaine, prends une petite décision en moins de 5 minutes, et tiens-la.',
  },
  panthere: {
    force: 'Tu restes calme quand les autres paniquent. Tu avances avec précision et maîtrise.',
    piege: 'Tu gardes tout à l\'intérieur. Les autres ne savent pas quand tu vas mal, et toi non plus parfois.',
    recharge: 'Ton propre rythme, l\'efficacité, et des moments rien qu\'à toi.',
    lien: 'Tu aimes discrètement mais fort. Tu as besoin de confiance et d\'espace, pas de démonstrations.',
    defi: 'Cette semaine, dis à un proche ce que tu ressens vraiment, en une phrase.',
  },
  renard: {
    force: 'Tu t\'adaptes à tout et tu trouves toujours une solution. Ton esprit vif te sort des situations compliquées.',
    piege: 'Tu peux tout gérer « en mode stratégie » et oublier ce que tu ressens. Tu contrôles plutôt que de confier.',
    recharge: 'Les défis, les idées nouvelles, et des gens qui te stimulent.',
    lien: 'Tu es malin et attentionné en amour. Tu as besoin de jeu, de complicité et de confiance mutuelle.',
    defi: 'Cette semaine, demande l\'avis de quelqu\'un sur un problème, au lieu de le régler {{seul|seule}}.',
  },
  tortue: {
    force: 'Ta constance et ta paix intérieure rassurent. Tu tiens bon dans les tempêtes, à ton rythme.',
    piege: 'Quand quelque chose te blesse, tu rentres dans ta carapace. Tu évites le conflit plutôt que d\'en parler.',
    recharge: 'La régularité, les habitudes qui apaisent, la prière ou la méditation, la nature.',
    lien: 'Tu aimes avec fidélité et patience. Tu as besoin de stabilité et de temps pour te sentir en confiance.',
    defi: 'Cette semaine, aborde calmement un petit sujet que tu évites depuis un moment.',
  },
  ours: {
    force: 'Ta force tranquille protège ceux que tu aimes. Tu n\'as pas besoin de beaucoup de monde pour être bien.',
    piege: 'Quand ça va mal, tu te retires complètement. Ton silence peut inquiéter ou éloigner tes proches.',
    recharge: 'La solitude choisie, ta maison, un cercle restreint de gens de confiance.',
    lien: 'Tu laisses entrer peu de monde, mais pour toujours. Tu as besoin qu\'on respecte tes moments de retrait.',
    defi: 'Cette semaine, quand tu as besoin de te retirer, préviens un proche d\'un simple message.',
  },
};

/** Quelle jauge relève quel programme (pour « Ce qui ferait rayonner ton animal intérieur »). */
export const GAUGE_TO_AXIS: Record<string, 'stress' | 'humeur' | null> = {
  gad7: 'stress', pss10: 'stress', phq9: 'humeur', rses: null, brs: null, ecr_r: null, big_five: null,
};

/**
 * Routines propres à chaque totem, à ajouter (ou retirer) dans « Mon programme ».
 * Petites habitudes quotidiennes, cochables, gratuites. Tirées de la force, du piège et de ce
 * qui recharge chaque animal.
 */
export interface TotemRoutine { id: string; title: string; text: string; when: 'matin' | 'journée' | 'soir' }

export const TOTEM_ROUTINES: Record<TotemAnimal, TotemRoutine[]> = {
  lion: [
    { id: 'LI1', when: 'matin', title: 'Une tâche à confier', text: 'Choisis une chose que tu peux laisser faire par quelqu\'un d\'autre aujourd\'hui.' },
    { id: 'LI2', when: 'journée', title: 'Écouter avant de décider', text: 'Dans une discussion, laisse l\'autre finir et demande son avis avant de trancher.' },
    { id: 'LI3', when: 'soir', title: '10 minutes sans responsabilité', text: 'Un moment où personne ne te demande rien : thé, marche, musique.' },
  ],
  aigle: [
    { id: 'AI1', when: 'matin', title: 'Mon cap du jour', text: 'Écris en une phrase la chose la plus importante de ta journée.' },
    { id: 'AI2', when: 'journée', title: 'Partager une idée', text: 'Raconte une de tes idées ou de tes projets à un proche.' },
    { id: 'AI3', when: 'soir', title: 'Redescendre', text: '5 minutes sans écran à ne penser à rien de précis, juste respirer.' },
  ],
  cheval: [
    { id: 'CH1', when: 'matin', title: 'Bouger dès le matin', text: '10 minutes de mouvement : marche, étirements, danse.' },
    { id: 'CH2', when: 'journée', title: 'Finir avant de commencer', text: 'Termine une chose en cours avant d\'en lancer une nouvelle.' },
    { id: 'CH3', when: 'soir', title: 'Ralentir le soir', text: 'Une activité calme avant de dormir, sans téléphone.' },
  ],
  loup: [
    { id: 'LO1', when: 'journée', title: 'Un message à ma meute', text: 'Prends des nouvelles d\'une personne qui compte pour toi.' },
    { id: 'LO2', when: 'journée', title: 'Mon besoin à moi', text: 'Repère un de tes besoins aujourd\'hui et dis-le simplement.' },
    { id: 'LO3', when: 'soir', title: 'Un moment pour moi', text: '15 minutes rien que pour toi, sans t\'occuper des autres.' },
  ],
  dauphin: [
    { id: 'DA1', when: 'matin', title: 'Ma vraie météo', text: 'Note honnêtement comment tu te sens, même si tu souris dehors.' },
    { id: 'DA2', when: 'journée', title: 'Confier une chose', text: 'Dis à quelqu\'un de confiance une petite chose qui te pèse.' },
    { id: 'DA3', when: 'soir', title: 'Recharger dans le calme', text: '10 minutes au calme, rien que pour toi, après une journée pleine de monde.' },
  ],
  elephant: [
    { id: 'EL1', when: 'matin', title: 'Moi d\'abord, un peu', text: 'Fais une chose pour toi avant de t\'occuper des autres.' },
    { id: 'EL2', when: 'journée', title: 'Accepter une aide', text: 'Laisse quelqu\'un t\'aider ou te rendre service aujourd\'hui.' },
    { id: 'EL3', when: 'soir', title: 'Poser le fardeau', text: 'Écris ce que tu portes pour les autres, et ce que tu peux laisser.' },
  ],
  cerf: [
    { id: 'CE1', when: 'matin', title: 'Mon bouclier du matin', text: 'Trois respirations lentes avant d\'ouvrir ton téléphone.' },
    { id: 'CE2', when: 'journée', title: 'Mon émotion ou la sienne ?', text: 'Face à une tension, demande-toi : « c\'est à moi, ou je l\'absorbe ? »' },
    { id: 'CE3', when: 'soir', title: 'Un moment calme', text: '15 minutes dans le calme : musique douce, nature, prière.' },
  ],
  hibou: [
    { id: 'HI1', when: 'matin', title: 'Une décision rapide', text: 'Prends une petite décision en moins de 5 minutes, et tiens-la.' },
    { id: 'HI2', when: 'journée', title: 'Sortir de ma tête', text: 'Fais une chose concrète avec tes mains : ranger, cuisiner, marcher.' },
    { id: 'HI3', when: 'soir', title: 'Vider mes pensées', text: 'Écris ce qui tourne dans ta tête avant de dormir.' },
  ],
  panthere: [
    { id: 'PA1', when: 'matin', title: 'Mon ressenti du jour', text: 'Mets un mot sur ce que tu ressens ce matin.' },
    { id: 'PA2', when: 'journée', title: 'Dire une chose vraie', text: 'Partage avec un proche une chose que tu ressens vraiment.' },
    { id: 'PA3', when: 'soir', title: 'Relâcher le contrôle', text: 'Relâche les épaules, la mâchoire, et laisse la journée derrière toi.' },
  ],
  renard: [
    { id: 'RE1', when: 'matin', title: 'Une émotion, pas une stratégie', text: 'Avant de planifier ta journée, note ce que tu ressens.' },
    { id: 'RE2', when: 'journée', title: 'Demander un avis', text: 'Demande l\'avis de quelqu\'un au lieu de tout régler {{seul|seule}}.' },
    { id: 'RE3', when: 'soir', title: 'Lâcher prise', text: 'Accepte une chose de la journée qui ne s\'est pas passée comme prévu.' },
  ],
  tortue: [
    { id: 'TO1', when: 'matin', title: 'Mon rituel calme', text: 'Garde ton rituel du matin : prière, thé, quelques minutes au calme.' },
    { id: 'TO2', when: 'journée', title: 'Sortir de la carapace', text: 'Dis une chose qui te gêne, calmement, au lieu de l\'éviter.' },
    { id: 'TO3', when: 'soir', title: 'Une petite nouveauté', text: 'Essaie une petite chose nouvelle cette semaine : un plat, un trajet, une rencontre.' },
  ],
  ours: [
    { id: 'OU1', when: 'journée', title: 'Prévenir avant de me retirer', text: 'Quand tu as besoin de solitude, envoie un mot à un proche.' },
    { id: 'OU2', when: 'journée', title: 'Un lien, même court', text: 'Un appel ou un message à une personne de confiance.' },
    { id: 'OU3', when: 'soir', title: 'Ma tanière', text: 'Un vrai moment de repos chez toi, sans culpabilité.' },
  ],
};

export function routineById(id: string): TotemRoutine | undefined {
  for (const list of Object.values(TOTEM_ROUTINES)) {
    const r = list.find(x => x.id === id);
    if (r) return r;
  }
  return undefined;
}
