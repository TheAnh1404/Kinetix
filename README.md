# Kinetix

**Shared finance for families and communities, built on Avalanche.**

Kinetix brings shared funds, member responsibilities, and financial approvals into one application. Designed for households and community groups, it combines familiar account experiences with blockchain-based financial rules to make collective money management clearer and more accountable.

From supporting an older family member's daily expenses to rewarding a child's progress or saving toward a shared goal, Kinetix gives each fund a defined purpose and each participant a clear role.

> **Development status:** Experimental, testnet-oriented software. The checked-in contract deployment is not verified or enabled. T1 uses native AVAX; cross-chain transfers, ERC20/USDC, and yield are disabled. The contracts have not been independently audited.

## Product Vision

Managing money together requires more than a shared balance. Families and groups need to know who can contribute, who can request funds, how decisions are approved, and where to follow the outcome.

Kinetix translates those responsibilities into structured workflows. Its vision is to make shared finance accessible across generations while keeping participation, oversight, and transaction activity easy to understand.

## Core Capabilities

- **Shared workspaces** — Organize a household or group with its own members, roles, and financial vaults.
- **Purpose-driven vaults** — Define beneficiaries, guardians, spending rules, and approval requirements for each fund.
- **Coordinated approvals** — Route eligible requests through guardian review according to the vault's policy.
- **Activity tracking** — Follow requests, approvals, transaction history, and notifications in a unified interface.
- **Role-based experiences** — Provide dedicated workflows for administrators, guardians, older adults, and children, with responsive layouts for desktop, tablet, and mobile.

## Financial Experiences

| Experience | Purpose | How it works |
| --- | --- | --- |
| **Kinetix Shield** | Everyday support with family oversight | Beneficiaries access funds within configured limits, while larger requests require guardian approval. |
| **Kinetix Kids** | Financial learning through tasks and milestones | Children submit completed tasks for family review, with rewards released through the vault's approval process. |
| **Kinetix ROSCA** | Structured rotating contributions | Members contribute on a defined schedule and receive the pooled funds in an established order. |
| **Shared Goal** | Collective saving for a common purpose | Participants contribute toward a target, with release conditions and approval rules defined for the fund. |

## Explore Locally

Use Node.js 24.7 or newer in the Node 24 release line.

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Create local environment files from `.env.example` and `frontend/.env.example`, configure your own development database and BFF secret, then run:

```bash
npm run db:migrate
npm run dev:all
```

Open the frontend on port 3000. For a UI-only demo, set `NEXT_PUBLIC_DEMO_MODE=true` in the frontend environment, run `npm run dev:frontend`, and open `/demo`. Demo balances and approvals are simulated. See [contributing](CONTRIBUTING.md) for setup and validation details.

## Technology

| Layer | Foundation |
| --- | --- |
| Application interface | Next.js, React, TypeScript, and Tailwind CSS |
| Application services | Node.js, Express, and TypeScript |
| Blockchain integration | Avalanche, Solidity, and Web3 wallet connectivity |

The application combines account access, wallet interaction, and blockchain event tracking to present financial activity within a consistent user experience.

## Documentation

- [Current status and validation](docs/STATUS.md)
- [Architecture and custody boundaries](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security policy](SECURITY.md)
- [Documentation index](docs/README.md)

The standalone yield experiment models reserve-funded accrual; it is not a live DeFi yield source. The shared Core treasury is a separate custodial workflow and does not inherit smart-contract multisig guarantees.

## License

Kinetix is available under the [MIT License](LICENSE).
