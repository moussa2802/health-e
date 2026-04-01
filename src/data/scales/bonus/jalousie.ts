import type { AssessmentScale } from '../../../types/assessment';

// MJS adapté : Multidimensional Jealousy Scale — 15 items, Likert 0-4
// Score total : 0-60  |  Seuils : 0-15 / 16-30 / 31-45 / 46-60
// Pfeiffer & Wong (1989). Multidimensional jealousy. Journal of Social and Personal Relationships.

const opts = [
  { value: 0, label: 'Jamais' },
  { value: 1, label: 'Rarement' },
  { value: 2, label: 'Parfois' },
  { value: 3, label: 'Souvent' },
  { value: 4, label: 'Très souvent' },
];

export const BONUS_JALOUSIE: AssessmentScale = {
  id: 'bonus_jalousie',
  name: 'Jalousie',
  shortName: 'MJS',
  category: 'bonus',
  description: 'Mesure l\'intensité et la fréquence des expériences de jalousie dans tes relations amoureuses ou proches.',
  instructions: 'Ces questions portent sur tes sentiments et comportements dans tes relations proches ou amoureuses. Réponds honnêtement — en te basant sur comment tu es en général.',
  timeEstimateMinutes: 5,
  reference: 'Pfeiffer, S.M. & Wong, P.T.P. (1989). Multidimensional jealousy. Journal of Social and Personal Relationships, 6(2), 181-196.',
  licenseNote: 'Adaptation française de la MJS (Multidimensional Jealousy Scale) à usage d\'auto-évaluation.',
  warningMessage: 'La jalousie est une émotion normale. Ce test mesure son intensité — non sa présence. Des scores élevés méritent une exploration avec un professionnel.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Je me sens nerveux(se) ou mal à l\'aise quand mon/ma partenaire parle avec quelqu\'un d\'attrayant.', type: 'frequency', options: opts },
    { id: 2,  text: 'Je vérifie les messages, réseaux sociaux ou activités de mon/ma partenaire sans qu\'il/elle le sache.', type: 'frequency', options: opts },
    { id: 3,  text: 'L\'idée que mon/ma partenaire soit attiré(e) par quelqu\'un d\'autre m\'envahit et me perturbe profondément.', type: 'frequency', options: opts },
    { id: 4,  text: 'Je me compare aux autres pour savoir si mon/ma partenaire me trouve encore attractif(ve).', type: 'frequency', options: opts },
    { id: 5,  text: 'L\'amitié de mon/ma partenaire avec une personne du sexe opposé (ou du même sexe) me dérange vraiment.', type: 'frequency', options: opts },
    { id: 6,  text: 'Je pense encore à des conversations ou moments passés de mon/ma partenaire avec quelqu\'un d\'autre, avec jalousie.', type: 'frequency', options: opts },
    { id: 7,  text: 'J\'ai peur que mon/ma partenaire finisse par trouver quelqu\'un de mieux ou de plus attirant que moi.', type: 'frequency', options: opts },
    { id: 8,  text: 'Quand mon/ma partenaire est en retard ou ne répond pas, je commence immédiatement à imaginer le pire.', type: 'frequency', options: opts },
    { id: 9,  text: 'Je ressens le besoin de savoir où est mon/ma partenaire et avec qui, à tout moment.', type: 'frequency', options: opts },
    { id: 10, text: 'Je pense aux ex de mon/ma partenaire ou à son passé amoureux avec un malaise ou de la jalousie rétrospective.', type: 'frequency', options: opts },
    { id: 11, text: 'L\'idée que mon/ma partenaire me quitte pour quelqu\'un d\'autre me génère une anxiété intense.', type: 'frequency', options: opts },
    { id: 12, text: 'Je deviens hostile, froid(e) ou distant(e) quand je pense que mon/ma partenaire montre trop d\'intérêt pour quelqu\'un.', type: 'frequency', options: opts },
    { id: 13, text: 'Je me sens souvent insuffisant(e) ou en compétition avec les personnes qui tournent autour de mon/ma partenaire.', type: 'frequency', options: opts },
    { id: 14, text: 'Mon imagination crée des scénarios de trahison ou d\'infidélité sans raison concrète réelle.', type: 'frequency', options: opts },
    { id: 15, text: 'Je surveille régulièrement l\'activité de mon/ma partenaire sur les réseaux sociaux (likes, commentaires, abonnements...).', type: 'frequency', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Jalousie négligeable',
      severity: 'minimal',
      description: 'Tu ressens très peu de jalousie dans tes relations. Tu fais confiance à ton/ta partenaire et tu te sens sécurisé(e) dans tes liens.',
      referralRequired: false,
      recommendation: 'Cette sécurité intérieure est une grande force dans tes relations.',
    },
    {
      min: 16, max: 30,
      label: 'Jalousie légère à modérée',
      severity: 'mild',
      description: 'Tu ressens de la jalousie de temps en temps, mais elle reste gérable. Elle peut être liée à un manque de confiance en soi ou à des expériences passées.',
      referralRequired: false,
      recommendation: 'Travailler sur ta sécurité intérieure et la communication dans tes relations peut diminuer ces moments d\'anxiété.',
    },
    {
      min: 31, max: 45,
      label: 'Jalousie modérée — attention recommandée',
      severity: 'moderate',
      description: 'Ta jalousie est assez présente et peut affecter ta relation et ton bien-être émotionnel. Elle peut créer des tensions dans tes liens affectifs.',
      referralRequired: false,
      recommendation: 'Explorer les sources de cette jalousie avec un thérapeute peut t\'aider à trouver une relation à toi-même et aux autres plus sereine.',
      alertLevel: 1,
    },
    {
      min: 46, max: 60,
      label: 'Jalousie pathologique',
      severity: 'severe',
      description: 'Tu présentes un niveau élevé de jalousie qui peut être destructeur pour toi et tes relations. Cette jalousie mérite une attention sérieuse.',
      referralRequired: true,
      recommendation: 'Un accompagnement psychologique est fortement recommandé. La jalousie intense peut mener à des comportements de contrôle ou à de la violence — des thérapies spécialisées existent pour t\'aider.',
      alertLevel: 2,
    },
  ],
};
