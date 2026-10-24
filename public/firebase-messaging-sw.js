/* Notifications de Dr Lô (Firebase Cloud Messaging).
 * Les messages arrivent avec un titre et un texte neutres (rien de sensible sur l'écran verrouillé).
 * Toucher la notification ouvre Health-e à la bonne page. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCQP_KoMF6uoNNlSAC4MtPbQM_cUC3atow',
  authDomain: 'health-e-af2bf.firebaseapp.com',
  projectId: 'health-e-af2bf',
  storageBucket: 'health-e-af2bf.firebasestorage.app',
  messagingSenderId: '309913232683',
  appId: '1:309913232683:web:4af084bc334d3d3513d16e',
});

const messaging = firebase.messaging();

// Messages sans notification affichée automatiquement (données seules) : on l'affiche nous-mêmes
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return; // déjà affichée par le navigateur
  const d = payload.data || {};
  self.registration.showNotification(d.title || 'Dr Lô', {
    body: d.body || '',
    icon: '/icons/drlo-notif.png', // Android : le visage de Dr Lô (l'iPhone affiche toujours l'icône de l'appli)
    badge: '/icons/badge-96.png', // petite icône de la barre d'état : blanche, détourée
    tag: `drlo-${d.kind || 'info'}`,
    data: { link: d.link || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || '/';
  event.notification.close();
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) { await c.focus(); c.navigate(link); return; }
    }
    await clients.openWindow(link);
  })());
});
