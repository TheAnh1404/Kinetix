# Contributing to Kinetix

Kinetix develops shared funds for clubs, communities, friends, siblings, and families. Start with the [project status](docs/STATUS.md), [architecture](docs/ARCHITECTURE.md), and [security policy](SECURITY.md).

## Development Setup

Use Node.js 24.7 or newer in the Node 24 release line and npm. Native Argon2id is required for authentication.

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Copy `.env.example` to a local `.env` and `frontend/.env.example` to `frontend/.env.local`. Replace placeholders with your own development configuration, use a dedicated development database, and set a random shared BFF secret consistently in both environments. Never commit these local files. Next.js exposes variables prefixed with `NEXT_PUBLIC_` to browsers; do not put secrets there.

Apply database migrations only to your intended development database, then start the services:

```bash
npm run db:migrate
npm run dev:all
```

The frontend uses port 3000 and the API defaults to port 4000. The event worker runs alongside them. For a UI-only exploration, set `NEXT_PUBLIC_DEMO_MODE=true` in the frontend environment, run `npm run dev:frontend`, and open `/demo`. Simulated activity is separate from real wallet transactions. Read the checked-in manifest and deployment evidence for the active network and supported features; do not assume a disabled deployment or reuse local fixture addresses.

## Validation

Run checks relevant to your change:

```bash
npm run docs:check
npm run compile
npm test
npm run typecheck
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
npm run sol:lint
npm --prefix frontend run build
```

`npm test` includes contract, policy, authentication, and UI regression tests on the local Hardhat network. Without an isolated test database, database integration suites are reported as pending. Report passing, pending, and failing totals separately; a passing run with skipped integrations is not complete integration validation.

For authentication/database integration tests, configure `TEST_DATABASE_URL` for a disposable database distinct from `DATABASE_URL`, and explicitly set `AUTH_TEST_ALLOW_RESET=true`. These tests modify and delete records. Run `npm run test:auth:integration` for a compatible hosted PostgreSQL transport, or `npm run test:auth:local` for a loopback PostgreSQL instance through the test-only WebSocket adapter. The CI workflow provisions its own disposable database.

Contract tests use native AVAX amounts represented in wei. Hardhat helpers such as `parseEther` and `changeEtherBalance` operate on the local EVM's native currency; they do not imply USDC support.

After changing contract ABIs, run `npm run export:abis` following compilation and commit both application ABI files. Deployments must be verified again against the new bytecode; do not activate old evidence for changed sources.

## Pull Requests

Use scoped Conventional Commit titles, such as `fix(contracts): reject self-approved withdrawals`. Explain the concrete behavior change, relevant security and migration effects, and the checks you ran. Include screenshots for visual changes and identify any validation you could not perform. Keep generated Hardhat output, real credentials, database exports, and local logs out of commits.

Use public issues for non-sensitive defects and feature proposals. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Product and Mobile Review

Follow [product direction](docs/PRODUCT_DIRECTION.md), [group finance specification](docs/GROUP_FINANCE_SPEC.md), and [mobile UX standard](docs/MOBILE_UX_STANDARD.md). Treat target capabilities as planned until code and acceptance evidence exist. Keep financial permissions distinct from workspace administration and do not silently change legacy custody or roles.

All essential tasks must be usable on phones, including settings, approvals, membership administration, and reports. Use [mobile acceptance](docs/MOBILE_ACCEPTANCE.md) for viewport, keyboard, accessibility, failure, and wallet checks. PRs with UI changes include phone screenshots and the tested device/browser/wallet versions; record untested environments explicitly. Review text density and actionable copy as well as layout. Avoid marketing filler and unnecessary visual effects in task screens.

Documentation-only changes require `npm run docs:check`, local-link validation for the changed references, and `git diff --check`. Preserve dated evidence and mark superseded plans instead of rewriting past test results. Generic design skill reference libraries remain reusable; project-specific rules take precedence.
