// Prisma 7 moved CLI connection config out of schema.prisma and into this
// file. This config is used by `prisma migrate`, `prisma studio`, and
// `prisma db seed` — it is NOT used by the running app (see src/lib/prisma.ts
// for that, which builds its own driver adapter from DATABASE_URL).
//
// Migrations need a direct (non-pooled) connection, so this points at
// DIRECT_URL rather than the pooled DATABASE_URL.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
