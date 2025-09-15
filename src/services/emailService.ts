import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Types pour les emails
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  toName?: string;
  template?: string;
  message: {
    subject: string;
    html: string;
    text?: string;
  };
  data?: Record<string, any>; // Données pour les templates Handlebars
}

// Templates d'email prédéfinis
const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  appointment_confirmed: {
    id: "appointment_confirmed",
    name: "Rendez-vous confirmé",
    subject: "Votre rendez-vous a été confirmé - Health-e",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Rendez-vous confirmé</h2>
        <p>Bonjour {{patientName}},</p>
        <p>Votre rendez-vous avec <strong>{{professionalName}}</strong> a été confirmé.</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails du rendez-vous :</h3>
          <p><strong>Date :</strong> {{appointmentDate}}</p>
          <p><strong>Heure :</strong> {{appointmentTime}}</p>
          <p><strong>Type :</strong> {{appointmentType}}</p>
          <p><strong>Prix :</strong> {{appointmentPrice}} FCFA</p>
        </div>
        <p>Vous recevrez un lien de consultation 15 minutes avant le rendez-vous.</p>
        <p>Merci de votre confiance,<br>L'équipe Health-e</p>
      </div>
    `,
    text: "Votre rendez-vous avec {{professionalName}} a été confirmé pour le {{appointmentDate}} à {{appointmentTime}}.",
  },
  appointment_reminder: {
    id: "appointment_reminder",
    name: "Rappel de rendez-vous",
    subject: "Rappel : Votre rendez-vous dans 24h - Health-e",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Rappel de rendez-vous</h2>
        <p>Bonjour {{patientName}},</p>
        <p>Ceci est un rappel que vous avez un rendez-vous demain avec <strong>{{professionalName}}</strong>.</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails du rendez-vous :</h3>
          <p><strong>Date :</strong> {{appointmentDate}}</p>
          <p><strong>Heure :</strong> {{appointmentTime}}</p>
          <p><strong>Type :</strong> {{appointmentType}}</p>
        </div>
        <p>Le lien de consultation vous sera envoyé 15 minutes avant le rendez-vous.</p>
        <p>Merci,<br>L'équipe Health-e</p>
      </div>
    `,
    text: "Rappel : Vous avez un rendez-vous demain avec {{professionalName}} le {{appointmentDate}} à {{appointmentTime}}.",
  },
  new_message: {
    id: "new_message",
    name: "Nouveau message",
    subject: "Vous avez reçu un nouveau message - Health-e",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Nouveau message</h2>
        <p>Bonjour {{recipientName}},</p>
        <p>Vous avez reçu un nouveau message de <strong>{{senderName}}</strong>.</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-style: italic;">"{{messagePreview}}"</p>
        </div>
        <p><a href="https://health-e.sn/messages" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le message</a></p>
        <p>Merci,<br>L'équipe Health-e</p>
      </div>
    `,
    text: "Vous avez reçu un nouveau message de {{senderName}} : {{messagePreview}}",
  },
  professional_registration: {
    id: "professional_registration",
    name: "Inscription professionnel",
    subject: "Bienvenue sur Health-e - Votre compte est en cours de validation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Bienvenue sur Health-e</h2>
        <p>Bonjour {{professionalName}},</p>
        <p>Merci de vous être inscrit sur Health-e en tant que professionnel de santé.</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Votre compte :</h3>
          <p><strong>Spécialité :</strong> {{specialty}}</p>
          <p><strong>Catégorie :</strong> {{category}}</p>
          <p><strong>Statut :</strong> En attente de validation</p>
        </div>
        <p>Notre équipe va examiner votre profil et vous contactera dans les 24-48h pour finaliser votre inscription.</p>
        <p>En attendant, vous pouvez compléter votre profil sur <a href="https://health-e.sn/professional/settings">votre espace professionnel</a>.</p>
        <p>Merci de votre confiance,<br>L'équipe Health-e</p>
      </div>
    `,
    text: "Bienvenue sur Health-e ! Votre compte professionnel est en cours de validation. Notre équipe vous contactera dans les 24-48h.",
  },
  support_ticket: {
    id: "support_ticket",
    name: "Ticket de support",
    subject: "Votre ticket de support a été créé - Health-e",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Ticket de support créé</h2>
        <p>Bonjour {{userName}},</p>
        <p>Votre ticket de support a été créé avec succès.</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails du ticket :</h3>
          <p><strong>ID :</strong> {{ticketId}}</p>
          <p><strong>Sujet :</strong> {{ticketSubject}}</p>
          <p><strong>Priorité :</strong> {{ticketPriority}}</p>
          <p><strong>Catégorie :</strong> {{ticketCategory}}</p>
        </div>
        <p>Notre équipe de support vous répondra dans les plus brefs délais.</p>
        <p>Merci,<br>L'équipe Health-e</p>
      </div>
    `,
    text: "Votre ticket de support {{ticketId}} a été créé. Sujet : {{ticketSubject}}",
  },
};

// Fonction pour remplacer les variables dans les templates
function replaceTemplateVariables(
  template: string,
  data: Record<string, any>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value || ""));
  }
  return result;
}

// Envoyer un email via l'extension Trigger Email
export async function sendEmail(emailData: EmailData): Promise<string> {
  try {
    console.log("📧 Sending email to:", emailData.to);

    // Ensure Firestore is ready
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Si un template est spécifié, utiliser le template
    let finalMessage = emailData.message;
    if (emailData.template && EMAIL_TEMPLATES[emailData.template]) {
      const template = EMAIL_TEMPLATES[emailData.template];
      const templateData = { ...emailData.data, toName: emailData.toName };

      finalMessage = {
        subject: replaceTemplateVariables(template.subject, templateData),
        html: replaceTemplateVariables(template.html, templateData),
        text: replaceTemplateVariables(template.text, templateData),
      };
    }

    // Créer le document dans la collection 'mail' pour déclencher l'extension
    const mailRef = collection(db, "mail");
    const mailData = {
      to: emailData.to,
      toName: emailData.toName || emailData.to,
      message: finalMessage,
      createdAt: serverTimestamp(),
      status: "pending",
    };

    const docRef = await addDoc(mailRef, mailData);
    console.log("✅ Email queued successfully:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

// Fonctions utilitaires pour les types d'emails courants

// Envoyer une notification de rendez-vous confirmé
export async function sendAppointmentConfirmationEmail(
  patientEmail: string,
  patientName: string,
  professionalName: string,
  appointmentDate: string,
  appointmentTime: string,
  appointmentType: string,
  appointmentPrice: number
): Promise<string> {
  return sendEmail({
    to: patientEmail,
    toName: patientName,
    template: "appointment_confirmed",
    data: {
      patientName,
      professionalName,
      appointmentDate,
      appointmentTime,
      appointmentType,
      appointmentPrice,
    },
    message: {
      subject: "", // Sera remplacé par le template
      html: "", // Sera remplacé par le template
    },
  });
}

// Envoyer un rappel de rendez-vous
export async function sendAppointmentReminderEmail(
  patientEmail: string,
  patientName: string,
  professionalName: string,
  appointmentDate: string,
  appointmentTime: string,
  appointmentType: string
): Promise<string> {
  return sendEmail({
    to: patientEmail,
    toName: patientName,
    template: "appointment_reminder",
    data: {
      patientName,
      professionalName,
      appointmentDate,
      appointmentTime,
      appointmentType,
    },
    message: {
      subject: "", // Sera remplacé par le template
      html: "", // Sera remplacé par le template
    },
  });
}

// Envoyer une notification de nouveau message
export async function sendNewMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string
): Promise<string> {
  return sendEmail({
    to: recipientEmail,
    toName: recipientName,
    template: "new_message",
    data: {
      recipientName,
      senderName,
      messagePreview,
    },
    message: {
      subject: "", // Sera remplacé par le template
      html: "", // Sera remplacé par le template
    },
  });
}

// Envoyer une notification d'inscription professionnel
export async function sendProfessionalRegistrationEmail(
  professionalEmail: string,
  professionalName: string,
  specialty: string,
  category: string
): Promise<string> {
  return sendEmail({
    to: professionalEmail,
    toName: professionalName,
    template: "professional_registration",
    data: {
      professionalName,
      specialty,
      category,
    },
    message: {
      subject: "", // Sera remplacé par le template
      html: "", // Sera remplacé par le template
    },
  });
}

// Envoyer une notification de ticket de support
export async function sendSupportTicketEmail(
  userEmail: string,
  userName: string,
  ticketId: string,
  ticketSubject: string,
  ticketPriority: string,
  ticketCategory: string
): Promise<string> {
  return sendEmail({
    to: userEmail,
    toName: userName,
    template: "support_ticket",
    data: {
      userName,
      ticketId,
      ticketSubject,
      ticketPriority,
      ticketCategory,
    },
    message: {
      subject: "", // Sera remplacé par le template
      html: "", // Sera remplacé par le template
    },
  });
}

// Envoyer un email personnalisé
export async function sendCustomEmail(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<string> {
  return sendEmail({
    to,
    toName,
    message: {
      subject,
      html: htmlContent,
      text: textContent,
    },
  });
}
