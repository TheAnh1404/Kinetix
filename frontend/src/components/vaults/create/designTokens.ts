/**
 * Kinetix Vault Creation Experience - Design Tokens & Visual Architecture
 * Mobile-First Fintech Redesign (No AI-Slop, Ultra-Crisp Vietnamese Copy)
 *
 * Adheres to:
 * - Senior Fintech UX standards (MoMo / Revolut / Apple Card)
 * - Radically trimmed microcopy: Cut 60% verbose AI-slop paragraphs
 * - 360px-430px mobile viewport ergonomics: compact cards, sticky thumb-friendly dock, single-line tags
 * - Strict 4/8dp spacing rhythm, WCAG 2.1 AA compliant
 */

export type VaultRule = "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";

// ============================================================================
// 1. COLOR PALETTE & SURFACES
// ============================================================================
export const VAULT_COLORS = {
  background: {
    base: "#0B0F19",
    surface: "#111827",
    elevated: "#1F2937",
    subtle: "#1E293B",
    scrim: "rgba(11, 15, 25, 0.8)",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.08)",
    standard: "#334155",
    active: "#475569",
    focus: "#10B981",
    error: "#EF4444",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#94A3B8",
    tertiary: "#64748B",
    inverse: "#0F172A",
    accent: "#10B981",
  },
  yield: {
    DEFAULT: "#10B981",
    hover: "#059669",
    glow: "rgba(16, 185, 129, 0.25)",
    light: "#ECFDF5",
    dark: "#064E3B",
  },
  chain: {
    l1Buffer: {
      primary: "#38BDF8",
      bg: "rgba(56, 189, 248, 0.12)",
      border: "rgba(56, 189, 248, 0.3)",
      badge: "#0284C7",
      label: "Family L1 (0 gas)",
    },
    cChainYield: {
      primary: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
      badge: "#059669",
      label: "Fuji C-Chain (Lãi 8%)",
    },
    avalancheRed: "#E84142",
  },
  presetThemes: {
    SHIELD: {
      primary: "#10B981",
      secondary: "#065F46",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    SHARED_GOAL: {
      primary: "#F59E0B",
      secondary: "#92400E",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    MILESTONE: {
      primary: "#8B5CF6",
      secondary: "#5B21B6",
      badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    },
    ROSCA: {
      primary: "#14B8A6",
      secondary: "#0F766E",
      badge: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    },
  },
} as const;

// ============================================================================
// 2. MOBILE-FIRST ERGONOMICS & SIZING TOKENS
// ============================================================================
export const VAULT_MOBILE_TOKENS = {
  modal: {
    container: "fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md",
    panel: "w-full max-w-2xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl",
    header: "px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0",
    body: "flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-5 space-y-4",
    footer: "px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3",
  },
  typography: {
    modalTitle: "text-base sm:text-lg font-bold text-white tracking-tight",
    stepTitle: "text-sm sm:text-base font-bold text-white",
    stepSubtitle: "text-xs text-slate-400 mt-0.5",
    bodyCompact: "text-xs text-slate-300 leading-normal",
    caption: "text-[11px] text-slate-400",
  },
  inputs: {
    compact: "w-full h-10 px-3 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
  },
  buttons: {
    primary: "h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50",
  },
};

// ============================================================================
// 3. THE 4 HIGH-IMPACT PRESETS (Trimmed, 1-Line Taglines)
// ============================================================================
export interface VaultPresetDefinition {
  id: VaultRule;
  title: string;
  shortTitle: string;
  tagline: string;
  badge: string;
  splitSummary: string; // e.g. "20% L1 · 80% C-Chain"
  effectiveApyFormatted: string; // e.g. "6.4% APY"
  description: string;
  ruleTemplate: VaultRule;
  defaultBufferRatioBps: number;
  defaultRequiredApprovals: number;
  defaultFastWithdrawLimit: string;
  defaultTargetGoalAmount?: string;
  defaultRoscaRoundDuration?: string;
  defaultRoscaRoundContribution?: string;
  themeKey: keyof typeof VAULT_COLORS.presetThemes;
  highlights: string[];
  suggestedNames: string[];
  quickNames: string[];
  whyItMatters: string;
}

export const VAULT_PRESETS: Record<VaultRule, VaultPresetDefinition> = {
  SHIELD: {
    id: "SHIELD",
    title: "Quỹ Khẩn Cấp & Trợ Cấp",
    shortTitle: "Quỹ Khẩn Cấp",
    tagline: "Rút tức thì 0 gas, chi lớn cả nhà duyệt",
    badge: "Phổ biến nhất",
    splitSummary: "20% L1 • 80% C-Chain",
    effectiveApyFormatted: "6.4% APY",
    description: "Bộ đệm 20% tại Family L1 giải ngân trong 1 giây không tốn phí gas. 80% còn lại tự động stake sinh lời 8% APY trên C-Chain.",
    ruleTemplate: "SHIELD",
    defaultBufferRatioBps: 2000,
    defaultRequiredApprovals: 1,
    defaultFastWithdrawLimit: "0.05",
    themeKey: "SHIELD",
    highlights: [
      "Rút nhanh < 1s hoàn toàn miễn phí gas (0 Gas Fee)",
      "Vốn nhàn rỗi sinh lời ~6.4% APY hiệu dụng",
      "Rút lớn vượt hạn mức tự động kích hoạt M/N chữ ký",
    ],
    suggestedNames: ["Quỹ Khẩn Cấp Gia Đình", "Trợ Cấp Sinh Hoạt", "Quỹ Y Tế Sức Khỏe"],
    quickNames: ["Quỹ Khẩn Cấp", "Trợ Cấp Tuần", "Viện Phí Y Tế"],
    whyItMatters: "Phù hợp chi tiêu thường nhật, viện phí cấp bách không cần chờ duyệt lâu.",
  },
  SHARED_GOAL: {
    id: "SHARED_GOAL",
    title: "Quỹ Mục Tiêu Chung",
    shortTitle: "Heo Đất Chung",
    tagline: "Cả nhà cùng góp, sinh lãi 7.2%/năm",
    badge: "Tích lũy",
    splitSummary: "10% L1 • 90% C-Chain",
    effectiveApyFormatted: "7.2% APY",
    description: "Cả nhà cùng chung tay tích lũy cho mục tiêu lớn. Tiền nhàn rỗi sinh lời trên Fuji C-Chain.",
    ruleTemplate: "SHARED_GOAL",
    defaultBufferRatioBps: 1000,
    defaultRequiredApprovals: 2,
    defaultFastWithdrawLimit: "0.01",
    defaultTargetGoalAmount: "5.0",
    themeKey: "SHARED_GOAL",
    highlights: [
      "90% vốn sinh lời 8% APY trong suốt thời gian tích lũy",
      "Mở khóa minh bạch: Chỉ chi khi đủ chỉ tiêu hoặc đến hạn",
      "Cần M/N Guardians cùng đồng thuận ký giải ngân",
    ],
    suggestedNames: ["Chuyến Du Lịch Hè", "Heo Đất Mua Xe", "Quỹ Tân Gia"],
    quickNames: ["Du Lịch Cả Nhà", "Mua Xe Mới", "Tân Gia"],
    whyItMatters: "Giúp cả nhà thấy tiến độ tích lũy trực quan, sinh lời liên tục.",
  },
  MILESTONE: {
    id: "MILESTONE",
    title: "Thưởng Nhiệm Vụ (Chore)",
    shortTitle: "Quỹ Nhiệm Vụ",
    tagline: "Giao việc con làm, duyệt ảnh nhận thưởng",
    badge: "Giáo dục",
    splitSummary: "10% L1 • 90% C-Chain",
    effectiveApyFormatted: "7.2% APY",
    description: "Bố mẹ nạp quỹ, giao nhiệm vụ học tập cho con. Tiền thưởng được giữ riêng và sinh lời.",
    ruleTemplate: "MILESTONE",
    defaultBufferRatioBps: 1000,
    defaultRequiredApprovals: 1,
    defaultFastWithdrawLimit: "0.01",
    themeKey: "MILESTONE",
    highlights: [
      "Khuyến khích con cái làm việc nhà & học tập tự giác",
      "Tiền thưởng sinh lãi 8% trong thời gian chờ thực hiện",
      "Phân quyền bảo vệ: Con làm, Bố Mẹ kiểm duyệt và mở khóa",
    ],
    suggestedNames: ["Học Bổng Cho Bé", "Thưởng Việc Nhà", "Rèn Luyện"],
    quickNames: ["Học Bổng Cho Bé", "Thưởng Việc Nhà", "Rèn Luyện"],
    whyItMatters: "Tạo thói quen lao động & quản lý tài chính sớm cho trẻ nhỏ.",
  },
  ROSCA: {
    id: "ROSCA",
    title: "Họ / Hụi Xoay Vòng",
    shortTitle: "Hội Chơi Hụi",
    tagline: "Góp xoay vòng, lãi 8% không lo bùng họ",
    badge: "100% On-chain",
    splitSummary: "0% L1 • 100% C-Chain",
    effectiveApyFormatted: "8.0% APY",
    description: "Mô hình góp vốn cộng đồng không lo bùng hụi. Tự động sinh lời và chi trả gốc + lãi theo kỳ.",
    ruleTemplate: "ROSCA",
    defaultBufferRatioBps: 0,
    defaultRequiredApprovals: 1,
    defaultFastWithdrawLimit: "0.01",
    defaultRoscaRoundDuration: "604800",
    defaultRoscaRoundContribution: "0.1",
    themeKey: "ROSCA",
    highlights: [
      "100% tiền nhàn rỗi sinh lãi 8% APY trong thời gian chờ lượt",
      "Hợp đồng khóa quỹ tự động, triệt tiêu rủi ro bùng họ",
      "Tự động giải ngân cả Gốc + Lãi chia đều cho người nhận lượt",
    ],
    suggestedNames: ["Hụi Anh Em", "Tiết Kiệm Tuần", "Góp Vốn 30N"],
    quickNames: ["Hụi Anh Em", "Tiết Kiệm Tuần", "Góp Vốn 30N"],
    whyItMatters: "Số hóa truyền thống chơi họ của người Việt, loại bỏ bùng hụi.",
  },
};

// ============================================================================
// 4. COMPACT LIQUIDITY PRESETS & MATH
// ============================================================================
export const APY_CONSTANTS = {
  FUJI_C_CHAIN_BASE_APY: 8.0,
  MAX_BPS: 10000,
  MIN_BPS: 0,
  STEP_BPS: 100,
};

export interface LiquidityPresetOption {
  label: string;
  l1Percent: number;
  cChainPercent: number;
  bufferRatioBps: number;
  effectiveApy: number;
  badge: string;
}

export const LIQUIDITY_PRESETS: LiquidityPresetOption[] = [
  { label: "Tối đa lãi", l1Percent: 0, cChainPercent: 100, bufferRatioBps: 0, effectiveApy: 8.0, badge: "8.0%" },
  { label: "Chuẩn DeFi", l1Percent: 10, cChainPercent: 90, bufferRatioBps: 1000, effectiveApy: 7.2, badge: "7.2%" },
  { label: "Khẩn cấp", l1Percent: 20, cChainPercent: 80, bufferRatioBps: 2000, effectiveApy: 6.4, badge: "6.4%" },
  { label: "Rút nhanh", l1Percent: 30, cChainPercent: 70, bufferRatioBps: 3000, effectiveApy: 5.6, badge: "5.6%" },
];

export function calculateEffectiveApy(bufferRatioBps: number): number {
  const safeBps = Math.max(0, Math.min(10000, Number(bufferRatioBps) || 0));
  const cChainRatio = (10000 - safeBps) / 10000;
  return Number((APY_CONSTANTS.FUJI_C_CHAIN_BASE_APY * cChainRatio).toFixed(1));
}

export function simulateVaultYield({
  amountAvax = 10,
  bufferRatioBps = 1000,
}: {
  amountAvax?: number;
  bufferRatioBps?: number;
}) {
  const safeBps = Math.max(0, Math.min(10000, Number(bufferRatioBps) || 0));
  const l1Share = Number(((amountAvax * safeBps) / 10000).toFixed(2));
  const cChainShare = Number(((amountAvax * (10000 - safeBps)) / 10000).toFixed(2));
  const apy = calculateEffectiveApy(safeBps);
  const yearlyYieldAvax = Number(((cChainShare * APY_CONSTANTS.FUJI_C_CHAIN_BASE_APY) / 100).toFixed(3));

  return {
    l1Share,
    cChainShare,
    effectiveApy: apy,
    yearlyYieldAvax,
  };
}

// ============================================================================
// 5. GUARDIAN MULTI-SIG THRESHOLD RECOMMENDATIONS
// ============================================================================
export interface MultisigThresholdOption {
  threshold: number;
  total: number;
  label: string;
  shortLabel: string;
  isRecommended?: boolean;
}

export function getMultisigRecommendations(totalGuardians: number): MultisigThresholdOption[] {
  if (totalGuardians <= 0) {
    return [{ threshold: 1, total: 0, label: "Chưa chọn người bảo hộ", shortLabel: "0 người" }];
  }
  if (totalGuardians === 1) {
    return [
      { threshold: 1, total: 1, label: "1/1 — Tự duyệt tức thì", shortLabel: "1/1", isRecommended: true },
    ];
  }
  if (totalGuardians === 2) {
    return [
      { threshold: 1, total: 2, label: "1/2 — Bất kỳ ai duyệt", shortLabel: "1/2" },
      { threshold: 2, total: 2, label: "2/2 — Cả 2 cùng ký (Bố & Mẹ)", shortLabel: "2/2 (Đồng thuận)", isRecommended: true },
    ];
  }
  const majority = Math.floor(totalGuardians / 2) + 1;
  return [
    { threshold: 1, total: totalGuardians, label: `1/${totalGuardians} — Bất kỳ 1 người`, shortLabel: `1/${totalGuardians}` },
    { threshold: majority, total: totalGuardians, label: `${majority}/${totalGuardians} — Đa số quá bán`, shortLabel: `${majority}/${totalGuardians}`, isRecommended: true },
    { threshold: totalGuardians, total: totalGuardians, label: `${totalGuardians}/${totalGuardians} — 100% Đồng thuận`, shortLabel: `${totalGuardians}/${totalGuardians}` },
  ];
}

// ============================================================================
// 6. CRISP, HUMAN-CENTRIC VIETNAMESE MICRO-COPY (Zero AI Slop)
// ============================================================================
export const VAULT_MICROCOPY = {
  wizard: {
    steps: [
      { id: 1, title: "Mục Đích", subtitle: "Mẫu hũ & tên" },
      { id: 2, title: "Thành Viên", subtitle: "Duyệt & nhận" },
      { id: 3, title: "Đệm & Lãi", subtitle: "L1 vs Fuji C-Chain" },
      { id: 4, title: "Xác Nhận", subtitle: "Ký tạo hũ" },
    ],
    headerTag: "KINETIX VAULT",
    headerTitle: "Hũ Tiền Gia Đình",
    headerDesc: "Thiết lập quỹ chia sẻ trên Avalanche Fuji với 0 phí gas và sinh lời 8% APY.",
    btnBack: "Quay lại",
    btnContinue: "Tiếp tục",
    btnSaveDraft: "Lưu bản nháp",
    btnChecking: "Đang kiểm tra...",
    btnSignNow: "Ký Tạo Hũ (Core)",
    statusDraftSaved: "Đã tự động lưu bản nháp an toàn.",
  },

  step1Preset: {
    title: "Mục đích sử dụng hũ",
    subtitle: "Chọn mẫu cấu hình sẵn để bắt đầu nhanh:",
    fieldVaultName: "Tên hũ",
    namePlaceholder: "VD: Quỹ Khẩn Cấp, Heo Đất Du Lịch...",
    addNoteToggle: "+ Thêm ghi chú riêng tư",
    fieldDesc: "Ghi chú gia đình",
    descPlaceholder: "Ghi chú quy ước chi tiêu (chỉ gia đình thấy)...",
    privacyNote: "Ghi chú này được mã hóa và lưu riêng tư trong gia đình, không công khai lên blockchain.",
  },

  step2Members: {
    title: "Phân quyền thành viên",
    subtitle: "Chọn người ký duyệt và người được rút:",
    guardiansTitle: "Người Bảo Hộ (Guardians)",
    guardiansHint: "Ký duyệt khoản rút vượt hạn mức",
    guardianSectionTitle: "Người Bảo Hộ (Guardians ký duyệt)",
    guardianSectionDesc: "Chịu trách nhiệm kiểm tra và ký duyệt các khoản rút lớn hơn hạn mức.",
    beneficiariesTitle: "Người Thụ Hưởng",
    beneficiariesHint: "Được rút tiền hoặc nhận thưởng",
    beneficiarySectionTitle: "Người Thụ Hưởng (Thành viên nhận tiền)",
    beneficiarySectionDesc: "Người có thể tạo yêu cầu rút tiền hoặc nhận tiền thưởng/hụi.",
    thresholdLabel: "Chữ ký cần cho khoản rút lớn:",
    roscaOrderTitle: "Thứ tự nhận hụi theo kỳ",
    roscaOrderDesc: "Thứ tự này sẽ được khóa vĩnh viễn trên blockchain sau khi tạo.",
    noCoreWarning: "Thành viên chưa liên kết ví Core vẫn có thể chọn. Hệ thống sẽ hỗ trợ kích hoạt khi giao dịch.",
    milestoneSelfGuardConstraint: "Với Quỹ Nhiệm Vụ, người làm việc (con cái) không được tự làm Guardian duyệt cho chính mình.",
  },

  step3Rules: {
    title: "Đệm thanh khoản & Lãi suất",
    subtitle: "Cân đối rút tức thì 0 gas và sinh lời 8% APY:",
    l1Tag: "L1: Rút 0s (0 gas)",
    cChainTag: "C-Chain: Lãi 8%",
    l1BufferLabel: "Đệm Thanh Khoản Family L1 (Rút Tức Thì)",
    cChainYieldLabel: "Gửi Sinh Lời Fuji C-Chain (Lãi Suất Thụ Động)",
    sliderHint: "Kéo để điều chỉnh tỷ lệ đệm mong muốn cho hũ này.",
    effectiveApyBadge: "Lợi suất",
    simHint: "Giả định 10 AVAX:",
    fastLimitLabel: "Hạn mức rút nhanh (mỗi lần)",
    fastLimitHint: "Dưới mức này rút tức thì 0 cần duyệt",
    fastWithdrawLabel: "Hạn mức rút nhanh không cần duyệt (mỗi lần)",
    fastWithdrawDesc: "Khoản tiền dưới mức này sẽ được giải ngân ngay lập tức trong 1 giây từ đệm L1.",
    goalLabel: "Mục tiêu tích lũy (AVAX)",
    goalDeadlineLabel: "Hạn mục tiêu",
    targetGoalLabel: "Số tiền mục tiêu tích lũy (AVAX)",
    targetDeadlineLabel: "Ngày mục tiêu muốn đạt được",
    roscaContribLabel: "Mỗi người góp mỗi kỳ (AVAX)",
    roscaDurationLabel: "Chu kỳ góp hụi",
    roscaContributionLabel: "Mỗi người đóng góp mỗi kỳ (AVAX)",
    thresholdLabel: "Ngưỡng biểu quyết cho khoản rút lớn",
    thresholdDesc: "Khi ai đó rút lớn hơn hạn mức nhanh, cần bao nhiêu Guardians cùng xác nhận?",
  },

  step4Review: {
    title: "Xem lại & Kích hoạt",
    subtitle: "Mọi quy tắc sẽ được ghi nhận an toàn trên Avalanche:",
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
    consentShort: "Tôi đồng ý với các quy tắc và hạn mức của hũ này.",
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
