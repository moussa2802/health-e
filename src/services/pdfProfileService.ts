import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ProfilePDFData {
  userName: string;
  profileType: 'mental_health' | 'sexual_health';
  profileLabel: string;
  drLoAnalysis: string | null;
  completedTests: Array<{
    name: string;
    icon: string;
    resultLabel: string;
    severity: string;
    score: number;
    maxScore: number;
  }>;
  bonusTests?: Array<{
    name: string;
    icon: string;
    resultLabel: string;
    severity: string;
  }>;
  completedCount: number;
  totalCount: number;
  bonusCount?: number;
  bonusTotalCount?: number;
  compatibilityCode?: string | null;
  evaluationDate: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip emojis — jsPDF can't render them */
function strip(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/\u00B7/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  positive: [16, 185, 129],
  none: [16, 185, 129],
  minimal: [16, 185, 129],
  mild: [245, 158, 11],
  moderate: [234, 88, 12],
  severe: [220, 38, 38],
  alert: [220, 38, 38],
};

const SEVERITY_BG: Record<string, [number, number, number]> = {
  positive: [220, 252, 231],
  none: [220, 252, 231],
  minimal: [220, 252, 231],
  mild: [254, 249, 195],
  moderate: [255, 237, 213],
  severe: [254, 226, 226],
  alert: [254, 226, 226],
};

// ── Colors ──────────────────────────────────────────────────────────────────

function getThemeColors(type: 'mental_health' | 'sexual_health') {
  if (type === 'mental_health') {
    return {
      primary: [30, 64, 175] as [number, number, number],       // #1E40AF
      secondary: [8, 145, 178] as [number, number, number],     // #0891B2
      headerBg: [10, 35, 66] as [number, number, number],       // #0A2342
      gradient2: [30, 64, 175] as [number, number, number],
      gradient3: [8, 145, 178] as [number, number, number],
    };
  }
  return {
    primary: [124, 58, 237] as [number, number, number],       // #7C3AED
    secondary: [190, 24, 93] as [number, number, number],      // #BE185D
    headerBg: [59, 7, 100] as [number, number, number],        // #3B0764
    gradient2: [124, 58, 237] as [number, number, number],
    gradient3: [190, 24, 93] as [number, number, number],
  };
}

// ── PDF Drawing Helpers ─────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BOTTOM_MARGIN = 25;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - BOTTOM_MARGIN) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  r: number,
  fill: [number, number, number],
  stroke?: [number, number, number],
) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, 'FD');
  } else {
    doc.roundedRect(x, y, w, h, r, r, 'F');
  }
}

// ── Main Generator ──────────────────────────────────────────────────────────

export async function generateProfilePDF(data: ProfilePDFData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const theme = getThemeColors(data.profileType);
  const isMental = data.profileType === 'mental_health';

  // ── PDF Metadata ──
  doc.setProperties({
    title: `Profil ${data.profileLabel} - ${data.userName}`,
    subject: `Evaluation Health-e generee le ${data.evaluationDate}`,
    author: 'Health-e - health-e.sn',
    creator: 'Health-e v2.0',
  });

  let y = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — Header
  // ═══════════════════════════════════════════════════════════════════════════

  const headerH = 48;
  // Background
  drawRoundedRect(doc, MARGIN, MARGIN, CONTENT_W, headerH, 4, theme.headerBg);

  // Gradient overlay (simulated with a lighter rectangle)
  doc.setFillColor(theme.gradient2[0], theme.gradient2[1], theme.gradient2[2]);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.roundedRect(MARGIN + CONTENT_W * 0.3, MARGIN, CONTENT_W * 0.7, headerH, 4, 4, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // "HEALTH-E" title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('HEALTH-E', MARGIN + 10, MARGIN + 14);

  // Profile type badge
  const badgeText = isMental ? 'PROFIL PSYCHOLOGIQUE' : 'VIE INTIME';
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'bold');
  const badgeW = doc.getTextWidth(badgeText) + 10;
  const badgeX = MARGIN + CONTENT_W - badgeW - 8;
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.2 }));
  doc.roundedRect(badgeX, MARGIN + 8, badgeW, 8, 4, 4, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, badgeX + 5, MARGIN + 13.5);

  // Avatar circle with initials
  const avatarX = MARGIN + 14;
  const avatarY = MARGIN + 32;
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.25 }));
  doc.circle(avatarX, avatarY, 8, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  const initials = data.userName.charAt(0).toUpperCase();
  doc.text(initials, avatarX - doc.getTextWidth(initials) / 2, avatarY + 3.5);

  // User name
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(strip(data.userName), MARGIN + 28, MARGIN + 30);

  // Date
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(200, 210, 225);
  doc.text(`Evalue le ${data.evaluationDate}`, MARGIN + 28, MARGIN + 37);

  y = MARGIN + headerH + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Analyse Dr Lo
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.drLoAnalysis) {
    y = ensureSpace(doc, y, 30);

    // Section title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.text('ANALYSE DR LO', MARGIN, y);

    // IA badge
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(MARGIN + CONTENT_W - 14, y - 4, 14, 6, 3, 3, 'F');
    doc.setFontSize(6);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('IA', MARGIN + CONTENT_W - 10, y - 0.3);

    y += 6;

    // Parse raw text (with emojis) to detect structure, then strip in parser
    const parsed = parseDrLoText(data.drLoAnalysis);

    // Draw analysis content
    const boxX = MARGIN;
    const boxStartY = y;
    y += 4;

    for (const block of parsed) {
      y = ensureSpace(doc, y, 8);

      if (block.type === 'heading') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(10, 35, 66);
        const headLines = doc.splitTextToSize(block.content, CONTENT_W - 10);
        for (const hl of headLines) {
          y = ensureSpace(doc, y, 6);
          doc.text(hl, boxX + 5, y);
          y += 5;
        }
        y += 1;
      } else if (block.type === 'bullet') {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        const bulletLines = doc.splitTextToSize(block.content, CONTENT_W - 18);
        for (let i = 0; i < bulletLines.length; i++) {
          y = ensureSpace(doc, y, 5);
          if (i === 0) {
            doc.text('-', boxX + 7, y);
          }
          doc.text(bulletLines[i], boxX + 12, y);
          y += 4.5;
        }
      } else if (block.type === 'signature') {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.text(block.content, boxX + 5, y);
        y += 6;
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        const paraLines = doc.splitTextToSize(block.content, CONTENT_W - 10);
        for (const pl of paraLines) {
          y = ensureSpace(doc, y, 5);
          doc.text(pl, boxX + 5, y);
          y += 4.5;
        }
        y += 1.5;
      }
    }

    y += 4;

    // Separator
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — Resultats des evaluations
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(doc, y, 20);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 35, 66);
  doc.text('MES EVALUATIONS', MARGIN, y);

  doc.setFontSize(11);
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  const countText = `${data.completedCount}/${data.totalCount}`;
  doc.text(countText, MARGIN + CONTENT_W - doc.getTextWidth(countText), y);

  y += 4;

  // Progress bar
  const barW = CONTENT_W;
  const barH = 2.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN, y, barW, barH, 1.2, 1.2, 'F');
  const progressW = data.totalCount > 0 ? (data.completedCount / data.totalCount) * barW : 0;
  if (progressW > 0) {
    doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.roundedRect(MARGIN, y, Math.max(progressW, 3), barH, 1.2, 1.2, 'F');
  }
  y += 8;

  // Test results list
  for (const test of data.completedTests) {
    y = ensureSpace(doc, y, 10);

    const sevColor = SEVERITY_COLORS[test.severity] || SEVERITY_COLORS.none;
    const sevBg = SEVERITY_BG[test.severity] || SEVERITY_BG.none;

    // Row background
    drawRoundedRect(doc, MARGIN, y - 4, CONTENT_W, 9, 2, [248, 250, 255] as [number, number, number]);

    // Test name
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 35, 66);
    doc.text(strip(test.name), MARGIN + 4, y);

    // Severity pill
    const label = strip(test.resultLabel);
    doc.setFontSize(7.5);
    const labelW = doc.getTextWidth(label) + 8;
    const pillX = MARGIN + CONTENT_W - labelW - 4;

    drawRoundedRect(doc, pillX, y - 3.5, labelW, 6, 3, sevBg);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
    doc.text(label, pillX + 4, y + 0.5);

    y += 10;
  }

  // ── Bonus tests ──
  if (data.bonusTests && data.bonusTests.length > 0) {
    y += 4;
    y = ensureSpace(doc, y, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('TESTS BONUS', MARGIN, y);
    if (data.bonusCount !== undefined && data.bonusTotalCount !== undefined) {
      const bonusCountTxt = `${data.bonusCount}/${data.bonusTotalCount}`;
      doc.text(bonusCountTxt, MARGIN + CONTENT_W - doc.getTextWidth(bonusCountTxt), y);
    }
    y += 6;

    for (const test of data.bonusTests) {
      y = ensureSpace(doc, y, 10);
      const sevColor = SEVERITY_COLORS[test.severity] || SEVERITY_COLORS.none;
      const sevBg = SEVERITY_BG[test.severity] || SEVERITY_BG.none;

      drawRoundedRect(doc, MARGIN, y - 4, CONTENT_W, 9, 2, [248, 250, 255] as [number, number, number]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(10, 35, 66);
      doc.text(strip(test.name), MARGIN + 4, y);

      const label = strip(test.resultLabel);
      doc.setFontSize(7.5);
      const labelW = doc.getTextWidth(label) + 8;
      const pillX = MARGIN + CONTENT_W - labelW - 4;
      drawRoundedRect(doc, pillX, y - 3.5, labelW, 6, 3, sevBg);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
      doc.text(label, pillX + 4, y + 0.5);

      y += 10;
    }
  }

  // Separator
  y += 2;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Code de compatibilite
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.compatibilityCode) {
    y = ensureSpace(doc, y, 30);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(10, 35, 66);
    doc.text('CODE DE COMPATIBILITE', MARGIN, y);
    y += 6;

    // Code box
    const codeBoxH = 22;
    drawRoundedRect(
      doc, MARGIN, y, CONTENT_W, codeBoxH, 3,
      [248, 250, 255] as [number, number, number],
      [theme.primary[0], theme.primary[1], theme.primary[2]],
    );

    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('TON CODE UNIQUE', MARGIN + 8, y + 7);

    doc.setFontSize(14);
    doc.setFont('Courier', 'bold');
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.text(data.compatibilityCode, MARGIN + 8, y + 15);

    y += codeBoxH + 4;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Partage ce code pour comparer vos profils de compatibilite', MARGIN, y);
    y += 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — Footer
  // ═══════════════════════════════════════════════════════════════════════════

  y = ensureSpace(doc, y, 20);

  // Website
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.text('health-e.sn', PAGE_W / 2, y, { align: 'center' });
  y += 6;

  // Disclaimer
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Ces evaluations ne remplacent pas une consultation avec un professionnel de sante.',
    PAGE_W / 2, y, { align: 'center' },
  );
  y += 4;

  const now = new Date();
  const genDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const genTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  doc.text(
    `© ${now.getFullYear()} Health-e — Genere le ${genDate} a ${genTime}`,
    PAGE_W / 2, y, { align: 'center' },
  );

  // ── Save ──
  const safeName = data.userName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const safeLabel = data.profileLabel.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const dateStr = now.toISOString().slice(0, 10);
  doc.save(`Health-e_${safeLabel}_${safeName}_${dateStr}.pdf`);
}

// ── Dr Lo text parser ───────────────────────────────────────────────────────

interface TextBlock {
  type: 'heading' | 'bullet' | 'paragraph' | 'signature';
  content: string;
}

function parseDrLoText(rawText: string): TextBlock[] {
  // Work on raw text WITH emojis to detect structure, then strip emojis from output
  const lines = rawText.split('\n').filter(l => l.trim());
  const parsed: TextBlock[] = [];

  // Common Dr Lô heading emoji patterns
  const HEADING_EMOJIS = /^[\u{1F44B}\u{1F441}\u{1F4AA}\u{26A0}\u{1F4A1}\u{1F31F}\u{2728}\u{1F91D}\u{1F3AF}\u{1F49A}\u{1F496}\u{1F4AC}\u{1F9E0}\u{2764}\u{1F525}\u{1F6E1}\u{1F310}\u{1F331}\u{270C}\u{1F64F}\u{1F490}\u{1F91E}\u{1F4AB}\u{1F48E}\u{1F4DD}\u{1FA7A}\u{1F491}\u{1F46B}\u{1F468}][\u{FE0F}\u{200D}]?\s*/u;

  for (const line of lines) {
    const trimmed = line.trim();

    // Signature line "— Dr Lo" / "— Dr Lô 🩺"
    if (/[-—]\s*Dr\s*L[oô]/i.test(trimmed)) {
      parsed.push({ type: 'signature', content: strip(trimmed) });
      continue;
    }

    // Emoji-prefixed headings (💪 Tes points forts, ⚠️ Ce qu'on doit surveiller, etc.)
    if (HEADING_EMOJIS.test(trimmed) && trimmed.length < 80) {
      parsed.push({ type: 'heading', content: strip(trimmed) });
      continue;
    }

    // Bold headings: **Text**
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      parsed.push({ type: 'heading', content: strip(trimmed.replace(/\*\*/g, '')) });
      continue;
    }

    // Inline bold at the start of a line
    const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*(.*)/);
    if (boldMatch && boldMatch[2].trim().length === 0) {
      parsed.push({ type: 'heading', content: strip(boldMatch[1]) });
      continue;
    }

    // Bullet points: • - ▸ or emoji bullet
    if (/^[•\-▸]\s/.test(trimmed)) {
      parsed.push({ type: 'bullet', content: strip(trimmed.replace(/^[•\-▸]\s*/, '')) });
      continue;
    }

    // Regular paragraph — strip inline bold markers and emojis
    const cleaned = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1');
    parsed.push({ type: 'paragraph', content: strip(cleaned) });
  }

  return parsed;
}
