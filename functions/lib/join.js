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
exports.joinInfo = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const luxon_1 = require("luxon");
const db = admin.firestore();
const REGION = "europe-west1"; // Using existing region for consistency
const TZ = process.env.TZ || "Africa/Dakar";
exports.joinInfo = (0, https_1.onCall)({
    region: REGION,
}, async (request) => {
    const { token } = request.data;
    if (!token) {
        return { status: "invalid" };
    }
    try {
        // 1. Lire roomLinks/{token} → récupérer bookingId
        const roomLinkRef = db.doc(`roomLinks/${token}`);
        const roomLinkSnap = await roomLinkRef.get();
        if (!roomLinkSnap.exists) {
            console.log(`[joinInfo] Token not found: ${token}`);
            return { status: "invalid" };
        }
        const roomLinkData = roomLinkSnap.data();
        const bookingId = roomLinkData?.bookingId;
        if (!bookingId) {
            console.log(`[joinInfo] No bookingId for token: ${token}`);
            return { status: "invalid" };
        }
        // 2. Charger bookings/{bookingId}
        const bookingRef = db.doc(`bookings/${bookingId}`);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
            console.log(`[joinInfo] Booking not found: ${bookingId}`);
            return { status: "invalid" };
        }
        const bookingData = bookingSnap.data();
        if (bookingData?.status !== "confirmed") {
            console.log(`[joinInfo] Booking not confirmed: ${bookingId}, status: ${bookingData?.status}`);
            return { status: "invalid" };
        }
        // 3. Calculer maintenant et comparer avec startsAt/endsAt
        const now = luxon_1.DateTime.now().setZone(TZ);
        const startsAt = bookingData.startsAt;
        const endsAt = bookingData.endsAt;
        const professionalName = bookingData.professionalName || "votre professionnel";
        if (!startsAt || !endsAt) {
            console.log(`[joinInfo] Missing timestamps for booking: ${bookingId}`);
            return { status: "invalid" };
        }
        const startsAtDt = luxon_1.DateTime.fromMillis(startsAt.toMillis()).setZone(TZ);
        const endsAtDt = luxon_1.DateTime.fromMillis(endsAt.toMillis()).setZone(TZ);
        const endsAtExtended = endsAtDt.plus({ minutes: 30 }); // 30 min grace period
        // Format human-readable date/time
        const startsAtHuman = startsAtDt.setLocale("fr").toLocaleString({
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        // 4. Politique de décision
        if (now < startsAtDt) {
            // Trop tôt
            return {
                status: "too_early",
                startsAtHuman,
                professionalName,
            };
        }
        else if (now >= startsAtDt && now <= endsAtExtended) {
            // C'est l'heure (avec grâce de 30 min après la fin)
            return {
                status: "ok",
                bookingId,
                roomPath: `/room/${bookingId}`,
            };
        }
        else {
            // Terminé
            return {
                status: "finished",
            };
        }
    }
    catch (error) {
        console.error(`[joinInfo] Error processing token ${token}:`, error);
        return { status: "invalid" };
    }
});
