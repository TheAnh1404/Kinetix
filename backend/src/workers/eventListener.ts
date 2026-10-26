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
  families,
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

// Các sự kiện On-Chain từ FamilyHub.sol
const withdrawalRequestedEvent = parseAbiItem(
  "event WithdrawalRequested(uint256 indexed requestId, address indexed requester, uint8 indexed vaultType, uint256 amount, address recipient, string reason, uint256 deadline)"
);

const withdrawalApprovedEvent = parseAbiItem(
  "event WithdrawalApproved(uint256 indexed requestId, address indexed guardian, uint256 currentApprovals)"
);

const withdrawalExecutedEvent = parseAbiItem(
  "event WithdrawalExecuted(uint256 indexed requestId, address indexed recipient, uint256 amount, bool fullyFundedFromLocalBuffer)"
);

const fundsDepositedEvent = parseAbiItem(
  "event FundsDeposited(uint8 indexed vaultType, address indexed depositor, uint256 totalAmount, uint256 toBuffer, uint256 toBridge)"
);

const choreClaimedEvent = parseAbiItem(
  "event ChoreClaimed(uint256 indexed taskId, address indexed kidAddress)"
);

const choreRewardedEvent = parseAbiItem(
  "event ChoreRewarded(uint256 indexed taskId, address indexed kidAddress, uint256 rewardAmount)"
);

/**
 * 1. Lắng nghe yêu cầu rút tiền lớn (WithdrawalRequested)
 */
function watchWithdrawalRequests() {
  console.log("👂 Đang lắng nghe sự kiện: WithdrawalRequested...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: withdrawalRequestedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { requestId, requester, vaultType, amount, recipient, reason } = log.args;
        if (!requestId || !requester || amount === undefined) continue;

        const onchainReqId = Number(requestId);
        const amountEther = Number(formatEther(amount));
        console.log(`\n🚨 [EVENT] Phát hiện yêu cầu rút tiền on-chain ID #${onchainReqId}`);
        console.log(`   Người rút: ${requester} -> ${amountEther} AVAX/USDC | Lý do: ${reason}`);

        // Tìm người dùng trong database
        const matchingUsers = await db
          .select()
          .from(users)
          .where(sql`LOWER(${users.walletAddress}) = LOWER(${requester})`);

        let targetFamilyId: string;
        let requesterId: string;

        if (matchingUsers.length > 0) {
          targetFamilyId = matchingUsers[0].familyId;
          requesterId = matchingUsers[0].id;
        } else {
          const defaultFam = await db.select().from(families).limit(1);
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

        // Kiểm tra xem đã có bản ghi chưa
        const existing = await db
          .select()
          .from(withdrawalRequests)
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));

        const vaultNames: ("RetirementShield" | "KidsSavings" | "FamilyROSCA")[] = [
          "RetirementShield",
          "KidsSavings",
          "FamilyROSCA",
        ];
        const vaultName = vaultNames[vaultType ?? 0] || "RetirementShield";

        if (existing.length === 0) {
          await db.insert(withdrawalRequests).values({
            familyId: targetFamilyId,
            requesterId: requesterId,
            amount: amountEther.toFixed(6),
            vault: vaultName,
            reason: reason || "Yêu cầu từ On-Chain",
            onchainRequestId: onchainReqId,
            approvalsCount: 0,
            requiredApprovals: 2,
            status: "PENDING",
            txHash: log.transactionHash,
          });
        }

        // Tạo thông báo cảnh báo lừa đảo khẩn cấp gửi cho Guardians
        const guardians = await db
          .select()
          .from(users)
          .where(sql`${users.familyId} = ${targetFamilyId} AND ${users.role} IN ('ADMIN', 'GUARDIAN')`);

        for (const g of guardians) {
          await db.insert(notifications).values({
            familyId: targetFamilyId,
            userId: g.id,
            title: "🚨 ON-CHAIN ALERT: CẢNH BÁO RÚT TIỀN LỚN!",
            message: `Hợp đồng FamilyHub ghi nhận yêu cầu #${onchainReqId} rút ${amountEther} USDC từ ví ${requester}. Cần 2/3 chữ ký bảo hộ duyệt on-chain!`,
            type: "ALERT_SCAM",
            isRead: false,
          });
        }
      }
    },
    onError: (err) => console.error("Lỗi watchWithdrawalRequests:", err),
  });
}

/**
 * 2. Lắng nghe Guardian ký duyệt (WithdrawalApproved)
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
        const approvals = Number(currentApprovals);
        console.log(`\n✍️ [EVENT] Guardian ${guardian} ký duyệt yêu cầu #${onchainReqId} (${approvals}/2 chữ ký)`);

        const isApproved = approvals >= 2;
        await db
          .update(withdrawalRequests)
          .set({
            approvalsCount: approvals,
            status: isApproved ? "APPROVED" : "PENDING",
          })
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));
      }
    },
    onError: (err) => console.error("Lỗi watchWithdrawalApproved:", err),
  });
}

/**
 * 3. Lắng nghe giải ngân thành công (WithdrawalExecuted)
 */
function watchWithdrawalExecuted() {
  console.log("👂 Đang lắng nghe sự kiện: WithdrawalExecuted...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: withdrawalExecutedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { requestId, recipient, amount, fullyFundedFromLocalBuffer } = log.args;
        if (!requestId || amount === undefined) continue;

        const onchainReqId = Number(requestId);
        const amountEther = formatEther(amount);
        console.log(`\n💸 [EVENT] Giải ngân thành công yêu cầu #${onchainReqId}: ${amountEther} AVAX/USDC tới ${recipient}`);
        console.log(`   Nguồn chi trả: ${fullyFundedFromLocalBuffer ? "100% Bộ đệm L1" : "Bộ đệm L1 + Cầu nối C-Chain"}`);

        await db
          .update(withdrawalRequests)
          .set({
            status: "EXECUTED",
            txHash: log.transactionHash,
          })
          .where(eq(withdrawalRequests.onchainRequestId, onchainReqId));
      }
    },
    onError: (err) => console.error("Lỗi watchWithdrawalExecuted:", err),
  });
}

/**
 * 4. Lắng nghe nạp tiền và phân bổ đệm 10/90 (FundsDeposited)
 */
function watchFundsDeposited() {
  console.log("👂 Đang lắng nghe sự kiện: FundsDeposited (10/90 Buffer)...");
  return publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: fundsDepositedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { vaultType, depositor, totalAmount, toBuffer, toBridge } = log.args;
        if (totalAmount === undefined || toBuffer === undefined || toBridge === undefined) continue;

        console.log(`\n💰 [EVENT] Nạp tiền vào Hũ #${vaultType} từ ${depositor}`);
        console.log(`   Tổng nạp:   ${formatEther(totalAmount)} AVAX`);
        console.log(`   - 10% L1:   ${formatEther(toBuffer)} AVAX (Chi tiêu tức thì)`);
        console.log(`   - 90% C-Chain: ${formatEther(toBridge)} AVAX (Đẩy sang Vault sinh lời 8% APY)`);
      }
    },
    onError: (err) => console.error("Lỗi watchFundsDeposited:", err),
  });
}

/**
 * 5. Lắng nghe các sự kiện Chore-to-Earn
 */
function watchChoreEvents() {
  console.log("👂 Đang lắng nghe sự kiện: ChoreClaimed & ChoreRewarded...");

  publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: choreClaimedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { taskId, kidAddress } = log.args;
        if (!taskId) continue;
        console.log(`\n🎒 [EVENT] Bé ${kidAddress} báo cáo hoàn thành nhiệm vụ #${taskId}`);
        await db
          .update(chores)
          .set({ status: "SUBMITTED" })
          .where(eq(chores.onchainTaskId, Number(taskId)));
      }
    },
  });

  publicClient.watchEvent({
    address: HUB_ADDRESS,
    event: choreRewardedEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { taskId, kidAddress, rewardAmount } = log.args;
        if (!taskId || rewardAmount === undefined) continue;
        console.log(`\n🎉 [EVENT] Trả thưởng nhiệm vụ #${taskId}: ${formatEther(rewardAmount)} USDC cho bé ${kidAddress}`);
        await db
          .update(chores)
          .set({ status: "REWARDED" })
          .where(eq(chores.onchainTaskId, Number(taskId)));
      }
    },
  });
}

// Khởi chạy toàn bộ worker
export async function startWorker() {
  console.log("⚡ Khởi động toàn bộ Blockchain Event Listeners...");
  watchWithdrawalRequests();
  watchWithdrawalApproved();
  watchWithdrawalExecuted();
  watchFundsDeposited();
  watchChoreEvents();
  console.log("🟢 Worker đã sẵn sàng và đang nhận sự kiện realtime!");
}

if (process.env.NODE_ENV !== "test") {
  startWorker();
}
