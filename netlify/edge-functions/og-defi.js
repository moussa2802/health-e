const CRAWLER_RE = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Googlebot|Slackbot|TelegramBot|Discordbot/i;
const PROJECT_ID = 'health-e-af2bf';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function genderPronoun(genre) {
  return genre === 'feminin' ? 'la' : 'le';
}

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  if (!CRAWLER_RE.test(ua)) {
    return context.next();
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/d\/([a-z0-9]+)$/i);
  if (!match) {
    return context.next();
  }

  const slug = match[1];
  let title = 'Kan moo ma gën a xam ? — Health-e';
  let description = 'Réponds au défi et montre que tu connais tes proches — Health-e';
  let questionCount = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const firestoreUrl = `${FIRESTORE_BASE}/defis/${slug}?mask.fieldPaths=displayName&mask.fieldPaths=genre&mask.fieldPaths=statut&mask.fieldPaths=questions`;
    const res = await fetch(firestoreUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};

      const displayName = fields.displayName?.stringValue;
      const genre = fields.genre?.stringValue || null;
      const questions = fields.questions?.arrayValue?.values;

      if (displayName) {
        const pron = genderPronoun(genre);
        title = `${escapeHtml(displayName)} veut savoir qui ${pron} connaît le mieux 👀`;
      }
      if (questions) {
        questionCount = ` ${questions.length}`;
        description = `Réponds à${questionCount} questions en 1 minute — Health-e`;
      }
    }
  } catch {}

  const ogImage = `${url.origin}/og-defi.png`;
  const ogUrl = `${url.origin}/d/${slug}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};

export const config = { path: '/d/*' };
