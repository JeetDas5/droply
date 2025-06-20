import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE URL is not defined in the environment variables.");
}

async function runMigrations() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql, { schema: {} });

    await migrate(db, {
      migrationsFolder: "./drizzle",
    });
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.log("An error occurred while running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
