# Repository Guidelines

## Project Structure & Module Organization

Kinetix is a family finance application on Avalanche. `contracts/` contains Solidity contracts, interfaces, and mocks. `test/` holds contract, authentication, and backend tests. `frontend/src/` contains Next.js App Router pages and API routes (`app/`), components, hooks, contexts, and Web3 utilities. `backend/src/` contains the Express server, services, Drizzle schema, and blockchain event worker; migrations live in `backend/drizzle/`. Use `scripts/` for deployment and maintenance. Treat `artifacts/`, `cache/`, and `typechain-types/` as generated output.

## Build, Test, and Development Commands

Install dependencies with `npm install`, `npm --prefix backend install`, and `npm --prefix frontend install`.

- `npm run dev:all`: start the frontend (3000), API (4000 by default), and event worker. Individual commands are `dev:frontend`, `dev:server`, and `dev:worker`.
- `npm run compile`: compile Solidity and generate contract types.
- `npm test`: run the Hardhat test suite.
- `npm --prefix frontend run build`: build the Next.js production application.
- `npm run sol:lint` / `npm run sol:format`: lint or format Solidity.
- `npm run db:generate` / `npm run db:migrate`: generate or apply Drizzle migrations using the configured database.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and semicolons, matching existing files. Name React components and contracts in PascalCase, hooks as `useSomething`, and functions and variables in camelCase. Preserve Next.js route filenames such as `page.tsx` and `route.ts`. Solidity targets `^0.8.20`; its Prettier configuration specifies four spaces and a 100-character line width. Follow `solhint:recommended` and retain NatSpec documentation for contract interfaces.

## Testing Guidelines

Write `*.test.ts` files under `test/` using Mocha, Chai, and Hardhat/ethers. Run contract-only checks with `npx hardhat test test/Kinetix.test.ts test/SecurityHardening.test.ts`. Authentication and backend tests require `DATABASE_URL` and modify database records; use an isolated test database. Cover successful flows, authorization failures, liquidity boundaries, and cross-chain message validation. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Follow the scoped Conventional Commit style in history: `feat(contracts): ...`, `fix(ui): ...`, or `feat(auth): ...`. Keep commits focused. PRs should describe behavior changes, link relevant issues, list validation commands and results, and include screenshots for UI changes. Explain schema, deployment, and configuration changes explicitly.

## Security & Configuration

Start root configuration from `.env.example`; configure frontend values in `frontend/.env.local`. Supply a dedicated `JWT_SECRET`. Keep private keys, database credentials, and real environment files out of commits. Confirm the target network and contract addresses before deployment.
