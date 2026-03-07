/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

self.addEventListener("install", () => {
  void self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  // Keep installability while preserving the "no offline cache" policy.
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response("", {
          status: 503,
          statusText: "Service Unavailable",
        })
    )
  )
})

export {}
