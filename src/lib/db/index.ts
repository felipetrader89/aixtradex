import "server-only";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// PostgreSQL local da VPS. Conexão criada só no primeiro uso, pra o build não quebrar sem DATABASE_URL.
const globalForDb = globalThis as unknown as { aixDb?: PostgresJsDatabase<typeof schema> };

export function db() {
  if (!globalForDb.aixDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    globalForDb.aixDb = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.aixDb;
}

export { schema };
