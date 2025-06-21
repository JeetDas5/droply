import * as schema from "./schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE URL is not defined in the environment variables.");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export { sql };
