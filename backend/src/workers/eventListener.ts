import {
  createPublicClient,
  http,
  parseAbiItem,
  Address,
  formatEther,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { db } from "../db";
import {
  withdrawalRequests,
  notifications,
  chores,
  users,
  workspaces,
  vaults,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

// Cấu hình RPC và địa chỉ Smart Contract
const RPC_URL = process.env.FAMILY_L1_RPC_URL || process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const HUB_ADDRESS = (process.env.FAMILY_HUB_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Address;

console.log("=================================================");
console.log("🛰️  KINETIX BLOCKCHAIN EVENT LISTENER WORKER");
console.log("=================================================");
console.log(`🔗 RPC URL:      ${RPC_URL}`);
console.log(`📍 Hub Address:  ${HUB_ADDRESS}`);
console.log("=================================================\n");

// Khởi tạo Viem Client
const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(RPC_URL),
});

// Các sự kiện On-Chain từ FamilyHub.sol (Dynamic & Composable Multi-Space Vaults)
const vaultCreatedEvent = parseAbiItem(
  "event VaultCreated(uint256 indexed vaultId, string name, uint8 indexed ruleType, uint256 bufferRatioBps, uint256 fastWithdrawLimit, uint256 requiredApprovals)"
);

const depositToVaultEvent = parseAbiItem(
  "event DepositToVault(uint256 indexed vaultId, address indexed depositor, uint256 totalAmount, uint256 toBuffer, uint256 toBridge)"
);

const fastWithdrawalExecutedEvent = parseAbiItem(
  "event FastWithdrawalExecuted(uint256 indexed vaultId, address indexed recipient, uint256 amount)"
);

const withdrawalRequestedEvent = parseAbiItem(
  "event WithdrawalRequested(uint256 indexed requestId, uint256 indexed vaultId, address indexed requester, uint256 amount, address recipient, string reason, uint256 deadline)"
);

const withdrawalApprovedEvent = parseAbiItem(
  "event WithdrawalApproved(uint256 indexed requestId, uint256 indexed vaultId, address indexed guardian, uint256 currentApprovals)"
);

const withdrawalExecutedEvent = parseAbiItem(
  "event WithdrawalExecuted(uint256 indexed requestId, uint256 indexed vaultId, address indexed recipient, uint256 amount, bool fullyFundedFromLocalBuffer)"
);

const choreClaimedEvent = parseAbiItem(
  "event ChoreClaimed(uint256 indexed taskId, uint256 indexed vaultId, address indexed kidAddress)"
);

const choreRewardedEvent = parseAbiItem(
  "event ChoreRewarded(uint256 indexed taskId, uint256 indexed vaultId, address indexed kidAddress, uint256 rewardAmount)"
);

/**
 * 1. Lắng nghe nạp tiền vào Hũ Động (DepositToVault)
 */
function watchDepositToVault() {
  console.log("👂 Đang lắng nghe sự kiện: DepositToVault...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: depositToVaultEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { vaultId, depositor, totalAmount, toBuffer, toBridge } = log.args;
        if (vaultId === undefined || totalAmount === undefined) continue;

        const onchainId = Number(vaultId);
        const totalAvax = Number(formatEther(totalAmount));
        const bufferAvax = Number(formatEther(toBuffer ?? 0n));
        console.log(`\n💰 [EVENT] Nạp tiền vào Hũ ID #${onchainId}: ${totalAvax} AVAX (L1 Buffer: ${bufferAvax} AVAX)`);

        // Cập nhật số dư trong database
        const [matchingVault] = await db
          .select()
          .from(vaults)
          .where(eq(vaults.onchainVaultId, onchainId));

        if (matchingVault) {
          const newTotal = (Number(matchingVault.cachedTotalBalance) + totalAvax).toFixed(6);
          const newBuffer = (Number(matchingVault.cachedL1Buffer) + bufferAvax).toFixed(6);

          await db
            .update(vaults)
            .set({
              cachedTotalBalance: newTotal,
              cachedL1Buffer: newBuffer,
            })
            .where(eq(vaults.id, matchingVault.id));
        }
      }
    },
  });
}

/**
 * 2. Lắng nghe yêu cầu rút tiền lớn (WithdrawalRequested)
 */
function watchWithdrawalRequests() {
  console.log("👂 Đang lắng nghe sự kiện: WithdrawalRequested...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: withdrawalRequestedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { requestId, vaultId, requester, amount, recipient, reason } = log.args;
        if (!requestId || !requester || amount === undefined) continue;

        const onchainReqId = Number(requestId);
        const onchainVaultId = vaultId !== undefined ? Number(vaultId) : 1;
        const amountEther = Number(formatEther(amount));
        console.log(`\n🚨 [EVENT] Phát hiện yêu cầu rút tiền on-chain ID #${onchainReqId} (Hũ #${onchainVaultId})`);
        console.log(`   Người rút: ${requester} -> ${amountEther} AVAX | Lý do: ${reason}`);

        const matchingUsers = await db
          .select()
          .from(users)
          .where(sql`LOWER(${users.walletAddress}) = LOWER(${requester})`);

        let targetFamilyId: string;
        let requesterId: string;

        if (matchingUsers.length > 0) {
          targetFamilyId = matchingUsers[0].familyId || "";
          requesterId = matchingUsers[0].id;
        } else {
          const defaultFam = await db.select().from(workspaces).limit(1);
          if (defaultFam.length === 0) continue;
          targetFamilyId = defaultFam[0].id;

          const [autoUser] = await db
            .insert(users)
            .values({
              familyId: targetFamilyId,
              fullName: `Ví ${requester.slice(0, 6)}...${requester.slice(-4)}`,
              role: "ELDERLY",
              walletAddress: requester,
            })
            .returning();
          requesterId = autoUser.id;
        }

        const [matchingVault] = await db
          .select()
          .from(vaults)
          .where(eq(vaults.onchainVaultId, onchainVaultId));

        const existing = await db
          .select()
          .from(withdrawalRequests)
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));

        if (existing.length === 0) {
          await db.insert(withdrawalRequests).values({
            familyId: targetFamilyId,
            vaultId: matchingVault ? matchingVault.id : null,
            requesterId: requesterId,
            amount: amountEther.toFixed(6),
            vault: matchingVault ? matchingVault.name : "SHIELD",
            reason: reason || "Yêu cầu từ On-Chain",
            onchainRequestId: onchainReqId,
            approvalsCount: 0,
            requiredApprovals: matchingVault ? matchingVault.requiredApprovals : 2,
            status: "PENDING",
            txHash: log.transactionHash,
          });
        }

        const guardians = await db
          .select()
          .from(users)
          .where(sql`${users.familyId} = ${targetFamilyId} AND ${users.role} IN ('ADMIN', 'GUARDIAN')`);

        for (const g of guardians) {
          await db.insert(notifications).values({
            familyId: targetFamilyId,
            userId: g.id,
            title: "🚨 ON-CHAIN ALERT: CẢNH BÁO RÚT TIỀN LỚN!",
            message: `Hợp đồng FamilyHub ghi nhận yêu cầu #${onchainReqId} rút ${amountEther} AVAX từ ví ${requester}. Cần xác nhận đa chữ ký để giải ngân!`,
            type: "ALERT_SCAM",
            isRead: false,
          });
        }
      }
    },
  });
}

/**
 * 3. Lắng nghe Guardian ký duyệt (WithdrawalApproved)
 */
function watchWithdrawalApproved() {
  console.log("👂 Đang lắng nghe sự kiện: WithdrawalApproved...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: withdrawalApprovedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { requestId, guardian, currentApprovals } = log.args;
        if (!requestId || currentApprovals === undefined) continue;

        const onchainReqId = Number(requestId);
        const count = Number(currentApprovals);
        console.log(`\n✍️ [EVENT] Ký duyệt on-chain ID #${onchainReqId} bởi Guardian: ${guardian} (${count} chữ ký)`);

        const [request] = await db
          .select()
          .from(withdrawalRequests)
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));

        if (request) {
          const isApproved = count >= request.requiredApprovals;
          await db
            .update(withdrawalRequests)
            .set({
              approvalsCount: count,
              status: isApproved ? "APPROVED" : "PENDING",
            })
            .where(eq(withdrawalRequests.id, request.id));
        }
      }
    },
  });
}

/**
 * 4. Lắng nghe giải ngân thành công (WithdrawalExecuted)
 */
function watchWithdrawalExecuted() {
  console.log("👂 Đang lắng nghe sự kiện: WithdrawalExecuted...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: withdrawalExecutedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { requestId, recipient, amount } = log.args;
        if (!requestId || amount === undefined) continue;

        const onchainReqId = Number(requestId);
        const amountEther = Number(formatEther(amount));
        console.log(`\n🎉 [EVENT] Giải ngân thành công on-chain ID #${onchainReqId}: ${amountEther} AVAX tới ${recipient}`);

        await db
          .update(withdrawalRequests)
          .set({ status: "EXECUTED" })
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));
      }
    },
  });
}

/**
 * 5. Lắng nghe hoàn thành việc nhà (ChoreRewarded)
 */
function watchChoreRewarded() {
  console.log("👂 Đang lắng nghe sự kiện: ChoreRewarded...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: choreRewardedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { taskId, kidAddress, rewardAmount } = log.args;
        if (!taskId || rewardAmount === undefined) continue;

        const onchainTaskId = Number(taskId);
        console.log(`\n🌟 [EVENT] Thưởng việc nhà on-chain Task #${onchainTaskId} cho ${kidAddress}`);

        await db
          .update(chores)
          .set({ status: "REWARDED" })
          .where(eq(chores.onchainTaskId, onchainTaskId));
      }
    },
  });
}

async function startWorker() {
  try {
    watchDepositToVault();
    watchWithdrawalRequests();
    watchWithdrawalApproved();
    watchWithdrawalExecuted();
    watchChoreRewarded();
    console.log("🚀 Kinetix Event Listener Worker đang chạy và sẵn sàng bắt sự kiện...");
  } catch (error) {
    console.error("❌ Lỗi khi khởi động Event Listener Worker:", error);
    process.exit(1);
  }
}

startWorker();
