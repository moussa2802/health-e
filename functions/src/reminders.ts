import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { DateTime } from "luxon";
import { sendWaTemplate } from "./messaging";
import { findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";

// Helper functions
function ts(millis: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(millis);
}

// Helper functions moved to lib/room.ts

function splitDateTime(timestamp: admin.firestore.Timestamp) {
  const dt = DateTime.fromMillis(timestamp.toMillis())
    .setZone(TZ)
    .setLocale("fr");
  const dateStr = dt.toFormat("cccc d LLLL yyyy"); // ex: "dimanche 21 septembre 2025"
  const timeStr = dt.toFormat("HH:mm"); // ex: "20:00"
  return { dateStr, timeStr, dt };
}

// Rappel T-5 minutes
export const remindTMinus5 = onSchedule(
  {
    schedule: "every 1 minutes",
    region: REGION,
    timeZone: TZ,
  },
  async () => {
    console.log("[T-5] Starting reminder check...");

    const now = DateTime.now().setZone(TZ);
    const fiveLater = now.plus({ minutes: 5 });
    const sevenLater = now.plus({ minutes: 7 });

    // Query bookings with startsAt between now+5min and now+7min (widened window)
    const query = db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("startsAt", ">=", ts(fiveLater.toMillis()))
      .where("startsAt", "<", ts(sevenLater.toMillis()));

    const snapshot = await query.get();
    console.log(`[T-5] Found ${snapshot.docs.length} bookings to check`);

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      // Skip if already notified
      if (booking?.notify?.sent?.reminder5m) {
        console.log(`[T-5] Already notified: ${bookingId}`);
        continue;
      }

      try {
        // Get phone number
        const phone =
          booking.patientPhone || (await findPatientPhone(booking.patientId));
        if (!phone) {
          console.warn(`[T-5] No phone found for booking ${bookingId}`);
          continue;
        }

        // Prepare message - format Dakar
        const startsAt = booking.startsAt as admin.firestore.Timestamp;
        const professionalName = booking.professionalName || "votre professionnel";
        
        const fmtDakar = (ts: admin.firestore.Timestamp) => {
          const date = new Date(ts.toMillis());
          return date.toLocaleString("fr-CA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: TZ,
          }) + " (Dakar)";
        };

        const canFill = !!(professionalName && startsAt);
        const bodyParams = canFill ? [professionalName, fmtDakar(startsAt)] : undefined;

        const success = await sendWaTemplate({
          to: phone,
          name: "rdv_rappel",
          language: "fr_CA",
          bodyParams,
        });

        if (success) {
          // Mark as notified
          await db.doc(`bookings/${bookingId}`).update({
            "notify.sent.reminder5m": true,
            "notify.last.reminder5mAt": admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[T-5] Reminder sent for booking ${bookingId}`);
        }
      } catch (error) {
        console.error(`[T-5] Error processing booking ${bookingId}:`, error);
      }
    }

    console.log("[T-5] Reminder check completed");
  }
);

// Rappel H-0 (heure exacte)
export const remindStartNow = onSchedule(
  {
    schedule: "every 1 minutes",
    region: REGION,
    timeZone: TZ,
  },
  async () => {
    console.log("[H-0] Starting start reminder check...");

    const now = DateTime.now().setZone(TZ);
    const lower = now.minus({ seconds: 30 });
    const upper = now.plus({ minutes: 2 });

    // Query bookings with startsAt between now-30s and now+2min (widened window)
    const query = db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("startsAt", ">=", ts(lower.toMillis()))
      .where("startsAt", "<", ts(upper.toMillis()));

    const snapshot = await query.get();
    console.log(`[H-0] Found ${snapshot.docs.length} bookings to check`);

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      // Skip if already notified
      if (booking?.notify?.sent?.startNow) {
        console.log(`[H-0] Already notified: ${bookingId}`);
        continue;
      }

      try {
        // Get phone number
        const phone =
          booking.patientPhone || (await findPatientPhone(booking.patientId));
        if (!phone) {
          console.warn(`[H-0] No phone found for booking ${bookingId}`);
          continue;
        }

        // Construire le suffixe pour le bouton dynamique
        const joinSuffix = booking.join?.code || booking.room?.joinCode || bookingId;

        // Template rdv_consultation avec bouton dynamique (0 variable body, 1 param button)
        const success = await sendWaTemplate({
          to: phone,
          name: "rdv_consultation",
          language: "fr_CA",
          // pas de bodyParams (0 variable body)
          button0Param: String(joinSuffix), // remplit {{1}} de l'URL dynamique
        });

        if (success) {
          // Mark as notified
          await db.doc(`bookings/${bookingId}`).update({
            "notify.sent.startNow": true,
            "notify.last.startNowAt": admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[H-0] Start reminder sent for booking ${bookingId}`);
        }
      } catch (error) {
        console.error(`[H-0] Error processing booking ${bookingId}:`, error);
      }
    }

    console.log("[H-0] Start reminder check completed");
  }
);

// === Nouveaux rappels J-1 (24h) et J-1h ===
function windowStartEnd(minutesAhead: number) {
  const now = admin.firestore.Timestamp.now().toMillis();
  const start = admin.firestore.Timestamp.fromMillis(
    now + minutesAhead * 60 * 1000
  );
  const end = admin.firestore.Timestamp.fromMillis(
    now + (minutesAhead + 5) * 60 * 1000
  );
  return { start, end };
}

export const remindMinus24h = onSchedule(
  { schedule: "every 5 minutes", region: REGION, timeZone: TZ },
  async () => {
    const { start, end } = windowStartEnd(24 * 60);
    const qsnap = await db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("startsAt", ">=", start)
      .where("startsAt", "<", end)
      .get();

    for (const doc of qsnap.docs) {
      const b = doc.data() as FirebaseFirestore.DocumentData;
      if (b?.notify?.sent?.reminder24h) continue;

      try {
        // Email pro via notification bridge
        await db.collection("notifications").add({
          userId: b.professionalId,
          userType: "professional",
          type: "appointment_reminder_pro",
          title: `Rappel – RDV ${b.patientName || "patient"}`,
          message: `Rappel de rendez-vous avec ${b.patientName || "patient"}.`,
          data: {
            bookingId: doc.id,
            date: splitDateTime(b.startsAt).dateStr,
            time: splitDateTime(b.startsAt).timeStr,
            redirectPath: "/professional/dashboard",
          },
          channels: ["email"],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // WhatsApp patient
        const phone = b.patientPhone || (await findPatientPhone(b.patientId));
        if (phone) {
          const startsAt = b.startsAt as admin.firestore.Timestamp;
          const professionalName = b.professionalName || "votre professionnel";
          
          const fmtDakar = (ts: admin.firestore.Timestamp) => {
            const date = new Date(ts.toMillis());
            return date.toLocaleString("fr-CA", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: TZ,
            }) + " (Dakar)";
          };

          const canFill = !!(professionalName && startsAt);
          const bodyParams = canFill ? [professionalName, fmtDakar(startsAt)] : undefined;

          await sendWaTemplate({
            to: phone,
            name: "rdv_rappel",
            language: "fr_CA",
            bodyParams,
          });
        }

        await doc.ref.update({
          "notify.sent.reminder24h": true,
          "notify.last.reminder24hAt": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[J-1] Error handling booking", doc.id, e);
      }
    }
  }
);

export const remindMinus1h = onSchedule(
  { schedule: "every 5 minutes", region: REGION, timeZone: TZ },
  async () => {
    const { start, end } = windowStartEnd(60);
    const qsnap = await db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("startsAt", ">=", start)
      .where("startsAt", "<", end)
      .get();

    for (const doc of qsnap.docs) {
      const b = doc.data() as FirebaseFirestore.DocumentData;
      if (b?.notify?.sent?.reminder1h) continue;

      try {
        // Email pro via notification bridge
        await db.collection("notifications").add({
          userId: b.professionalId,
          userType: "professional",
          type: "appointment_reminder_pro",
          title: `Rappel – RDV ${b.patientName || "patient"}`,
          message: `Rappel de rendez-vous avec ${b.patientName || "patient"}.`,
          data: {
            bookingId: doc.id,
            date: splitDateTime(b.startsAt).dateStr,
            time: splitDateTime(b.startsAt).timeStr,
            redirectPath: "/professional/dashboard",
          },
          channels: ["email"],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // WhatsApp patient
        const phone = b.patientPhone || (await findPatientPhone(b.patientId));
        if (phone) {
          const startsAt = b.startsAt as admin.firestore.Timestamp;
          const professionalName = b.professionalName || "votre professionnel";
          
          const fmtDakar = (ts: admin.firestore.Timestamp) => {
            const date = new Date(ts.toMillis());
            return date.toLocaleString("fr-CA", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: TZ,
            }) + " (Dakar)";
          };

          const canFill = !!(professionalName && startsAt);
          const bodyParams = canFill ? [professionalName, fmtDakar(startsAt)] : undefined;

          await sendWaTemplate({
            to: phone,
            name: "rdv_rappel",
            language: "fr_CA",
            bodyParams,
          });
        }

        await doc.ref.update({
          "notify.sent.reminder1h": true,
          "notify.last.reminder1hAt": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[J-1h] Error handling booking", doc.id, e);
      }
    }
  }
);
