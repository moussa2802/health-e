import type { AssessmentScale } from '../../../types/assessment';

// NPI-16 : Narcissistic Personality Inventory — 16 items version
// Format : choix forcé entre deux affirmations
// Score total : 0-16  |  Seuils : 0-3 faible / 4-7 modéré / 8-11 élevé / 12-16 très élevé
// Ames, Rose & Anderson (2006)
// value 0 = option non-narcissique | value 1 = option narcissique (scoring Ames et al.)

export const BONUS_NARCISSISME: AssessmentScale = {
  id: 'bonus_narcissisme',
  name: 'Traits narcissiques',
  shortName: 'NPI-16',
  category: 'bonus',
  description: 'Mesure les traits narcissiques de la personnalité à travers 16 paires d\'affirmations.',
  instructions: 'Pour chaque paire, choisis l\'affirmation qui te ressemble le plus. Pas de piège — sois honnête avec toi-même \u{1FA9E}',
  timeEstimateMinutes: 5,
  reference: 'Ames, D.R., Rose, P., & Anderson, C.P. (2006). The NPI-16 as a short measure of narcissism. Journal of Research in Personality, 40(4), 440-450.',
  licenseNote: 'Échelle en domaine public à usage de recherche et d\'auto-évaluation.',
  warningMessage: 'Ce test évalue des traits de personnalité normaux. Les résultats ne constituent pas un diagnostic clinique.',
  scoreRange: { min: 0, max: 16 },
  items: [
    // 1. Special person
    {
      id: 1,
      text: 'Entre ces deux affirmations, laquelle te correspond le mieux ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je ne suis ni {{meilleur|meilleure}} ni pire que la plupart des gens' },
        { value: 1, label: 'Je pense être quelqu\'un de vraiment spécial' },
      ],
    },
    // 2. Center of attention
    {
      id: 2,
      text: 'Comment tu te vois plutôt ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Être le centre de l\'attention, ça me met mal à l\'aise' },
        { value: 1, label: 'J\'aime être le centre de l\'attention' },
      ],
    },
    // 3. Authority over people
    {
      id: 3,
      text: 'Qu\'est-ce qui te parle le plus ? \u{1F447}',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je préfère rester {{discret|discrète}} et ne pas m\'imposer' },
        { value: 1, label: 'J\'aime avoir de l\'autorité sur les gens' },
      ],
    },
    // 4. Compliments
    {
      id: 4,
      text: 'Tu te reconnais plutôt dans laquelle ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je me méfie un peu des compliments — on ne sait jamais ce qu\'il y a derrière' },
        { value: 1, label: 'J\'adore qu\'on me complimente — j\'en ai besoin pour me sentir bien' },
      ],
    },
    // 5. Show off body
    {
      id: 5,
      text: 'Choisis la phrase qui te ressemble le plus \u{1F447}',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je n\'ai pas besoin de me montrer pour qu\'on me respecte' },
        { value: 1, label: 'J\'aime bien mettre mon physique en valeur — je sais que j\'ai de quoi impressionner' },
      ],
    },
    // 6. Talk my way out of anything
    {
      id: 6,
      text: 'Entre ces deux phrases, laquelle te ressemble le plus ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je préfère avancer grâce à mes vrais mérites, pas en manipulant' },
        { value: 1, label: 'Je suis capable de convaincre n\'importe qui de n\'importe quoi' },
      ],
    },
    // 7. More capable than others
    {
      id: 7,
      text: 'Comment tu te situes par rapport aux autres ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Il y a plein de choses que je pourrais apprendre des autres' },
        { value: 1, label: 'Je suis plus capable que la plupart des gens autour de moi' },
      ],
    },
    // 8. Extraordinary person
    {
      id: 8,
      text: 'Qu\'est-ce qui te correspond le mieux ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je suis quelqu\'un d\'ordinaire, comme beaucoup de monde' },
        { value: 1, label: 'Je suis quelqu\'un d\'extraordinaire' },
      ],
    },
    // 9. Born leader
    {
      id: 9,
      text: 'Tu te reconnais dans quelle affirmation ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je ne suis pas {{sûr|sûre}} d\'être {{un|une}} {{bon|bonne}} leader' },
        { value: 1, label: 'Je suis un leader né — les gens me suivent naturellement' },
      ],
    },
    // 10. Going to be great
    {
      id: 10,
      text: 'Entre ces deux visions de toi, laquelle est la plus juste ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je ne me préoccupe pas tant que ça de mon succès ou de ma réussite' },
        { value: 1, label: 'Je suis {{destiné|destinée}} à accomplir de grandes choses' },
      ],
    },
    // 11. Talk about myself
    {
      id: 11,
      text: 'Choisis celle qui te parle le plus \u{1F447}',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je n\'ai pas besoin de me vanter — les actes parlent d\'eux-mêmes' },
        { value: 1, label: 'J\'aime parler de moi et de mes réussites' },
      ],
    },
    // 12. Class and style
    {
      id: 12,
      text: 'Comment tu te décrirais ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je n\'ai pas vraiment un style qui me distingue des autres' },
        { value: 1, label: 'J\'ai beaucoup de classe et de charisme' },
      ],
    },
    // 13. Make anybody believe anything
    {
      id: 13,
      text: 'Qu\'est-ce qui te ressemble le plus ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je ne suis pas spécialement {{doué|douée}} pour influencer les gens' },
        { value: 1, label: 'Je peux faire croire à n\'importe qui ce que je veux' },
      ],
    },
    // 14. Insist on respect
    {
      id: 14,
      text: 'Tu te vois plutôt comment dans tes relations ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je n\'ai pas besoin d\'admiration pour me sentir bien' },
        { value: 1, label: 'J\'exige qu\'on me donne le respect que je mérite' },
      ],
    },
    // 15. Expect a great deal from others
    {
      id: 15,
      text: 'Entre ces deux phrases, tu te retrouves où ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je n\'attends pas grand-chose des autres — chacun fait ce qu\'il peut' },
        { value: 1, label: 'J\'attends beaucoup des autres — ils devraient être à la hauteur' },
      ],
    },
    // 16. More important than others
    {
      id: 16,
      text: 'Pour finir, laquelle te correspond le mieux ?',
      type: 'multiple_choice',
      options: [
        { value: 0, label: 'Je m\'efforce de ne pas me croire au-dessus des autres' },
        { value: 1, label: 'Au fond, je suis plus {{important|importante}} que la plupart des gens' },
      ],
    },
  ],
  interpretation: [
    {
      min: 0, max: 3,
      label: 'Très peu de traits narcissiques',
      severity: 'minimal',
      description: 'Ton profil montre très peu de traits narcissiques. Tu es probablement quelqu\'un d\'humble, {{tourné|tournée}} vers les autres et plutôt empathique. C\'est une vraie qualité dans tes relations.',
      referralRequired: false,
      recommendation: 'Ce faible score est une force dans tes liens avec les autres. Mais veille quand même à t\'affirmer quand il le faut — être humble, c\'est bien, mais s\'effacer tout le temps, ça peut te coûter cher.',
    },
    {
      min: 4, max: 7,
      label: 'Confiance en soi saine',
      severity: 'mild',
      description: 'Tu as une estime de toi équilibrée, avec une bonne dose de confiance et d\'ambition. C\'est tout à fait dans la norme — un narcissisme sain, en quelque sorte.',
      referralRequired: false,
      recommendation: 'Un certain niveau de narcissisme est normal et même nécessaire pour avancer dans la vie. Tes résultats montrent un bon équilibre entre confiance en toi et ouverture aux autres.',
    },
    {
      min: 8, max: 11,
      label: 'Tendances narcissiques marquées',
      severity: 'moderate',
      description: 'Tu as des traits narcissiques assez prononcés. Tu accordes beaucoup d\'importance à ton image, à ton statut et à ta réussite — et ça peut jouer dans tes relations.',
      referralRequired: false,
      recommendation: 'Ces traits peuvent être un atout dans certains contextes (carrière, leadership), mais ils peuvent aussi créer des tensions dans tes relations proches. Ça vaut le coup de réfléchir à l\'impact que ça a sur ton entourage.',
    },
    {
      min: 12, max: 16,
      label: 'Tendances narcissiques très marquées',
      severity: 'severe',
      description: 'Ton profil montre de nombreux traits narcissiques. Ça peut influencer de façon importante ta manière d\'interagir avec les autres et la qualité de tes relations.',
      referralRequired: false,
      recommendation: 'Un échange avec un professionnel pourrait t\'aider à mieux comprendre ces traits et leur impact au quotidien. Ce n\'est pas un jugement — c\'est une opportunité de mieux te connaître et d\'améliorer tes relations.',
    },
  ],
};
