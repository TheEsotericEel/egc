import { Client } from "pg";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set in env");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query("select current_database() as db, current_user as user");
    console.log("Connected OK:", res.rows[0]);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

main();
