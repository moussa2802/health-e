"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Force deployment
const REGION = "us-central1"; // laisse comme l'extension
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)({ document: "notifications/{id}", region: REGION }, async (event) => {
    var _a, _b, _c, _d;
    const snap = event.data;
    if (!snap)
        return;
    const n = snap.data();
    // Anti doublon / ignorés
    if ((n === null || n === void 0 ? void 0 : n.emailed) === true || (n === null || n === void 0 ? void 0 : n.status) === "deleted")
        return;
    // On cible les pros et les admins
    if ((n === null || n === void 0 ? void 0 : n.userType) && !["professional", "admin"].includes(n.userType))
        return;
    if (!(n === null || n === void 0 ? void 0 : n.userId))
        return;
    const db = (0, firestore_2.getFirestore)();
    // Récupérer profil utilisateur + préférences
    let userData = {};
    let emailEnabled = true;
    let to = "";
    let userName = "";
    if (n.userType === "admin") {
        // Pour les admins, récupérer depuis la collection users
        const userRef = db.collection("users").doc(n.userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            logger.warn("Admin user doc not found", n.userId);
            return;
        }
        userData = userSnap.data() || {};
        to = userData.email;
        userName = userData.name || "Administrateur Health-e";
        // Les admins reçoivent toujours les emails par défaut
    }
    else {
        // Pour les professionnels, récupérer depuis la collection professionals
        const proRef = db.collection("professionals").doc(n.userId);
        const proSnap = await proRef.get();
        if (!proSnap.exists) {
            logger.warn("Pro doc not found", n.userId);
            return;
        }
        userData = proSnap.data() || {};
        emailEnabled = (_d = (_c = (_b = (_a = userData === null || userData === void 0 ? void 0 : userData.settings) === null || _a === void 0 ? void 0 : _a.notifications) === null || _b === void 0 ? void 0 : _b.email) === null || _c === void 0 ? void 0 : _c.enabled) !== null && _d !== void 0 ? _d : true;
        to = (userData === null || userData === void 0 ? void 0 : userData.email) || (userData === null || userData === void 0 ? void 0 : userData.contactEmail);
        userName = (userData === null || userData === void 0 ? void 0 : userData.name) || "Professionnel Health-e";
    }
    if (!to) {
        await snap.ref.update({
            emailed: false,
            emailSkipped: "missing_email",
        });
        return;
    }
    if (!emailEnabled) {
        await snap.ref.update({
            emailed: false,
            emailSkipped: "opted_out",
        });
        return;
    }
    // Construire sujet/HTML/texte selon le type
    const subject = buildSubject(n);
    const html = buildHtml(n, userData);
    const text = buildText(n);
    // Idempotent: utiliser l'ID de la notif comme ID du doc mail
    const mailDoc = db.collection("mail").doc(snap.id);
    await mailDoc.set({
        to,
        toName: userName,
        from: "Health-e <no-reply@health-e.sn>",
        replyTo: "support@health-e.sn",
        headers: {
            "X-Notification-ID": snap.id,
            "List-Unsubscribe": "<mailto:support@health-e.sn?subject=unsubscribe>",
        },
        message: { subject, html, text },
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    });
    await snap.ref.update({
        emailed: true,
        emailedAt: firestore_2.FieldValue.serverTimestamp(),
        mailDocId: mailDoc.id,
    });
});
// === helpers très simples (tu peux les raffiner plus tard) ===
function buildSubject(n) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    switch (n === null || n === void 0 ? void 0 : n.type) {
        case "appointment":
            return `Nouveau rendez-vous le ${(_b = (_a = n === null || n === void 0 ? void 0 : n.data) === null || _a === void 0 ? void 0 : _a.date) !== null && _b !== void 0 ? _b : ""} à ${(_d = (_c = n === null || n === void 0 ? void 0 : n.data) === null || _c === void 0 ? void 0 : _c.time) !== null && _d !== void 0 ? _d : ""}`;
        case "appointment_request":
            return `Nouvelle demande de rendez-vous le ${(_f = (_e = n === null || n === void 0 ? void 0 : n.data) === null || _e === void 0 ? void 0 : _e.date) !== null && _f !== void 0 ? _f : ""} à ${(_h = (_g = n === null || n === void 0 ? void 0 : n.data) === null || _g === void 0 ? void 0 : _g.time) !== null && _h !== void 0 ? _h : ""}`;
        case "appointment_confirmed":
            return `Rendez-vous confirmé le ${(_k = (_j = n === null || n === void 0 ? void 0 : n.data) === null || _j === void 0 ? void 0 : _j.date) !== null && _k !== void 0 ? _k : ""} à ${(_m = (_l = n === null || n === void 0 ? void 0 : n.data) === null || _l === void 0 ? void 0 : _l.time) !== null && _m !== void 0 ? _m : ""}`;
        case "appointment_cancelled":
            return `Rendez-vous annulé le ${(_p = (_o = n === null || n === void 0 ? void 0 : n.data) === null || _o === void 0 ? void 0 : _o.date) !== null && _p !== void 0 ? _p : ""} à ${(_r = (_q = n === null || n === void 0 ? void 0 : n.data) === null || _q === void 0 ? void 0 : _q.time) !== null && _r !== void 0 ? _r : ""}`;
        case "appointment_modified":
            return `Rendez-vous modifié le ${(_t = (_s = n === null || n === void 0 ? void 0 : n.data) === null || _s === void 0 ? void 0 : _s.date) !== null && _t !== void 0 ? _t : ""} à ${(_v = (_u = n === null || n === void 0 ? void 0 : n.data) === null || _u === void 0 ? void 0 : _u.time) !== null && _v !== void 0 ? _v : ""}`;
        case "message":
            // Détecter si c'est un admin qui envoie
            const isFromAdmin = ((_w = n === null || n === void 0 ? void 0 : n.data) === null || _w === void 0 ? void 0 : _w.fromType) === "admin" || ((_x = n === null || n === void 0 ? void 0 : n.data) === null || _x === void 0 ? void 0 : _x.fromUserType) === "admin";
            if (isFromAdmin) {
                return `Message de l'administration Health-e`;
            }
            return `Nouveau message de ${((_y = n === null || n === void 0 ? void 0 : n.data) === null || _y === void 0 ? void 0 : _y.fromName) || "un patient"}`;
        case "withdrawal_request":
            return (n === null || n === void 0 ? void 0 : n.title) || "Demande de retrait";
        case "withdrawal_status_update":
            return (n === null || n === void 0 ? void 0 : n.title) || "Mise à jour de votre retrait";
        case "withdrawal":
            return "Mise à jour de votre retrait";
        case "professional_approval":
            return (n === null || n === void 0 ? void 0 : n.title) || "Mise à jour de votre compte professionnel";
        default:
            return (n === null || n === void 0 ? void 0 : n.title) || "Notification Health-e";
    }
}
function buildHtml(n, userData) {
    var _a, _b, _c;
    let title = escapeHtml((n === null || n === void 0 ? void 0 : n.title) || "Notification");
    const body = escapeHtml((n === null || n === void 0 ? void 0 : n.message) || "");
    // Adapter le titre selon le type d'expéditeur
    if ((n === null || n === void 0 ? void 0 : n.type) === "message") {
        const isFromAdmin = ((_a = n === null || n === void 0 ? void 0 : n.data) === null || _a === void 0 ? void 0 : _a.fromType) === "admin" || ((_b = n === null || n === void 0 ? void 0 : n.data) === null || _b === void 0 ? void 0 : _b.fromUserType) === "admin";
        if (isFromAdmin) {
            title = "Message de l'administration Health-e";
        }
    }
    else if ((n === null || n === void 0 ? void 0 : n.type) === "withdrawal_request" ||
        (n === null || n === void 0 ? void 0 : n.type) === "withdrawal_status_update") {
        // Utiliser le titre de la notification pour les retraits
        title = escapeHtml((n === null || n === void 0 ? void 0 : n.title) || "Notification de retrait");
    }
    else if ((n === null || n === void 0 ? void 0 : n.type) === "appointment_request" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_confirmed" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_cancelled" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_modified") {
        // Utiliser le titre de la notification pour les rendez-vous
        title = escapeHtml((n === null || n === void 0 ? void 0 : n.title) || "Notification de rendez-vous");
    }
    const cta = ((_c = n === null || n === void 0 ? void 0 : n.data) === null || _c === void 0 ? void 0 : _c.redirectPath)
        ? `<p><a href="https://health-e.sn${n.data.redirectPath}" style="background-color:#0d9488;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Ouvrir</a></p>`
        : "";
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <h2 style="color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:10px;">${title}</h2>
    <p style="font-size:16px;line-height:1.6;color:#333;">${body}</p>
    ${cta}
    <p style="color:#64748b;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">Health-e - Plateforme de télémédecine</p>
  </div>`;
}
function buildText(n) {
    var _a, _b;
    let title = (n === null || n === void 0 ? void 0 : n.title) || "Notification";
    // Adapter le titre selon le type d'expéditeur
    if ((n === null || n === void 0 ? void 0 : n.type) === "message") {
        const isFromAdmin = ((_a = n === null || n === void 0 ? void 0 : n.data) === null || _a === void 0 ? void 0 : _a.fromType) === "admin" || ((_b = n === null || n === void 0 ? void 0 : n.data) === null || _b === void 0 ? void 0 : _b.fromUserType) === "admin";
        if (isFromAdmin) {
            title = "Message de l'administration Health-e";
        }
    }
    else if ((n === null || n === void 0 ? void 0 : n.type) === "withdrawal_request" ||
        (n === null || n === void 0 ? void 0 : n.type) === "withdrawal_status_update") {
        // Utiliser le titre de la notification pour les retraits
        title = (n === null || n === void 0 ? void 0 : n.title) || "Notification de retrait";
    }
    else if ((n === null || n === void 0 ? void 0 : n.type) === "appointment_request" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_confirmed" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_cancelled" || (n === null || n === void 0 ? void 0 : n.type) === "appointment_modified") {
        // Utiliser le titre de la notification pour les rendez-vous
        title = (n === null || n === void 0 ? void 0 : n.title) || "Notification de rendez-vous";
    }
    return `${title}\n\n${(n === null || n === void 0 ? void 0 : n.message) || ""}`;
}
function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
//# sourceMappingURL=notificationEmailBridge.js.map