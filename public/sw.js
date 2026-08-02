/**
 * Service worker MINIMAL (§22.3, §32.4): exista ca aplicatia sa fie
 * instalabila (icon pe homescreen, splash), atat. Fara cache si fara
 * sincronizare offline — spec-ul le exclude explicit din v1; un cache gresit
 * ar servi rezervari vechi, ceea ce e mai rau decat niciun offline.
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (eveniment) => {
  eveniment.waitUntil(self.clients.claim())
})

// Prezenta handler-ului conteaza pentru criteriile de instalare; cererile
// merg mai departe pe drumul lor normal, spre retea.
self.addEventListener('fetch', () => {})
