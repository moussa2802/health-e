import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { DateTime } from "luxon";
import { sendWhatsAppTemplate } from "./messaging";
import { findPatientPhone } from "./lib/room";

const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
// const SITE_URL = process.env.SITE_URL || "http://localhost:5174"; // Non utilisé pour le template

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

    // Token + lien public (pour référence future si besoin)
    // const token = await ensureRoomToken(bookingId); // Non utilisé pour le template

    // Numéro patient - récupérer depuis booking ou users/{patientId}
    let phone = after.patientPhone;
    if (!phone && after.patientId) {
      phone = await findPatientPhone(after.patientId);
      // Persister le numéro dans le booking pour les prochaines fois
      if (phone) {
        await db.doc(`bookings/${bookingId}`).update({
          patientPhone: phone,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // WhatsApp confirmation avec template spécifique
    if (phone) {
      // Idempotence WhatsApp
      if (after?.notify?.sent?.waConfirmation) {
        console.log(`[onBookingConfirmed] WhatsApp déjà envoyé pour ${bookingId}`);
        return;
      }

      try {
        const professionalName = after.professionalName || "votre professionnel";
        const patientName = after.patientName || "Patient";
        const when = startsAt || admin.firestore.Timestamp.fromDate(new Date());
        
        // Formatage en Africa/Dakar: dd/MM/yyyy HH:mm (Dakar)
        const date = new Date(when.toMillis());
        const dateTimeDakar = date.toLocaleString("fr-CA", {
          day: "2-digit",
          month: "2-digit", 
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: TZ,
        }) + " (Dakar)";

        // Template WhatsApp avec 3 paramètres body uniquement
        const templateName = "rdv_confirmation";
        const variables = [patientName, professionalName, dateTimeDakar];
        
        // Envoi via template WhatsApp
        const success = await sendWhatsAppTemplate(phone, templateName, variables);
        
        if (success) {
          // Marquer comme envoyé
          await db.doc(`bookings/${bookingId}`).update({
            "notify.sent.waConfirmation": true,
            "notify.last.waConfirmationAt": admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[onBookingConfirmed] WhatsApp template envoyé pour ${bookingId}`);
        } else {
          console.warn(`[onBookingConfirmed] Échec envoi WhatsApp template pour ${bookingId}`);
        }
      } catch (e) {
        console.error("[onBookingConfirmed] Erreur envoi WhatsApp:", bookingId, e);
      }
    } else {
      console.warn(`[onBookingConfirmed] Aucun numéro patient trouvé pour booking ${bookingId}`);
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
