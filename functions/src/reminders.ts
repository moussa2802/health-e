import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { DateTime } from "luxon";
import { sendViaPreferredChannel } from "./messaging";
import { ensureRoomToken, findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";

// Helper functions
function ts(millis: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(millis);
}

// Helper functions moved to lib/room.ts

function humanize(timestamp: admin.firestore.Timestamp): string {
  const dt = DateTime.fromMillis(timestamp.toMillis()).setZone(TZ);
  // Example: "dimanche 21 septembre 2025 à 20:00"
  return dt.setLocale("fr").toLocaleString({
    ...DateTime.DATETIME_MED_WITH_WEEKDAY,
    hour12: false,
  });
}

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
  async (event) => {
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

        // Ensure room token
        const token = await ensureRoomToken(bookingId);
        const joinLink = `${SITE_URL.replace(
          /\/$/,
          ""
        )}/join?t=${encodeURIComponent(token)}`;

        // Prepare message
        const startsAt = booking.startsAt as admin.firestore.Timestamp;
        const professionalName =
          booking.professionalName || "votre professionnel";
        const { dateStr, timeStr } = splitDateTime(startsAt);
        const whenText = humanize(startsAt);

        const text = `[Health-e] Rappel: votre consultation avec ${professionalName} commence dans 5 min (${whenText}). Lien: ${joinLink}`;

        // Try template first, then text - 4 variables for template
        const templateName = process.env.WA_TEMPLATE_REMINDER;
        const variables = [professionalName, dateStr, timeStr, joinLink];

        await sendViaPreferredChannel(phone, {
          text,
          templateName,
          variables,
        });

        // Mark as notified
        await db.doc(`bookings/${bookingId}`).set(
          {
            "notify.sent.reminder5m": true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(`[T-5] Reminder sent for booking ${bookingId}`);
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
  async (event) => {
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

        // Ensure room token
        const token = await ensureRoomToken(bookingId);
        const joinLink = `${SITE_URL.replace(
          /\/$/,
          ""
        )}/join?t=${encodeURIComponent(token)}`;

        // Prepare message
        const professionalName =
          booking.professionalName || "votre professionnel";

        const text = `[Health-e] C'est l'heure ! Votre consultation avec ${professionalName} commence. Rejoignez la salle: ${joinLink}`;

        // Try template first, then text - keep 2 variables for start now
        const templateName = process.env.WA_TEMPLATE_STARTNOW;
        const variables = [professionalName, joinLink];

        await sendViaPreferredChannel(phone, {
          text,
          templateName,
          variables,
        });

        // Mark as notified
        await db.doc(`bookings/${bookingId}`).set(
          {
            "notify.sent.startNow": true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(`[H-0] Start reminder sent for booking ${bookingId}`);
      } catch (error) {
        console.error(`[H-0] Error processing booking ${bookingId}:`, error);
      }
    }

    console.log("[H-0] Start reminder check completed");
  }
);
