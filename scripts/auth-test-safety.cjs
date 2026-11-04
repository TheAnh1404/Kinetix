require("dotenv").config();

function target(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid test database configuration."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Tests require a PostgreSQL database.");
  const host = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, "").replace(/^localhost$/, "127.0.0.1");
  return `${host}:${url.port || "5432"}${url.pathname}`;
}

function assertIsolatedDatabase(testUrl, applicationUrl, optIn) {
  if (!testUrl || optIn !== "true") throw new Error("Integration tests require a disposable TEST_DATABASE_URL and AUTH_TEST_ALLOW_RESET=true.");
  const testTarget = target(testUrl);
  if (applicationUrl && testTarget === target(applicationUrl)) throw new Error("Refusing to run destructive auth tests against the application database.");
}

module.exports = { assertIsolatedDatabase };
