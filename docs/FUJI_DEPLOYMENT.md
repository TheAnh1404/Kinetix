# Avalanche Fuji T1 deployment

Deployed and activated on **2026-11-12**, chain ID **43113**. These are contract deployment records; the frontend and API are running locally.

## Contracts

| Contract | Fuji address | Creation receipt |
| --- | --- | --- |
| FamilyHub | [0x2c2D8a0af6b3b610108a7bc49c6f33b4B6361211](https://testnet.snowtrace.io/address/0x2c2D8a0af6b3b610108a7bc49c6f33b4B6361211) | [Transaction, block 60950962](https://testnet.snowtrace.io/tx/0xf33dc3f1237d4b18e1a37d48378fb3ed1386b08337c07102a9054ea5febc584f) |
| VaultCashflow | [0x2203FDBB6a779ae4ADd73Bc6c08BA0ddD182796B](https://testnet.snowtrace.io/address/0x2203FDBB6a779ae4ADd73Bc6c08BA0ddD182796B) | [Transaction, block 60950974](https://testnet.snowtrace.io/tx/0xce1f95d34f907011178610938aaa80b52abc5ca8d1953bf10273c6b0c3af2b8e) |
| KinetixForwarder | [0xf8b5c91E96B865aA73d2FeD2105456997253d0d2](https://testnet.snowtrace.io/address/0xf8b5c91E96B865aA73d2FeD2105456997253d0d2) | [Transaction, block 60950984](https://testnet.snowtrace.io/tx/0xc609a7d9a839f8472deb24c6b5de444c42e07f6f9d3839d3aa3d37ddc104d8ce) |

Administrator: `0x215eb14808B826d1469476a79C8942d8944e9d6c`. Its key is stored only in the ignored root `.env`, never in frontend configuration. The current FamilyHub has no administrator-transfer entry point; retain access to this wallet.

## Wiring and verification

- [Cashflow wiring, block 60950992](https://testnet.snowtrace.io/tx/0xe586527f7db339a5fbda4628d1676f1cf8211388ebec200cf3093384cf852698).
- [Trusted forwarder wiring, block 60951002](https://testnet.snowtrace.io/tx/0xd16bfda3e4ad43864a397cfe285705d760de8728ce2f66874cb5b034007206aa).
- All five receipts succeeded and were finalized before activation at checked block **60951016**.
- Transaction sender, chain ID, creation bytecode, constructor arguments, call data, and zero transferred value matched the deployment plan.
- Runtime bytecode matched the compiled contracts, accounting for compiler-recorded immutable fields. Full on-chain runtime hashes are recorded in [the manifest](../shared/deployment.json).
- FamilyHub points to VaultCashflow and the trusted forwarder. Cashflow's controller is FamilyHub; its owner is the dedicated administrator. Both contracts are unpaused.
- Native AVAX is enabled; ERC20, cross-chain, yield, and sponsored relaying remain disabled.
- `npm run check:testnet` returned `VERIFIED` after activation.

Sourcify independently recompiled all three contracts and returned **exact_match** for both creation and runtime code:

- [FamilyHub source](https://repo.sourcify.dev/43113/0x2c2D8a0af6b3b610108a7bc49c6f33b4B6361211), verified at 2026-11-12 14:32:12 UTC.
- [VaultCashflow source](https://repo.sourcify.dev/43113/0x2203FDBB6a779ae4ADd73Bc6c08BA0ddD182796B), verified at 2026-11-12 14:32:09 UTC.
- [KinetixForwarder source](https://repo.sourcify.dev/43113/0xf8b5c91E96B865aA73d2FeD2105456997253d0d2), verified at 2026-11-12 14:32:10 UTC.

Source-code matching is separate from an independent security audit.

Compiler: Solidity **0.8.26**, Cancun EVM, optimizer **200 runs**, `viaIR: true`.

Source build identity: `0x1d1ee980ac2032de81fd15c18fba79a5796ebdb7b4c5e18c45f002588d402f05`.

Post-activation validation: root/frontend typechecks and the frontend production build passed. The full local suite returned **321 passing, 20 pending**; pending tests require an isolated integration database. Local frontend, API health, and database readiness returned HTTP 200. Public documentation checks passed. Other UI work was being edited concurrently; these are validation results at deployment time.

## Funding and operating boundaries

The dedicated wallet received **0.1 Fuji AVAX** in [this finalized funding transaction](https://testnet.snowtrace.io/tx/0x3f154f26e875e2bd477a774cf385e0b17f21813c16b1060fb54fa52df7003912). The five deployment/wiring transactions consumed **0.00000000113318816 AVAX** at the network's fees at deployment time. Fees can change.

Legacy contracts, existing vault mappings, account-wallet links, and financial ledgers were not migrated. Workspace owners must use the application's verified workspace connection and wallet-proof flows before transacting against this deployment. No public frontend hosting, source audit, mainnet deployment, or legacy-fund migration is implied.
