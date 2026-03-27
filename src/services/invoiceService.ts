import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceData {
  invoiceNumber: string;
  bookingId: string;
  date: string;          // "YYYY-MM-DD"
  startTime: string;
  endTime?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  professionalName: string;
  professionalSpecialty?: string;
  consultationType: "video" | "audio" | "chat";
  amount: number;        // en XOF
  isPaid: boolean;
  paymentMethod?: "mobile" | "card";
}

const BRAND_COLOR: [number, number, number] = [37, 99, 235];   // health-e blue
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const DARK_GRAY: [number, number, number] = [71, 85, 105];
const TEXT_BLACK: [number, number, number] = [15, 23, 42];

function formatAmount(xof: number): string {
  return new Intl.NumberFormat("fr-SN", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(xof);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-SN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Génère une facture PDF pour une consultation Health-e.
 * @returns Le blob PDF
 */
export function generateInvoicePDF(data: InvoiceData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // ── En-tête ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Health-e", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Plateforme de téléconsultation", margin, 26);
  doc.text("health-e.sn  ·  Dakar, Sénégal", margin, 32);

  // Numéro de facture (coin droit)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`FACTURE`, pageW - margin, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`#${data.invoiceNumber}`, pageW - margin, 26, { align: "right" });
  doc.text(`Émise le ${new Date().toLocaleDateString("fr-SN")}`, pageW - margin, 32, { align: "right" });

  y = 50;

  // ── Statut paiement ──────────────────────────────────────────────────────────
  const statusColor: [number, number, number] = data.isPaid ? [22, 163, 74] : [234, 179, 8];
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, y, 40, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.isPaid ? "PAYÉE" : "EN ATTENTE", margin + 20, y + 5.5, { align: "center" });

  y += 16;

  // ── Informations patient & professionnel ─────────────────────────────────────
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, y, (pageW - 2 * margin) / 2 - 5, 40, "F");
  doc.rect(pageW / 2 + 2, y, (pageW - 2 * margin) / 2 - 5, 40, "F");

  const col1x = margin + 5;
  const col2x = pageW / 2 + 7;

  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT", col1x, y + 7);
  doc.text("PROFESSIONNEL", col2x, y + 7);

  doc.setTextColor(...TEXT_BLACK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, col1x, y + 15);
  doc.text(data.professionalName, col2x, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...DARK_GRAY);
  if (data.patientEmail) doc.text(data.patientEmail, col1x, y + 22);
  if (data.patientPhone) doc.text(data.patientPhone, col1x, y + 28);
  if (data.professionalSpecialty) doc.text(data.professionalSpecialty, col2x, y + 22);

  y += 50;

  // ── Détail de la consultation ────────────────────────────────────────────────
  const consultationLabel =
    data.consultationType === "video"
      ? "Téléconsultation vidéo"
      : data.consultationType === "audio"
      ? "Téléconsultation audio"
      : "Consultation par messagerie";

  const timeRange = data.endTime
    ? `${data.startTime} – ${data.endTime}`
    : data.startTime;

  autoTable(doc, {
    startY: y,
    head: [["Description", "Date", "Horaire", "Montant"]],
    body: [
      [
        consultationLabel,
        formatDate(data.date),
        timeRange,
        formatAmount(data.amount),
      ],
    ],
    foot: [["", "", "Total TTC", formatAmount(data.amount)]],
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: TEXT_BLACK },
    footStyles: {
      fillColor: LIGHT_GRAY,
      textColor: TEXT_BLACK,
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore — jspdf-autotable adds lastAutoTable to doc
  y = doc.lastAutoTable.finalY + 10;

  // ── Informations de paiement ─────────────────────────────────────────────────
  if (data.isPaid) {
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y, pageW - 2 * margin, 16, "F");
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const methodLabel =
      data.paymentMethod === "card"
        ? "Carte bancaire"
        : data.paymentMethod === "mobile"
        ? "Mobile Money (Orange / Wave / Free)"
        : "—";
    doc.text(`✓ Paiement reçu via ${methodLabel}`, margin + 5, y + 10);
  }

  y += 25;

  // ── Réf. réservation ─────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_GRAY);
  doc.text(`Référence de réservation : ${data.bookingId}`, margin, y);

  // ── Pied de page ─────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, pageH - 16, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(
    "Health-e · Téléconsultation en santé mentale et sexuelle · health-e.sn",
    pageW / 2,
    pageH - 6,
    { align: "center" }
  );

  return doc.output("blob");
}

/**
 * Déclenche le téléchargement de la facture dans le navigateur.
 */
export function downloadInvoice(data: InvoiceData): void {
  const blob = generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facture-health-e-${data.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Construit un InvoiceData à partir d'un objet booking Firestore.
 */
export function buildInvoiceFromBooking(booking: Record<string, any>): InvoiceData {
  const now = new Date();
  const invoiceNumber = `HE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${booking.id?.slice(-6).toUpperCase() ?? "000000"}`;

  return {
    invoiceNumber,
    bookingId: booking.id ?? "",
    date: booking.date ?? "",
    startTime: booking.startTime ?? "",
    endTime: booking.endTime,
    patientName: booking.patientName ?? "",
    patientEmail: booking.patientEmail,
    patientPhone: booking.patientPhone,
    professionalName: booking.professionalName ?? "",
    professionalSpecialty: booking.professionalSpecialty ?? booking.specialty,
    consultationType: booking.type ?? "video",
    amount: booking.price ?? booking.amount ?? 0,
    isPaid: booking.status === "confirmed" || booking.isPaid === true,
    paymentMethod: booking.paymentMethod,
  };
}
