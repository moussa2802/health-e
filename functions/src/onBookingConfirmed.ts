import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { DateTime } from "luxon";
import { sendViaPreferredChannel } from "./messaging";
import { ensureRoomToken, findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";

function toStartsEnds(
  booking:
    | {
        date?: string;
        startTime?: string;
        endTime?: string;
        duration?: number | string;
      }
    | undefined
) {
  // booking.date = "YYYY-MM-DD", startTime = "HH:mm"
  const date = booking?.date;
  const startTime = booking?.startTime;
  const endTime = booking?.endTime;
  const duration = Number(booking?.duration || 30);

  if (!date || !startTime) return { startsAt: null, endsAt: null };

  const start = DateTime.fromISO(`${date}T${startTime}`, { zone: TZ });
  const end = endTime
    ? DateTime.fromISO(`${date}T${endTime}`, { zone: TZ })
    : start.plus({ minutes: isFinite(duration) ? duration : 30 });

  return {
    startsAt: admin.firestore.Timestamp.fromMillis(start.toUTC().toMillis()),
    endsAt: admin.firestore.Timestamp.fromMillis(end.toUTC().toMillis()),
  };
}

// Helper functions moved to lib/room.ts

export const onBookingConfirmed = onDocumentWritten(
  { region: REGION, document: "bookings/{bookingId}" },
  async (event) => {
    const bookingId = event.params.bookingId;
    const before = event.data?.before?.data() as
      | FirebaseFirestore.DocumentData
      | undefined;
    const after = event.data?.after?.data() as
      | FirebaseFirestore.DocumentData
      | undefined;

    if (!after) return; // supprimé

    const isConfirmed = after?.status === "confirmed";
    const wasConfirmed = before?.status === "confirmed";

    // Ne déclenche que si nouvellement confirmé (pas déjà confirmé avant)
    if (!isConfirmed || wasConfirmed) return;

    // Idempotence: ne pas renvoyer la confirmation si déjà envoyée
    if (after?.notify?.sent?.confirmation) return;

    // Calcule startsAt/endsAt si absents
    const patch: Record<string, unknown> = {};
    const { startsAt, endsAt } = toStartsEnds(after);
    if (startsAt && !after.startsAt) patch.startsAt = startsAt;
    if (endsAt && !after.endsAt) patch.endsAt = endsAt;

    // Token + lien public
    const token = await ensureRoomToken(bookingId);
    const joinLink = `${SITE_URL.replace(
      /\/$/,
      ""
    )}/join?t=${encodeURIComponent(token)}`;

    // Numéro patient
    const phone =
      after.patientPhone || // si tu décides plus tard d'ajouter ce champ dans booking
      (await findPatientPhone(after.patientId));

    // Message "RDV confirmé" (WhatsApp prioritaire, fallback interne si besoin)
    if (phone) {
      try {
        const professionalName =
          after.professionalName || "votre professionnel";
        const when = startsAt || admin.firestore.Timestamp.fromDate(new Date());
        const date = new Date(when.toMillis());
        const whenText = date.toLocaleString("fr-FR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: TZ,
        });

        const templateName = process.env.WA_TEMPLATE_INITIAL;
        const variables = [professionalName, whenText, joinLink];
        const text = `[Health-e] RDV confirmé avec ${professionalName} le ${whenText}. Lien: ${joinLink}`;

        await sendViaPreferredChannel(phone, {
          text,
          templateName,
          variables,
        });
      } catch (e) {
        console.error(
          "[onBookingConfirmed] Envoi message échoué",
          bookingId,
          e
        );
      }
    } else {
      console.warn(
        `[onBookingConfirmed] Aucun numéro patient trouvé pour booking ${bookingId}`
      );
    }

    // Marque comme notifié + patchs éventuels
    const updates = {
      ...patch,
      "notify.sent.initial": true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`bookings/${bookingId}`).set({
      ...updates,
      "notify.sent.confirmation": true,
    }, { merge: true });
  }
);
