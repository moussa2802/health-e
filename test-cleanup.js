/**
 * Script de test pour la fonction de nettoyage des créneaux expirés
 *
 * Ce script peut être exécuté localement pour tester la logique de nettoyage
 * avant de déployer sur Netlify
 */

// Simulation des données de test
const mockExpiredSlots = [
  {
    id: "slot1",
    start: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h dans le passé
    isAvailable: true,
    professionalId: "prof1",
    isRecurring: false,
  },
  {
    id: "slot2",
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h dans le passé
    isAvailable: true,
    professionalId: "prof1",
    isRecurring: false,
  },
  {
    id: "slot3",
    start: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12h dans le passé
    isAvailable: false, // Réservé
    professionalId: "prof1",
    isRecurring: false,
  },
  {
    id: "slot4",
    start: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h dans le futur
    isAvailable: true,
    professionalId: "prof1",
    isRecurring: false,
  },
];

/**
 * Simule la logique de nettoyage des créneaux expirés
 */
function simulateCleanup() {
  console.log("🧹 Simulation du nettoyage des créneaux expirés...");

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h dans le passé

  console.log(`⏰ Date actuelle: ${now.toISOString()}`);
  console.log(`⏰ Date de coupure: ${cutoffDate.toISOString()}`);
  console.log("");

  // Filtrer les créneaux expirés
  const expiredSlots = mockExpiredSlots.filter((slot) => {
    const isExpired = slot.start < cutoffDate;
    const isAvailable = slot.isAvailable;

    console.log(`📅 Créneau ${slot.id}:`);
    console.log(`   - Date: ${slot.start.toISOString()}`);
    console.log(`   - Expiré: ${isExpired ? "❌ OUI" : "✅ NON"}`);
    console.log(`   - Disponible: ${isAvailable ? "✅ OUI" : "❌ NON"}`);
    console.log(
      `   - À supprimer: ${isExpired && isAvailable ? "🗑️ OUI" : "✅ NON"}`
    );
    console.log("");

    return isExpired && isAvailable;
  });

  console.log(`📊 Résumé du nettoyage:`);
  console.log(`   - Total des créneaux: ${mockExpiredSlots.length}`);
  console.log(
    `   - Créneaux expirés: ${
      mockExpiredSlots.filter((s) => s.start < cutoffDate).length
    }`
  );
  console.log(`   - Créneaux à supprimer: ${expiredSlots.length}`);
  console.log(
    `   - Créneaux conservés: ${mockExpiredSlots.length - expiredSlots.length}`
  );
  console.log("");

  if (expiredSlots.length > 0) {
    console.log("🗑️ Créneaux qui seraient supprimés:");
    expiredSlots.forEach((slot) => {
      console.log(`   - ${slot.id} (${slot.start.toISOString()})`);
    });
  } else {
    console.log("✅ Aucun créneau à supprimer");
  }

  console.log("");
  console.log("🎯 Créneaux qui seraient conservés:");
  mockExpiredSlots
    .filter((slot) => !(slot.start < cutoffDate && slot.isAvailable))
    .forEach((slot) => {
      const reason = slot.start < cutoffDate ? "Réservé" : "Pas encore expiré";
      console.log(`   - ${slot.id}: ${reason}`);
    });
}

/**
 * Test de la logique de filtrage des créneaux récurrents
 */
function testRecurringSlots() {
  console.log("\n🔄 Test de la logique des créneaux récurrents...");

  const mockRecurringSlots = [
    {
      id: "recurring1",
      start: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h dans le passé
      isAvailable: true,
      professionalId: "prof1",
      isRecurring: true,
      parentEventId: "parent1",
    },
    {
      id: "recurring2",
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h dans le passé
      isAvailable: true,
      professionalId: "prof1",
      isRecurring: true,
      parentEventId: "parent1",
    },
    {
      id: "recurring3",
      start: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h dans le futur
      isAvailable: true,
      professionalId: "prof1",
      isRecurring: true,
      parentEventId: "parent1",
    },
  ];

  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Simuler la vérification des instances futures
  const hasFutureInstances = mockRecurringSlots.some(
    (slot) => slot.start >= new Date()
  );

  console.log(`📅 Créneaux récurrents du groupe 'parent1':`);
  mockRecurringSlots.forEach((slot) => {
    const isExpired = slot.start < cutoffDate;
    const isFuture = slot.start >= new Date();

    console.log(
      `   - ${slot.id}: ${slot.start.toISOString()} ${
        isExpired ? "❌ Expiré" : "✅ Valide"
      } ${isFuture ? "⏭️ Futur" : ""}`
    );
  });

  console.log(`\n🔍 Analyse:`);
  console.log(
    `   - A des instances futures: ${hasFutureInstances ? "✅ OUI" : "❌ NON"}`
  );

  if (hasFutureInstances) {
    console.log(
      `   - Action: Suppression différée (garder le groupe récurrent)`
    );
  } else {
    console.log(`   - Action: Suppression autorisée (pas d'instances futures)`);
  }
}

/**
 * Test de performance avec un grand nombre de créneaux
 */
function testPerformance() {
  console.log("\n⚡ Test de performance...");

  const startTime = Date.now();
  const largeSlotArray = Array.from({ length: 10000 }, (_, index) => ({
    id: `slot${index}`,
    start: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000), // 0-72h dans le passé
    isAvailable: Math.random() > 0.3, // 70% disponibles
    professionalId: `prof${Math.floor(Math.random() * 10)}`,
  }));

  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Filtrer les créneaux expirés
  const expiredSlots = largeSlotArray.filter(
    (slot) => slot.start < cutoffDate && slot.isAvailable
  );

  const endTime = Date.now();
  const processingTime = endTime - startTime;

  console.log(`📊 Performance:`);
  console.log(
    `   - Créneaux traités: ${largeSlotArray.length.toLocaleString()}`
  );
  console.log(`   - Créneaux expirés: ${expiredSlots.length.toLocaleString()}`);
  console.log(`   - Temps de traitement: ${processingTime}ms`);
  console.log(
    `   - Taux de traitement: ${Math.round(
      largeSlotArray.length / processingTime
    )} créneaux/ms`
  );
}

// Exécuter les tests
console.log("🚀 Tests de la fonction de nettoyage des créneaux expirés");
console.log("=".repeat(60));
console.log("");

simulateCleanup();
testRecurringSlots();
testPerformance();

console.log("\n" + "=".repeat(60));
console.log("✅ Tests terminés !");
console.log("");
console.log("💡 Pour déployer cette fonction sur Netlify:");
console.log(
  "   1. Copiez le fichier netlify/functions/cleanup-expired-slots.js"
);
console.log("   2. Déployez avec: netlify deploy --prod");
console.log(
  "   3. Testez avec: curl https://votre-site.netlify.app/.netlify/functions/cleanup-expired-slots"
);
console.log("");
console.log("🕐 Pour automatiser le nettoyage:");
console.log("   - Utilisez un service comme cron-job.org");
console.log("   - Appelez l'URL toutes les 24h");
console.log("   - Surveillez les logs Netlify");
