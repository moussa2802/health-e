import type { AssessmentScale } from '../../../types/assessment';

// NPI-16 : Narcissistic Personality Inventory — 16 items version
// Format : choix forcé entre deux affirmations (A=0, B=1 pour l'option narcissique)
// Score total : 0-16  |  Seuils : 0-3 faible / 4-7 modéré / 8-11 élevé / 12-16 très élevé
// Raskin & Terry (1988) ; Ames, Rose & Anderson (2006)

const opts = [
  { value: 0, label: 'A' },
  { value: 1, label: 'B' },
];

export const BONUS_NARCISSISME: AssessmentScale = {
  id: 'bonus_narcissisme',
  name: 'Traits narcissiques',
  shortName: 'NPI-16',
  category: 'bonus',
  description: 'Mesure les traits narcissiques de la personnalité à travers 16 paires d\'affirmations.',
  instructions: 'Pour chaque paire, choisis l\'affirmation qui te ressemble le mieux — A ou B. Il n\'y a pas de bonne ou mauvaise réponse. Sois honnête(e) avec toi-même.',
  timeEstimateMinutes: 5,
  reference: 'Ames, D.R., Rose, P., & Anderson, C.P. (2006). The NPI-16 as a short measure of narcissism. Journal of Research in Personality, 40(4), 440-450.',
  licenseNote: 'Échelle en domaine public à usage de recherche et d\'auto-évaluation.',
  warningMessage: 'Ce test évalue des traits de personnalité normaux. Les résultats ne constituent pas un diagnostic clinique.',
  scoreRange: { min: 0, max: 16 },
  items: [
    { id: 1,  text: 'A — Je ne suis ni meilleur(e) ni pire que la plupart des gens.\nB — Je pense être une personne vraiment exceptionnelle.', type: 'multiple_choice', options: opts },
    { id: 2,  text: 'A — Ça me gêne d\'être le centre de l\'attention.\nB — J\'aime vraiment être le centre de l\'attention.', type: 'multiple_choice', options: opts },
    { id: 3,  text: 'A — Je suis assertif(ve) et je le montre.\nB — Je préfère rester discret(e) et ne pas m\'imposer.', type: 'multiple_choice', options: opts },
    { id: 4,  text: 'A — Je me méfie des flatteries — elles cachent souvent quelque chose.\nB — J\'aime vraiment qu\'on me complimente et me valorise.', type: 'multiple_choice', options: opts },
    { id: 5,  text: 'A — Je n\'ai pas besoin de me montrer pour être respecté(e).\nB — J\'adore me mettre en avant et briller en public.', type: 'multiple_choice', options: opts },
    { id: 6,  text: 'A — Je préfère avancer grâce à mes vrais mérites.\nB — Je ferai tout ce qu\'il faut pour obtenir ce que je veux.', type: 'multiple_choice', options: opts },
    { id: 7,  text: 'A — Il y a beaucoup de choses que je pourrais apprendre des autres.\nB — Je suis plus capable que la plupart des gens autour de moi.', type: 'multiple_choice', options: opts },
    { id: 8,  text: 'A — Je suis quelqu\'un d\'ordinaire, comme beaucoup.\nB — Je suis une personne vraiment à part, extraordinaire.', type: 'multiple_choice', options: opts },
    { id: 9,  text: 'A — Je ne suis pas sûr(e) d\'être un(e) bon(ne) leader.\nB — Je suis un(e) leader né(e) — les gens me suivent naturellement.', type: 'multiple_choice', options: opts },
    { id: 10, text: 'A — Je ne me préoccupe pas particulièrement de mon succès ou de ma réussite.\nB — Je sais que je vais sortir du lot et réussir plus que les autres.', type: 'multiple_choice', options: opts },
    { id: 11, text: 'A — Les gens comme moi n\'ont pas besoin de se vanter — les actes parlent.\nB — Je n\'ai aucune honte à parler de mes accomplissements.', type: 'multiple_choice', options: opts },
    { id: 12, text: 'A — Je n\'ai pas vraiment de style particulier qui me distingue.\nB — Je pense que j\'ai beaucoup de classe et de charisme.', type: 'multiple_choice', options: opts },
    { id: 13, text: 'A — Je ne suis pas particulièrement doué(e) pour influencer les autres.\nB — Je sais comment convaincre et influencer les gens autour de moi.', type: 'multiple_choice', options: opts },
    { id: 14, text: 'A — Je n\'ai pas besoin d\'admiration pour me sentir bien.\nB — J\'ai besoin que les autres reconnaissent ma valeur et m\'admirent.', type: 'multiple_choice', options: opts },
    { id: 15, text: 'A — Je suis réservé(e) sur mes droits et attentes dans les relations.\nB — Je mérite un traitement privilégié — je le vaux bien.', type: 'multiple_choice', options: opts },
    { id: 16, text: 'A — Je m\'efforce de ne pas être prétentieux(se).\nB — Je pense que je suis plus important(e) que la plupart des gens.', type: 'multiple_choice', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 3,
      label: 'Très peu de traits narcissiques',
      severity: 'minimal',
      description: 'Tu montres très peu de traits narcissiques. Tu es probablement orienté(e) vers les autres, humble et empathique.',
      referralRequired: false,
      recommendation: 'Ton faible score peut être une vraie force dans tes relations. Veille cependant à t\'affirmer davantage si tu as tendance à t\'effacer.',
    },
    {
      min: 4, max: 7,
      label: 'Traits narcissiques modérés',
      severity: 'mild',
      description: 'Tu as une estime de soi saine avec quelques traits de confiance en soi et d\'ambition — tout à fait dans la normale.',
      referralRequired: false,
      recommendation: 'Un certain niveau de narcissisme est sain et nécessaire pour s\'affirmer. Tes résultats sont dans la normale.',
    },
    {
      min: 8, max: 11,
      label: 'Traits narcissiques prononcés',
      severity: 'moderate',
      description: 'Tu as des traits narcissiques assez marqués. Tu accordes beaucoup d\'importance à ton image, ton statut et ta réussite.',
      referralRequired: false,
      recommendation: 'Ces traits peuvent être utiles dans certains contextes professionnels, mais il est utile de prêter attention à la qualité de tes relations proches.',
    },
    {
      min: 12, max: 16,
      label: 'Traits narcissiques très marqués',
      severity: 'severe',
      description: 'Tu présentes de nombreux traits narcissiques. Cela peut influencer significativement tes relations et ta façon d\'interagir avec les autres.',
      referralRequired: false,
      recommendation: 'Un échange avec un professionnel de santé mentale pourrait t\'aider à explorer ces traits et leur impact sur tes relations.',
    },
  ],
};
