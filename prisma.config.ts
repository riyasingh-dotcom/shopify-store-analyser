import { defineConfig } from "prisma/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Prisma config presence disables automatic .env loading, so we load
// .env.local ourselves using only Node built-ins (no dotenv dependency).
// On Vercel/prod, env vars are already injected — the existsSync guard
// means this is a no-op in those environments.
const envLocalPath = join(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present; don't overwrite vars already set.
    if (!process.env[key]) {
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
