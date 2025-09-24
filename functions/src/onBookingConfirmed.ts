import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { DateTime } from "luxon";
import { sendSmsFallback } from "./messaging";
import { ensureRoomToken, findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";

function toStartsEnds(booking: any) {
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
    const before = event.data?.before?.data() as any | undefined;
    const after = event.data?.after?.data() as any | undefined;

    if (!after) return; // supprimé
    const wasConfirmed = before?.status === "confirmed";
    const isConfirmed = after?.status === "confirmed";

    // Ne déclenche que si nouvellement confirmé, ou création déjà confirmée
    if (!isConfirmed || (before && wasConfirmed)) return;

    // Idempotence
    if (after?.notify?.sent?.initial) return;

    // Calcule startsAt/endsAt si absents
    const patch: any = {};
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

    // Message "RDV confirmé"
    if (phone) {
      const whenText = (
        startsAt ? new Date(startsAt.toMillis()) : new Date()
      ).toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: TZ,
      });

      try {
        // À l'étape 1 on utilise le SMS stub (pas de coût, pas d'intégration externe)
        await sendSmsFallback(
          phone,
          `[Health-e] RDV confirmé avec ${
            after.professionalName || "votre professionnel"
          } le ${whenText}. Lien: ${joinLink}`
        );
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

    await db.doc(`bookings/${bookingId}`).set(updates, { merge: true });
  }
);
