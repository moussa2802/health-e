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
          const token = await ensureRoomToken(doc.id);
          const joinLink = `${SITE_URL.replace(
            /\/$/,
            ""
          )}/join?t=${encodeURIComponent(token)}`;
          const startsAt = b.startsAt as admin.firestore.Timestamp;
          const { dateStr, timeStr } = splitDateTime(startsAt);
          const whenText = humanize(startsAt);
          const text = `[Health-e] Rappel J-1: votre consultation avec ${
            b.professionalName || "votre professionnel"
          } est prévue ${whenText}. Lien: ${joinLink}`;
          const templateName = process.env.WA_TEMPLATE_REMINDER;
          const variables = [
            b.professionalName || "votre professionnel",
            dateStr,
            timeStr,
            joinLink,
          ];
          await sendViaPreferredChannel(phone, {
            text,
            templateName,
            variables,
          });
        }

        await doc.ref.set(
          {
            "notify.sent.reminder24h": true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
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
          const token = await ensureRoomToken(doc.id);
          const joinLink = `${SITE_URL.replace(
            /\/$/,
            ""
          )}/join?t=${encodeURIComponent(token)}`;
          const startsAt = b.startsAt as admin.firestore.Timestamp;
          const { dateStr, timeStr } = splitDateTime(startsAt);
          const whenText = humanize(startsAt);
          const text = `[Health-e] Rappel J-1h: votre consultation avec ${
            b.professionalName || "votre professionnel"
          } commence dans 1 heure (${whenText}). Lien: ${joinLink}`;
          const templateName = process.env.WA_TEMPLATE_REMINDER;
          const variables = [
            b.professionalName || "votre professionnel",
            dateStr,
            timeStr,
            joinLink,
          ];
          await sendViaPreferredChannel(phone, {
            text,
            templateName,
            variables,
          });
        }

        await doc.ref.set(
          {
            "notify.sent.reminder1h": true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error("[J-1h] Error handling booking", doc.id, e);
      }
    }
  }
);
