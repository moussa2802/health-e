import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { DateTime } from "luxon";
import { sendViaPreferredChannel } from "./messaging";
import { ensureRoomToken, findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";

function humanizeDateTime(timestamp: admin.firestore.Timestamp): string {
  const dt = DateTime.fromMillis(timestamp.toMillis()).setZone(TZ);
  return dt.setLocale("fr").toLocaleString({
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const onBookingUpdated = onDocumentUpdated(
  { region: REGION, document: "bookings/{bookingId}" },
  async (event) => {
    const bookingId = event.params.bookingId;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!after) return; // Document deleted

    const {
      status: afterStatus,
      startsAt: afterStartsAt,
      endsAt: afterEndsAt,
      professionalName,
      patientId,
      patientPhone,
    } = after;

    const beforeStatus = before?.status;
    const beforeStartsAt = before?.startsAt;

    console.log(
      `[onBookingUpdated] Processing booking ${bookingId}, status: ${beforeStatus} -> ${afterStatus}`
    );

    try {
      // Get patient phone
      const phone = patientPhone || (await findPatientPhone(patientId));
      if (!phone) {
        console.warn(
          `[onBookingUpdated] No phone found for booking ${bookingId}`
        );
        return;
      }

      // CAS 1 – Annulation
      if (beforeStatus !== "cancelled" && afterStatus === "cancelled") {
        console.log(`[onBookingUpdated] Booking cancelled: ${bookingId}`);

        // Check idempotence
        if (after?.notify?.sent?.cancelled) {
          console.log(
            `[onBookingUpdated] Cancellation already notified for ${bookingId}`
          );
          return;
        }

        const message = `[Health-e] Votre consultation avec ${
          professionalName || "votre professionnel"
        } a été annulée. Pour reprogrammer, contactez votre professionnel.`;

        // Try template first, then text
        const templateName = process.env.WA_TEMPLATE_CANCELLED;
        const variables = [professionalName || "votre professionnel"];

        await sendViaPreferredChannel(phone, {
          text: message,
          templateName,
          variables,
        });

        // Mark as notified and disarm reminder flags
        await db.doc(`bookings/${bookingId}`).set(
          {
            "notify.sent.cancelled": true,
            "notify.sent.reminder5m": false,
            "notify.sent.startNow": false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(
          `[onBookingUpdated] Cancellation notification sent for ${bookingId}`
        );
      }
      // CAS 2 – Report (reschedule)
      else if (
        afterStatus === "confirmed" &&
        beforeStartsAt &&
        afterStartsAt &&
        !beforeStartsAt.isEqual(afterStartsAt)
      ) {
        console.log(`[onBookingUpdated] Booking rescheduled: ${bookingId}`);

        // Check idempotence
        if (after?.notify?.sent?.rescheduled) {
          console.log(
            `[onBookingUpdated] Reschedule already notified for ${bookingId}`
          );
          return;
        }

        // Ensure room token exists
        const token = await ensureRoomToken(bookingId);
        const joinLink = `${SITE_URL.replace(
          /\/$/,
          ""
        )}/join?t=${encodeURIComponent(token)}`;

        // Format new date/time
        const whenHuman = humanizeDateTime(afterStartsAt);

        const message = `[Health-e] Votre consultation avec ${
          professionalName || "votre professionnel"
        } a été reprogrammée au ${whenHuman}. Lien: ${joinLink}`;

        // Try template first, then text
        const templateName = process.env.WA_TEMPLATE_RESCHEDULED;
        const variables = [
          professionalName || "votre professionnel",
          whenHuman,
          joinLink,
        ];

        await sendViaPreferredChannel(phone, {
          text: message,
          templateName,
          variables,
        });

        // Rearm reminders and mark as notified
        await db.doc(`bookings/${bookingId}`).set(
          {
            "notify.sent.rescheduled": true,
            "notify.sent.reminder5m": false,
            "notify.sent.startNow": false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(
          `[onBookingUpdated] Reschedule notification sent for ${bookingId}`
        );
      }
    } catch (error) {
      console.error(
        `[onBookingUpdated] Error processing booking ${bookingId}:`,
        error
      );
    }
  }
);
