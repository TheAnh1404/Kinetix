"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "vi" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Brand & Meta
    "brand.name": "Kinetix",
    "brand.tagline": "Family Finance OS",
    "brand.sub": "Hệ điều hành tài chính gia đình đa thế hệ trên Avalanche",

    // Navbar
    "nav.about": "Giới Thiệu",
    "nav.architecture": "Kiến Trúc 10/90",
    "nav.solutions": "3 Thế Hệ",
    "nav.security": "Bảo Mật",
    "nav.login": "Đăng Nhập",
    "nav.getStarted": "Bắt Đầu Sử Dụng",
    "nav.dashboard": "Vào Bảng Điều Khiển",
    "nav.logout": "Đăng Xuất",
    "nav.familyCode": "Mã Gia Đình",
    "nav.copiedCode": "Đã sao chép mã gia đình!",

    // Hero Section
    "hero.badge.subnet": "Phát triển trên Avalanche L1",
    "hero.badge.gas": "Phí Gas Bằng 0 (0 Gwei)",
    "hero.badge.multisig": "Đa Chữ Ký Chống Scam 2/3",
    "hero.badge.teleporter": "Công nghệ Avalanche Teleporter",
    "hero.title": "Hệ Điều Hành Tài Chính Gia Đình Đa Thế Hệ Trên",
    "hero.subtitle":
      "Bảo vệ ông bà khỏi các thủ đoạn lừa đảo công nghệ cao, tự động điều chuyển vốn nhàn rỗi sang DeFi sinh lời ~8%/năm, và dạy con quản lý tài chính sớm với 0đ phí gas.",
    "hero.cta.start": "Bắt Đầu Trải Nghiệm Ngay",
    "hero.cta.explore": "Khám Phá Giải Pháp",
    "hero.stat.gas": "Phí Gas Chi Tiêu",
    "hero.stat.gasVal": "0.00đ Miễn Phí",
    "hero.stat.speed": "Tốc Độ Giải Ngân",
    "hero.stat.speedVal": "< 0.8 Giây",
    "hero.stat.multisig": "Cơ Chế Bảo Vệ",
    "hero.stat.multisigVal": "2/3 Guardians Ký",
    "hero.stat.yield": "Lợi Suất Tiết Kiệm",
    "hero.stat.yieldVal": "~8.2% APY Thực",

    // Architecture 10/90
    "arch.badge": "Kiến Trúc Phân Tầng Độc Quyền",
    "arch.title": "Cơ Chế Đệm Thanh Khoản 10/90 & Đa Chuỗi Thông Minh",
    "arch.desc":
      "Giải quyết triệt để bài toán: vừa rút tiền chi tiêu hàng ngày tức thì không mất phí, vừa sinh lời tối đa cho khoản tiết kiệm nhàn rỗi của cả gia đình.",
    "arch.step1.title": "1. Nạp Quỹ Gia Đình",
    "arch.step1.desc": "Gia đình nạp vốn một lần vào Quỹ chung trên Avalanche Family L1.",
    "arch.step2.title": "2. 10% Giữ Lại Đệm L1",
    "arch.step2.desc": "Sẵn sàng cho Ông Bà rút đi chợ và Con Trẻ nhận thưởng việc nhà. Thời gian <1s, 0 gas fee.",
    "arch.step3.title": "3. Avalanche Teleporter ICM",
    "arch.step3.desc": "Kênh liên lạc đa chuỗi tự động điều chuyển 90% dòng tiền sang C-Chain mà không cần qua cầu nối bên thứ ba.",
    "arch.step4.title": "4. 90% Sinh Lời DeFi",
    "arch.step4.desc": "Tự động stake vào Fuji C-Chain nhận lợi nhuận ~8.2% APY cộng dồn theo thời gian thực.",

    // 3 Generations Solutions
    "solutions.badge": "Trải Nghiệm Riêng Biệt",
    "solutions.title": "Giải Pháp Thiết Kế Chuyên Biệt Cho 3 Thế Hệ",
    "solutions.desc":
      "Mỗi thế hệ có một giao diện và cơ chế phân quyền bảo mật riêng biệt, tối ưu theo độ tuổi và hành vi sử dụng.",
    
    // Gen 1: Elderly
    "gen1.badge": "Thế Hệ 1 • Ông Bà",
    "gen1.title": "Kinetix Shield — Lá Chắn Phòng Chống Lừa Đảo",
    "gen1.desc":
      "Bảo vệ tài sản dưỡng già của ông bà trước các thủ đoạn gọi điện giả danh công an, viện phí khẩn cấp, hay dụ dỗ chuyển tiền.",
    "gen1.feature1": "Rút tiền nhỏ (<= 50 USDC): Giải ngân tức thì từ đệm 10%, không yêu cầu xét duyệt.",
    "gen1.feature2": "Rút tiền lớn (> 50 USDC): Tự động chặn và gửi cảnh báo khẩn đến các con, cần 2/3 chữ ký mới giải ngân.",
    "gen1.feature3": "Giao diện chữ to, thao tác 1 chạm, ẩn hoàn toàn mã băm kỹ thuật (hex, gas).",

    // Gen 2: Guardians
    "gen2.badge": "Thế Hệ 2 • Bố Mẹ / Các Con",
    "gen2.title": "Trạm Quản Trị — Kiểm Soát Tài Sản & Phê Duyệt",
    "gen2.desc":
      "Bảng điều khiển trực quan giúp các con bảo hộ tài sản cho cha mẹ già và quản lý ngân sách tương lai cho con cái.",
    "gen2.feature1": "Trung tâm Đa chữ ký (Multisig Center): Ký duyệt các lệnh rút tiền lớn nhanh chóng trên di động.",
    "gen2.feature2": "Quản lý 3 Hũ Tài Chính: Hưu trí báo hiếu, Heo đất con trẻ, và Quỹ tương trợ dòng họ ROSCA.",
    "gen2.feature3": "Quản lý thành viên gia đình, cấp mã Family Code và phân quyền linh hoạt.",

    // Gen 3: Kids
    "gen3.badge": "Thế Hệ 3 • Con Trẻ",
    "gen3.title": "Kinetix Kids — Heo Đất & Làm Việc Nhà Nhận Thưởng",
    "gen3.desc":
      "Ứng dụng mô hình Chore-to-Earn giúp trẻ hình thành thói quen lao động, tiết kiệm và hiểu về giá trị đồng tiền từ sớm.",
    "gen3.feature1": "Danh sách việc nhà thông minh: Tưới cây, dọn phòng, đạt điểm 10 kiểm tra.",
    "gen3.feature2": "Nộp ảnh minh chứng hoàn thành để bố mẹ xác nhận và chuyển thưởng trực tiếp.",
    "gen3.feature3": "Theo dõi Heo đất tăng trưởng với lãi suất DeFi thực tế được cộng dồn mỗi ngày.",

    // Security & Trust
    "sec.badge": "Độ Tin Cậy Cao",
    "sec.title": "Bảo Mật Cấp Doanh Nghiệp Trên Nền Tảng Avalanche",
    "sec.item1.title": "Mạng L1 Gia Đình Riêng Biệt",
    "sec.item1.desc": "Family L1 hoạt động độc lập, cấu hình 0 phí gas và giới hạn Allowlist chỉ các ví gia đình mới được tham gia.",
    "sec.item2.title": "Chuẩn Đăng Nhập SIWE EIP-4361",
    "sec.item2.desc": "Đăng nhập bằng chữ ký mật mã từ ví Avalanche Core, đối soát Nonce chống tấn công phát lại Replay Attack.",
    "sec.item3.title": "Không Giả Lập Thời Gian (No Mock Time)",
    "sec.item3.desc": "Smart Contract tính toán lãi suất dựa trên block.timestamp thực tế, đạt tiêu chuẩn kiểm thử Production-grade.",
    "sec.item4.title": "Lưu Trữ Bền Vững Đám Mây",
    "sec.item4.desc": "Toàn bộ tài khoản gia đình được lưu trữ an toàn trên Neon Serverless PostgreSQL, sẵn sàng mở rộng quy mô.",

    // CTA
    "cta.title": "Sẵn Sàng Bảo Vệ & Gia Tăng Tài Sản Gia Đình Bạn?",
    "cta.desc": "Khởi tạo tổ hợp tài chính gia đình trên Avalanche chỉ trong 2 phút. Không cần thẻ tín dụng, phí gas bằng 0.",
    "cta.btn": "Tạo Gia Đình Mới Miễn Phí",

    // Footer
    "footer.desc": "Hệ điều hành tài chính gia đình đa thế hệ xây dựng trên nền tảng Avalanche L1.",
    "footer.unihack": "Dự án Avalanche Team 1 Vietnam - UniHack",
    "footer.docs": "Tài Liệu Kỹ Thuật",
    "footer.security": "Kiểm Toán An Toàn",
    "footer.rights": "© 2026 Kinetix Labs. Bảo mật trên Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Family OS",
    "auth.subtitle": "Hệ điều hành tài chính gia đình đa thế hệ trên Avalanche",
    "auth.tab.login": "Đăng Nhập",
    "auth.tab.register": "Tạo Gia Đình Mới",
    "auth.tab.join": "Gia Nhập Mã",
    "auth.wallet.title": "Ví Avalanche Core",
    "auth.credentials.title": "Thành Viên (PIN/SĐT)",
    "auth.wallet.btn": "Kết Nối Ví Avalanche Core",
    "auth.wallet.connecting": "Đang kết nối & xác thực ví...",
    "auth.member.familyCode": "Mã Gia Đình (Family Code)",
    "auth.member.identifier": "Số Điện Thoại Hoặc Họ Tên",
    "auth.member.pin": "Mã PIN Bảo Mật",
    "auth.member.btn": "Đăng Nhập Thành Viên",
    "auth.register.familyName": "Tên Gia Đình",
    "auth.register.adminName": "Họ & Tên Người Đại Diện (Admin)",
    "auth.register.phone": "Số Điện Thoại Liên Lạc",
    "auth.register.pin": "Mã PIN Quản Trị (4-6 số)",
    "auth.register.btn": "Ký Ví Core & Khởi Tạo Gia Đình",
    "auth.join.familyCode": "Mã Gia Đình Cần Tham Gia",
    "auth.join.name": "Họ & Tên Của Bạn",
    "auth.join.phone": "Số Điện Thoại",
    "auth.join.pin": "Mã PIN Cá Nhân (4-6 số)",
    "auth.join.btn": "Ký Ví Core & Gia Nhập Gia Đình",
  },
  en: {
    // Brand & Meta
    "brand.name": "Kinetix",
    "brand.tagline": "Family Finance OS",
    "brand.sub": "The Multi-Generational Family Finance OS on Avalanche",

    // Navbar
    "nav.about": "Overview",
    "nav.architecture": "10/90 Architecture",
    "nav.solutions": "3 Generations",
    "nav.security": "Security",
    "nav.login": "Sign In",
    "nav.getStarted": "Get Started",
    "nav.dashboard": "Launch Dashboard",
    "nav.logout": "Sign Out",
    "nav.familyCode": "Family Code",
    "nav.copiedCode": "Family code copied to clipboard!",

    // Hero Section
    "hero.badge.subnet": "Powered by Avalanche L1",
    "hero.badge.gas": "Zero Gas Fee (0 Gwei)",
    "hero.badge.multisig": "Anti-Scam Multisig 2/3",
    "hero.badge.teleporter": "Avalanche Teleporter ICM",
    "hero.title": "The Multi-Generational Family Finance OS on",
    "hero.subtitle":
      "Protect grandparents from high-tech scams, automatically route idle family capital to earn ~8% APY in DeFi, and teach kids financial literacy with zero gas fees.",
    "hero.cta.start": "Get Started Free",
    "hero.cta.explore": "Explore Solutions",
    "hero.stat.gas": "Transaction Fee",
    "hero.stat.gasVal": "$0.00 Gasless",
    "hero.stat.speed": "Disbursement Speed",
    "hero.stat.speedVal": "< 0.8 Seconds",
    "hero.stat.multisig": "Protection Standard",
    "hero.stat.multisigVal": "2/3 Guardians",
    "hero.stat.yield": "Compound Savings",
    "hero.stat.yieldVal": "~8.2% APY Live",

    // Architecture 10/90
    "arch.badge": "Proprietary Architecture",
    "arch.title": "Smart 10/90 Liquidity Buffer & Dual-Chain Protocol",
    "arch.desc":
      "Solving the fundamental dilemma: instant gas-free daily spending for family members while maximizing compound DeFi yield on idle wealth.",
    "arch.step1.title": "1. Family Capital Deposit",
    "arch.step1.desc": "Deposit once into the unified Family Vault on Avalanche Family L1.",
    "arch.step2.title": "2. 10% Local Buffer (L1)",
    "arch.step2.desc": "Instantly liquid for elderly grocery runs and chore rewards. Under 1s, zero gas fee.",
    "arch.step3.title": "3. Teleporter ICM Bridge",
    "arch.step3.desc": "Cryptographic cross-chain messaging routes 90% of funds to C-Chain with no third-party bridge risks.",
    "arch.step4.title": "4. 90% DeFi Yield Engine",
    "arch.step4.desc": "Staked in Fuji C-Chain earning ~8.2% APY compounded continuously in real time.",

    // 3 Generations Solutions
    "solutions.badge": "Tailored Experiences",
    "solutions.title": "Dedicated Experiences Built for Three Generations",
    "solutions.desc":
      "Each generation enjoys a purpose-built interface and security permission model tailored to their digital comfort.",

    // Gen 1: Elderly
    "gen1.badge": "Generation 1 • Grandparents",
    "gen1.title": "Kinetix Shield — High-Tech Scam Defense",
    "gen1.desc":
      "Shielding retirement wealth against urgent voice impersonation, fake hospital calls, and fraudulent transfer scams.",
    "gen1.feature1": "Small Withdrawals (<= 50 USDC): Instant release from the 10% buffer without approval.",
    "gen1.feature2": "Large Withdrawals (> 50 USDC): Automatically queued, triggering guardian alerts. Requires 2/3 approvals.",
    "gen1.feature3": "Large high-contrast text, 1-touch actions, with technical hashes and gas completely hidden.",

    // Gen 2: Guardians
    "gen2.badge": "Generation 2 • Parents / Guardians",
    "gen2.title": "Guardian Command — Wealth Governance & Approval",
    "gen2.desc":
      "A holistic dashboard allowing adult children to safeguard elderly parents and cultivate wealth for their kids.",
    "gen2.feature1": "Multisig Approval Center: Swiftly review and sign large withdrawal requests on mobile.",
    "gen2.feature2": "3-Pot Vault Management: Retirement Shield, Kids Savings, and Family ROSCA fund.",
    "gen2.feature3": "Family member onboarding, unique Family Code generation, and dynamic role permissions.",

    // Gen 3: Kids
    "gen3.badge": "Generation 3 • Children",
    "gen3.title": "Kinetix Kids — Smart Piggy Bank & Chore-to-Earn",
    "gen3.desc":
      "Chore-to-Earn gamification teaches children work ethics, early savings habits, and the time value of money.",
    "gen3.feature1": "Intuitive chore checklist: Watering plants, cleaning room, scoring high marks in math.",
    "gen3.feature2": "Submit photo proof of completion for parents to verify and disburse instant rewards.",
    "gen3.feature3": "Watch savings grow in real time with automated DeFi yields added directly to the piggy bank.",

    // Security & Trust
    "sec.badge": "Enterprise Trust",
    "sec.title": "Enterprise-Grade Security Powered by Avalanche",
    "sec.item1.title": "Private Sovereign L1 Subnet",
    "sec.item1.desc": "Family L1 operates with custom 0-gas fee rules and transaction allowlists restricted strictly to family members.",
    "sec.item2.title": "SIWE EIP-4361 Cryptographic Auth",
    "sec.item2.desc": "Authenticated via Avalanche Core cryptographic signatures with database nonces mitigating replay attacks.",
    "sec.item3.title": "No Mock Time Travel",
    "sec.item3.desc": "Strict production-grade smart contracts calculating interest based on verifiable block timestamps.",
    "sec.item4.title": "Serverless Cloud Persistence",
    "sec.item4.desc": "Family records and multi-sig states safely stored on Neon Serverless PostgreSQL, ready for scale.",

    // CTA
    "cta.title": "Ready to Protect and Grow Your Family's Wealth?",
    "cta.desc": "Set up your multi-generational financial OS on Avalanche in under 2 minutes. No credit card required, 0 gas fees.",
    "cta.btn": "Create Free Family Vault",

    // Footer
    "footer.desc": "Multi-generational family finance OS built on the Avalanche L1 ecosystem.",
    "footer.unihack": "Avalanche Team 1 Vietnam - UniHack Entry",
    "footer.docs": "Technical Docs",
    "footer.security": "Security Audit",
    "footer.rights": "© 2026 Kinetix Labs. Secured on Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Family OS",
    "auth.subtitle": "The Multi-Generational Family Finance OS on Avalanche",
    "auth.tab.login": "Sign In",
    "auth.tab.register": "Create Family",
    "auth.tab.join": "Join with Code",
    "auth.wallet.title": "Avalanche Core Wallet",
    "auth.credentials.title": "Family Member (PIN/Phone)",
    "auth.wallet.btn": "Connect Avalanche Core Wallet",
    "auth.wallet.connecting": "Connecting & signing wallet...",
    "auth.member.familyCode": "Family Code",
    "auth.member.identifier": "Phone Number or Full Name",
    "auth.member.pin": "Security PIN",
    "auth.member.btn": "Sign In to Family",
    "auth.register.familyName": "Family Name",
    "auth.register.adminName": "Primary Representative (Admin)",
    "auth.register.phone": "Contact Phone Number",
    "auth.register.pin": "Admin Security PIN (4-6 digits)",
    "auth.register.btn": "Sign Wallet & Create Family Vault",
    "auth.join.familyCode": "Family Code to Join",
    "auth.join.name": "Your Full Name",
    "auth.join.phone": "Phone Number",
    "auth.join.pin": "Personal Security PIN (4-6 digits)",
    "auth.join.btn": "Sign Wallet & Join Family",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kinetix_lang") as Language;
      if (saved && (saved === "vi" || saved === "en")) {
        setLanguageState(saved);
      }
    } catch (e) {
      // LocalStorage access warning
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("kinetix_lang", lang);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const next = language === "vi" ? "en" : "vi";
    setLanguage(next);
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations.vi;
    return dict[key] || translations.vi[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
