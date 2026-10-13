// AUTO-GENERATED — do not edit manually.
// Source: scripts/generateScaleDefs.ts → src/data/scales/*.ts
// Regenerate: npx tsx scripts/generateScaleDefs.ts

const SCALE_DEFS = {
  "big_five": {
    "id": "big_five",
    "scoreRange": {
      "min": 10,
      "max": 50
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 10,
        "max": 25,
        "severity": "mild"
      },
      {
        "min": 26,
        "max": 38,
        "severity": "minimal"
      },
      {
        "min": 39,
        "max": 50,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "extraversion",
        "label": "Extraversion",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "agreeableness",
        "label": "Agréabilité",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "conscientiousness",
        "label": "Conscienciosité",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "emotional_stability",
        "label": "Stabilité émotionnelle",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "openness",
        "label": "Ouverture",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      }
    ]
  },
  "ecr_r": {
    "id": "ecr_r",
    "scoreRange": {
      "min": 36,
      "max": 252
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 36,
        "max": 107,
        "severity": "positive"
      },
      {
        "min": 108,
        "max": 162,
        "severity": "mild"
      },
      {
        "min": 163,
        "max": 252,
        "severity": "moderate"
      }
    ],
    "subscales": [
      {
        "key": "anxiety",
        "label": "Anxiété d'attachement",
        "range": {
          "min": 1,
          "max": 7
        },
        "scoringMode": "mean"
      },
      {
        "key": "avoidance",
        "label": "Évitement de l'intimité",
        "range": {
          "min": 1,
          "max": 7
        },
        "scoringMode": "mean"
      }
    ]
  },
  "brs": {
    "id": "brs",
    "scoreRange": {
      "min": 1,
      "max": 5
    },
    "scoringMode": "mean",
    "ranges": [
      {
        "min": 1,
        "max": 2.99,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 3,
        "max": 4.3,
        "severity": "minimal"
      },
      {
        "min": 4.31,
        "max": 5,
        "severity": "positive"
      }
    ],
    "subscales": null
  },
  "bonus_tdah": {
    "id": "bonus_tdah",
    "scoreRange": {
      "min": 0,
      "max": 72
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 17,
        "severity": "minimal"
      },
      {
        "min": 18,
        "max": 35,
        "severity": "mild"
      },
      {
        "min": 36,
        "max": 52,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 53,
        "max": 72,
        "severity": "severe",
        "alertLevel": 1
      }
    ],
    "subscales": [
      {
        "key": "partie_a",
        "label": "Partie A — Screening",
        "range": {
          "min": 0,
          "max": 24
        },
        "scoringMode": "sum"
      },
      {
        "key": "partie_b",
        "label": "Partie B — Symptômes complémentaires",
        "range": {
          "min": 0,
          "max": 48
        },
        "scoringMode": "sum"
      }
    ]
  },
  "bonus_hsp": {
    "id": "bonus_hsp",
    "scoreRange": {
      "min": 0,
      "max": 60
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 20,
        "severity": "none"
      },
      {
        "min": 21,
        "max": 35,
        "severity": "mild"
      },
      {
        "min": 36,
        "max": 50,
        "severity": "moderate"
      },
      {
        "min": 51,
        "max": 60,
        "severity": "positive"
      }
    ],
    "subscales": null
  },
  "bonus_hpi": {
    "id": "bonus_hpi",
    "scoreRange": {
      "min": 0,
      "max": 60
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 25,
        "severity": "none"
      },
      {
        "min": 26,
        "max": 40,
        "severity": "mild"
      },
      {
        "min": 41,
        "max": 52,
        "severity": "positive"
      },
      {
        "min": 53,
        "max": 60,
        "severity": "positive"
      }
    ],
    "subscales": null
  },
  "bonus_jalousie": {
    "id": "bonus_jalousie",
    "scoreRange": {
      "min": 0,
      "max": 60
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "minimal"
      },
      {
        "min": 16,
        "max": 30,
        "severity": "mild"
      },
      {
        "min": 31,
        "max": 45,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 46,
        "max": 60,
        "severity": "severe",
        "alertLevel": 2
      }
    ],
    "subscales": null
  },
  "bonus_eq": {
    "id": "bonus_eq",
    "scoreRange": {
      "min": 16,
      "max": 112
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 16,
        "max": 48,
        "severity": "moderate"
      },
      {
        "min": 49,
        "max": 72,
        "severity": "mild"
      },
      {
        "min": 73,
        "max": 96,
        "severity": "positive"
      },
      {
        "min": 97,
        "max": 112,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "sea",
        "label": "Conscience de soi émotionnelle",
        "range": {
          "min": 4,
          "max": 28
        },
        "scoringMode": "sum"
      },
      {
        "key": "oea",
        "label": "Empathie et lecture des autres",
        "range": {
          "min": 4,
          "max": 28
        },
        "scoringMode": "sum"
      },
      {
        "key": "uoe",
        "label": "Utilisation des émotions",
        "range": {
          "min": 4,
          "max": 28
        },
        "scoringMode": "sum"
      },
      {
        "key": "roe",
        "label": "Régulation émotionnelle",
        "range": {
          "min": 4,
          "max": 28
        },
        "scoringMode": "sum"
      }
    ]
  },
  "bonus_confiance": {
    "id": "bonus_confiance",
    "scoreRange": {
      "min": 0,
      "max": 45
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "moderate"
      },
      {
        "min": 16,
        "max": 28,
        "severity": "mild"
      },
      {
        "min": 29,
        "max": 38,
        "severity": "minimal"
      },
      {
        "min": 39,
        "max": 45,
        "severity": "positive"
      }
    ],
    "subscales": null
  },
  "bonus_personnalite": {
    "id": "bonus_personnalite",
    "scoreRange": {
      "min": 0,
      "max": 12
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 2,
        "severity": "minimal"
      },
      {
        "min": 3,
        "max": 5,
        "severity": "mild"
      },
      {
        "min": 6,
        "max": 8,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 9,
        "max": 12,
        "severity": "severe",
        "alertLevel": 2
      }
    ],
    "subscales": null
  },
  "bonus_narcissisme": {
    "id": "bonus_narcissisme",
    "scoreRange": {
      "min": 0,
      "max": 16
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 3,
        "severity": "minimal"
      },
      {
        "min": 4,
        "max": 7,
        "severity": "mild"
      },
      {
        "min": 8,
        "max": 11,
        "severity": "moderate"
      },
      {
        "min": 12,
        "max": 16,
        "severity": "severe"
      }
    ],
    "subscales": null
  },
  "bonus_manipulation": {
    "id": "bonus_manipulation",
    "scoreRange": {
      "min": 0,
      "max": 80
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 20,
        "severity": "minimal"
      },
      {
        "min": 21,
        "max": 40,
        "severity": "mild"
      },
      {
        "min": 41,
        "max": 60,
        "severity": "moderate"
      },
      {
        "min": 61,
        "max": 80,
        "severity": "severe"
      }
    ],
    "subscales": null
  },
  "gad7": {
    "id": "gad7",
    "scoreRange": {
      "min": 0,
      "max": 21
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 4,
        "severity": "minimal"
      },
      {
        "min": 5,
        "max": 9,
        "severity": "mild",
        "alertLevel": 1
      },
      {
        "min": 10,
        "max": 14,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 15,
        "max": 21,
        "severity": "severe",
        "alertLevel": 2
      }
    ],
    "subscales": null
  },
  "rses": {
    "id": "rses",
    "scoreRange": {
      "min": 10,
      "max": 40
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 10,
        "max": 14,
        "severity": "moderate",
        "alertLevel": 2
      },
      {
        "min": 15,
        "max": 25,
        "severity": "mild",
        "alertLevel": 1
      },
      {
        "min": 26,
        "max": 30,
        "severity": "minimal"
      },
      {
        "min": 31,
        "max": 40,
        "severity": "positive"
      }
    ],
    "subscales": null
  },
  "pss10": {
    "id": "pss10",
    "scoreRange": {
      "min": 0,
      "max": 40
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 13,
        "severity": "minimal"
      },
      {
        "min": 14,
        "max": 26,
        "severity": "moderate"
      },
      {
        "min": 27,
        "max": 40,
        "severity": "severe"
      }
    ],
    "subscales": null
  },
  "social_pressure": {
    "id": "social_pressure",
    "scoreRange": {
      "min": 12,
      "max": 60
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 12,
        "max": 24,
        "severity": "positive"
      },
      {
        "min": 25,
        "max": 42,
        "severity": "mild"
      },
      {
        "min": 43,
        "max": 60,
        "severity": "moderate"
      }
    ],
    "subscales": [
      {
        "key": "marriage_pressure",
        "label": "Pression au mariage",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "gender_roles",
        "label": "Rôles de genre",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "social_judgment",
        "label": "Jugement social",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "economic_pressure",
        "label": "Pression économique",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "conformity",
        "label": "Conformité vs authenticité",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      }
    ]
  },
  "bonus_burnout": {
    "id": "bonus_burnout",
    "scoreRange": {
      "min": 0,
      "max": 54
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "minimal"
      },
      {
        "min": 16,
        "max": 30,
        "severity": "mild"
      },
      {
        "min": 31,
        "max": 42,
        "severity": "moderate",
        "alertLevel": 1
      },
      {
        "min": 43,
        "max": 54,
        "severity": "severe",
        "alertLevel": 2
      }
    ],
    "subscales": [
      {
        "key": "epuisement",
        "label": "Épuisement émotionnel",
        "range": {
          "min": 0,
          "max": 18
        },
        "scoringMode": "sum"
      },
      {
        "key": "depersonnalisation",
        "label": "Dépersonnalisation",
        "range": {
          "min": 0,
          "max": 18
        },
        "scoringMode": "sum"
      },
      {
        "key": "accomplissement",
        "label": "Accomplissement personnel",
        "range": {
          "min": 0,
          "max": 18
        },
        "scoringMode": "sum"
      }
    ]
  },
  "bonus_dependance": {
    "id": "bonus_dependance",
    "scoreRange": {
      "min": 0,
      "max": 60
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "minimal"
      },
      {
        "min": 16,
        "max": 30,
        "severity": "mild"
      },
      {
        "min": 31,
        "max": 45,
        "severity": "moderate"
      },
      {
        "min": 46,
        "max": 60,
        "severity": "severe",
        "alertLevel": 1
      }
    ],
    "subscales": null
  },
  "phq9": {
    "id": "phq9",
    "scoreRange": {
      "min": 0,
      "max": 27
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 4,
        "severity": "none"
      },
      {
        "min": 5,
        "max": 9,
        "severity": "mild"
      },
      {
        "min": 10,
        "max": 14,
        "severity": "moderate"
      },
      {
        "min": 15,
        "max": 19,
        "severity": "severe"
      },
      {
        "min": 20,
        "max": 27,
        "severity": "severe"
      }
    ],
    "subscales": null
  },
  "ace": {
    "id": "ace",
    "scoreRange": {
      "min": 0,
      "max": 10
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 0,
        "severity": "none"
      },
      {
        "min": 1,
        "max": 3,
        "severity": "mild"
      },
      {
        "min": 4,
        "max": 6,
        "severity": "moderate",
        "alertLevel": 2
      },
      {
        "min": 7,
        "max": 10,
        "severity": "severe",
        "alertLevel": 3
      }
    ],
    "subscales": null
  },
  "pcl5": {
    "id": "pcl5",
    "scoreRange": {
      "min": 0,
      "max": 80
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 20,
        "severity": "minimal"
      },
      {
        "min": 21,
        "max": 32,
        "severity": "mild"
      },
      {
        "min": 33,
        "max": 49,
        "severity": "severe",
        "alertLevel": 2
      },
      {
        "min": 50,
        "max": 80,
        "severity": "severe",
        "alertLevel": 3
      }
    ],
    "subscales": [
      {
        "key": "intrusion",
        "label": "Intrusion",
        "range": {
          "min": 0,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "avoidance",
        "label": "Évitement",
        "range": {
          "min": 0,
          "max": 8
        },
        "scoringMode": "sum"
      },
      {
        "key": "cognition_mood",
        "label": "Altérations cognitives et humeur",
        "range": {
          "min": 0,
          "max": 28
        },
        "scoringMode": "sum"
      },
      {
        "key": "hyperarousal",
        "label": "Hyperactivation",
        "range": {
          "min": 0,
          "max": 24
        },
        "scoringMode": "sum"
      }
    ]
  },
  "pg13": {
    "id": "pg13",
    "scoreRange": {
      "min": 0,
      "max": 44
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "minimal"
      },
      {
        "min": 16,
        "max": 25,
        "severity": "moderate"
      },
      {
        "min": 26,
        "max": 44,
        "severity": "severe",
        "alertLevel": 2
      }
    ],
    "subscales": null
  },
  "ceca_q": {
    "id": "ceca_q",
    "scoreRange": {
      "min": 16,
      "max": 64
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 16,
        "max": 26,
        "severity": "positive"
      },
      {
        "min": 27,
        "max": 40,
        "severity": "mild"
      },
      {
        "min": 41,
        "max": 64,
        "severity": "moderate",
        "alertLevel": 2
      }
    ],
    "subscales": [
      {
        "key": "maternal_care",
        "label": "Soins et affection",
        "range": {
          "min": 3,
          "max": 12
        },
        "scoringMode": "sum"
      },
      {
        "key": "maternal_antipathy",
        "label": "Antipathie parentale",
        "range": {
          "min": 3,
          "max": 12
        },
        "scoringMode": "sum"
      },
      {
        "key": "paternal_care",
        "label": "Sécurité du foyer",
        "range": {
          "min": 3,
          "max": 12
        },
        "scoringMode": "sum"
      },
      {
        "key": "paternal_antipathy",
        "label": "Violence et conflits",
        "range": {
          "min": 3,
          "max": 12
        },
        "scoringMode": "sum"
      },
      {
        "key": "sexual_abuse",
        "label": "Abus sexuels",
        "range": {
          "min": 3,
          "max": 12
        },
        "scoringMode": "sum"
      }
    ]
  },
  "religious_cultural": {
    "id": "religious_cultural",
    "scoreRange": {
      "min": 14,
      "max": 70
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 14,
        "max": 30,
        "severity": "positive"
      },
      {
        "min": 31,
        "max": 50,
        "severity": "mild"
      },
      {
        "min": 51,
        "max": 70,
        "severity": "moderate"
      }
    ],
    "subscales": [
      {
        "key": "religious_support",
        "label": "Soutien religieux / culturel",
        "range": {
          "min": 4,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "religious_influence",
        "label": "Influence religieuse sur les choix",
        "range": {
          "min": 1,
          "max": 5
        },
        "scoringMode": "sum"
      },
      {
        "key": "cultural_conflict",
        "label": "Conflit culturel",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "guilt_shame",
        "label": "Culpabilité et honte",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "traditional_medicine",
        "label": "Médecine traditionnelle",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      }
    ]
  },
  "economic_stress": {
    "id": "economic_stress",
    "scoreRange": {
      "min": 0,
      "max": 40
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 13,
        "severity": "minimal"
      },
      {
        "min": 14,
        "max": 26,
        "severity": "moderate"
      },
      {
        "min": 27,
        "max": 40,
        "severity": "severe"
      }
    ],
    "subscales": null
  },
  "nsss": {
    "id": "nsss",
    "scoreRange": {
      "min": 20,
      "max": 100
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 20,
        "max": 40,
        "severity": "mild"
      },
      {
        "min": 41,
        "max": 65,
        "severity": "minimal"
      },
      {
        "min": 66,
        "max": 80,
        "severity": "positive"
      },
      {
        "min": 81,
        "max": 100,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "self_focused",
        "label": "Satisfaction centrée sur soi",
        "range": {
          "min": 10,
          "max": 50
        },
        "scoringMode": "sum"
      },
      {
        "key": "partner_focused",
        "label": "Satisfaction centrée sur le partenaire",
        "range": {
          "min": 10,
          "max": 50
        },
        "scoringMode": "sum"
      }
    ]
  },
  "sdi2": {
    "id": "sdi2",
    "scoreRange": {
      "min": 0,
      "max": 112
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 30,
        "severity": "mild"
      },
      {
        "min": 31,
        "max": 60,
        "severity": "minimal"
      },
      {
        "min": 61,
        "max": 90,
        "severity": "positive"
      },
      {
        "min": 91,
        "max": 112,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "dyadic",
        "label": "Désir dyadique (envers un partenaire)",
        "range": {
          "min": 0,
          "max": 72
        },
        "scoringMode": "sum"
      },
      {
        "key": "solitary",
        "label": "Désir solitaire (personnel)",
        "range": {
          "min": 0,
          "max": 40
        },
        "scoringMode": "sum"
      }
    ]
  },
  "sis_ses": {
    "id": "sis_ses",
    "scoreRange": {
      "min": 28,
      "max": 112
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 28,
        "max": 55,
        "severity": "moderate"
      },
      {
        "min": 56,
        "max": 84,
        "severity": "minimal"
      },
      {
        "min": 85,
        "max": 112,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "ses",
        "label": "Excitation sexuelle (SES)",
        "range": {
          "min": 10,
          "max": 40
        },
        "scoringMode": "sum"
      },
      {
        "key": "sis1",
        "label": "Inhibition par échec de performance (SIS1)",
        "range": {
          "min": 9,
          "max": 36
        },
        "scoringMode": "sum"
      },
      {
        "key": "sis2",
        "label": "Inhibition par crainte des conséquences (SIS2)",
        "range": {
          "min": 9,
          "max": 36
        },
        "scoringMode": "sum"
      }
    ]
  },
  "fsfi": {
    "id": "fsfi",
    "scoreRange": {
      "min": 2,
      "max": 36
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 2,
        "max": 15,
        "severity": "severe"
      },
      {
        "min": 16,
        "max": 26,
        "severity": "moderate"
      },
      {
        "min": 27,
        "max": 36,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "desire",
        "label": "Désir",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "arousal",
        "label": "Éveil",
        "range": {
          "min": 0,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "lubrication",
        "label": "Lubrification",
        "range": {
          "min": 0,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "orgasm",
        "label": "Orgasme",
        "range": {
          "min": 0,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "satisfaction",
        "label": "Satisfaction",
        "range": {
          "min": 0,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "pain",
        "label": "Douleur",
        "range": {
          "min": 0,
          "max": 15
        },
        "scoringMode": "sum"
      }
    ]
  },
  "iief": {
    "id": "iief",
    "scoreRange": {
      "min": 5,
      "max": 75
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 5,
        "max": 10,
        "severity": "severe"
      },
      {
        "min": 11,
        "max": 21,
        "severity": "moderate"
      },
      {
        "min": 22,
        "max": 25,
        "severity": "mild"
      },
      {
        "min": 26,
        "max": 75,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "erectile",
        "label": "Fonction érectile",
        "range": {
          "min": 1,
          "max": 25
        },
        "scoringMode": "sum"
      },
      {
        "key": "orgasmic",
        "label": "Fonction orgasmique",
        "range": {
          "min": 0,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "desire",
        "label": "Désir sexuel",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "intercourse_satisfaction",
        "label": "Satisfaction des rapports",
        "range": {
          "min": 0,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "overall_satisfaction",
        "label": "Satisfaction globale",
        "range": {
          "min": 2,
          "max": 15
        },
        "scoringMode": "sum"
      }
    ]
  },
  "tsi_base": {
    "id": "tsi_base",
    "scoreRange": {
      "min": 0,
      "max": 48
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 0,
        "max": 15,
        "severity": "minimal"
      },
      {
        "min": 16,
        "max": 30,
        "severity": "moderate"
      },
      {
        "min": 31,
        "max": 48,
        "severity": "severe"
      }
    ],
    "subscales": [
      {
        "key": "intrusive",
        "label": "Pensées intrusives",
        "range": {
          "min": 0,
          "max": 9
        },
        "scoringMode": "sum"
      },
      {
        "key": "avoidance",
        "label": "Évitement",
        "range": {
          "min": 0,
          "max": 9
        },
        "scoringMode": "sum"
      },
      {
        "key": "dissociation",
        "label": "Dissociation",
        "range": {
          "min": 0,
          "max": 9
        },
        "scoringMode": "sum"
      },
      {
        "key": "shame",
        "label": "Honte et culpabilité",
        "range": {
          "min": 0,
          "max": 9
        },
        "scoringMode": "sum"
      },
      {
        "key": "distress",
        "label": "Détresse sexuelle",
        "range": {
          "min": 0,
          "max": 12
        },
        "scoringMode": "sum"
      }
    ]
  },
  "pair": {
    "id": "pair",
    "scoreRange": {
      "min": 24,
      "max": 120
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 24,
        "max": 60,
        "severity": "moderate"
      },
      {
        "min": 61,
        "max": 90,
        "severity": "mild"
      },
      {
        "min": 91,
        "max": 120,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "emotional",
        "label": "Intimité émotionnelle",
        "range": {
          "min": 5,
          "max": 25
        },
        "scoringMode": "sum"
      },
      {
        "key": "social",
        "label": "Intimité sociale",
        "range": {
          "min": 5,
          "max": 25
        },
        "scoringMode": "sum"
      },
      {
        "key": "sexual",
        "label": "Intimité sexuelle",
        "range": {
          "min": 5,
          "max": 25
        },
        "scoringMode": "sum"
      },
      {
        "key": "intellectual",
        "label": "Intimité intellectuelle",
        "range": {
          "min": 5,
          "max": 25
        },
        "scoringMode": "sum"
      },
      {
        "key": "recreational",
        "label": "Intimité récréative",
        "range": {
          "min": 4,
          "max": 20
        },
        "scoringMode": "sum"
      }
    ]
  },
  "sise": {
    "id": "sise",
    "scoreRange": {
      "min": 16,
      "max": 80
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 16,
        "max": 40,
        "severity": "moderate"
      },
      {
        "min": 41,
        "max": 60,
        "severity": "mild"
      },
      {
        "min": 61,
        "max": 80,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "clarity",
        "label": "Clarté de l'identité",
        "range": {
          "min": 4,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "satisfaction",
        "label": "Satisfaction sexuelle",
        "range": {
          "min": 4,
          "max": 20
        },
        "scoringMode": "sum"
      },
      {
        "key": "congruence",
        "label": "Congruence désirs/actions",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "shame",
        "label": "Honte et culpabilité",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "expression",
        "label": "Liberté d'expression",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "acceptance",
        "label": "Acceptation de soi",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      }
    ]
  },
  "social_pressure_sex": {
    "id": "social_pressure_sex",
    "scoreRange": {
      "min": 14,
      "max": 70
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 14,
        "max": 28,
        "severity": "positive"
      },
      {
        "min": 29,
        "max": 49,
        "severity": "mild"
      },
      {
        "min": 50,
        "max": 70,
        "severity": "moderate"
      }
    ],
    "subscales": [
      {
        "key": "coercion",
        "label": "Pression et coercition",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "taboo",
        "label": "Tabou et silence",
        "range": {
          "min": 3,
          "max": 15
        },
        "scoringMode": "sum"
      },
      {
        "key": "norms",
        "label": "Normes culturelles",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "stigma",
        "label": "Stigmatisation",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "communication",
        "label": "Communication sexuelle",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "virginity",
        "label": "Pression virginité / valeurs",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      }
    ]
  },
  "griss_base": {
    "id": "griss_base",
    "scoreRange": {
      "min": 16,
      "max": 80
    },
    "scoringMode": "sum",
    "ranges": [
      {
        "min": 16,
        "max": 40,
        "severity": "severe"
      },
      {
        "min": 41,
        "max": 60,
        "severity": "moderate"
      },
      {
        "min": 61,
        "max": 80,
        "severity": "positive"
      }
    ],
    "subscales": [
      {
        "key": "satisfaction",
        "label": "Satisfaction globale",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "frequency",
        "label": "Fréquence",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "avoidance",
        "label": "Évitement",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "communication",
        "label": "Communication",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "sensuality",
        "label": "Sensualité",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "pain",
        "label": "Douleur / Inconfort",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "orgasm",
        "label": "Orgasme",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      },
      {
        "key": "psychological",
        "label": "Facteurs psychologiques",
        "range": {
          "min": 2,
          "max": 10
        },
        "scoringMode": "sum"
      }
    ]
  }
};

module.exports = { SCALE_DEFS };
