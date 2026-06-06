// Bloomies — minimale service worker.
// Doel: app installeerbaar maken (PWA) en meldingen tonen/afhandelen.
// Geen agressieve caching (voorkomt vastzittende oude versies).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Lege fetch-handler: nodig voor installeerbaarheid, maar laat het netwerk gewoon zijn werk doen.
self.addEventListener('fetch', () => {})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lijst) => {
      for (const client of lijst) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/bloomies/')
    }),
  )
})
