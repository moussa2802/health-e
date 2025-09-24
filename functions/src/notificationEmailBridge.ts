import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
initializeApp();

// Force deployment

const REGION = "us-central1"; // laisse comme l'extension

export const onNotificationCreated = onDocumentCreated(
  { document: "notifications/{id}", region: REGION },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const n = snap.data() as any;

    // Anti doublon / ignorés
    if (n?.emailed === true || n?.status === "deleted") return;

    // On cible les pros et les admins
    if (n?.userType && !["professional", "admin"].includes(n.userType)) return;
    if (!n?.userId) return;

    const db = getFirestore();

    // Récupérer profil utilisateur + préférences
    let userData: any = {};
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
    } else {
      // Pour les professionnels, récupérer depuis la collection professionals
      const proRef = db.collection("professionals").doc(n.userId);
      const proSnap = await proRef.get();
      if (!proSnap.exists) {
        logger.warn("Pro doc not found", n.userId);
        return;
      }
      userData = proSnap.data() || {};
      emailEnabled = userData?.settings?.notifications?.email?.enabled ?? true;
      to = userData?.email || userData?.contactEmail;
      userName = userData?.name || "Professionnel Health-e";
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
      from: "Health-e <no-reply@health-e.sn>", // écrase le default FROM si besoin
      replyTo: "support@health-e.sn",
      headers: {
        "X-Notification-ID": snap.id,
        "List-Unsubscribe": "<mailto:support@health-e.sn?subject=unsubscribe>",
      },
      message: { subject, html, text },
      createdAt: FieldValue.serverTimestamp(),
    });

    await snap.ref.update({
      emailed: true,
      emailedAt: FieldValue.serverTimestamp(),
      mailDocId: mailDoc.id,
    });
  }
);

// === helpers très simples (tu peux les raffiner plus tard) ===
function buildSubject(n: any) {
  switch (n?.type) {
    case "appointment":
      return `Nouveau rendez-vous le ${n?.data?.date ?? ""} à ${
        n?.data?.time ?? ""
      }`;
    case "appointment_request":
      return `Nouvelle demande de rendez-vous le ${n?.data?.date ?? ""} à ${
        n?.data?.time ?? ""
      }`;
    case "appointment_confirmed":
      return `Rendez-vous confirmé le ${n?.data?.date ?? ""} à ${
        n?.data?.time ?? ""
      }`;
    case "appointment_reminder_pro":
      return `Rappel – RDV ${n?.data?.patientName ?? "patient"} (${
        n?.data?.date ?? ""
      } ${n?.data?.time ?? ""})`;
    case "appointment_cancelled":
      return `Rendez-vous annulé le ${n?.data?.date ?? ""} à ${
        n?.data?.time ?? ""
      }`;
    case "appointment_modified":
      return `Rendez-vous modifié le ${n?.data?.date ?? ""} à ${
        n?.data?.time ?? ""
      }`;
    case "message":
      // Détecter si c'est un admin qui envoie
      const isFromAdmin =
        n?.data?.fromType === "admin" || n?.data?.fromUserType === "admin";
      if (isFromAdmin) {
        return `Message de l'administration Health-e`;
      }
      return `Nouveau message de ${n?.data?.fromName || "un patient"}`;
    case "withdrawal_request":
      return n?.title || "Demande de retrait";
    case "withdrawal_status_update":
      return n?.title || "Mise à jour de votre retrait";
    case "withdrawal":
      return "Mise à jour de votre retrait";
    case "professional_approval":
      return n?.title || "Mise à jour de votre compte professionnel";
    default:
      return n?.title || "Notification Health-e";
  }
}
function buildHtml(n: any, userData: any) {
  let title = escapeHtml(n?.title || "Notification");
  const body = escapeHtml(n?.message || "");

  // Adapter le titre selon le type d'expéditeur
  if (n?.type === "message") {
    const isFromAdmin =
      n?.data?.fromType === "admin" || n?.data?.fromUserType === "admin";
    if (isFromAdmin) {
      title = "Message de l'administration Health-e";
    }
  } else if (
    n?.type === "withdrawal_request" ||
    n?.type === "withdrawal_status_update"
  ) {
    // Utiliser le titre de la notification pour les retraits
    title = escapeHtml(n?.title || "Notification de retrait");
  } else if (
    n?.type === "appointment_request" ||
    n?.type === "appointment_confirmed" ||
    n?.type === "appointment_reminder_pro" ||
    n?.type === "appointment_cancelled" ||
    n?.type === "appointment_modified"
  ) {
    // Utiliser le titre de la notification pour les rendez-vous
    title = escapeHtml(n?.title || "Notification de rendez-vous");
  }

  const cta = n?.data?.redirectPath
    ? `<p><a href="https://health-e.sn${n.data.redirectPath}" style="background-color:#0d9488;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Ouvrir</a></p>`
    : "";

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <h2 style="color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:10px;">${title}</h2>
    <p style="font-size:16px;line-height:1.6;color:#333;">${body}</p>
    ${cta}
    <p style="color:#64748b;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">Health-e - Plateforme de télémédecine</p>
  </div>`;
}
function buildText(n: any) {
  let title = n?.title || "Notification";

  // Adapter le titre selon le type d'expéditeur
  if (n?.type === "message") {
    const isFromAdmin =
      n?.data?.fromType === "admin" || n?.data?.fromUserType === "admin";
    if (isFromAdmin) {
      title = "Message de l'administration Health-e";
    }
  } else if (
    n?.type === "withdrawal_request" ||
    n?.type === "withdrawal_status_update"
  ) {
    // Utiliser le titre de la notification pour les retraits
    title = n?.title || "Notification de retrait";
  } else if (
    n?.type === "appointment_request" ||
    n?.type === "appointment_confirmed" ||
    n?.type === "appointment_reminder_pro" ||
    n?.type === "appointment_cancelled" ||
    n?.type === "appointment_modified"
  ) {
    // Utiliser le titre de la notification pour les rendez-vous
    title = n?.title || "Notification de rendez-vous";
  }

  return `${title}\n\n${n?.message || ""}`;
}
function escapeHtml(s: string) {
  return String(s).replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}
