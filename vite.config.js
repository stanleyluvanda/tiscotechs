// vite.config.js
/*import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 👇 make asset paths relative in the production build
  base: "/",
  server: { port: 5176, strictPort: true, host: true, open: true },
  preview: { port: 5176, strictPort: true, host: true },
});*/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "/",

  server: {
    port: 5176,
    strictPort: true,
    host: true,
    open: true,

    proxy: {
      "/local-auth-st-prod": {
        target: "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) =>
          path.replace(
            /^\/local-auth-st-prod/,
            "/default/api/auth-st-prod"
          ),
      },
    },
  },

  preview: {
    port: 5176,
    strictPort: true,
    host: true,
  },
});