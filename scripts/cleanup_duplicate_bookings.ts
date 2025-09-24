import * as admin from "firebase-admin";

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();

  const bookingsSnap = await db.collection("bookings").get();
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, data: d.data() }));

  const byKey = new Map<string, { temp?: string; normal?: string }>();

  for (const { id, data } of bookings) {
    const isTemp = id.startsWith("temp_") || data.isTemp === true;
    const keyPayment = data.paymentRef ? `pay:${data.paymentRef}` : null;
    const keyTuple =
      data.patientId && data.professionalId && data.startsAt
        ? `tuple:${data.patientId}:${data.professionalId}:${
            data.startsAt.toMillis?.() || data.startsAt
          }`
        : null;

    const keys = [keyPayment, keyTuple].filter(Boolean) as string[];
    for (const key of keys) {
      const entry = byKey.get(key) || {};
      if (isTemp) entry.temp = id;
      else entry.normal = id;
      byKey.set(key, entry);
    }
  }

  let deletions = 0;
  for (const [key, pair] of byKey.entries()) {
    if (pair.temp && pair.normal) {
      console.log(
        `Duplicate detected for ${key}: keeping ${pair.temp}, deleting ${pair.normal}`
      );
      await db.collection("bookings").doc(pair.normal).delete();
      deletions++;
    }
  }

  console.log(`Cleanup complete. Deleted ${deletions} duplicate bookings.`);
}

main().catch((e) => {
  console.error("Cleanup failed", e);
  process.exit(1);
});
