"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBookingConfirmed = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const luxon_1 = require("luxon");
const messaging_1 = require("./messaging");
const room_1 = require("./lib/room");
const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";
function toStartsEnds(booking) {
    // booking.date = "YYYY-MM-DD", startTime = "HH:mm"
    const date = booking?.date;
    const startTime = booking?.startTime;
    const endTime = booking?.endTime;
    const duration = Number(booking?.duration || 30);
    if (!date || !startTime)
        return { startsAt: null, endsAt: null };
    const start = luxon_1.DateTime.fromISO(`${date}T${startTime}`, { zone: TZ });
    const end = endTime
        ? luxon_1.DateTime.fromISO(`${date}T${endTime}`, { zone: TZ })
        : start.plus({ minutes: isFinite(duration) ? duration : 30 });
    return {
        startsAt: admin.firestore.Timestamp.fromMillis(start.toUTC().toMillis()),
        endsAt: admin.firestore.Timestamp.fromMillis(end.toUTC().toMillis()),
    };
}
// Helper functions moved to lib/room.ts
exports.onBookingConfirmed = (0, firestore_1.onDocumentWritten)({ region: REGION, document: "bookings/{bookingId}" }, async (event) => {
    const bookingId = event.params.bookingId;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after)
        return; // supprimé
    const wasConfirmed = before?.status === "confirmed";
    const isConfirmed = after?.status === "confirmed";
    // Ne déclenche que si nouvellement confirmé, ou création déjà confirmée
    if (!isConfirmed || (before && wasConfirmed))
        return;
    // Idempotence
    if (after?.notify?.sent?.initial)
        return;
    // Calcule startsAt/endsAt si absents
    const patch = {};
    const { startsAt, endsAt } = toStartsEnds(after);
    if (startsAt && !after.startsAt)
        patch.startsAt = startsAt;
    if (endsAt && !after.endsAt)
        patch.endsAt = endsAt;
    // Token + lien public
    const token = await (0, room_1.ensureRoomToken)(bookingId);
    const joinLink = `${SITE_URL.replace(/\/$/, "")}/join?t=${encodeURIComponent(token)}`;
    // Numéro patient
    const phone = after.patientPhone || // si tu décides plus tard d'ajouter ce champ dans booking
        (await (0, room_1.findPatientPhone)(after.patientId));
    // Message "RDV confirmé"
    if (phone) {
        const whenText = (startsAt ? new Date(startsAt.toMillis()) : new Date()).toLocaleString("fr-FR", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: TZ,
        });
        try {
            // À l'étape 1 on utilise le SMS stub (pas de coût, pas d'intégration externe)
            await (0, messaging_1.sendSmsFallback)(phone, `[Health-e] RDV confirmé avec ${after.professionalName || "votre professionnel"} le ${whenText}. Lien: ${joinLink}`);
        }
        catch (e) {
            console.error("[onBookingConfirmed] Envoi message échoué", bookingId, e);
        }
    }
    else {
        console.warn(`[onBookingConfirmed] Aucun numéro patient trouvé pour booking ${bookingId}`);
    }
    // Marque comme notifié + patchs éventuels
    const updates = {
        ...patch,
        "notify.sent.initial": true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.doc(`bookings/${bookingId}`).set(updates, { merge: true });
});
