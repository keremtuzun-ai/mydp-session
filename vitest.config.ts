import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    env: { ALLOWED_SCHOOL_DOMAINS: process.env.ALLOWED_SCHOOL_DOMAINS ?? "school.edu,stu.school.edu" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
