import type { AssessmentScale } from '../../../types/assessment';

const opts = [
  { value: 0, label: "Jamais" },
  { value: 1, label: "Presque jamais" },
  { value: 2, label: "Parfois" },
  { value: 3, label: "Assez souvent" },
  { value: 4, label: "Très souvent" },
];

export const PSS10: AssessmentScale = {
  id: 'pss10',
  name: "Stress Perçu",
  shortName: "PSS-10",
  category: 'mental_health',
  description: "Mesure le degré auquel les situations de la vie sont perçues comme stressantes.",
  instructions: "Au cours du dernier mois, à quelle fréquence as-tu vécu ces situations ?",
  timeEstimateMinutes: 4,
  reference: "Cohen, S., Kamarck, T., & Mermelstein, R. (1983). A global measure of perceived stress. Journal of Health and Social Behavior, 24(4), 385–396.",
  licenseNote: "Domaine public. Libre de droits.",
  warningMessage: "Ces résultats sont un premier éclairage, pas un diagnostic — si tu te sens {{submergé|submergée}}, parler à un professionnel peut vraiment aider 🤝",
  scoreRange: { min: 0, max: 40 },
  reverseIds: [4, 5, 7, 8],
  items: [
    { id: 1,  text: "Il t'est arrivé d'être {{pris|prise}} de court par quelque chose d'inattendu qui t'a {{bouleversé|bouleversée}} ?",         type: 'frequency', options: opts },
    { id: 2,  text: "Tu as eu l'impression de ne plus avoir le contrôle sur les choses importantes de ta vie ?",              type: 'frequency', options: opts },
    { id: 3,  text: "Tu t'es {{senti|sentie}} {{nerveux|nerveuse}} ou {{stressé|stressée}} ?",                                                          type: 'frequency', options: opts },
    { id: 4,  text: "Tu t'es {{senti|sentie}} capable de gérer tes problèmes personnels par toi-même ?",                             type: 'frequency', options: opts, reversed: true },
    { id: 5,  text: "Tu as senti que les choses allaient dans le bon sens pour toi ?",                                        type: 'frequency', options: opts, reversed: true },
    { id: 6,  text: "Tu as eu l'impression de ne pas arriver à tout gérer, comme si ta to-do list débordait de partout ?",    type: 'frequency', options: opts },
    { id: 7,  text: "Tu as réussi à garder ton calme face aux petites irritations du quotidien ?",                            type: 'frequency', options: opts, reversed: true },
    { id: 8,  text: "Tu t'es {{senti|sentie}} maître de la situation, comme aux commandes de ta vie ?",                               type: 'frequency', options: opts, reversed: true },
    { id: 9,  text: "Tu t'es {{mis|mise}} en colère à cause de choses sur lesquelles tu n'avais aucun contrôle ?",                 type: 'frequency', options: opts },
    { id: 10, text: "Tu as eu l'impression que les problèmes s'empilaient au point de ne plus pouvoir gérer ? 🧱",            type: 'frequency', options: opts },
  ],
  interpretation: [
    { min: 0,  max: 13, label: "Ton niveau de stress est bas 😌",    severity: 'minimal',  description: "Tu gères bien la pression — ton stress reste dans une zone confortable et gérable.", referralRequired: false, recommendation: "Continue comme ça ! Garde tes bonnes habitudes de bien-être, elles font clairement effet." },
    { min: 14, max: 26, label: "Ton stress est modéré",    severity: 'moderate', description: "Le stress commence à peser un peu — comme un sac à dos qu'on remplit sans s'en rendre compte 🎒", referralRequired: false, recommendation: "C'est le bon moment pour identifier ce qui te pèse le plus et mettre en place des stratégies concrètes : respiration, mouvement, pauses régulières." },
    { min: 27, max: 40, label: "Ton niveau de stress est élevé",     severity: 'severe',   description: "Tu es sous forte pression et ça mérite qu'on s'en occupe — c'est pas un signe de faiblesse, c'est un signal d'alerte ⚠️", referralRequired: true, recommendation: "Parler à un professionnel de santé peut t'aider à retrouver de l'air. Tu n'as pas à tout porter {{seul|seule}}." },
  ],
};
