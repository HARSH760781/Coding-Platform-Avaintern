// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← THIS IS REQUIRED for Tailwind v4
  ],
  server: {
    port: 3000,
  },
});
