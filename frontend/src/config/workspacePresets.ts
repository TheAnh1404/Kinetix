/**
 * Cấu hình Presets & Dữ liệu Mẫu cho 4 Không Gian (Multi-Space) của Kinetix
 * Tuân thủ chuẩn định vị Avalanche Team1 Vietnam - UniHack & Nguyên tắc Anti-AI Slop
 */

export type WorkspaceType = "FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY";
export type RuleTemplateType = "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";

export interface DefaultVaultTemplate {
  name: string;
  ruleTemplate: RuleTemplateType;
  bufferRatioBps: number; // e.g. 1000 = 10% L1, 90% C-Chain
  fastWithdrawLimit: number; // Rút nhanh không cần biểu quyết (USDC / AVAX)
  requiredApprovals: number; // Ngưỡng đa chữ ký (M/N)
  description: string;
  icon: string;
  targetGoalAmount?: number;
  roscaRoundContribution?: number;
  roscaRoundDuration?: number; // tính bằng giây
  roscaCurrentRound?: number;
}

export interface WorkspacePresetMetadata {
  type: WorkspaceType;
  titleVi: string;
  displayName: string;
  tagline: string;
  description: string;
  icon: string;
  placeholderName: string;
  roleLabels: {
    ADMIN: string;
    GUARDIAN: string;
    BENEFICIARY: string;
    ELDERLY?: string;
    CHILD?: string;
  };
  defaultVaultTemplates: DefaultVaultTemplate[];
}

/**
 * 4 Workspace Presets chuẩn hóa cho toàn hệ thống
 */
export const WORKSPACE_PRESETS: Record<WorkspaceType, WorkspacePresetMetadata> = {
  FAMILY: {
    type: "FAMILY",
    titleVi: "Đại Gia Đình",
    displayName: "Đại Gia Đình Bác Ba",
    tagline: "Bảo vệ ông bà khỏi lừa đảo AI qua duyệt 2/3 & tích lũy lì xì cho con nhỏ",
    description:
      "Không gian tài chính an toàn gắn kết Ông Bà, Bố Mẹ và Con Cái với hũ bảo vệ hưu trí và heo đất thông minh.",
    icon: "👨‍👩‍👧‍👦",
    placeholderName: "VD: Đại Gia Đình Bác Ba...",
    roleLabels: {
      ADMIN: "Bố Mẹ (Quản trị)",
      GUARDIAN: "Con trưởng thành (Người bảo vệ)",
      BENEFICIARY: "Ông Bà / Con nhỏ",
      ELDERLY: "Ông / Bà (Chữ siêu to WCAG AAA)",
      CHILD: "Con Nhỏ (Heo đất & Việc nhà)",
    },
    defaultVaultTemplates: [
      {
        name: "Hũ Báo Hiếu Ông Bà",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: 50,
        requiredApprovals: 2,
        description:
          "Bảo vệ tài sản hưu trí, rút nhanh tức thì 0 gas <= 50 USDC từ L1; rút lớn cần 2/3 chữ ký bảo hộ gia đình.",
        icon: "🛡️",
      },
      {
        name: "Hũ Lì Xì Bé Na",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: 20,
        requiredApprovals: 2,
        description:
          "Quỹ nhiệm vụ Chore-to-Earn, vốn gửi C-Chain sinh lời, mở khóa thưởng khi hoàn thành việc nhà được cha mẹ duyệt.",
        icon: "🎁",
      },
    ],
  },

  SIBLINGS: {
    type: "SIBLINGS",
    titleVi: "Anh Chị Em",
    displayName: "Anh Chị Em Nhà Họ Nguyễn",
    tagline: "Góp quỹ phụng dưỡng bố mẹ hoặc chơi họ xoay vòng văn minh, không lo mất lòng",
    description:
      "Giải pháp hụi/họ truyền thống được hiện đại hóa trên Avalanche: tiền nhàn rỗi sinh lời DeFi 8% APY, minh bạch giải ngân.",
    icon: "🤝",
    placeholderName: "VD: Anh Chị Em Nhà Họ Nguyễn...",
    roleLabels: {
      ADMIN: "Anh/Chị/Em đồng quản lý (Trưởng quỹ)",
      GUARDIAN: "Anh/Chị/Em đồng quản lý",
      BENEFICIARY: "Thành viên nhận lượt / Bố Mẹ",
      ELDERLY: "Bố Mẹ Hưởng Phúc",
      CHILD: "Thành Viên Trẻ",
    },
    defaultVaultTemplates: [
      {
        name: "Vòng Quay Tương Trợ Mua Xe",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0, // 0% L1 / 100% C-Chain để tối ưu lợi suất
        fastWithdrawLimit: 0,
        requiredApprovals: 2,
        roscaRoundContribution: 250,
        roscaRoundDuration: 2592000, // 30 ngày
        roscaCurrentRound: 3,
        description:
          "Góp vốn xoay vòng tương trợ anh chị em mua sắm, tiền nhàn rỗi sinh lời C-Chain 8% APY, đến kỳ giải ngân gốc + lãi.",
        icon: "🔄",
      },
      {
        name: "Quỹ Chung Phụng Dưỡng Bố Mẹ",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: 100,
        requiredApprovals: 2,
        description:
          "Anh chị em cùng đóng góp phụng dưỡng cha mẹ hàng tháng, rút chi tiêu minh bạch on-chain.",
        icon: "❤️",
      },
    ],
  },

  FRIENDS: {
    type: "FRIENDS",
    titleVi: "Hội Bạn Thân",
    displayName: "Nhóm Bạn Thân Đại Học Bách Khoa",
    tagline: "Quỹ đi du lịch/phượt chung, tiền trọ, ăn uống cuối tuần có tự động sinh lời 8%/năm",
    description:
      "Tích lũy tiền du lịch cùng bạn bè sinh lời DeFi, kết hợp quỹ chi tiêu ăn uống thường nhật rút nhanh 1 giây qua VietQR.",
    icon: "🎒",
    placeholderName: "Nhóm Bạn Thân Đại Học...",
    roleLabels: {
      ADMIN: "Trưởng Nhóm",
      GUARDIAN: "Thành viên giữ khóa duyệt chi",
      BENEFICIARY: "Cả nhóm cùng thụ hưởng",
      ELDERLY: "Cố Vấn Nhóm",
      CHILD: "Thành Viên Mới",
    },
    defaultVaultTemplates: [
      {
        name: "Quỹ Đi Phượt Đà Lạt Cuối Năm",
        ruleTemplate: "SHARED_GOAL",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: 50,
        requiredApprovals: 2,
        targetGoalAmount: 1000,
        description:
          "Cả nhóm cùng tích lũy cho chuyến đi phượt Đà Lạt cuối năm, vốn sinh lãi DeFi 8% APY trên C-Chain cho đến khi đạt mục tiêu.",
        icon: "🎒",
      },
      {
        name: "Hũ Ăn Uống Hàng Tuần",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 3000, // 30% L1 / 70% C-Chain (thanh khoản cao cho ăn uống)
        fastWithdrawLimit: 25,
        requiredApprovals: 2,
        description:
          "Quỹ sinh hoạt ăn uống hàng tuần, 30% giữ L1 rút nhanh 1 giây 0đ phí quét VietQR (<= 25 USDC), 70% sinh lời.",
        icon: "🍕",
      },
    ],
  },

  COMMUNITY: {
    type: "COMMUNITY",
    titleVi: "CLB / Hội Nhóm",
    displayName: "CLB Avalanche Campus",
    tagline: "Quản lý quỹ CLB minh bạch chống thủ quỹ ôm tiền, duyệt chi đa chữ ký & thưởng Bounty",
    description:
      "Quản trị ngân quỹ tổ chức sự kiện, biểu quyết chi tiêu minh bạch và cơ chế trao thưởng nhiệm vụ đóng góp (Bounties).",
    icon: "🏛️",
    placeholderName: "VD: CLB Avalanche Campus / Đội Tình Nguyện...",
    roleLabels: {
      ADMIN: "Ban Chủ Nhiệm (Ký duyệt)",
      GUARDIAN: "Ban Chủ Nhiệm (Ký duyệt)",
      BENEFICIARY: "Thành viên CLB / Ban Sự Kiện",
      ELDERLY: "Ban Cố Vấn",
      CHILD: "Cộng Tác Viên Thử Việc",
    },
    defaultVaultTemplates: [
      {
        name: "Quỹ Hoạt Động & Sự Kiện CLB",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 2000, // 20% L1 / 80% C-Chain
        fastWithdrawLimit: 100,
        requiredApprovals: 2,
        description:
          "Ngân sách sự kiện workshop, chi tiêu minh bạch on-chain cần tối thiểu 2/3 chữ ký BCN duyệt.",
        icon: "🏛️",
      },
      {
        name: "Quỹ Thưởng Bounty Thành Viên",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: 25,
        requiredApprovals: 2,
        description:
          "Quỹ khen thưởng nhiệm vụ & bounty cho thành viên tích cực, sinh lời tự động trên Fuji C-Chain trả thưởng 0đ gas.",
        icon: "🏆",
      },
    ],
  },
};

/**
 * Lấy metadata preset tương ứng theo loại workspace, mặc định là FAMILY
 */
export function getWorkspacePreset(type?: string): WorkspacePresetMetadata {
  if (!type) return WORKSPACE_PRESETS.FAMILY;
  const upper = type.toUpperCase() as WorkspaceType;
  return WORKSPACE_PRESETS[upper] || WORKSPACE_PRESETS.FAMILY;
}

/**
 * Chuyển đổi nhãn vai trò sang ngôn ngữ thân thiện theo ngữ cảnh không gian
 */
export function getRoleLabel(
  workspaceType: string | undefined,
  role: string | undefined,
  isBeneficiary?: boolean,
): string {
  const preset = getWorkspacePreset(workspaceType);
  if (isBeneficiary) return preset.roleLabels.BENEFICIARY;
  if (!role) return preset.roleLabels.GUARDIAN;

  switch (role.toUpperCase()) {
    case "ADMIN":
      return preset.roleLabels.ADMIN;
    case "GUARDIAN":
      return preset.roleLabels.GUARDIAN;
    case "ELDERLY":
      return preset.roleLabels.ELDERLY || preset.roleLabels.BENEFICIARY;
    case "CHILD":
      return preset.roleLabels.CHILD || preset.roleLabels.BENEFICIARY;
    case "BENEFICIARY":
      return preset.roleLabels.BENEFICIARY;
    default:
      return role;
  }
}

/**
 * Kết quả tính toán cơ chế đệm thanh khoản kép L1 / C-Chain
 */
export interface BufferBreakdown {
  totalAmount: number;
  bufferRatioBps: number;
  l1Percent: number; // Tỷ lệ % giữ L1 (e.g. 10%)
  cChainPercent: number; // Tỷ lệ % gửi C-Chain (e.g. 90%)
  l1BufferAmount: number; // Số tiền giữ trên Family L1
  cChainPrincipal: number; // Số tiền stake C-Chain sinh lời
  annualYieldEstimated: number; // Ước tính lợi nhuận 1 năm (8% APY)
  monthlyYieldEstimated: number; // Ước tính lợi nhuận 1 tháng
  dailyYieldEstimated: number; // Ước tính lợi nhuận 1 ngày
}

/**
 * Tính toán phân bổ thanh khoản và ước tính lợi suất APY dựa vào bufferRatioBps
 * Mặc định APY trên Avalanche Fuji C-Chain là 8% (0.08)
 */
export function calculateBufferBreakdown(
  totalAmount: number,
  bufferRatioBps: number,
  apyRate = 0.08,
): BufferBreakdown {
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const safeBps = Math.min(10000, Math.max(0, Number(bufferRatioBps) || 0));

  const l1Percent = safeBps / 100;
  const cChainPercent = (10000 - safeBps) / 100;

  const l1BufferAmount = (safeTotal * safeBps) / 10000;
  const cChainPrincipal = safeTotal - l1BufferAmount;

  const annualYieldEstimated = cChainPrincipal * apyRate;
  const monthlyYieldEstimated = annualYieldEstimated / 12;
  const dailyYieldEstimated = annualYieldEstimated / 365;

  return {
    totalAmount: safeTotal,
    bufferRatioBps: safeBps,
    l1Percent,
    cChainPercent,
    l1BufferAmount,
    cChainPrincipal,
    annualYieldEstimated,
    monthlyYieldEstimated,
    dailyYieldEstimated,
  };
}

/**
 * Tính toán nhanh lợi suất ước tính theo năm/tháng/ngày từ vốn C-Chain
 */
export function calculateEstimatedApyYield(
  cChainPrincipal: number,
  apyRate = 0.08,
) {
  const principal = Math.max(0, Number(cChainPrincipal) || 0);
  const annual = principal * apyRate;
  return {
    annualYield: annual,
    monthlyYield: annual / 12,
    dailyYield: annual / 365,
  };
}

/**
 * Định dạng câu mô tả thanh khoản trực quan (Anti-AI Slop, rõ ràng, minh bạch)
 * Ví dụ: "100.00 USDC sẵn sàng rút trong 1 giây (0đ phí); 900.00 USDC tự động chuyển qua Avalanche ICM sang C-Chain sinh lời ~72.00 USDC/năm (8% APY)."
 */
export function formatBufferDescription(
  bufferRatioBps: number,
  totalAmount = 1000,
  currency = "USDC",
): string {
  const breakdown = calculateBufferBreakdown(totalAmount, bufferRatioBps);
  const l1Str = breakdown.l1BufferAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const cChainStr = breakdown.cChainPrincipal.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const yieldStr = breakdown.annualYieldEstimated.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  if (bufferRatioBps === 0) {
    return `100% (${cChainStr} ${currency}) chuyển tiếp qua Avalanche ICM sang Fuji C-Chain tích lũy lợi nhuận tối đa ~${yieldStr} ${currency}/năm (8% APY).`;
  }

  if (bufferRatioBps === 10000) {
    return `100% (${l1Str} ${currency}) lưu giữ đệm Family L1, sẵn sàng rút tức thì trong 1 giây với 0đ phí giao dịch.`;
  }

  return `${l1Str} ${currency} (${breakdown.l1Percent}%) sẵn sàng rút trong 1 giây (0đ phí); ${cChainStr} ${currency} (${breakdown.cChainPercent}%) tự động chuyển qua Avalanche ICM sang C-Chain sinh lời ~${yieldStr} ${currency}/năm (8% APY).`;
}

export * from "./fallbackData";

