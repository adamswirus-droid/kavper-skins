import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Vercel + Neon (Storage w panelu Vercel) ustawia DATABASE_URL lub POSTGRES_URL —
// obsługujemy obie nazwy, żeby wdrożenie działało bez konfiguracji.
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Lokalnie (127.0.0.1 / localhost) bez SSL; hostowane bazy (Neon, Supabase,
// Railway, Render…) wymagają SSL — włączamy automatycznie.
const isLocal = /(^|@)(127\.0\.0\.1|localhost)(:|\/)/.test(databaseUrl);

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
