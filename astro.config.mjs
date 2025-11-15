// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    // @ts-expect-error Temporary cast until @tailwindcss/vite bumps to Astro's Vite version
    plugins: [tailwindcss()],
  },
  adapter: vercel({}),
});
