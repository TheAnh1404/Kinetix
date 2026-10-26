import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_AB4SNJCH6Emd@ep-wandering-butterfly-az49799k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
