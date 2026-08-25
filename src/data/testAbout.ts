const TEST_ABOUT: Record<string, string> = {
  // ── Mental ──
  gad7:
    "L'anxiété est une réaction naturelle face au stress, mais quand elle devient excessive, elle peut affecter ton quotidien. Ce test t'aide à comprendre où tu en es et si un accompagnement pourrait t'aider.",
  phq9:
    "L'humeur fluctue naturellement, mais certains signaux méritent attention. Ce test explore ton vécu émotionnel récent pour t'aider à mieux comprendre comment tu te sens au quotidien.",
  big_five:
    "La personnalité, c'est ce qui fait de toi une personne unique. Ce test explore cinq grandes dimensions — ouverture, conscience, extraversion, agréabilité et stabilité émotionnelle — pour t'offrir un portrait de qui tu es.",
  ecr_r:
    "La façon dont tu vis tes relations est souvent liée à ton style d'attachement, forgé dès l'enfance. Comprendre ce mécanisme peut transformer ta vie relationnelle et t'aider à construire des liens plus sereins.",
  rses:
    "L'estime de soi, c'est le regard que tu portes sur toi-même. Elle influence ta confiance, tes choix et ta capacité à affronter les défis. Ce test t'aide à mesurer cette dimension essentielle.",
  brs:
    "La résilience est ta capacité à rebondir après les épreuves. Certaines personnes s'en remettent plus vite que d'autres — ce test t'aide à comprendre ta propre capacité d'adaptation.",
  pss10:
    "Le stress fait partie de la vie, mais un stress chronique peut peser lourd. Ce test évalue comment tu perçois les situations stressantes et leur impact sur ton bien-être général.",
  ace:
    "Les expériences vécues pendant l'enfance — positives ou difficiles — laissent une empreinte sur la santé à l'âge adulte. Ce test explore ce terrain en toute bienveillance, sans jugement.",
  pcl5:
    "Après un événement traumatique, certaines réactions (flashbacks, hypervigilance, évitement) peuvent persister. Ce test t'aide à identifier ces symptômes pour mieux les comprendre et agir.",
  pg13:
    "Le deuil est un processus naturel, mais parfois la douleur s'installe durablement. Ce test t'aide à évaluer comment tu traverses la perte d'un proche et si un soutien pourrait t'aider.",
  ceca_q:
    "Les carences affectives de l'enfance — manque de chaleur, de sécurité ou d'attention — peuvent influencer tes relations à l'âge adulte. Ce test explore cette dimension avec délicatesse.",
  social_pressure:
    "Dans de nombreuses cultures, la pression autour du mariage et des attentes familiales peut être intense. Ce test mesure comment ces pressions influencent ton bien-être psychologique.",
  religious_cultural:
    "Tes croyances et ta culture façonnent ta vision du monde. Ce test explore comment elles influencent ton profil psychologique — sans porter de jugement, juste pour mieux te comprendre.",
  economic_stress:
    "Le stress financier est l'un des facteurs les plus impactants sur la santé mentale. Ce test évalue comment ta situation économique affecte ton bien-être au quotidien.",

  // ── Vie intime ──
  nsss:
    "La satisfaction sexuelle est une composante importante du bien-être. Ce test explore différentes facettes de ta vie intime pour t'aider à identifier ce qui fonctionne et ce qui pourrait évoluer.",
  sdi2:
    "Le désir sexuel varie d'une personne à l'autre et fluctue au fil du temps. Ce test t'aide à comprendre ton niveau de désir et les facteurs qui l'influencent.",
  sis_ses:
    "L'excitation sexuelle dépend d'un équilibre entre des mécanismes qui l'activent et d'autres qui la freinent. Comprendre cet équilibre peut t'aider à mieux vivre ta sexualité.",
  fsfi:
    "La fonction sexuelle féminine couvre plusieurs dimensions : désir, excitation, lubrification, orgasme, satisfaction et douleur. Ce test t'offre une évaluation complète et bienveillante.",
  iief:
    "La fonction érectile est un indicateur de santé important. Ce test évalue différents aspects de ta fonction sexuelle masculine pour t'aider à mieux comprendre ton corps.",
  tsi_base:
    "Les expériences traumatiques peuvent laisser des traces sur la vie intime. Ce test explore ce lien avec délicatesse, pour t'aider à comprendre et avancer à ton rythme.",
  pair:
    "L'intimité de couple va au-delà de la sexualité — elle inclut la proximité émotionnelle, la confiance et le partage. Ce test évalue la qualité de cette connexion avec ton partenaire.",
  sise:
    "Le rapport à ton corps influence directement ta vie intime. Ce test explore comment ton image corporelle affecte ta sexualité et ton bien-être.",
  social_pressure_sex:
    "Les normes sociales, familiales et culturelles autour de la sexualité peuvent créer une pression invisible. Ce test t'aide à mesurer cet impact sur ta vie intime.",
  griss_base:
    "La satisfaction dans un couple se construit au quotidien. Ce test évalue plusieurs dimensions de ta relation pour t'aider à identifier tes forces et tes axes d'amélioration.",

  // ── Bonus ──
  bonus_narcissisme:
    "Le narcissisme existe sur un spectre — de la confiance saine à des traits plus problématiques. Ce test t'aide à situer tes tendances sans dramatiser.",
  bonus_personnalite:
    "Au-delà des Big Five, certains traits de personnalité peuvent influencer tes relations et ton quotidien. Ce test explore ces dimensions souvent méconnues.",
  bonus_dependance:
    "La dépendance affective, c'est quand l'amour devient un besoin vital plutôt qu'un choix. Ce test t'aide à comprendre si tes relations sont équilibrées ou si tu pourrais gagner en autonomie.",
  bonus_hsp:
    "L'hypersensibilité n'est pas un défaut — c'est une façon de percevoir le monde plus intensément. Ce test t'aide à savoir si tu fais partie des 15-20% de personnes hautement sensibles.",
  bonus_hpi:
    "Le haut potentiel intellectuel ne se limite pas au QI — c'est aussi une façon différente de penser, de ressentir et de vivre. Ce test explore ces caractéristiques.",
  bonus_tdah:
    "Le TDAH chez l'adulte est souvent sous-diagnostiqué. Ce test explore les signes — inattention, impulsivité, hyperactivité — pour t'aider à y voir plus clair.",
  bonus_manipulation:
    "La manipulation relationnelle peut être subtile. Ce test t'aide à comprendre tes propres schémas — pas pour te juger, mais pour mieux interagir avec les autres.",
  bonus_burnout:
    "Le burnout n'arrive pas du jour au lendemain — il s'installe progressivement. Ce test évalue où tu en es dans ce processus pour t'aider à agir avant l'épuisement total.",
  bonus_jalousie:
    "La jalousie est une émotion humaine normale, mais quand elle devient envahissante, elle peut nuire à tes relations. Ce test t'aide à comprendre ton rapport à cette émotion.",
  bonus_eq:
    "L'intelligence émotionnelle, c'est ta capacité à reconnaître, comprendre et gérer tes émotions — et celles des autres. Ce test mesure cette compétence clé du bien-être.",
  bonus_confiance:
    "La confiance en soi, c'est croire en ta capacité à agir et à réussir. Ce test t'aide à mesurer cette force intérieure et à identifier tes zones de progression.",
};

export default TEST_ABOUT;
