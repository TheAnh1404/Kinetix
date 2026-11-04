const integration = process.argv.includes("--integration");
const { assertIsolatedDatabase } = require("./auth-test-safety.cjs");
if (integration || process.env.TEST_DATABASE_URL) {
  try { assertIsolatedDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.AUTH_TEST_ALLOW_RESET); }
  catch (error) { console.error(error.message); process.exit(1); }
}
require("ts-node/register/transpile-only");
const Mocha = require("mocha");
const mocha = new Mocha({ timeout: 15000 });
mocha.addFile("test/auth.test.ts");
mocha.addFile("test/backend.test.ts");
mocha.addFile("test/Web3AuthGuard.test.ts");
mocha.addFile("test/BffAuth.test.ts");
mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
