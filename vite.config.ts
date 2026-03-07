import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vitest/config"

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "数独",
        short_name: "数独",
        description: "随机生成 + 难度选择 + 唯一解校验",
        theme_color: "#059669",
        background_color: "#ecfeff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/sudoku.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "/icons/sudoku-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/sudoku-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/sudoku/**/*.ts", "src/store/**/*.ts"],
    },
  },
})
