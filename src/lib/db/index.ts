import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let instance: NeonHttpDatabase<typeof schema> | undefined;

// Conexão criada só no primeiro uso, pra o build não quebrar sem DATABASE_URL.
export function db() {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}

export { schema };
