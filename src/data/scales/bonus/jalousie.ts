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
  instructions: 'Ces questions portent sur ce que tu ressens dans tes relations proches ou amoureuses. Réponds honnêtement — selon comment tu es en général 💚',
  timeEstimateMinutes: 5,
  reference: 'Pfeiffer, S.M. & Wong, P.T.P. (1989). Multidimensional jealousy. Journal of Social and Personal Relationships, 6(2), 181-196.',
  licenseNote: 'Adaptation française de la MJS (Multidimensional Jealousy Scale) à usage d\'auto-évaluation.',
  warningMessage: 'La jalousie est une émotion normale. Ce test mesure son intensité — non sa présence. Des scores élevés méritent une exploration avec un professionnel.',
  scoreRange: { min: 0, max: 60 },
  items: [
    { id: 1,  text: 'Ça te rend {{nerveux|nerveuse}} ou mal à l\'aise quand ton/ta partenaire parle avec quelqu\'un d\'attrayant ?', type: 'frequency', options: opts },
    { id: 2,  text: 'Il t\'arrive de vérifier les messages ou les réseaux sociaux de ton/ta partenaire en cachette ?', type: 'frequency', options: opts },
    { id: 3,  text: 'L\'idée que ton/ta partenaire soit {{attiré|attirée}} par quelqu\'un d\'autre t\'envahit et te perturbe profondément ?', type: 'frequency', options: opts },
    { id: 4,  text: 'Tu te compares aux autres pour savoir si ton/ta partenaire te trouve encore {{attractif|attractive}} ?', type: 'frequency', options: opts },
    { id: 5,  text: 'Ça te dérange vraiment quand ton/ta partenaire a une amitié proche avec quelqu\'un qui pourrait être un rival ?', type: 'frequency', options: opts },
    { id: 6,  text: 'Tu repenses encore à des conversations ou des moments passés de ton/ta partenaire avec quelqu\'un d\'autre — et ça te pique de jalousie ?', type: 'frequency', options: opts },
    { id: 7,  text: 'Tu as peur que ton/ta partenaire finisse par trouver quelqu\'un de mieux ou de plus attirant que toi ?', type: 'frequency', options: opts },
    { id: 8,  text: 'Quand ton/ta partenaire est en retard ou ne répond pas, tu commences direct à imaginer le pire ?', type: 'frequency', options: opts },
    { id: 9,  text: 'Tu ressens le besoin de savoir où est ton/ta partenaire et avec qui — à tout moment ?', type: 'frequency', options: opts },
    { id: 10, text: 'Tu penses aux ex de ton/ta partenaire ou à son passé amoureux avec un malaise ou une jalousie rétrospective ?', type: 'frequency', options: opts },
    { id: 11, text: 'L\'idée que ton/ta partenaire te quitte pour quelqu\'un d\'autre te génère une anxiété intense ?', type: 'frequency', options: opts },
    { id: 12, text: 'Tu deviens hostile, {{froid|froide}} ou {{distant|distante}} quand tu penses que ton/ta partenaire montre trop d\'intérêt pour quelqu\'un ?', type: 'frequency', options: opts },
    { id: 13, text: 'Tu te sens souvent {{insuffisant|insuffisante}} ou en compétition avec les personnes qui tournent autour de ton/ta partenaire ?', type: 'frequency', options: opts },
    { id: 14, text: 'Ton imagination te fabrique des scénarios de trahison ou d\'infidélité — même sans raison concrète ?', type: 'frequency', options: opts },
    { id: 15, text: 'Tu surveilles régulièrement l\'activité de ton/ta partenaire sur les réseaux sociaux — likes, commentaires, abonnements... ?', type: 'frequency', options: opts },
  ],
  interpretation: [
    {
      min: 0, max: 15,
      label: 'Jalousie négligeable',
      severity: 'minimal',
      description: 'Tu ressens très peu de jalousie dans tes relations — et c\'est un vrai signe de sécurité intérieure. Tu fais confiance à ton/ta partenaire et tu te sens stable dans tes liens.',
      referralRequired: false,
      recommendation: 'Cette sécurité intérieure est une grande force. Continue à la nourrir.',
    },
    {
      min: 16, max: 30,
      label: 'Jalousie légère à modérée',
      severity: 'mild',
      description: 'Tu ressens de la jalousie de temps en temps, mais elle reste gérable. Elle peut être liée à un manque de confiance en toi ou à des expériences passées qui ont laissé des traces.',
      referralRequired: false,
      recommendation: 'Travailler sur ta sécurité intérieure et la communication dans ton couple peut vraiment diminuer ces moments d\'anxiété.',
    },
    {
      min: 31, max: 45,
      label: 'Jalousie modérée — attention recommandée',
      severity: 'moderate',
      description: 'Ta jalousie est assez présente et peut peser sur ta relation et ton bien-être émotionnel. Elle crée probablement des tensions dans tes liens affectifs — et toi, tu le ressens aussi.',
      referralRequired: false,
      recommendation: 'Explorer les sources de cette jalousie avec {{un|une}} thérapeute peut t\'aider à construire une relation plus sereine — avec toi-même et avec les autres.',
      alertLevel: 1,
    },
    {
      min: 46, max: 60,
      label: 'Jalousie très intense',
      severity: 'severe',
      description: 'Ta jalousie est à un niveau qui pèse beaucoup sur toi et sur tes relations. Ce n\'est pas une fatalité — ça se travaille.',
      referralRequired: true,
      recommendation: 'Un accompagnement psychologique est fortement recommandé. La jalousie intense peut mener à des comportements de contrôle — mais des thérapies spécialisées existent et elles fonctionnent.',
      alertLevel: 2,
    },
  ],
};
