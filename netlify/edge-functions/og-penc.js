// Aperçu des liens de Pénc /p/:id (WhatsApp, Facebook, Telegram…) : sujet, date, animateur. Les vraies personnes passent à l'appli.
const CRAWLER_RE = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Googlebot|Slackbot|TelegramBot|Discordbot|Snapchat|Pinterest|SkypeUriPreview|iMessage|Applebot/i;
// Le navigateur intégré de Snapchat s'annonce « Snapchat/x.y » avec AppleWebKit : c'est une vraie personne (pas un robot d'aperçu), elle doit recevoir l'appli.
const isCrawler = (ua) => CRAWLER_RE.test(ua) && !(/Snapchat\/[\d.]+/i.test(ua) && /AppleWebKit|Android/i.test(ua));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** L'heure de Dakar (UTC, sans heure d'été). */
function when(t) {
  const d = new Date(t);
  const m = d.getUTCMinutes();
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} à ${d.getUTCHours()} h${m ? String(m).padStart(2, '0') : ''} (Dakar)`;
}

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/p\/([A-Za-z0-9_-]{1,60})\/?$/);
  if (!m || !isCrawler(ua)) return context.next();

  let title = 'Pénc mi · Health-e';
  let description = 'Une discussion en direct pour parler de ce qui pèse. Écoute, commente, pose ta question, même en anonyme.';
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${url.origin}/.netlify/functions/penc-live?id=${m[1]}`, { signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) {
      const p = await res.json();
      title = `Pénc mi : ${p.title}`;
      const head = p.status === 'live' ? 'En direct maintenant' : p.status === 'ended' ? 'Pénc terminé' : when(p.startAt);
      description = `${head} · animé par ${p.host && p.host.name ? p.host.name : 'l\'équipe Health-e'}. ${String(p.description || 'Écoute, commente, pose ta question, même en anonyme.').replace(/\s+/g, ' ').slice(0, 140)}`;
    }
  } catch { /* aperçu générique */ }

  const page = `${url.origin}/p/${m[1]}`;
  const image = `${url.origin}/og-health-e.png`;
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:site_name" content="Health-e" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(page)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head><body></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};
