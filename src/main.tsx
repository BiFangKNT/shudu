import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"

import App from "@/App"
import "@/index.css"

if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onRegisterError(error: unknown) {
      console.warn("Service worker registration failed", error)
    },
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
