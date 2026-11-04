import { expect } from "chai";
import { vaultMappingIssue } from "../shared/vaultMapping";

describe("Financial vault mapping guard", () => {
  const hub = `0x${"a".repeat(40)}`;
  const vault = { onchainVaultId: 1, onchainChainId: 43113, onchainHub: hub };
  it("keeps seeded/unverified vaults and ID zero blocked before signing", () => {
    expect(
      vaultMappingIssue(
        { onchainVaultId: 1, onchainChainId: null, onchainHub: null },
        43113,
        hub,
      )?.code,
    ).to.equal("VAULT_NOT_RECONCILED");
    expect(
      vaultMappingIssue({ ...vault, onchainVaultId: 0 }, 43113, hub)?.code,
    ).to.equal("VAULT_NOT_RECONCILED");
  });
  it("distinguishes chain and Hub conflicts without silently correcting mappings", () => {
    expect(vaultMappingIssue(vault, 99999, hub)?.code).to.equal(
      "VAULT_CHAIN_MISMATCH",
    );
    expect(
      vaultMappingIssue(vault, 43113, `0x${"b".repeat(40)}`)?.code,
    ).to.equal("VAULT_HUB_MISMATCH");
    expect(vault.onchainChainId).to.equal(43113);
  });
  it("accepts a present same-chain mapping case-insensitively; runtime still verifies receipt/RPC", () => {
    expect(vaultMappingIssue(vault, 43113, hub.toUpperCase())).to.equal(null);
  });
});
