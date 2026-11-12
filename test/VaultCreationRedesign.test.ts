import { expect } from "chai";
import { decodeFunctionData, parseEther, formatEther } from "viem";
import { FAMILY_HUB_ABI } from "../shared/abis";
import {
  RuleTemplate,
  VAULT_TEMPLATES,
  getVaultTemplate,
  bpsToPercent,
  percentToBps,
  formatBps,
  ruleIdToEnum,
  enumToRuleId,
  avaxToWei,
  weiToAvax,
  formatAvax,
  calculateProjectedYield,
  calculateEffectiveApy,
  getMultisigRecommendations,
  CCHAIN_APY_RATE,
  BPS_DIVISOR,
  MAX_STORED_WEI,
} from "../frontend/src/lib/vaultTemplates";
import {
  VAULT_COLORS,
  VAULT_PRESETS,
  APY_CONSTANTS,
  calculateEffectiveApy as tokenCalculateEffectiveApy,
  simulateVaultYield,
} from "../frontend/src/components/vaults/create/designTokens";
import {
  buildVaultCall,
  emptyVaultForm,
  resolveVaultConfig,
  validateVaultForm,
  VaultForm,
} from "../shared/vaultCreation";

describe("Senior Verification: Redesigned Vault Creation Suite", () => {
  const ids = [1, 2, 3, 4, 5].map(
    (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  );
  const wallets = new Map(
    ids.map((id, idx) => [id, `0x${String(idx + 1).repeat(40)}`]),
  );
  const mockTimestamp = 1793898000n; // Future unix timestamp

  describe("1. BPS and Percentage Conversions", () => {
    it("converts BPS to percentage accurately with clamping", () => {
      expect(bpsToPercent(0)).to.equal(0);
      expect(bpsToPercent(1000)).to.equal(10);
      expect(bpsToPercent(2000)).to.equal(20);
      expect(bpsToPercent(2345)).to.equal(23.45);
      expect(bpsToPercent(10000)).to.equal(100);

      // Edge cases & boundaries
      expect(bpsToPercent(-100)).to.equal(0);
      expect(bpsToPercent(15000)).to.equal(100);
      expect(bpsToPercent(NaN)).to.equal(0);
      expect(bpsToPercent(Infinity)).to.equal(0);
    });

    it("converts percentage to BPS accurately with clamping and rounding", () => {
      expect(percentToBps(0)).to.equal(0);
      expect(percentToBps(10)).to.equal(1000);
      expect(percentToBps(20)).to.equal(2000);
      expect(percentToBps(23.45)).to.equal(2345);
      expect(percentToBps(100)).to.equal(10000);

      // Edge cases
      expect(percentToBps(-10)).to.equal(0);
      expect(percentToBps(150)).to.equal(10000);
      expect(percentToBps(NaN)).to.equal(0);
    });

    it("formats BPS to user-friendly string", () => {
      expect(formatBps(0)).to.equal("0%");
      expect(formatBps(1000)).to.equal("10%");
      expect(formatBps(2000)).to.equal("20%");
      expect(formatBps(10000)).to.equal("100%");
    });
  });

  describe("2. AVAX and Wei Conversions", () => {
    it("converts AVAX strings to Wei with strict safety", () => {
      expect(avaxToWei("1")).to.equal(10n ** 18n);
      expect(avaxToWei("0.01")).to.equal(10n ** 16n);
      expect(avaxToWei("0.000000000000000001")).to.equal(1n);
      expect(avaxToWei("0")).to.equal(0n);

      // Malformed / negative strings safely return 0n
      expect(avaxToWei("")).to.equal(0n);
      expect(avaxToWei("-5")).to.equal(0n);
      expect(avaxToWei("abc")).to.equal(0n);
      expect(avaxToWei("1.2.3")).to.equal(0n);
    });

    it("caps values at MAX_STORED_WEI to prevent EVM overflow", () => {
      const huge = "99999999999999999999999999999999999999";
      expect(avaxToWei(huge)).to.equal(MAX_STORED_WEI);
    });

    it("formats Wei back to human-readable AVAX", () => {
      expect(weiToAvax(10n ** 18n)).to.equal("1");
      expect(weiToAvax(10n ** 16n)).to.equal("0.01");
      expect(weiToAvax(0n)).to.equal("0");
      expect(weiToAvax("invalid")).to.equal("0");
    });
  });

  describe("3. RuleTemplate Enum Alignment with FamilyHub.sol", () => {
    it("strictly aligns enum integers with Solidity contract: 0=SHIELD, 1=MILESTONE, 2=ROSCA, 3=SHARED_GOAL", () => {
      expect(RuleTemplate.SHIELD).to.equal(0);
      expect(RuleTemplate.MILESTONE).to.equal(1);
      expect(RuleTemplate.ROSCA).to.equal(2);
      expect(RuleTemplate.SHARED_GOAL).to.equal(3);

      expect(ruleIdToEnum("SHIELD")).to.equal(RuleTemplate.SHIELD);
      expect(ruleIdToEnum("MILESTONE")).to.equal(RuleTemplate.MILESTONE);
      expect(ruleIdToEnum("ROSCA")).to.equal(RuleTemplate.ROSCA);
      expect(ruleIdToEnum("SHARED_GOAL")).to.equal(RuleTemplate.SHARED_GOAL);

      expect(enumToRuleId(RuleTemplate.SHIELD)).to.equal("SHIELD");
      expect(enumToRuleId(RuleTemplate.MILESTONE)).to.equal("MILESTONE");
      expect(enumToRuleId(RuleTemplate.ROSCA)).to.equal("ROSCA");
      expect(enumToRuleId(RuleTemplate.SHARED_GOAL)).to.equal("SHARED_GOAL");
    });
  });

  describe("4. Real-time Dual-Chain Yield Engine (8.0% APY)", () => {
    it("computes effective APY in lockstep with buffer ratio", () => {
      // 0% buffer (100% C-Chain) -> 8.0% APY
      expect(calculateEffectiveApy(0)).to.equal(8.0);
      expect(tokenCalculateEffectiveApy(0)).to.equal(8.0);

      // 10% buffer (90% C-Chain) -> 7.2% APY
      expect(calculateEffectiveApy(1000)).to.equal(7.2);
      expect(tokenCalculateEffectiveApy(1000)).to.equal(7.2);

      // 20% buffer (80% C-Chain) -> 6.4% APY
      expect(calculateEffectiveApy(2000)).to.equal(6.4);
      expect(tokenCalculateEffectiveApy(2000)).to.equal(6.4);

      // 50% buffer (50% C-Chain) -> 4.0% APY
      expect(calculateEffectiveApy(5000)).to.equal(4.0);

      // 100% buffer (0% C-Chain) -> 0.0% APY
      expect(calculateEffectiveApy(10000)).to.equal(0.0);
    });

    it("matches FamilyYieldVault.sol accrual math: (principal * APY_RATE * time) / (100 * 365 days)", () => {
      const principal = 100; // 100 AVAX
      const bufferBps = 2000; // 20% buffer -> 80 AVAX on C-Chain

      const result = calculateProjectedYield(principal, bufferBps, 365);
      expect(result.bufferAvax).to.equal(20);
      expect(result.cchainPrincipalAvax).to.equal(80);
      expect(result.effectiveApyPercent).to.equal(6.4);
      expect(result.yearlyYieldAvax).to.equal(6.4); // 80 * 8% = 6.4 AVAX
      expect(result.projectedTotalAvax).to.equal(106.4);
    });

    it("handles zero principal or zero days gracefully", () => {
      const resultZero = calculateProjectedYield(0, 1000, 365);
      expect(resultZero.projectedYieldAvax).to.equal(0);
      expect(resultZero.projectedTotalAvax).to.equal(0);
    });
  });

  describe("5. 4 High-Impact Presets & Contract Constraints", () => {
    it("SHIELD enforces flexible fast withdraw limit and 20% buffer default", () => {
      const shield = VAULT_TEMPLATES.SHIELD;
      expect(shield.defaultBufferRatioBps).to.equal(2000);
      expect(shield.defaultFastWithdrawLimit).to.equal("0.5");
      expect(shield.contractConstraints.requiresZeroFastWithdraw).to.be.false;
    });

    it("SHARED_GOAL enforces zero fast withdraw limit in FamilyHub.sol", () => {
      const goal = VAULT_TEMPLATES.SHARED_GOAL;
      expect(goal.defaultBufferRatioBps).to.equal(1000);
      expect(goal.defaultFastWithdrawLimit).to.equal("0");
      expect(goal.contractConstraints.requiresZeroFastWithdraw).to.be.true;
      expect(goal.contractConstraints.requiresTargetGoal).to.be.true;
    });

    it("MILESTONE enforces zero fast withdraw and separates earner from guardian", () => {
      const milestone = VAULT_TEMPLATES.MILESTONE;
      expect(milestone.defaultFastWithdrawLimit).to.equal("0");
      expect(milestone.contractConstraints.requiresZeroFastWithdraw).to.be.true;
      expect(milestone.contractConstraints.separateEarnerFromGuardian).to.be.true;
    });

    it("ROSCA enforces zero fast withdraw and requires round duration & contribution", () => {
      const rosca = VAULT_TEMPLATES.ROSCA;
      expect(rosca.defaultFastWithdrawLimit).to.equal("0");
      expect(rosca.contractConstraints.requiresZeroFastWithdraw).to.be.true;
      expect(rosca.contractConstraints.requiresRoscaConfig).to.be.true;
      expect(rosca.defaultRoscaRoundDuration).to.equal("604800");
    });
  });

  describe("6. Multisig Recommendations", () => {
    it("generates intuitive approval options based on guardian count", () => {
      const rec1 = getMultisigRecommendations(1);
      expect(rec1).to.have.length(1);
      expect(rec1[0].threshold).to.equal(1);
      expect(rec1[0].isRecommended).to.be.true;

      const rec2 = getMultisigRecommendations(2);
      expect(rec2).to.have.length(2);
      expect(rec2.find((o) => o.isRecommended)?.threshold).to.equal(2); // 2/2 recommended for pairs

      const rec3 = getMultisigRecommendations(3);
      expect(rec3).to.have.length(3);
      expect(rec3.find((o) => o.isRecommended)?.threshold).to.equal(2); // Majority 2 of 3

      const rec5 = getMultisigRecommendations(5);
      expect(rec5.find((o) => o.isRecommended)?.threshold).to.equal(3); // Majority 3 of 5
    });
  });

  describe("7. Smart Contract Call Encoding against FamilyHub.sol", () => {
    const baseForm = (): VaultForm => ({
      ...emptyVaultForm(),
      name: "Family Vault Test",
      description: "Secure savings",
      guardianIds: [ids[0], ids[1]],
      beneficiaryIds: [ids[1], ids[2]],
      requiredApprovals: 2,
      policyAccepted: true,
      fastWithdrawLimit: "0.5",
      targetGoalAmount: "5.0",
      targetDeadline: new Date(Number(mockTimestamp + 86400n) * 1000).toISOString(),
      roscaRoundDuration: "604800",
      roscaRoundContribution: "0.2",
    });

    it("encodes createCustomVault for SHIELD with exact 7 parameters", () => {
      const config = resolveVaultConfig(
        { ...baseForm(), ruleTemplate: "SHIELD", bufferRatioBps: 2000 },
        wallets,
        mockTimestamp,
      );
      const call = buildVaultCall(config);
      expect(call.functionName).to.equal("createCustomVault");

      const decoded = decodeFunctionData({
        abi: FAMILY_HUB_ABI,
        data: call.data,
      });
      expect(decoded.functionName).to.equal("createCustomVault");
      expect(decoded.args![0]).to.equal("Family Vault Test");
      expect(decoded.args![1]).to.equal(RuleTemplate.SHIELD); // 0
      expect(decoded.args![2]).to.equal(2000n); // bufferRatioBps
      expect(decoded.args![3]).to.equal(parseEther("0.5")); // fastWithdrawLimit
      expect(decoded.args![4]).to.equal(2n); // requiredApprovals
      expect(decoded.args![5]).to.deep.equal([wallets.get(ids[0]), wallets.get(ids[1])]);
      expect(decoded.args![6]).to.deep.equal([wallets.get(ids[1]), wallets.get(ids[2])]);
    });

    it("encodes createCustomVault for MILESTONE with fastWithdrawLimit = 0", () => {
      const config = resolveVaultConfig(
        {
          ...baseForm(),
          ruleTemplate: "MILESTONE",
          guardianIds: [ids[0]],
          requiredApprovals: 1,
          beneficiaryIds: [ids[2]], // Separated from guardian
        },
        wallets,
        mockTimestamp,
      );
      const call = buildVaultCall(config);
      expect(call.functionName).to.equal("createCustomVault");

      const decoded = decodeFunctionData({
        abi: FAMILY_HUB_ABI,
        data: call.data,
      });
      // Crucial constraint: MILESTONE fastWithdrawLimit MUST be 0 in FamilyHub.sol
      expect(decoded.args![3]).to.equal(0n);
    });

    it("encodes createAdvancedVault for ROSCA with 11 parameters and 0 fastWithdrawLimit", () => {
      const config = resolveVaultConfig(
        { ...baseForm(), ruleTemplate: "ROSCA", bufferRatioBps: 0 },
        wallets,
        mockTimestamp,
      );
      const call = buildVaultCall(config);
      expect(call.functionName).to.equal("createAdvancedVault");

      const decoded = decodeFunctionData({
        abi: FAMILY_HUB_ABI,
        data: call.data,
      });
      expect(decoded.functionName).to.equal("createAdvancedVault");
      expect(decoded.args![1]).to.equal(RuleTemplate.ROSCA); // 2
      expect(decoded.args![3]).to.equal(0n); // fastWithdrawLimit MUST be 0 for ROSCA
      expect(decoded.args![7]).to.equal(0n); // targetGoalAmount = 0
      expect(decoded.args![8]).to.equal(0n); // targetDeadline = 0
      expect(decoded.args![9]).to.equal(604800n); // roscaRoundDuration
      expect(decoded.args![10]).to.equal(parseEther("0.2")); // roscaRoundContribution
    });

    it("encodes createAdvancedVault for SHARED_GOAL with 11 parameters and 0 fastWithdrawLimit", () => {
      const config = resolveVaultConfig(
        { ...baseForm(), ruleTemplate: "SHARED_GOAL", bufferRatioBps: 1000 },
        wallets,
        mockTimestamp,
      );
      const call = buildVaultCall(config);
      expect(call.functionName).to.equal("createAdvancedVault");

      const decoded = decodeFunctionData({
        abi: FAMILY_HUB_ABI,
        data: call.data,
      });
      expect(decoded.functionName).to.equal("createAdvancedVault");
      expect(decoded.args![1]).to.equal(RuleTemplate.SHARED_GOAL); // 3
      expect(decoded.args![3]).to.equal(0n); // fastWithdrawLimit MUST be 0 for SHARED_GOAL
      expect(decoded.args![7]).to.equal(parseEther("5.0")); // targetGoalAmount
      expect(decoded.args![8]).to.be.greaterThan(0n); // targetDeadline timestamp
      expect(decoded.args![9]).to.equal(0n); // roscaRoundDuration = 0
      expect(decoded.args![10]).to.equal(0n); // roscaRoundContribution = 0
    });
  });
});
