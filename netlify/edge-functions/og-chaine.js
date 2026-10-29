// Aperçu des liens d'invitation /c/:id (WhatsApp, Facebook, Telegram…) : titre, description et photo de la chaîne.
const CRAWLER_RE = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Googlebot|Slackbot|TelegramBot|Discordbot|Snapchat|Pinterest|SkypeUriPreview|iMessage|Applebot/i;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/c\/([A-Za-z0-9_-]{1,60})\/?$/);
  if (!m || !CRAWLER_RE.test(ua)) return context.next();

  let title = 'Une chaîne de Dr Lô — Health-e';
  let description = 'Rejoins la chaîne : des vocaux et des textes de Dr Lô, pour mieux te comprendre.';
  let image = `${url.origin}/og-chaine.png`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${url.origin}/.netlify/functions/channel-share?id=${m[1]}`, { signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) {
      const c = await res.json();
      title = `${c.name} — la chaîne de Dr Lô`;
      const entry = c.price > 0 ? `Entrée : ${c.price} étincelle${c.price > 1 ? 's' : ''}` : 'Entrée gratuite';
      const members = c.memberCount > 1 ? ` · ${c.memberCount} membres` : '';
      description = `${String(c.description || '').replace(/\s+/g, ' ').slice(0, 150)} — ${entry}${members}`;
      if (c.imageUrl) image = `${url.origin}${c.imageUrl}`;
    }
  } catch { /* aperçu générique */ }

  const page = `${url.origin}/c/${m[1]}`;
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
