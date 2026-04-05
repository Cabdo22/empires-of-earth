import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/tone")) {
            return "audio-vendor";
          }
          if (id.includes("node_modules/partysocket") || id.includes("node_modules/partykit")) {
            return "multiplayer-vendor";
          }
          return null;
        },
      },
    },
  },
  server: {
    port: 5000,
  },
});
