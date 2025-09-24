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
exports.onBookingUpdated = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const luxon_1 = require("luxon");
const messaging_1 = require("./messaging");
const room_1 = require("./lib/room");
const db = admin.firestore();
const REGION = "europe-west1";
const TZ = process.env.TZ || "Africa/Dakar";
const SITE_URL = process.env.SITE_URL || "http://localhost:5174";
function humanizeDateTime(timestamp) {
    const dt = luxon_1.DateTime.fromMillis(timestamp.toMillis()).setZone(TZ);
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
exports.onBookingUpdated = (0, firestore_1.onDocumentUpdated)({ region: REGION, document: "bookings/{bookingId}" }, async (event) => {
    const bookingId = event.params.bookingId;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after)
        return; // Document deleted
    const { status: afterStatus, startsAt: afterStartsAt, endsAt: afterEndsAt, professionalName, patientId, patientPhone, } = after;
    const beforeStatus = before?.status;
    const beforeStartsAt = before?.startsAt;
    console.log(`[onBookingUpdated] Processing booking ${bookingId}, status: ${beforeStatus} -> ${afterStatus}`);
    try {
        // Get patient phone
        const phone = patientPhone || (await (0, room_1.findPatientPhone)(patientId));
        if (!phone) {
            console.warn(`[onBookingUpdated] No phone found for booking ${bookingId}`);
            return;
        }
        // CAS 1 – Annulation
        if (beforeStatus !== "cancelled" && afterStatus === "cancelled") {
            console.log(`[onBookingUpdated] Booking cancelled: ${bookingId}`);
            // Check idempotence
            if (after?.notify?.sent?.cancelled) {
                console.log(`[onBookingUpdated] Cancellation already notified for ${bookingId}`);
                return;
            }
            const message = `[Health-e] Votre consultation avec ${professionalName || "votre professionnel"} a été annulée. Pour reprogrammer, contactez votre professionnel.`;
            // Try template first, then text
            const templateName = process.env.WA_TEMPLATE_CANCELLED;
            const variables = [professionalName || "votre professionnel"];
            await (0, messaging_1.sendViaPreferredChannel)(phone, {
                text: message,
                templateName,
                variables,
            });
            // Mark as notified and disarm reminder flags
            await db.doc(`bookings/${bookingId}`).set({
                "notify.sent.cancelled": true,
                "notify.sent.reminder5m": false,
                "notify.sent.startNow": false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log(`[onBookingUpdated] Cancellation notification sent for ${bookingId}`);
        }
        // CAS 2 – Report (reschedule)
        else if (afterStatus === "confirmed" &&
            beforeStartsAt &&
            afterStartsAt &&
            !beforeStartsAt.isEqual(afterStartsAt)) {
            console.log(`[onBookingUpdated] Booking rescheduled: ${bookingId}`);
            // Check idempotence
            if (after?.notify?.sent?.rescheduled) {
                console.log(`[onBookingUpdated] Reschedule already notified for ${bookingId}`);
                return;
            }
            // Ensure room token exists
            const token = await (0, room_1.ensureRoomToken)(bookingId);
            const joinLink = `${SITE_URL.replace(/\/$/, "")}/join?t=${encodeURIComponent(token)}`;
            // Format new date/time
            const whenHuman = humanizeDateTime(afterStartsAt);
            const message = `[Health-e] Votre consultation avec ${professionalName || "votre professionnel"} a été reprogrammée au ${whenHuman}. Lien: ${joinLink}`;
            // Try template first, then text
            const templateName = process.env.WA_TEMPLATE_RESCHEDULED;
            const variables = [professionalName || "votre professionnel", whenHuman, joinLink];
            await (0, messaging_1.sendViaPreferredChannel)(phone, {
                text: message,
                templateName,
                variables,
            });
            // Rearm reminders and mark as notified
            await db.doc(`bookings/${bookingId}`).set({
                "notify.sent.rescheduled": true,
                "notify.sent.reminder5m": false,
                "notify.sent.startNow": false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log(`[onBookingUpdated] Reschedule notification sent for ${bookingId}`);
        }
    }
    catch (error) {
        console.error(`[onBookingUpdated] Error processing booking ${bookingId}:`, error);
    }
});
