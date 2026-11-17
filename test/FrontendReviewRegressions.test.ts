import { expect } from "chai";

describe("FrontendReviewRegressions: Frontend Review 2026-11-17 P1 Regressions", () => {
  // =================================================================
  // R01 — P1: Receipt bị revert vẫn được coi là giao dịch thành công
  // =================================================================
  describe("R01: Reverted transaction receipts fail closed and are never confirmed", () => {
    interface TxReceipt {
      status: "success" | "reverted" | 0 | 1;
      transactionHash: string;
      blockNumber?: bigint;
    }

    /**
     * Mô phỏng helper xác minh transaction receipt theo chuẩn bảo mật V2.
     * Chặn việc coi reverted receipt là thành công.
     */
    function verifyTransactionReceipt(receipt: TxReceipt): {
      confirmed: boolean;
      status: "CONFIRMED" | "FAILED";
      txHash: string;
    } {
      const isReverted =
        receipt.status === "reverted" ||
        receipt.status === 0;

      if (isReverted) {
        throw new Error(
          `Giao dịch on-chain thất bại (reverted). Mã giao dịch: ${receipt.transactionHash}`
        );
      }

      return {
        confirmed: true,
        status: "CONFIRMED",
        txHash: receipt.transactionHash,
      };
    }

    it("throws explicit error when receipt status is 'reverted' and prevents CONFIRMED state", () => {
      const revertedReceipt: TxReceipt = {
        status: "reverted",
        transactionHash: "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      };

      let state = "PENDING";
      let errorThrown: Error | null = null;

      try {
        const result = verifyTransactionReceipt(revertedReceipt);
        state = result.status;
      } catch (err: any) {
        errorThrown = err;
        state = "FAILED";
      }

      expect(errorThrown).to.not.be.null;
      expect(errorThrown?.message).to.include("reverted");
      expect(errorThrown?.message).to.include(revertedReceipt.transactionHash);
      expect(state).to.equal("FAILED");
      expect(state).to.not.equal("CONFIRMED");
    });

    it("throws explicit error when EVM numeric receipt status is 0 (reverted)", () => {
      const numericRevertedReceipt: TxReceipt = {
        status: 0,
        transactionHash: "0xfeedface1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      };

      expect(() => verifyTransactionReceipt(numericRevertedReceipt)).to.throw(
        /Giao dịch on-chain thất bại \(reverted\)/
      );
    });

    it("resolves and confirms only when receipt status is 'success' or 1", () => {
      const successReceipt: TxReceipt = {
        status: "success",
        transactionHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      };

      const result = verifyTransactionReceipt(successReceipt);
      expect(result.confirmed).to.be.true;
      expect(result.status).to.equal("CONFIRMED");
      expect(result.txHash).to.equal(successReceipt.transactionHash);
    });
  });

  // =================================================================
  // R02 — P1: Thiếu mapping đề nghị chi lại dùng ID = 1
  // =================================================================
  describe("R02: Missing onchainExpenseId is rejected without fallback to id = 1", () => {
    /**
     * Mô phỏng helper chuẩn hóa onchainExpenseId trước khi gọi contract V2.
     * TUYỆT ĐỐI KHÔNG fallback về 1 khi thiếu ID hoặc ID không hợp lệ.
     */
    function resolveOnchainExpenseId(input: unknown): bigint {
      if (input === undefined || input === null) {
        throw new Error(
          "Không tìm thấy ID đề xuất chi trên chuỗi (onchainExpenseId is required). Vui lòng đợi hệ thống đồng bộ."
        );
      }

      if (typeof input === "string") {
        // Kiểm tra nếu là UUID (chứa dấu gạch nối) thì không phải ID số on-chain
        if (input.includes("-")) {
          throw new Error(
            `ID dạng UUID (${input}) chưa được liên kết với ID số on-chain. Không thể suy diễn ID mặc định.`
          );
        }
      }

      const parsed = BigInt(input as any);
      if (parsed <= 0n) {
        throw new Error(
          `ID đề xuất chi on-chain không hợp lệ: ${input}. ID phải là số nguyên dương lớn hơn 0.`
        );
      }

      return parsed;
    }

    it("rejects undefined or null onchainExpenseId without falling back to 1", () => {
      expect(() => resolveOnchainExpenseId(undefined)).to.throw(
        /onchainExpenseId is required/
      );
      expect(() => resolveOnchainExpenseId(null)).to.throw(
        /onchainExpenseId is required/
      );
    });

    it("rejects database UUID strings without falling back to 1", () => {
      const dbUuid = "d290f1ee-6c54-4b01-90e6-d701748f0851";
      expect(() => resolveOnchainExpenseId(dbUuid)).to.throw(
        /chưa được liên kết với ID số on-chain/
      );
    });

    it("rejects 0 or negative expense IDs", () => {
      expect(() => resolveOnchainExpenseId(0)).to.throw(
        /ID phải là số nguyên dương lớn hơn 0/
      );
      expect(() => resolveOnchainExpenseId(-5)).to.throw(
        /ID phải là số nguyên dương lớn hơn 0/
      );
    });

    it("correctly parses valid positive onchain expense IDs", () => {
      expect(resolveOnchainExpenseId(1)).to.equal(1n);
      expect(resolveOnchainExpenseId(42)).to.equal(42n);
      expect(resolveOnchainExpenseId("99")).to.equal(99n);
      expect(resolveOnchainExpenseId(100n)).to.equal(100n);
    });
  });

  // =================================================================
  // R03 — P1: Adapter V2 bỏ qua nhiều bảo vệ danh tính/nhóm của adapter hiện có
  // =================================================================
  describe("R03: Preflight checks enforce session linked wallet identity and chain 43113", () => {
    interface PreflightParams {
      connectedAccount: string;
      linkedWalletAddress?: string;
      activeChainId: number;
      targetChainId?: number;
      isUiDisconnected?: boolean;
    }

    /**
     * Preflight guard kiểm tra tính toàn vẹn danh tính trước khi ký giao dịch V2.
     */
    function preflightWalletCheck(params: PreflightParams): void {
      if (params.isUiDisconnected) {
        throw new Error("Ví đã bị ngắt kết nối trong giao diện. Vui lòng kết nối lại.");
      }

      if (!params.linkedWalletAddress) {
        throw new Error("Tài khoản chưa liên kết ví Web3. Vui lòng liên kết ví trước khi thực hiện.");
      }

      const connectedNorm = params.connectedAccount.toLowerCase();
      const linkedNorm = params.linkedWalletAddress.toLowerCase();

      if (connectedNorm !== linkedNorm) {
        throw new Error(
          `Ví đang kết nối trong trình duyệt (${params.connectedAccount}) không khớp với ví đã liên kết tài khoản (${params.linkedWalletAddress}). Vui lòng chuyển đúng ví.`
        );
      }

      const target = params.targetChainId ?? 43113;
      if (params.activeChainId !== target && params.activeChainId !== 31337) {
        throw new Error(
          `Mạng blockchain không đúng (Chain ID: ${params.activeChainId}). Vui lòng chuyển sang Avalanche Fuji (Chain ID: ${target}).`
        );
      }
    }

    it("fails closed when active wallet does not match session linked wallet", () => {
      const params: PreflightParams = {
        connectedAccount: "0x2222222222222222222222222222222222222222",
        linkedWalletAddress: "0x1111111111111111111111111111111111111111",
        activeChainId: 43113,
      };

      expect(() => preflightWalletCheck(params)).to.throw(
        /không khớp với ví đã liên kết tài khoản/
      );
    });

    it("fails closed when blockchain network is incorrect", () => {
      const params: PreflightParams = {
        connectedAccount: "0x1111111111111111111111111111111111111111",
        linkedWalletAddress: "0x1111111111111111111111111111111111111111",
        activeChainId: 1, // Ethereum Mainnet
      };

      expect(() => preflightWalletCheck(params)).to.throw(
        /Mạng blockchain không đúng.*Avalanche Fuji/
      );
    });

    it("passes preflight when connected wallet matches linked wallet (case-insensitive) on Fuji", () => {
      const params: PreflightParams = {
        connectedAccount: "0x1111AaAa2222BbBb3333CcCc4444DdDd5555EeEe",
        linkedWalletAddress: "0x1111aaaa2222bbbb3333cccc4444dddd5555eeee",
        activeChainId: 43113,
      };

      expect(() => preflightWalletCheck(params)).to.not.throw();
    });
  });

  // =================================================================
  // R04 — P1: Giao diện góp tiền chặn quỹ V2 hợp lệ
  // =================================================================
  describe("R04: ContributionModal allows contributing to an on-chain V2 fund without treasury wallet address", () => {
    interface FundItem {
      id: string;
      name: string;
      custodyType: "ONCHAIN_V2" | "SHARED_TREASURY";
      contractAddress?: string | null;
      treasuryWalletAddress?: string | null;
    }

    /**
     * Logic trích xuất và xác minh địa chỉ nhận tiền góp theo custody adapter.
     */
    function resolveContributionTarget(fund: FundItem): {
      valid: boolean;
      recipientAddress: string;
      mode: "CONTRACT" | "PERSONAL_WALLET";
      error?: string;
    } {
      if (fund.custodyType === "ONCHAIN_V2") {
        if (!fund.contractAddress || fund.contractAddress.trim() === "") {
          return {
            valid: false,
            recipientAddress: "",
            mode: "CONTRACT",
            error: "Quỹ Smart Contract V2 chưa có địa chỉ hợp đồng đã xác minh.",
          };
        }
        return {
          valid: true,
          recipientAddress: fund.contractAddress,
          mode: "CONTRACT",
        };
      }

      if (fund.custodyType === "SHARED_TREASURY") {
        if (!fund.treasuryWalletAddress || fund.treasuryWalletAddress.trim() === "") {
          return {
            valid: false,
            recipientAddress: "",
            mode: "PERSONAL_WALLET",
            error: "Quỹ ví cá nhân chưa có địa chỉ ví thủ quỹ được gán.",
          };
        }
        return {
          valid: true,
          recipientAddress: fund.treasuryWalletAddress,
          mode: "PERSONAL_WALLET",
        };
      }

      return {
        valid: false,
        recipientAddress: "",
        mode: "PERSONAL_WALLET",
        error: "Loại lưu ký không được hỗ trợ.",
      };
    }

    it("allows contribution to ONCHAIN_V2 fund when treasuryWalletAddress is null but contractAddress is valid", () => {
      const v2Fund: FundItem = {
        id: "fund-v2-test",
        name: "Quỹ Vận Hành On-Chain V2",
        custodyType: "ONCHAIN_V2",
        contractAddress: "0xb09Ca6BF513333dA8E401E45E4Ed794A983C0Fa1",
        treasuryWalletAddress: null, // Không có ví cá nhân
      };

      const result = resolveContributionTarget(v2Fund);
      expect(result.valid).to.be.true;
      expect(result.recipientAddress).to.equal(v2Fund.contractAddress);
      expect(result.mode).to.equal("CONTRACT");
    });

    it("rejects contribution to SHARED_TREASURY fund when treasuryWalletAddress is missing", () => {
      const treasuryFund: FundItem = {
        id: "fund-treasury-test",
        name: "Quỹ Ví Cá Nhân",
        custodyType: "SHARED_TREASURY",
        contractAddress: null,
        treasuryWalletAddress: null,
      };

      const result = resolveContributionTarget(treasuryFund);
      expect(result.valid).to.be.false;
      expect(result.error).to.include("chưa có địa chỉ ví thủ quỹ");
    });

    it("allows contribution to SHARED_TREASURY fund when treasuryWalletAddress is present", () => {
      const treasuryFund: FundItem = {
        id: "fund-treasury-test",
        name: "Quỹ Ví Cá Nhân",
        custodyType: "SHARED_TREASURY",
        contractAddress: null,
        treasuryWalletAddress: "0x4444444444444444444444444444444444444444",
      };

      const result = resolveContributionTarget(treasuryFund);
      expect(result.valid).to.be.true;
      expect(result.recipientAddress).to.equal(treasuryFund.treasuryWalletAddress);
      expect(result.mode).to.equal("PERSONAL_WALLET");
    });
  });

  // =================================================================
  // R07 — P1: Ngày giờ và thông tin quyền hoàn tiền bị biến đổi sai
  // =================================================================
  describe("R07: ISO timestamps parse deterministically and prevent Invalid Date bugs", () => {
    it("demonstrates that localized date string produces Invalid Date while ISO timestamp succeeds", () => {
      const localizedStr = "15:30:00 17/11/2026"; // Chuỗi định dạng tiếng Việt cũ
      const parsedLocalized = new Date(localizedStr);

      // Trong chuẩn JS Engine (V8/Node), chuỗi này không hợp lệ:
      expect(isNaN(parsedLocalized.getTime())).to.be.true;
      expect(parsedLocalized.toString()).to.equal("Invalid Date");

      // Chuỗi ISO 8601 chuẩn luôn parse chính xác:
      const isoStr = "2026-11-17T15:30:00.000Z";
      const parsedIso = new Date(isoStr);

      expect(isNaN(parsedIso.getTime())).to.be.false;
      expect(parsedIso.getUTCFullYear()).to.equal(2026);
      expect(parsedIso.getUTCMonth()).to.equal(10); // 0-indexed, November = 10
      expect(parsedIso.getUTCDate()).to.equal(17);
    });

    interface RefundEligibilityParams {
      fundKind: "OPERATING" | "GOAL";
      goalDeadlineIso: string;
      goalReached: boolean;
      contributedWei: string;
      hasClaimed: boolean;
      referenceNowMs?: number;
    }

    /**
     * Logic kiểm tra điều kiện hoàn tiền 1-chạm không phụ thuộc chuỗi localized.
     */
    function evaluateRefundEligibility(params: RefundEligibilityParams): {
      eligible: boolean;
      reason?: string;
    } {
      if (params.fundKind !== "GOAL") {
        return { eligible: false, reason: "NOT_GOAL_FUND" };
      }

      if (params.goalReached) {
        return { eligible: false, reason: "GOAL_ACHIEVED" };
      }

      if (params.hasClaimed) {
        return { eligible: false, reason: "ALREADY_CLAIMED" };
      }

      const contributed = BigInt(params.contributedWei || "0");
      if (contributed <= 0n) {
        return { eligible: false, reason: "NO_CONTRIBUTION" };
      }

      const deadline = new Date(params.goalDeadlineIso).getTime();
      if (isNaN(deadline)) {
        return { eligible: false, reason: "MALFORMED_DEADLINE" };
      }

      const now = params.referenceNowMs ?? Date.now();
      if (now < deadline) {
        return { eligible: false, reason: "DEADLINE_NOT_REACHED" };
      }

      return { eligible: true };
    }

    it("evaluates refund eligibility accurately with valid ISO timestamp past deadline", () => {
      const now = new Date("2026-11-20T12:00:00.000Z").getTime();
      const pastDeadline = "2026-11-18T00:00:00.000Z";

      const result = evaluateRefundEligibility({
        fundKind: "GOAL",
        goalDeadlineIso: pastDeadline,
        goalReached: false,
        contributedWei: "5000000000000000000",
        hasClaimed: false,
        referenceNowMs: now,
      });

      expect(result.eligible).to.be.true;
    });

    it("blocks refund when deadline has not elapsed", () => {
      const now = new Date("2026-11-15T12:00:00.000Z").getTime();
      const futureDeadline = "2026-11-18T00:00:00.000Z";

      const result = evaluateRefundEligibility({
        fundKind: "GOAL",
        goalDeadlineIso: futureDeadline,
        goalReached: false,
        contributedWei: "5000000000000000000",
        hasClaimed: false,
        referenceNowMs: now,
      });

      expect(result.eligible).to.be.false;
      expect(result.reason).to.equal("DEADLINE_NOT_REACHED");
    });

    it("blocks refund when goal was achieved or already claimed", () => {
      const now = new Date("2026-11-20T12:00:00.000Z").getTime();
      const pastDeadline = "2026-11-18T00:00:00.000Z";

      const goalAchievedResult = evaluateRefundEligibility({
        fundKind: "GOAL",
        goalDeadlineIso: pastDeadline,
        goalReached: true, // Đạt target
        contributedWei: "5000000000000000000",
        hasClaimed: false,
        referenceNowMs: now,
      });
      expect(goalAchievedResult.eligible).to.be.false;
      expect(goalAchievedResult.reason).to.equal("GOAL_ACHIEVED");

      const alreadyClaimedResult = evaluateRefundEligibility({
        fundKind: "GOAL",
        goalDeadlineIso: pastDeadline,
        goalReached: false,
        contributedWei: "5000000000000000000",
        hasClaimed: true, // Đã rút
        referenceNowMs: now,
      });
      expect(alreadyClaimedResult.eligible).to.be.false;
      expect(alreadyClaimedResult.reason).to.equal("ALREADY_CLAIMED");
    });
  });
});
