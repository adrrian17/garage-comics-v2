import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

// Alchemy injects the Cloudflare Vite plugin when it builds or serves this app.
export default defineConfig({
  build: {
    // The Workers runtime provides it; a plain `vp build` has no Cloudflare plugin to resolve it.
    rolldownOptions: { external: ["cloudflare:workers"] },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), tanstackStart(), react()],
});
