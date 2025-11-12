import { mergeConfig } from "vite";
import baseConfig from "./vite.config";
import { defineConfig } from "vitest/config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/tests/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      globals: true,
      coverage: {
        reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/tests/**", "src/**/*.d.ts", "src/**/*.stories.tsx", "src/**/*.stories.ts"],
      },
    },
  })
);
