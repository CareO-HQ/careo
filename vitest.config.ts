import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname) };

export default defineConfig({
  resolve: { alias },
  test: {
    // DB tests share one local database; unit tests are fast enough to run serially too.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          env: { TZ: "UTC" },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/load-env.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportOnFailure: true,
      include: ["lib/**/*.ts", "schemas/**/*.ts", "app/actions/**/*.ts", "middleware.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
