# Repository Guidelines

## Project Structure & Module Organization

Kinetix is a shared-fund application for clubs, communities, friends, siblings, and families on Avalanche. Prioritize complete phone workflows. `contracts/` contains Solidity contracts, interfaces, and mocks. `test/` holds contract, authentication, and backend tests. `frontend/src/` contains Next.js App Router pages and API routes (`app/`), components, hooks, contexts, and Web3 utilities. `backend/src/` contains the Express server, services, Drizzle schema, and blockchain event worker; migrations live in `backend/drizzle/`. Use `scripts/` for deployment and maintenance. Treat `artifacts/`, `cache/`, and `typechain-types/` as generated output.

## Build, Test, and Development Commands

Install dependencies with `npm install`, `npm --prefix backend install`, and `npm --prefix frontend install`.

- `npm run dev:all`: start the frontend (3000), API (4000 by default), and event worker. Individual commands are `dev:frontend`, `dev:server`, and `dev:worker`.
- `npm run compile`: compile Solidity and generate contract types.
- `npm test`: run the Hardhat test suite.
- `npm --prefix frontend run build`: build the Next.js production application.
- `npm run sol:lint` / `npm run sol:format`: lint or format Solidity.
- `npm run db:generate` / `npm run db:migrate`: generate or apply Drizzle migrations using the configured database.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and semicolons, matching existing files. Name React components and contracts in PascalCase, hooks as `useSomething`, and functions and variables in camelCase. Preserve Next.js route filenames such as `page.tsx` and `route.ts`. Use the repository compiler configuration (currently Solidity 0.8.26) and compatible existing pragmas; its Prettier configuration specifies four spaces and a 100-character line width. Follow `solhint:recommended` and retain NatSpec documentation for contract interfaces.

## Testing Guidelines

Write `*.test.ts` files under `test/` using Mocha, Chai, and Hardhat/ethers. Run contract-only checks with `npx hardhat test test/Kinetix.test.ts test/SecurityHardening.test.ts`. Authentication and backend integration tests modify records; use a disposable `TEST_DATABASE_URL` distinct from `DATABASE_URL`, with the explicit reset opt-in described in CONTRIBUTING.md. Cover successful flows, authorization failures, liquidity boundaries, and cross-chain message validation. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Follow the scoped Conventional Commit style in history: `feat(contracts): ...`, `fix(ui): ...`, or `feat(auth): ...`. Keep commits focused. PRs should describe behavior changes, link relevant issues, list validation commands and results, and include screenshots for UI changes. Explain schema, deployment, and configuration changes explicitly.

## Security & Configuration

Start root configuration from `.env.example`; configure frontend values in `frontend/.env.local`. Supply a dedicated `JWT_SECRET`. Keep private keys, database credentials, and real environment files out of commits. Confirm the target network and contract addresses before deployment.

## Product and Documentation Rules

Read [product direction](docs/PRODUCT_DIRECTION.md), [target specification](docs/GROUP_FINANCE_SPEC.md), [mobile UX standard](docs/MOBILE_UX_STANDARD.md), and [mobile acceptance](docs/MOBILE_ACCEPTANCE.md) before product changes. Use [status](docs/STATUS.md) and [architecture](docs/ARCHITECTURE.md) for implemented behavior. Historical notes and generic skill examples do not override these project requirements.

The core is groups, members, funds, policies, contributions, expense requests, approvals, payments, and reconciliation. Prioritize operating funds and goal funds. Workspace type and age do not confer financial authority. Workspace administration is separate from fund signing; never rename legacy roles into broader permissions without verified mapping. Preserve legacy enums, ABIs, routes, and custody boundaries until an explicit migration is implemented.

Every essential workflow, including administration and reports, must work on phones. Design from 360px and verify at 320px without page overflow. Keep one primary task per screen, readable 16px body/input text, touch targets of at least 44px, and actions clear of keyboards and safe areas. Use progressive disclosure without hiding payment terms or errors. Write short, concrete copy; avoid slogans, decorative dashboards, repetitive cards, unsupported guarantees, and AI filler.

For UI changes, record viewport screenshots and actual mobile wallet results or explicitly state untested environments. A build or source review does not prove mobile usability. Do not require unrelated contract changes before fixing UI; use explicit API boundaries for parallel work. Do not imply documentation updates upgraded code or deployments. Keep current guidance, proposed work, and dated evidence distinct.

Protected `.agents` replacement drafts are prepared in [docs/agent-guidance](docs/agent-guidance/README.md). The original files remain unchanged because this environment denies writes there; use current project documents for the new direction.
