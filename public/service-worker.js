const CACHE_NAME = 'gestor-familiar-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
            return undefined
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

const isNavigationRequest = request =>
  request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))

self.addEventListener('fetch', event => {
  const { request } = event

  // NetworkFirst for navigation (HTML)
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          return caches.match('/')
        }),
    )
    return
  }

  // CacheFirst for static assets
  if (['style', 'script', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(response => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }
})
