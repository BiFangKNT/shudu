/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

self.addEventListener("install", () => {
  void self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

export {}
