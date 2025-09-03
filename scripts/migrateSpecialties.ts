import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import {
  mapLegacySpecialty,
  isValidSpecialty,
  isValidCategory,
  type Category,
} from "../src/constants/specialties";

// Configuration Firebase (utilise les mêmes variables d'environnement que l'app)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ProfessionalProfile {
  id: string;
  specialty?: string;
  type?: "mental" | "sexual";
  category?: Category;
  primarySpecialty?: string;
  [key: string]: any;
}

// Mapping des anciennes spécialités vers les nouvelles
const LEGACY_MAPPING: Record<
  string,
  { category: Category; primarySpecialty: string }
> = {
  psychiatrie: { category: "mental-health", primarySpecialty: "psychiatre" },
  psychiatre: { category: "mental-health", primarySpecialty: "psychiatre" },
  psychologie: {
    category: "mental-health",
    primarySpecialty: "psychologue-clinicien",
  },
  psychologue: {
    category: "mental-health",
    primarySpecialty: "psychologue-clinicien",
  },
  "psychologue clinicien": {
    category: "mental-health",
    primarySpecialty: "psychologue-clinicien",
  },
  "psychologue-clinicien": {
    category: "mental-health",
    primarySpecialty: "psychologue-clinicien",
  },
  psychothérapeute: {
    category: "mental-health",
    primarySpecialty: "psychotherapeute-agree",
  },
  psychotherapeute: {
    category: "mental-health",
    primarySpecialty: "psychotherapeute-agree",
  },
  neuropsychologue: {
    category: "mental-health",
    primarySpecialty: "neuropsychologue",
  },
  addictologue: { category: "mental-health", primarySpecialty: "addictologue" },
  pédopsychiatre: {
    category: "mental-health",
    primarySpecialty: "pedopsychiatre",
  },
  pedopsychiatre: {
    category: "mental-health",
    primarySpecialty: "pedopsychiatre",
  },
  gérontopsychiatre: {
    category: "mental-health",
    primarySpecialty: "gerontopsychiatre",
  },
  gerontopsychiatre: {
    category: "mental-health",
    primarySpecialty: "gerontopsychiatre",
  },
  "infirmier santé mentale": {
    category: "mental-health",
    primarySpecialty: "infirmier-sante-mentale",
  },
  "infirmier-sante-mentale": {
    category: "mental-health",
    primarySpecialty: "infirmier-sante-mentale",
  },
  "coach développement personnel": {
    category: "mental-health",
    primarySpecialty: "coach-developpement-personnel",
  },
  "coach-developpement-personnel": {
    category: "mental-health",
    primarySpecialty: "coach-developpement-personnel",
  },
  "conseiller orientation": {
    category: "mental-health",
    primarySpecialty: "conseiller-orientation",
  },
  "conseiller-orientation": {
    category: "mental-health",
    primarySpecialty: "conseiller-orientation",
  },
  "travailleur social santé mentale": {
    category: "mental-health",
    primarySpecialty: "travailleur-social-sante-mentale",
  },
  "travailleur-social-sante-mentale": {
    category: "mental-health",
    primarySpecialty: "travailleur-social-sante-mentale",
  },
  "pair-aidant": { category: "mental-health", primarySpecialty: "pair-aidant" },
  "pair aidant": { category: "mental-health", primarySpecialty: "pair-aidant" },

  // Sexual Health
  sexologie: {
    category: "sexual-health",
    primarySpecialty: "sexologue-clinique",
  },
  sexologue: {
    category: "sexual-health",
    primarySpecialty: "sexologue-clinique",
  },
  "sexologue clinicien": {
    category: "sexual-health",
    primarySpecialty: "sexologue-clinique",
  },
  "sexologue-clinicien": {
    category: "sexual-health",
    primarySpecialty: "sexologue-clinique",
  },
  gynécologie: { category: "sexual-health", primarySpecialty: "gynecologue" },
  gynecologie: { category: "sexual-health", primarySpecialty: "gynecologue" },
  gynécologue: { category: "sexual-health", primarySpecialty: "gynecologue" },
  gynecologue: { category: "sexual-health", primarySpecialty: "gynecologue" },
  urologie: { category: "sexual-health", primarySpecialty: "urologue" },
  urologue: { category: "sexual-health", primarySpecialty: "urologue" },
  "sage-femme": { category: "sexual-health", primarySpecialty: "sage-femme" },
  "sage femme": { category: "sexual-health", primarySpecialty: "sage-femme" },
  "dermatologue-vénéréologue": {
    category: "sexual-health",
    primarySpecialty: "dermato-venerologue",
  },
  "dermato-venerologue": {
    category: "sexual-health",
    primarySpecialty: "dermato-venerologue",
  },
  endocrinologue: {
    category: "sexual-health",
    primarySpecialty: "endocrinologue",
  },
  andrologue: { category: "sexual-health", primarySpecialty: "andrologue" },
  "médecin généraliste santé sexuelle": {
    category: "sexual-health",
    primarySpecialty: "medecin-generaliste-sexuelle",
  },
  "medecin-generaliste-sexuelle": {
    category: "sexual-health",
    primarySpecialty: "medecin-generaliste-sexuelle",
  },
  "conseiller planning familial": {
    category: "sexual-health",
    primarySpecialty: "conseiller-planning-familial",
  },
  "conseiller-planning-familial": {
    category: "sexual-health",
    primarySpecialty: "conseiller-planning-familial",
  },
  "éducateur santé sexuelle": {
    category: "sexual-health",
    primarySpecialty: "educateur-sante-sexuelle",
  },
  "educateur-sante-sexuelle": {
    category: "sexual-health",
    primarySpecialty: "educateur-sante-sexuelle",
  },
  "psychologue sexologie": {
    category: "sexual-health",
    primarySpecialty: "psychologue-sexologie",
  },
  "psychologue-sexologie": {
    category: "sexual-health",
    primarySpecialty: "psychologue-sexologie",
  },
  "travailleur social santé sexuelle": {
    category: "sexual-health",
    primarySpecialty: "travailleur-social-sante-sexuelle",
  },
  "travailleur-social-sante-sexuelle": {
    category: "sexual-health",
    primarySpecialty: "travailleur-social-sante-sexuelle",
  },
  "médiateur familial": {
    category: "sexual-health",
    primarySpecialty: "mediateur-familial",
  },
  "mediateur-familial": {
    category: "sexual-health",
    primarySpecialty: "mediateur-familial",
  },
};

/**
 * Migre les spécialités d'un professionnel
 */
function migrateProfessionalSpecialty(
  professional: ProfessionalProfile
): { category?: Category; primarySpecialty?: string } | null {
  // Si déjà migré, ne rien faire
  if (
    professional.category &&
    professional.primarySpecialty &&
    isValidCategory(professional.category) &&
    isValidSpecialty(professional.primarySpecialty)
  ) {
    return null; // Déjà migré
  }

  const result: { category?: Category; primarySpecialty?: string } = {};

  // Essayer de mapper depuis l'ancien champ specialty
  if (professional.specialty) {
    const normalizedSpecialty = professional.specialty.toLowerCase().trim();
    const mapping = LEGACY_MAPPING[normalizedSpecialty];

    if (mapping) {
      result.category = mapping.category;
      result.primarySpecialty = mapping.primarySpecialty;
      return result;
    }
  }

  // Fallback sur le type legacy
  if (professional.type === "mental") {
    result.category = "mental-health";
    // Essayer de deviner la spécialité
    if (professional.specialty) {
      const mapped = mapLegacySpecialty(professional.specialty);
      if (mapped) {
        result.primarySpecialty = mapped;
      } else {
        result.primarySpecialty = "psychologue-clinicien"; // Default
      }
    } else {
      result.primarySpecialty = "psychologue-clinicien"; // Default
    }
    return result;
  } else if (professional.type === "sexual") {
    result.category = "sexual-health";
    // Essayer de deviner la spécialité
    if (professional.specialty) {
      const mapped = mapLegacySpecialty(professional.specialty);
      if (mapped) {
        result.primarySpecialty = mapped;
      } else {
        result.primarySpecialty = "sexologue-clinique"; // Default
      }
    } else {
      result.primarySpecialty = "sexologue-clinique"; // Default
    }
    return result;
  }

  return null; // Aucune migration possible
}

/**
 * Script principal de migration
 */
export async function migrateSpecialties(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  const results = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    console.log("🚀 Début de la migration des spécialités...");

    // Récupérer tous les professionnels
    const professionalsRef = collection(db, "professionals");
    const snapshot = await getDocs(professionalsRef);

    results.total = snapshot.size;
    console.log(`📊 ${results.total} professionnels trouvés`);

    // Traiter par batch pour éviter les limites Firestore
    const batchSize = 100;
    const batches: any[][] = [];

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      batches.push(snapshot.docs.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const writeBatch = writeBatch(db);
      let batchUpdates = 0;

      for (const docSnapshot of batch) {
        const professional = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
        } as ProfessionalProfile;

        try {
          const migration = migrateProfessionalSpecialty(professional);

          if (migration) {
            const docRef = doc(db, "professionals", professional.id);
            writeBatch.update(docRef, migration);
            batchUpdates++;
            results.migrated++;

            results.details.push(
              `✅ ${professional.name || professional.id}: ${
                professional.specialty || professional.type
              } → ${migration.category}/${migration.primarySpecialty}`
            );
          } else {
            results.skipped++;
            results.details.push(
              `⏭️ ${
                professional.name || professional.id
              }: Déjà migré ou aucune migration nécessaire`
            );
          }
        } catch (error) {
          results.errors++;
          results.details.push(
            `❌ ${professional.name || professional.id}: Erreur - ${error}`
          );
          console.error(`Erreur pour ${professional.id}:`, error);
        }
      }

      // Exécuter le batch s'il y a des mises à jour
      if (batchUpdates > 0) {
        await writeBatch.commit();
        console.log(
          `✅ Batch ${batchIndex + 1}/${
            batches.length
          } traité: ${batchUpdates} mises à jour`
        );
      } else {
        console.log(
          `⏭️ Batch ${batchIndex + 1}/${
            batches.length
          } ignoré: aucune mise à jour`
        );
      }
    }

    console.log("🎉 Migration terminée!");
    console.log(`📊 Résultats:`);
    console.log(`   - Total: ${results.total}`);
    console.log(`   - Migrés: ${results.migrated}`);
    console.log(`   - Ignorés: ${results.skipped}`);
    console.log(`   - Erreurs: ${results.errors}`);
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    results.errors++;
    results.details.push(`❌ Erreur générale: ${error}`);
  }

  return results;
}

/**
 * Fonction pour exécuter la migration depuis l'interface admin
 */
export async function runMigrationFromAdmin(): Promise<string> {
  try {
    const results = await migrateSpecialties();

    const summary = `
Migration des spécialités terminée:

📊 Statistiques:
- Total de professionnels: ${results.total}
- Migrés avec succès: ${results.migrated}
- Déjà migrés/ignorés: ${results.skipped}
- Erreurs: ${results.errors}

${
  results.errors > 0
    ? "⚠️ Des erreurs ont été rencontrées. Vérifiez les logs pour plus de détails."
    : "✅ Migration réussie sans erreur!"
}
    `.trim();

    return summary;
  } catch (error) {
    return `❌ Erreur lors de la migration: ${error}`;
  }
}

// Si exécuté directement (pour les tests)
if (import.meta.env.MODE === "development") {
  migrateSpecialties()
    .then((results) => {
      console.log("Résultats de la migration:", results);
    })
    .catch((error) => {
      console.error("Erreur:", error);
    });
}
