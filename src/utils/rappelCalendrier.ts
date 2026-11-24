/**
 * rappelCalendrier — « Me le rappeler » : un rappel dans l'agenda du téléphone pour l'épisode suivant (sans compte, sans notification,
 * sans service payant). iPhone : un fichier .ics (l'agenda s'ouvre) ; ailleurs : la page « nouvel événement » de Google Agenda.
 */
export interface Rappel { titre: string; debut: number; minutes?: number; url: string; description?: string }

const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const echap = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Le contenu du fichier .ics (heure en UTC = heure de Dakar), avec une alerte au moment de l'ouverture. */
export function icsDe(r: Rappel, now = Date.now()): string {
  const fin = r.debut + (r.minutes ?? 15) * 60000;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Health-e//Cas du soir//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${fmt(r.debut)}-${Math.abs(hash(r.url))}@health-e.sn`,
    `DTSTAMP:${fmt(now)}`, `DTSTART:${fmt(r.debut)}`, `DTEND:${fmt(fin)}`,
    `SUMMARY:${echap(r.titre)}`,
    `DESCRIPTION:${echap(`${r.description ? `${r.description}\n` : ''}${r.url}`)}`,
    `URL:${r.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${echap(r.titre)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/** Le lien « nouvel événement » de Google Agenda. */
export function lienGoogleAgenda(r: Rappel): string {
  const fin = r.debut + (r.minutes ?? 15) * 60000;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: r.titre, dates: `${fmt(r.debut)}/${fmt(fin)}`, details: `${r.description ? `${r.description}\n` : ''}${r.url}` });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

const estIphone = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

/** Ouvre le rappel : .ics sur iPhone, Google Agenda ailleurs. Ne lève jamais d'erreur. */
export function ajouterRappel(r: Rappel): void {
  try {
    if (estIphone()) {
      const url = URL.createObjectURL(new Blob([icsDe(r)], { type: 'text/calendar;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'cas-du-soir.ics'; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }
    window.open(lienGoogleAgenda(r), '_blank', 'noopener');
  } catch { /* le rappel est un plus : la page continue de marcher */ }
}
