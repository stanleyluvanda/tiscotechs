// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 👇 make asset paths relative in the production build
  base: "./",
  server: { port: 5176, strictPort: true, host: true, open: true },
  preview: { port: 5176, strictPort: true, host: true },
});