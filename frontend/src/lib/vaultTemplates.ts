/**
 * Kinetix Vault Templates & Financial Calculation Utilities
 * 
 * Provides:
 * 1. 4 Core High-Impact Vault Templates (SHIELD, MILESTONE, ROSCA, SHARED_GOAL)
 * 2. Smart financial defaults and constraints matching FamilyHub.sol
 * 3. BPS <-> Percentage conversion utilities
 * 4. AVAX <-> Wei conversions with safety boundary checks
 * 5. Avalanche Dual-Chain Real-Time APY Projection Engine (8.0% C-Chain accrual)
 * 6. Full re-exports and interoperability with Vault Design Tokens
 */

import { formatEther, parseEther } from "viem";
import { RuleTemplate } from "../contracts/config";
import {
  VAULT_PRESETS,
  calculateEffectiveApy,
  simulateVaultYield,
  getMultisigRecommendations,
  LIQUIDITY_PRESETS,
  MultisigThresholdOption,
  LiquidityPresetOption,
  VaultPresetDefinition,
} from "../components/vaults/create/designTokens";

export { RuleTemplate };

export type VaultRuleType = "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";

/** C-Chain Fuji Yield Vault annual APY rate (8.0% simple annual accrual as defined in FamilyYieldVault.sol) */
export const CCHAIN_APY_RATE = 0.08;
export const BPS_DIVISOR = 10000;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;
export const MAX_STORED_WEI = 10n ** 38n - 1n;

export interface VaultTemplateDefinition {
  id: VaultRuleType;
  ruleTemplate: RuleTemplate;
  title: string;
  subtitle: string;
  tagline: string;
  badge: string;
  description: string;
  features: string[];
  accentColor: "emerald" | "cyan" | "indigo" | "amber";
  iconName: "shield" | "target" | "trophy" | "users";
  
  // Smart financial defaults
  defaultBufferRatioBps: number; // e.g. 2000 = 20%
  defaultFastWithdrawLimit: string; // in AVAX (Must be "0" for non-SHIELD in FamilyHub.sol)
  defaultRequiredApprovals: number; // M of N
  defaultTargetGoalAmount?: string; // in AVAX (for SHARED_GOAL)
  defaultTargetDays?: number; // Days until deadline
  defaultRoscaRoundDuration?: string; // in seconds (for ROSCA, e.g. 604800 = 7 days)
  defaultRoscaRoundContribution?: string; // in AVAX (for ROSCA)
  
  recommendedFor: string;
  suggestedNames: string[];
  contractConstraints: {
    requiresZeroFastWithdraw: boolean;
    requiresTargetGoal: boolean;
    requiresRoscaConfig: boolean;
    separateEarnerFromGuardian: boolean;
  };
}

export const VAULT_TEMPLATES: Record<VaultRuleType, VaultTemplateDefinition> = {
  SHIELD: {
    id: "SHIELD",
    ruleTemplate: RuleTemplate.SHIELD,
    title: "Hũ Khẩn Cấp & Trợ Cấp",
    subtitle: "Rút nhanh 0 gas & đệm an toàn",
    tagline: "Chi tiêu tức thì 0 gas, khoản lớn duyệt an toàn",
    badge: "20% Đệm L1 • 80% C-Chain",
    description: "Khoản nhỏ rút ngay tức thì 0 gas từ bộ đệm L1. Khoản lớn trên hạn mức cần Hội đồng Người bảo hộ ký duyệt on-chain.",
    features: [
      "Rút tiền tức thì <1s, 0 gas fee từ đệm L1",
      "80% vốn nhàn rỗi tự động sinh lời 8% APY trên C-Chain (~6.4% APY hiệu dụng)",
      "Đa chữ ký M/N bảo vệ các giao dịch chi tiêu lớn",
      "Hạn mức rút nhanh tùy chỉnh linh hoạt theo ngày"
    ],
    accentColor: "emerald",
    iconName: "shield",
    defaultBufferRatioBps: 2000, // 20% L1 đệm rút nhanh, 80% C-Chain 8% APY
    defaultFastWithdrawLimit: "0.5", // 0.5 AVAX
    defaultRequiredApprovals: 1,
    recommendedFor: "Chi tiêu sinh hoạt, viện phí khẩn cấp, tiền chợ, bảo trợ người thân",
    suggestedNames: [
      "Quỹ Chi Tiêu Khẩn Cấp",
      "Trợ Cấp Sinh Hoạt Gia Đình",
      "Quỹ Y Tế & Chăm Sóc Sức Khỏe",
      "Tiền Tiêu Vặt Tuần Này",
    ],
    contractConstraints: {
      requiresZeroFastWithdraw: false,
      requiresTargetGoal: false,
      requiresRoscaConfig: false,
      separateEarnerFromGuardian: false,
    },
  },
  SHARED_GOAL: {
    id: "SHARED_GOAL",
    ruleTemplate: RuleTemplate.SHARED_GOAL,
    title: "Hũ Mục Tiêu Chung",
    subtitle: "Tích lũy nhóm & Sinh lời kép",
    tagline: "Heo đất số gia đình, sinh lời đều đặn 8%/năm",
    badge: "10% Đệm L1 • 90% C-Chain",
    description: "Cả nhà cùng góp tiền mua sắm lớn hoặc du lịch. Toàn bộ tiền nhàn rỗi sinh lời trên Fuji C-Chain, chỉ giải ngân khi đủ mục tiêu và đủ chữ ký.",
    features: [
      "90% vốn sinh lời 8% APY trong suốt thời gian tích lũy (~7.2% APY hiệu dụng)",
      "Chỉ mở khóa giải ngân khi đạt số tiền mục tiêu hoặc đến hạn chót",
      "Biểu quyết đa chữ ký M/N trước khi giải ngân tài sản",
      "Thanh tiến độ trực quan hiển thị % hoàn thành mục tiêu"
    ],
    accentColor: "cyan",
    iconName: "target",
    defaultBufferRatioBps: 1000, // 10% L1, 90% C-Chain sinh lời
    defaultFastWithdrawLimit: "0", // Ràng buộc FamilyHub: non-SHIELD phải có fastWithdrawLimit = 0
    defaultRequiredApprovals: 2,
    defaultTargetGoalAmount: "10", // 10 AVAX
    defaultTargetDays: 30, // 30 ngày
    recommendedFor: "Du lịch hè cả nhà, mua xe, tân trang nhà cửa, quỹ học vấn",
    suggestedNames: [
      "Chuyến Du Lịch Hè Cả Nhà",
      "Quỹ Mua Xe Mới",
      "Nâng Cấp Thiết Bị Gia Đình",
      "Tiết Kiệm Tết Sung Túc",
    ],
    contractConstraints: {
      requiresZeroFastWithdraw: true,
      requiresTargetGoal: true,
      requiresRoscaConfig: false,
      separateEarnerFromGuardian: false,
    },
  },
  MILESTONE: {
    id: "MILESTONE",
    ruleTemplate: RuleTemplate.MILESTONE,
    title: "Hũ Thưởng Nhiệm Vụ",
    subtitle: "Chore-to-Earn & Giáo dục tài chính",
    tagline: "Giao việc nhà, duyệt ảnh minh chứng, nhận thưởng tức thì",
    badge: "Khóa vốn sinh lời",
    description: "Quỹ thưởng việc nhà và học tập cho con nhỏ. Vốn ký quỹ tự động sinh lời trên C-Chain, mở khóa trả thưởng ngay khi người bảo hộ duyệt hoàn thành.",
    features: [
      "Vốn quỹ ký quỹ liên tục sinh lãi 8% APY trên C-Chain",
      "Chỉ giải ngân khi con hoàn thành việc nhà được cha mẹ duyệt",
      "Tách bạch vai trò: Người nhận thưởng không thể tự duyệt thưởng",
      "Tích lũy điểm kinh nghiệm XP & bài học tài chính thực tế"
    ],
    accentColor: "indigo",
    iconName: "trophy",
    defaultBufferRatioBps: 1000, // 10% L1, 90% C-Chain
    defaultFastWithdrawLimit: "0", // Must be 0
    defaultRequiredApprovals: 1,
    recommendedFor: "Khen thưởng học tập, việc nhà cho con trẻ, rèn luyện thói quen tiết kiệm",
    suggestedNames: [
      "Học Bổng Chăm Ngoan Của Bé",
      "Quỹ Thưởng Việc Nhà Hàng Tuần",
      "Thử Thách Thể Thao & Đọc Sách",
      "Quỹ Phát Triển Kỹ Năng",
    ],
    contractConstraints: {
      requiresZeroFastWithdraw: true,
      requiresTargetGoal: false,
      requiresRoscaConfig: false,
      separateEarnerFromGuardian: true,
    },
  },
  ROSCA: {
    id: "ROSCA",
    ruleTemplate: RuleTemplate.ROSCA,
    title: "Hũ Họ / Hụi Xoay Vòng",
    subtitle: "Tương trợ định kỳ & Tự động chia lãi",
    tagline: "Góp định kỳ, tiền nhàn rỗi sinh lãi, xoay vòng minh bạch",
    badge: "Tự động chia lãi",
    description: "Mô hình chơi họ / chơi hụi truyền thống được số hóa minh bạch 100% bằng Smart Contract. Tiền nhàn rỗi sinh lời C-Chain, tự động giải ngân gốc + lãi theo kỳ.",
    features: [
      "Tiền đóng hụi nhàn rỗi sinh lãi 8% APY giữa các chu kỳ",
      "Tự động thanh toán gốc kèm lãi tích lũy cho người hốt hụi",
      "Lịch trình đóng hụi và thứ tự nhận tiền minh bạch, chống bùng hụi",
      "Không thể can thiệp thủ công trái quy tắc hợp đồng thông minh"
    ],
    accentColor: "amber",
    iconName: "users",
    defaultBufferRatioBps: 1000, // 10% L1, 90% C-Chain
    defaultFastWithdrawLimit: "0", // Must be 0
    defaultRequiredApprovals: 1,
    defaultRoscaRoundDuration: "604800", // 7 ngày tính bằng giây
    defaultRoscaRoundContribution: "0.5", // 0.5 AVAX mỗi kỳ
    recommendedFor: "Nhóm anh em ruột, hội bạn thân, đồng nghiệp góp vốn xoay vòng",
    suggestedNames: [
      "Hội Tương Trợ Anh Em",
      "Hụi Tiết Kiệm Tuần Nhóm Bạn",
      "Góp Vốn Xoay Vòng 30 Ngày",
      "Quỹ Tương Trợ Họ Hàng",
    ],
    contractConstraints: {
      requiresZeroFastWithdraw: true,
      requiresTargetGoal: false,
      requiresRoscaConfig: true,
      separateEarnerFromGuardian: false,
    },
  },
};

export const TEMPLATE_LIST: VaultTemplateDefinition[] = Object.values(VAULT_TEMPLATES);

// -------------------------------------------------------------
// BPS & Percentage Conversions
// -------------------------------------------------------------

/** Chuyển đổi Basis Points (0-10000) sang phần trăm (0-100) */
export function bpsToPercent(bps: number): number {
  if (!Number.isFinite(bps)) return 0;
  const clamped = Math.max(0, Math.min(10000, bps));
  return Number((clamped / 100).toFixed(2));
}

/** Chuyển đổi phần trăm (0-100) sang Basis Points (0-10000) */
export function percentToBps(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round(clamped * 100);
}

/** Định dạng hiển thị phần trăm chuẩn cho UI (VD: 20%) */
export function formatBps(bps: number): string {
  return `${bpsToPercent(bps)}%`;
}

/** Chuyển đổi tên Rule sang enum RuleTemplate của FamilyHub.sol */
export function ruleIdToEnum(ruleId: VaultRuleType): RuleTemplate {
  switch (ruleId) {
    case "SHIELD":
      return RuleTemplate.SHIELD;
    case "MILESTONE":
      return RuleTemplate.MILESTONE;
    case "ROSCA":
      return RuleTemplate.ROSCA;
    case "SHARED_GOAL":
      return RuleTemplate.SHARED_GOAL;
    default:
      return RuleTemplate.SHIELD;
  }
}

/** Chuyển đổi enum RuleTemplate sang mã định danh template */
export function enumToRuleId(rule: RuleTemplate): VaultRuleType {
  switch (rule) {
    case RuleTemplate.SHIELD:
      return "SHIELD";
    case RuleTemplate.MILESTONE:
      return "MILESTONE";
    case RuleTemplate.ROSCA:
      return "ROSCA";
    case RuleTemplate.SHARED_GOAL:
      return "SHARED_GOAL";
    default:
      return "SHIELD";
  }
}

/** Lấy cấu hình template theo ID hoặc enum */
export function getVaultTemplate(idOrEnum: VaultRuleType | RuleTemplate): VaultTemplateDefinition {
  if (typeof idOrEnum === "number") {
    return VAULT_TEMPLATES[enumToRuleId(idOrEnum)];
  }
  return VAULT_TEMPLATES[idOrEnum] || VAULT_TEMPLATES.SHIELD;
}

// -------------------------------------------------------------
// AVAX & Wei Conversions
// -------------------------------------------------------------

/** Chuyển đổi an toàn số AVAX (string hoặc number) sang Wei (bigint) */
export function avaxToWei(avax: string | number): bigint {
  try {
    const str = String(avax).trim();
    if (!str || !/^\d+(\.\d{1,18})?$/.test(str)) return 0n;
    const wei = parseEther(str);
    if (wei < 0n) return 0n;
    if (wei > MAX_STORED_WEI) return MAX_STORED_WEI;
    return wei;
  } catch {
    return 0n;
  }
}

/** Chuyển đổi Wei (bigint hoặc string) sang số AVAX định dạng chuỗi */
export function weiToAvax(wei: bigint | string, maxDecimals = 4): string {
  try {
    const bn = typeof wei === "string" ? BigInt(wei) : wei;
    const full = formatEther(bn);
    const num = Number(full);
    if (!Number.isFinite(num)) return full;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  } catch {
    return "0";
  }
}

/** Định dạng số AVAX hiển thị cho người dùng */
export function formatAvax(avax: string | number, maxDecimals = 4): string {
  const num = typeof avax === "string" ? parseFloat(avax) : avax;
  if (!Number.isFinite(num) || num <= 0) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

// -------------------------------------------------------------
// Real-time Dual-Chain Yield Projection Engine
// -------------------------------------------------------------

export interface ProjectedYieldResult {
  principalAvax: number;
  bufferRatioBps: number;
  bufferPercent: number;
  cchainPercent: number;
  bufferAvax: number;
  cchainPrincipalAvax: number;
  cchainApyPercent: number; // Cố định 8.0%
  effectiveApyPercent: number; // APY thực tế trên toàn bộ danh mục vốn
  durationDays: number;
  projectedYieldAvax: number; // Lãi phát sinh ước tính cho khoảng durationDays
  projectedTotalAvax: number; // Vốn + Lãi phát sinh
  monthlyYieldAvax: number; // Lãi phát sinh ước tính trong 30 ngày
  yearlyYieldAvax: number; // Lãi phát sinh ước tính trong 365 ngày
}

/**
 * Tính toán lợi tức dự kiến trên mô hình Dual-Chain của Kinetix
 * - Phần Đệm L1 (bufferRatioBps): Giữ lại L1 Avalanche để rút nhanh 0 gas (APY = 0%)
 * - Phần C-Chain (10000 - bufferRatioBps): Bridge sang Fuji C-Chain tham gia Yield Vault (APY = 8.0%/năm)
 * 
 * Tuân thủ công thức FamilyYieldVault.sol:
 * interest = (principal * APY_RATE * timeElapsed) / (100 * 365 days)
 */
export function calculateProjectedYield(
  principalAvax: number,
  bufferRatioBps: number,
  durationDays: number = 365,
): ProjectedYieldResult {
  const validPrincipal = Math.max(0, Number.isFinite(principalAvax) ? principalAvax : 0);
  const validBps = Math.max(0, Math.min(10000, Number.isFinite(bufferRatioBps) ? bufferRatioBps : 1000));
  const validDays = Math.max(1, Number.isFinite(durationDays) ? durationDays : 365);

  const bufferRatio = validBps / BPS_DIVISOR; // VD: 2000 / 10000 = 0.20
  const cchainRatio = (BPS_DIVISOR - validBps) / BPS_DIVISOR; // VD: 0.80

  const bufferAvax = Number((validPrincipal * bufferRatio).toFixed(4));
  const cchainPrincipalAvax = Number((validPrincipal * cchainRatio).toFixed(4));

  const cchainApyPercent = CCHAIN_APY_RATE * 100; // 8.0%
  // APY thực tế tỷ lệ thuận với phần vốn gửi sang C-Chain
  const effectiveApyPercent = Number((cchainApyPercent * cchainRatio).toFixed(2));

  // Lãi phát sinh hàng năm trên phần vốn C-Chain
  const yearlyYieldAvax = Number((cchainPrincipalAvax * CCHAIN_APY_RATE).toFixed(4));
  
  // Lãi phát sinh hàng tháng (30 ngày)
  const monthlyYieldAvax = Number(((cchainPrincipalAvax * CCHAIN_APY_RATE * 30) / 365).toFixed(4));

  // Lãi phát sinh cho số ngày chỉ định (durationDays)
  const projectedYieldAvax = Number(((cchainPrincipalAvax * CCHAIN_APY_RATE * validDays) / 365).toFixed(4));

  const projectedTotalAvax = Number((validPrincipal + projectedYieldAvax).toFixed(4));

  return {
    principalAvax: validPrincipal,
    bufferRatioBps: validBps,
    bufferPercent: bpsToPercent(validBps),
    cchainPercent: bpsToPercent(BPS_DIVISOR - validBps),
    bufferAvax,
    cchainPrincipalAvax,
    cchainApyPercent,
    effectiveApyPercent,
    durationDays: validDays,
    projectedYieldAvax,
    projectedTotalAvax,
    monthlyYieldAvax,
    yearlyYieldAvax,
  };
}

// Re-export design tokens & utilities for unified access
export {
  VAULT_PRESETS,
  calculateEffectiveApy,
  simulateVaultYield,
  getMultisigRecommendations,
  LIQUIDITY_PRESETS,
};

export type {
  MultisigThresholdOption,
  LiquidityPresetOption,
  VaultPresetDefinition,
};
