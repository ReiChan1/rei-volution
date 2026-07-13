// Quick sanity check that DATABASE_URL / DIRECT_URL actually work,
// before running migrate/seed/dev. Run with: npm run db:test
//
// Uses the raw `pg` driver directly (not Prisma) so a problem here always
// means "the network/credentials are wrong," not "something in the Prisma
// adapter wiring is wrong."
import "dotenv/config";
import pg from "pg";

function redact(url) {
  if (!url) return "(not set)";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}${u.search}`;
  } catch {
    return "(couldn't parse — check for stray quotes/spaces)";
  }
}

console.log("DATABASE_URL:", redact(process.env.DATABASE_URL));
console.log("DIRECT_URL:  ", redact(process.env.DIRECT_URL));
console.log();

if (
  process.env.DATABASE_URL?.includes("REPLACE_WITH") ||
  process.env.DIRECT_URL?.includes("REPLACE_WITH")
) {
  console.error(
    "✗ Your .env still has placeholder values in it (REPLACE_WITH_...).\n" +
    "  Open .env and paste in your real Supabase connection strings first."
  );
  process.exit(1);
}

async function testConnection(label, connectionString) {
  if (!connectionString) {
    console.error(`✗ ${label} is not set in .env.`);
    return false;
  }
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log(`✓ ${label} connected successfully.`);
    return true;
  } catch (err) {
    console.error(`✗ ${label} failed to connect.`);
    console.error(`  ${err.message}`);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const dbOk = await testConnection("DATABASE_URL (pooled, port 6543)", process.env.DATABASE_URL);
const directOk = await testConnection("DIRECT_URL (direct, port 5432)", process.env.DIRECT_URL);

console.log();
if (dbOk && directOk) {
  console.log("✓ Both connections work — you're good to run db:migrate.");
} else {
  console.error(
    "Common causes:\n" +
    "  - Your Supabase project is paused (open the dashboard once to wake it up)\n" +
    "  - A special character in your password isn't percent-encoded\n" +
    "  - Your network/firewall/antivirus is blocking outbound port 6543 or 5432\n" +
    "  - DATABASE_URL and DIRECT_URL are swapped (6543 = pooled, 5432 = direct)"
  );
  process.exit(1);
}
