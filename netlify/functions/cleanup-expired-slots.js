const admin = require("firebase-admin");

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Fonction Netlify pour nettoyer automatiquement les créneaux expirés
 * Cette fonction peut être appelée manuellement ou via un cron job
 */
exports.handler = async (event, context) => {
  // Gestion CORS pour Netlify
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Répondre aux requêtes OPTIONS (preflight)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    console.log("🧹 Début du nettoyage des créneaux expirés...");

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h dans le passé

    console.log(`⏰ Date de coupure: ${cutoffDate.toISOString()}`);

    // 1. Nettoyer les créneaux de calendrier expirés
    const calendarEventsRef = db.collection("calendar_events");
    const expiredCalendarQuery = calendarEventsRef
      .where("start", "<", cutoffDate)
      .where("isAvailable", "==", true); // Seulement les créneaux disponibles (non réservés)

    const expiredCalendarSnapshot = await expiredCalendarQuery.get();
    console.log(
      `📅 Trouvé ${expiredCalendarSnapshot.size} créneaux de calendrier expirés`
    );

    let deletedCalendarCount = 0;
    const calendarDeletePromises = expiredCalendarSnapshot.docs.map(
      async (doc) => {
        try {
          const eventData = doc.data();

          // Vérifier que ce n'est pas un créneau récurrent avec des instances futures
          if (eventData.isRecurring && eventData.parentEventId) {
            // Vérifier s'il y a des instances futures
            const futureInstancesQuery = calendarEventsRef
              .where("parentEventId", "==", eventData.parentEventId)
              .where("start", ">=", now);

            const futureInstancesSnapshot = await futureInstancesQuery.get();

            if (futureInstancesSnapshot.size > 0) {
              console.log(
                `⏭️ Créneau récurrent ${doc.id} a des instances futures, suppression différée`
              );
              return; // Ne pas supprimer maintenant
            }
          }

          await doc.ref.delete();
          deletedCalendarCount++;
          console.log(`🗑️ Créneau de calendrier supprimé: ${doc.id}`);
        } catch (error) {
          console.error(
            `❌ Erreur lors de la suppression du créneau ${doc.id}:`,
            error
          );
        }
      }
    );

    await Promise.all(calendarDeletePromises);

    // 2. Nettoyer les créneaux de disponibilité expirés (si stockés séparément)
    const availabilityRef = db.collection("availability_slots");
    const expiredAvailabilityQuery = availabilityRef.where(
      "date",
      "<",
      cutoffDate.toISOString().split("T")[0]
    );

    const expiredAvailabilitySnapshot = await expiredAvailabilityQuery.get();
    console.log(
      `📅 Trouvé ${expiredAvailabilitySnapshot.size} créneaux de disponibilité expirés`
    );

    let deletedAvailabilityCount = 0;
    const availabilityDeletePromises = expiredAvailabilitySnapshot.docs.map(
      async (doc) => {
        try {
          await doc.ref.delete();
          deletedAvailabilityCount++;
          console.log(`🗑️ Créneau de disponibilité supprimé: ${doc.id}`);
        } catch (error) {
          console.error(
            `❌ Erreur lors de la suppression du créneau ${doc.id}:`,
            error
          );
        }
      }
    );

    await Promise.all(availabilityDeletePromises);

    // 3. Nettoyer les créneaux orphelins (sans professionnel associé)
    const orphanedQuery = calendarEventsRef
      .where("start", "<", cutoffDate)
      .where("professionalId", "==", null);

    const orphanedSnapshot = await orphanedQuery.get();
    console.log(`👻 Trouvé ${orphanedSnapshot.size} créneaux orphelins`);

    let deletedOrphanedCount = 0;
    const orphanedDeletePromises = orphanedSnapshot.docs.map(async (doc) => {
      try {
        await doc.ref.delete();
        deletedOrphanedCount++;
        console.log(`🗑️ Créneau orphelin supprimé: ${doc.id}`);
      } catch (error) {
        console.error(
          `❌ Erreur lors de la suppression du créneau ${doc.id}:`,
          error
        );
      }
    });

    await Promise.all(orphanedDeletePromises);

    // 4. Statistiques du nettoyage
    const totalDeleted =
      deletedCalendarCount + deletedAvailabilityCount + deletedOrphanedCount;

    console.log("🎉 Nettoyage terminé !");
    console.log(`📊 Résumé:`);
    console.log(
      `   - Créneaux de calendrier supprimés: ${deletedCalendarCount}`
    );
    console.log(
      `   - Créneaux de disponibilité supprimés: ${deletedAvailabilityCount}`
    );
    console.log(`   - Créneaux orphelins supprimés: ${deletedOrphanedCount}`);
    console.log(`   - Total supprimé: ${totalDeleted}`);

    // Retourner le résultat
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Nettoyage des créneaux expirés terminé avec succès",
        summary: {
          calendarSlotsDeleted: deletedCalendarCount,
          availabilitySlotsDeleted: deletedAvailabilityCount,
          orphanedSlotsDeleted: deletedOrphanedCount,
          totalDeleted: totalDeleted,
          cutoffDate: cutoffDate.toISOString(),
          processedAt: now.toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des créneaux expirés:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Erreur lors du nettoyage des créneaux expirés",
        details: error.message,
      }),
    };
  }
};

/**
 * Fonction pour nettoyer les créneaux d'un professionnel spécifique
 * Utile pour le nettoyage ciblé
 */
async function cleanupProfessionalExpiredSlots(professionalId) {
  try {
    console.log(
      `🧹 Nettoyage des créneaux expirés pour le professionnel: ${professionalId}`
    );

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h dans le passé

    const calendarEventsRef = db.collection("calendar_events");
    const expiredQuery = calendarEventsRef
      .where("professionalId", "==", professionalId)
      .where("start", "<", cutoffDate)
      .where("isAvailable", "==", true);

    const expiredSnapshot = await expiredQuery.get();
    console.log(
      `📅 Trouvé ${expiredSnapshot.size} créneaux expirés pour le professionnel ${professionalId}`
    );

    let deletedCount = 0;
    const deletePromises = expiredSnapshot.docs.map(async (doc) => {
      try {
        await doc.ref.delete();
        deletedCount++;
        console.log(`🗑️ Créneau supprimé: ${doc.id}`);
      } catch (error) {
        console.error(
          `❌ Erreur lors de la suppression du créneau ${doc.id}:`,
          error
        );
      }
    });

    await Promise.all(deletePromises);

    console.log(
      `✅ Nettoyage terminé pour le professionnel ${professionalId}: ${deletedCount} créneaux supprimés`
    );
    return deletedCount;
  } catch (error) {
    console.error(
      `❌ Erreur lors du nettoyage pour le professionnel ${professionalId}:`,
      error
    );
    throw error;
  }
}

// Exporter la fonction de nettoyage ciblé
exports.cleanupProfessionalExpiredSlots = cleanupProfessionalExpiredSlots;
