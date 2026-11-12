/**
 * Kinetix Vault Creation Experience - Design Tokens & Visual Architecture
 * Designed by Senior Product & UI/UX Specialist (Web3 Fintech)
 *
 * Adheres to:
 * - UI-UX Pro Max design intelligence: Dark Slate + Emerald Yield Accents
 * - Zero AI Slop: Strict 4/8dp spacing, no neon pink/purple gradients, no raw crypto jargon
 * - Human-centric Vietnamese financial microcopy (MoMo / Revolut / Safe mental model)
 * - WCAG 2.1 AA compliant contrast ratios (>= 4.5:1 for body, >= 3:1 for graphical UI)
 */

import { VaultRule } from "../../../../../shared/vaultCreation";

// ============================================================================
// 1. COLOR PALETTE & SURFACES
// ============================================================================
export const VAULT_COLORS = {
  // Brand Base (Deep Slate / Navy)
  background: {
    base: "#0B0F19",       // Deep Slate ground
    surface: "#111827",    // Card container
    elevated: "#1F2937",   // Popover & high modal cards
    subtle: "#1E293B",     // Input & inset fields
    scrim: "rgba(11, 15, 25, 0.75)",
  },

  // Borders & Dividers
  border: {
    subtle: "rgba(255, 255, 255, 0.08)",
    standard: "#334155",
    active: "#475569",
    focus: "#10B981",      // Emerald ring
    error: "#EF4444",
  },

  // Typography
  text: {
    primary: "#F8FAFC",    // 95% White
    secondary: "#94A3B8",  // Slate 400
    tertiary: "#64748B",   // Slate 500
    inverse: "#0F172A",    // Dark on bright accents
    accent: "#10B981",     // Emerald yield highlight
  },

  // Core Yield Accents (Emerald / Teal)
  yield: {
    DEFAULT: "#10B981",    // Emerald 500
    hover: "#059669",      // Emerald 600
    glow: "rgba(16, 185, 129, 0.25)",
    light: "#ECFDF5",
    dark: "#064E3B",
  },

  // Avalanche & Dual-Chain Indicators
  chain: {
    l1Buffer: {
      primary: "#38BDF8",  // Sky 400 (Fast, instant, cool)
      bg: "rgba(56, 189, 248, 0.12)",
      border: "rgba(56, 189, 248, 0.3)",
      badge: "#0284C7",
      label: "Family L1 (Appchain)",
    },
    cChainYield: {
      primary: "#10B981",  // Emerald 500 (Yield, DeFi, growth)
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
      badge: "#059669",
      label: "Fuji C-Chain (DeFi Yield)",
    },
    avalancheRed: "#E84142",
  },

  // Rule Template Theme Accents
  presetThemes: {
    SHIELD: {
      primary: "#10B981", // Emerald
      secondary: "#065F46",
      bgSubtle: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.25)",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    SHARED_GOAL: {
      primary: "#F59E0B", // Amber / Gold
      secondary: "#92400E",
      bgSubtle: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.25)",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    MILESTONE: {
      primary: "#8B5CF6", // Violet / Purple
      secondary: "#5B21B6",
      bgSubtle: "rgba(139, 92, 246, 0.08)",
      border: "rgba(139, 92, 246, 0.25)",
      badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    },
    ROSCA: {
      primary: "#14B8A6", // Teal
      secondary: "#0F766E",
      bgSubtle: "rgba(20, 184, 166, 0.08)",
      border: "rgba(20, 184, 166, 0.25)",
      badge: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    },
  },
} as const;

// ============================================================================
// 2. TYPOGRAPHY & SPACING TOKENS (Strict 8dp Rhythm)
// ============================================================================
export const VAULT_TYPOGRAPHY = {
  fontSans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  sizes: {
    hero: "text-2xl sm:text-3xl font-extrabold tracking-tight",
    title: "text-lg sm:text-xl font-bold tracking-tight",
    subtitle: "text-sm sm:text-base font-semibold",
    body: "text-xs sm:text-sm font-normal leading-relaxed",
    caption: "text-[11px] sm:text-xs font-medium text-slate-400 leading-normal",
    eyebrow: "text-[11px] font-bold tracking-wider uppercase text-emerald-400 font-mono",
  },
};

export const VAULT_SPACING = {
  radius: {
    sm: "rounded-lg",      // 8px
    md: "rounded-xl",      // 12px
    lg: "rounded-2xl",     // 16px
    xl: "rounded-3xl",     // 24px
    full: "rounded-full",
  },
  padding: {
    card: "p-4 sm:p-6",
    cardCompact: "p-3 sm:p-4",
    modal: "p-4 sm:p-8",
  },
  gap: {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  },
};

// ============================================================================
// 3. THE 4 HIGH-IMPACT VAULT PRESETS
// ============================================================================
export interface VaultPresetDefinition {
  id: VaultRule;
  title: string;
  tagline: string;
  badge: string;
  description: string;
  ruleTemplate: VaultRule;
  defaultBufferRatioBps: number; // e.g. 2000 = 20%
  defaultRequiredApprovals: number;
  defaultFastWithdrawLimit: string; // in AVAX
  defaultTargetGoalAmount?: string;
  defaultRoscaRoundDuration?: string;
  defaultRoscaRoundContribution?: string;
  themeKey: keyof typeof VAULT_COLORS.presetThemes;
  highlights: string[];
  suggestedNames: string[];
  whyItMatters: string;
}

export const VAULT_PRESETS: Record<VaultRule, VaultPresetDefinition> = {
  SHIELD: {
    id: "SHIELD",
    title: "Quỹ Khẩn Cấp & Trợ Cấp",
    tagline: "Chi tiêu tức thì 0 gas, khoản lớn duyệt an toàn",
    badge: "Phổ biến nhất",
    description: "Bộ đệm 20% tại Family L1 giải ngân trong 1 giây không tốn phí gas. 80% còn lại tự động stake sinh lời 8% APY trên C-Chain.",
    ruleTemplate: "SHIELD",
    defaultBufferRatioBps: 2000, // 20% L1 / 80% C-Chain
    defaultRequiredApprovals: 1,  // 1/N for small fast withdraws, larger needs multisig
    defaultFastWithdrawLimit: "0.05", // 0.05 AVAX
    themeKey: "SHIELD",
    highlights: [
      "Rút nhanh < 1s hoàn toàn miễn phí gas (0 Gas Fee)",
      "Vốn nhàn rỗi sinh lời ~6.4% APY hiệu dụng",
      "Rút lớn vượt hạn mức tự động kích hoạt M/N chữ ký",
    ],
    suggestedNames: [
      "Quỹ Chi Tiêu Khẩn Cấp",
      "Trợ Cấp Sinh Hoạt Gia Đình",
      "Quỹ Y Tế & Chăm Sóc Sức Khỏe",
      "Tiền Tiêu Vặt Tuần Này",
    ],
    whyItMatters: "Phù hợp chi tiêu thường nhật của bố mẹ, viện phí cấp bách, hoặc trợ cấp con cái mà không phải đợi xác nhận blockchain lâu.",
  },

  SHARED_GOAL: {
    id: "SHARED_GOAL",
    title: "Quỹ Mục Tiêu Chung",
    tagline: "Heo đất số gia đình, sinh lời đều đặn 8%/năm",
    badge: "Tích lũy thông minh",
    description: "Cả nhà cùng chung tay tích lũy cho mục tiêu lớn (du lịch, mua sắm). Toàn bộ tiền nhàn rỗi sinh lời trên Fuji C-Chain cho đến ngày mở khóa.",
    ruleTemplate: "SHARED_GOAL",
    defaultBufferRatioBps: 1000, // 10% L1 / 90% C-Chain
    defaultRequiredApprovals: 2,  // Consensus needed
    defaultFastWithdrawLimit: "0.01",
    defaultTargetGoalAmount: "5.0",
    themeKey: "SHARED_GOAL",
    highlights: [
      "90% vốn sinh lời 8% APY trong suốt thời gian tích lũy",
      "Mở khóa minh bạch: Chỉ chi khi đủ chỉ tiêu hoặc đến hạn",
      "Cần M/N Guardians cùng đồng thuận ký giải ngân",
    ],
    suggestedNames: [
      "Chuyến Du Lịch Hè Cả Nhà",
      "Quỹ Mua Xe Mới",
      "Nâng Cấp Thiết Bị Gia Đình",
      "Tiết Kiệm Tết Sung Túc",
    ],
    whyItMatters: "Giúp cả nhà thấy tiến độ tích lũy trực quan, vốn không nằm yên mà liên tục sinh lời thụ động.",
  },

  MILESTONE: {
    id: "MILESTONE",
    title: "Quỹ Thưởng Nhiệm Vụ (Chore-to-Earn)",
    tagline: "Giao việc nhà, duyệt ảnh minh chứng, nhận thưởng tức thì",
    badge: "Giáo dục tài chính",
    description: "Bố mẹ nạp quỹ, giao nhiệm vụ học tập & việc nhà cho con. Tiền thưởng được giữ riêng và sinh lời cho đến khi bố mẹ duyệt ảnh hoàn thành.",
    ruleTemplate: "MILESTONE",
    defaultBufferRatioBps: 1000, // 10% L1 / 90% C-Chain
    defaultRequiredApprovals: 1,  // 1 parent approval
    defaultFastWithdrawLimit: "0.01",
    themeKey: "MILESTONE",
    highlights: [
      "Khuyến khích con cái làm việc nhà & học tập tự giác",
      "Tiền thưởng sinh lãi 8% trong thời gian chờ thực hiện",
      "Phân quyền bảo vệ: Con làm, Bố Mẹ kiểm duyệt và mở khóa",
    ],
    suggestedNames: [
      "Học Bổng Chăm Ngoan Của Bé",
      "Quỹ Thưởng Việc Nhà Hàng Tuần",
      "Thử Thách Thể Thao & Đọc Sách",
      "Quỹ Phát Triển Kỹ Năng",
    ],
    whyItMatters: "Tạo thói quen lao động & quản lý tài chính sớm cho trẻ nhỏ với trải nghiệm duyệt thưởng 1 chạm.",
  },

  ROSCA: {
    id: "ROSCA",
    title: "Họ / Hụi Xoay Vòng Thông Minh",
    tagline: "Góp định kỳ, tiền nhàn rỗi sinh lãi, xoay vòng minh bạch",
    badge: "100% On-chain",
    description: "Mô hình góp vốn cộng đồng không lo bùng hụi. Hợp đồng thông minh tự động trích góp mỗi kỳ, sinh lời 8% APY và chi trả gốc + lãi theo thứ tự.",
    ruleTemplate: "ROSCA",
    defaultBufferRatioBps: 0, // 0% L1 / 100% C-Chain for max yield while waiting for payout
    defaultRequiredApprovals: 1,
    defaultFastWithdrawLimit: "0.01",
    defaultRoscaRoundDuration: "604800", // 7 days (seconds)
    defaultRoscaRoundContribution: "0.1", // 0.1 AVAX per round
    themeKey: "ROSCA",
    highlights: [
      "100% tiền nhàn rỗi sinh lãi 8% APY trong thời gian chờ lượt",
      "Hợp đồng khóa quỹ tự động, triệt tiêu rủi ro bùng họ",
      "Tự động giải ngân cả Gốc + Lãi chia đều cho người nhận lượt",
    ],
    suggestedNames: [
      "Hội Tương Trợ Anh Em",
      "Hụi Tiết Kiệm Tuần Nhóm Bạn",
      "Góp Vốn Xoay Vòng 30 Ngày",
      "Quỹ Tương Trợ Họ Hàng",
    ],
    whyItMatters: "Số hóa truyền thống chơi họ của người Việt, loại bỏ hoàn toàn chủ hụi ôm tiền trốn, vừa an toàn vừa có lãi.",
  },
};

// ============================================================================
// 4. DUAL-CHAIN LIQUIDITY & APY VISUALIZER MATH & PRESETS
// ============================================================================
export const APY_CONSTANTS = {
  FUJI_C_CHAIN_BASE_APY: 8.0, // 8.0% annual yield on C-Chain
  MAX_BPS: 10000,
  MIN_BPS: 0,
  STEP_BPS: 100, // 1% steps
};

export interface LiquidityPresetOption {
  label: string;
  l1Percent: number;
  cChainPercent: number;
  bufferRatioBps: number;
  effectiveApy: number;
  badge: string;
  description: string;
}

export const LIQUIDITY_PRESETS: LiquidityPresetOption[] = [
  {
    label: "Tối đa sinh lời",
    l1Percent: 0,
    cChainPercent: 100,
    bufferRatioBps: 0,
    effectiveApy: 8.0,
    badge: "8.0% APY",
    description: "100% vốn gửi sinh lãi trên C-Chain. Rút tiền cần qua cầu nối.",
  },
  {
    label: "Chuẩn DeFi",
    l1Percent: 10,
    cChainPercent: 90,
    bufferRatioBps: 1000,
    effectiveApy: 7.2,
    badge: "7.2% APY",
    description: "10% đệm rút ngay tại L1, 90% tối ưu lợi nhuận cao nhất.",
  },
  {
    label: "Cân bằng khẩn cấp",
    l1Percent: 20,
    cChainPercent: 80,
    bufferRatioBps: 2000,
    effectiveApy: 6.4,
    badge: "6.4% APY",
    description: "20% sẵn sàng chi tiêu 0 gas tức thì. 80% sinh lời bền vững.",
  },
  {
    label: "Rút nhanh linh hoạt",
    l1Percent: 30,
    cChainPercent: 70,
    bufferRatioBps: 3000,
    effectiveApy: 5.6,
    badge: "5.6% APY",
    description: "Đệm chi tiêu lớn cho gia đình thường xuyên rút lặt vặt.",
  },
];

/**
 * Tính toán APY hiệu dụng theo tỷ lệ đệm
 * @param bufferRatioBps (0 to 10000)
 * @returns number (e.g. 7.2)
 */
export function calculateEffectiveApy(bufferRatioBps: number): number {
  const safeBps = Math.max(0, Math.min(10000, Number(bufferRatioBps) || 0));
  const cChainRatio = (10000 - safeBps) / 10000;
  return Number((APY_CONSTANTS.FUJI_C_CHAIN_BASE_APY * cChainRatio).toFixed(2));
}

/**
 * Mô phỏng phân bổ và tiền lãi ước tính
 */
export function simulateVaultYield({
  amountAvax = 10,
  bufferRatioBps = 1000,
}: {
  amountAvax?: number;
  bufferRatioBps?: number;
}) {
  const safeBps = Math.max(0, Math.min(10000, Number(bufferRatioBps) || 0));
  const l1Share = Number(((amountAvax * safeBps) / 10000).toFixed(3));
  const cChainShare = Number(((amountAvax * (10000 - safeBps)) / 10000).toFixed(3));
  const apy = calculateEffectiveApy(safeBps);
  const yearlyYieldAvax = Number(((cChainShare * APY_CONSTANTS.FUJI_C_CHAIN_BASE_APY) / 100).toFixed(4));
  const monthlyYieldAvax = Number((yearlyYieldAvax / 12).toFixed(4));

  return {
    l1Share,
    cChainShare,
    effectiveApy: apy,
    yearlyYieldAvax,
    monthlyYieldAvax,
  };
}

// ============================================================================
// 5. GUARDIAN MULTI-SIG THRESHOLD RECOMMENDATIONS
// ============================================================================
export interface MultisigThresholdOption {
  threshold: number;
  total: number;
  label: string;
  description: string;
  isRecommended?: boolean;
}

export function getMultisigRecommendations(totalGuardians: number): MultisigThresholdOption[] {
  if (totalGuardians <= 0) {
    return [{ threshold: 1, total: 0, label: "Chưa chọn người bảo hộ", description: "Vui lòng chọn ít nhất 1 Guardian." }];
  }
  if (totalGuardians === 1) {
    return [
      {
        threshold: 1,
        total: 1,
        label: "1 trên 1 (Chủ động)",
        description: "Người duy nhất tự ký phê duyệt mọi khoản giải ngân lớn.",
        isRecommended: true,
      },
    ];
  }
  if (totalGuardians === 2) {
    return [
      {
        threshold: 1,
        total: 2,
        label: "1 trên 2 (Linh hoạt)",
        description: "Bất kỳ ai trong 2 người ký là lệnh rút được thực thi ngay.",
      },
      {
        threshold: 2,
        total: 2,
        label: "2 trên 2 (Đồng thuận)",
        description: "Cả 2 người bảo hộ bắt buộc phải cùng ký duyệt (Bố & Mẹ).",
        isRecommended: true,
      },
    ];
  }
  // For 3 or more guardians
  const majority = Math.floor(totalGuardians / 2) + 1;
  return [
    {
      threshold: 1,
      total: totalGuardians,
      label: `1 trên ${totalGuardians} (Rút nhanh)`,
      description: "Chỉ cần bất kỳ 1 Guardian duyệt là mở khóa tiền.",
    },
    {
      threshold: majority,
      total: totalGuardians,
      label: `${majority} trên ${totalGuardians} (Đa số quá bán)`,
      description: `Cần ít nhất ${majority} người đồng thuận, an toàn nhất cho quỹ lớn.`,
      isRecommended: true,
    },
    {
      threshold: totalGuardians,
      total: totalGuardians,
      label: `${totalGuardians} trên ${totalGuardians} (Đồng thuận 100%)`,
      description: "Tất cả mọi người phải đồng ý mới được xuất quỹ.",
    },
  ];
}

// ============================================================================
// 6. VIETNAMESE FINANCIAL MICRO-COPY & DICTIONARIES
// ============================================================================
export const VAULT_MICROCOPY = {
  wizard: {
    steps: [
      { id: 1, title: "Chọn Mẫu Hũ", subtitle: "Mục đích & Ý nghĩa" },
      { id: 2, title: "Thành Viên", subtitle: "Bảo hộ & Thụ hưởng" },
      { id: 3, title: "Lãi Suất & Quy Tắc", subtitle: "Đệm L1 & APY 8%" },
      { id: 4, title: "Xác Nhận & Ký", subtitle: "Kiểm tra 1 chạm" },
    ],
    headerTag: "KINETIX VAULT OS",
    headerTitle: "Khởi tạo Hũ Tiền Mới Cho Gia Đình",
    headerDesc: "Thiết lập quỹ chia sẻ trên Avalanche Fuji với 0 phí gas và sinh lời 8% APY.",
    btnBack: "Quay lại",
    btnContinue: "Tiếp tục",
    btnSaveDraft: "Lưu bản nháp",
    btnChecking: "Đang kiểm tra...",
    btnSignNow: "Ký tạo hũ với Core Wallet",
    statusDraftSaved: "Đã tự động lưu bản nháp an toàn.",
  },

  step1Preset: {
    title: "Gia đình bạn muốn dùng quỹ này vào việc gì?",
    subtitle: "Chọn 1 trong 4 mẫu thiết kế sẵn để hệ thống tự động điền cấu hình tối ưu nhất.",
    fieldVaultName: "Tên hũ tiền",
    namePlaceholder: "Ví dụ: Quỹ Khẩn Cấp Gia Đình, Heo Đất Đà Lạt...",
    fieldDesc: "Mô tả mục đích (Không bắt buộc)",
    descPlaceholder: "Ghi chú thêm về quy ước chi tiêu giữa các thành viên...",
    privacyNote: "Ghi chú này được mã hóa và lưu riêng tư trong gia đình, không công khai lên blockchain.",
  },

  step2Members: {
    title: "Ai sẽ bảo vệ và ai được nhận tiền?",
    subtitle: "Chỉ định người duyệt chi (Guardian) và người thụ hưởng trong gia đình.",
    guardianSectionTitle: "Người Bảo Hộ (Guardians ký duyệt)",
    guardianSectionDesc: "Chịu trách nhiệm kiểm tra và ký duyệt các khoản rút lớn hơn hạn mức.",
    beneficiarySectionTitle: "Người Thụ Hưởng (Thành viên nhận tiền)",
    beneficiarySectionDesc: "Người có thể tạo yêu cầu rút tiền hoặc nhận tiền thưởng/hụi.",
    roscaOrderTitle: "Thứ tự nhận hụi theo kỳ",
    roscaOrderDesc: "Thứ tự này sẽ được khóa vĩnh viễn trên blockchain sau khi tạo.",
    noCoreWarning: "Thành viên chưa liên kết ví Core vẫn có thể chọn. Hệ thống sẽ hỗ trợ kích hoạt khi giao dịch.",
    milestoneSelfGuardConstraint: "Với Quỹ Nhiệm Vụ, người làm việc (con cái) không được tự làm Guardian duyệt cho chính mình.",
  },

  step3Rules: {
    title: "Phân bổ thanh khoản & Lãi suất sinh lời",
    subtitle: "Cân đối giữa khả năng rút tiền tức thì 0 gas và tối đa hóa lợi suất 8%/năm.",
    l1BufferLabel: "Đệm Thanh Khoản Family L1 (Rút Tức Thì)",
    cChainYieldLabel: "Gửi Sinh Lời Fuji C-Chain (Lãi Suất Thụ Động)",
    sliderHint: "Kéo để điều chỉnh tỷ lệ đệm mong muốn cho hũ này.",
    fastWithdrawLabel: "Hạn mức rút nhanh không cần duyệt (mỗi lần)",
    fastWithdrawDesc: "Khoản tiền dưới mức này sẽ được giải ngân ngay lập tức trong 1 giây từ đệm L1.",
    targetGoalLabel: "Số tiền mục tiêu tích lũy (AVAX)",
    targetDeadlineLabel: "Ngày mục tiêu muốn đạt được",
    roscaContributionLabel: "Mỗi người đóng góp mỗi kỳ (AVAX)",
    roscaDurationLabel: "Chu kỳ góp tiền xoay vòng",
    thresholdLabel: "Ngưỡng biểu quyết cho khoản rút lớn",
    thresholdDesc: "Khi ai đó rút lớn hơn hạn mức nhanh, cần bao nhiêu Guardians cùng xác nhận?",
  },

  step4Review: {
    title: "Kiểm tra kỹ thông tin trước khi kích hoạt",
    subtitle: "Mọi quy tắc sẽ được ghi nhận minh bạch và bất biến trên mạng Avalanche.",
    summaryWorkspace: "Không gian gia đình",
    summaryVaultName: "Tên hũ",
    summaryRuleType: "Loại quy tắc",
    summaryGuardians: "Hội đồng bảo hộ",
    summaryBeneficiaries: "Người thụ hưởng",
    summaryLiquidity: "Tỷ lệ phân bổ vốn",
    summaryApy: "Lợi suất ước tính",
    summaryFastLimit: "Rút nhanh 0 gas",
    summaryLargeWithdraw: "Rút lớn",
    summaryInitialDeposit: "Số dư khởi tạo",
    summaryNetworkFee: "Phí mạng khởi tạo",
    consentText: "Tôi xác nhận đã hiểu rõ cơ chế hoạt động, tỷ lệ đệm thanh khoản và quy tắc biểu quyết của hũ tiền này.",
    disclaimerSafe: "Hợp đồng thông minh Kinetix bảo vệ quỹ an toàn 100%. Tiền rút nhanh luôn được bảo chứng từ đệm L1.",
  },

  phases: {
    PRECHECK: "Đang kiểm tra kết nối ví Core và trạng thái phân quyền...",
    AWAITING_SIGNATURE: "Vui lòng mở ứng dụng Core Wallet để ký xác nhận tạo hũ...",
    BROADCAST: "Giao dịch đã phát sóng lên mạng Avalanche Fuji, đang chờ xác nhận...",
    CONFIRMED: "Giao dịch đã được ghi nhận vào block, đang đồng bộ dữ liệu...",
    SYNC_PENDING: "Đang liên kết Hũ Tiền vào Workspace gia đình của bạn...",
    COMPLETED: "Chúc mừng! Hũ Tiền đã sẵn sàng sử dụng.",
    REVERTED: "Giao dịch bị từ chối hoặc thất bại. Vui lòng thử lại.",
  },
} as const;

// ============================================================================
// 7. MOTION & TRANSITION TOKENS (GSAP / Tailwind Micro-interactions)
// ============================================================================
export const VAULT_ANIMATIONS = {
  transitionFast: "transition-all duration-150 ease-out",
  transitionNormal: "transition-all duration-250 cubic-bezier(0.16, 1, 0.3, 1)",
  transitionSlow: "transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1)",
  scaleHover: "hover:scale-[1.015] active:scale-[0.99]",
  cardShadow: "shadow-[0_4px_20px_-2px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)]",
};
