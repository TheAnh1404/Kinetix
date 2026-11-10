const { strict: assert } = require("node:assert");
const fs = require("node:fs");
const yaml = require("js-yaml");
const compose = yaml.load(fs.readFileSync("docker-compose.yml", "utf8"));
const services = compose.services;
for (const name of ["postgres", "pgproxy", "migrate", "backend", "worker", "frontend"]) assert(services[name], `Missing ${name}`);
for (const service of Object.values(services)) {
  if (service.build) { assert.equal(service.build.context, "."); assert(fs.existsSync(service.build.dockerfile)); }
  for (const dependency of Object.keys(service.depends_on || {})) assert(services[dependency], `Unknown dependency ${dependency}`);
}
assert.equal(services.backend.depends_on.migrate.condition, "service_completed_successfully");
assert.equal(services.worker.depends_on.migrate.condition, "service_completed_successfully");
assert.equal(services.frontend.depends_on.backend.condition, "service_healthy");
assert.equal(services.frontend.environment.BACKEND_INTERNAL_URL, "http://backend:4000");
assert(!services.postgres.ports && !services.pgproxy.ports, "Database transport must remain private");
assert(services.postgres.volumes.some((volume) => volume.startsWith("kinetix_pgdata:")));
for (const file of [".github/workflows/ci.yml", ".github/workflows/release-images.yml"]) {
  const workflow = yaml.load(fs.readFileSync(file, "utf8"));
  assert(workflow.on && workflow.jobs);
  for (const job of Object.values(workflow.jobs)) for (const step of job.steps || []) if (step.with?.context) assert.equal(step.with.context, ".");
}
const ci = yaml.load(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
assert.equal(ci.env.NODE_VERSION, "24");
assert.equal(ci.jobs["docker-build-verification"].needs.length, 3);
for (const file of ["package-lock.json", "frontend/package-lock.json", "backend/tsconfig.json", "scripts/verify-treasury-integration.ts", "docker/pg-proxy.cjs"]) assert(fs.existsSync(file), `Missing ${file}`);
console.log("Static container configuration checks passed (not a Docker build or Compose runtime test).");
