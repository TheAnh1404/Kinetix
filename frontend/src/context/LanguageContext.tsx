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
    "brand.tagline": "Multi-Space Vault OS",
    "brand.sub": "Hệ điều hành Quản trị Đa Không Gian & Hũ Tiền Động trên Avalanche",

    // Navbar
    "nav.about": "Giới Thiệu",
    "nav.workspaces": "Đa Không Gian",
    "nav.rules": "4 Bộ Quy Tắc",
    "nav.architecture": "Kiến Trúc Đệm L1/C-Chain",
    "nav.security": "Bảo Mật",
    "nav.login": "Đăng Nhập",
    "nav.getStarted": "Bắt Đầu Sử Dụng",
    "nav.dashboard": "Vào Bảng Điều Khiển",
    "nav.logout": "Đăng Xuất",
    "nav.workspaceCode": "Mã Không Gian",
    "nav.familyCode": "Mã Không Gian",
    "nav.copiedCode": "Đã sao chép mã thành công!",

    // Hero Section
    "hero.badge.subnet": "Avalanche Custom L1",
    "hero.badge.gas": "Phí Gas = 0 (0 Gwei)",
    "hero.badge.multisig": "Đa Chữ Ký Phân Tầng M/N",
    "hero.badge.teleporter": "Avalanche Teleporter ICM",
    "hero.title": "Hệ Điều Hành Quản Trị Đa Không Gian & Hũ Tiền Động Trên",
    "hero.subtitle":
      "Tạo không giới hạn các hũ tiền động theo nhu cầu cho Đại gia đình, Nhóm anh em, Hội bạn thân hoặc CLB; tùy chỉnh tỷ lệ đệm thanh khoản L1 rút tức thì 0 gas và sinh lời DeFi 8% APY trên Avalanche Fuji C-Chain.",
    "hero.cta.start": "Bắt Đầu Trải Nghiệm Ngay",
    "hero.cta.explore": "Khám Phá 4 Bộ Quy Tắc",
    "hero.stat.gas": "Phí Giao Dịch L1",
    "hero.stat.gasVal": "0.00đ Miễn Phí",
    "hero.stat.speed": "Tốc Độ Rút Nhanh",
    "hero.stat.speedVal": "< 0.8 Giây",
    "hero.stat.multisig": "Bảo Vệ Phân Tầng",
    "hero.stat.multisigVal": "M/N Chữ Ký Duyệt",
    "hero.stat.yield": "Lợi Tức C-Chain",
    "hero.stat.yieldVal": "8.0% APY Thực",

    // Workspaces Section
    "ws.badge": "Đa Không Gian Chia Sẻ",
    "ws.title": "Một Tài Khoản, Không Giới Hạn Không Gian Quản Trị",
    "ws.desc":
      "Người dùng có thể đồng thời tham gia nhiều tổ chức và nhóm khác nhau, mỗi không gian được cô lập an toàn với bộ quy tắc và hũ tiền riêng biệt.",
    "ws.family.title": "1. Đại Gia Đình",
    "ws.family.desc": "Kết nối 3 thế hệ: Ông bà nhận trợ cấp dưỡng già, con cái đồng quản trị, trẻ nhỏ làm việc nhà học tài chính.",
    "ws.siblings.title": "2. Nhóm Anh Em Ruột",
    "ws.siblings.desc": "Quỹ phụng dưỡng cha mẹ chung, hỗ trợ nhau khi ốm đau, xây sửa nhà thờ họ với cơ chế ký duyệt minh bạch.",
    "ws.friends.title": "3. Hội Bạn Thân",
    "ws.friends.desc": "Cùng tích lũy quỹ du lịch, cắm trại, ăn uống cuối tuần; tiền nhàn rỗi sinh lời DeFi đến ngày mở quỹ.",
    "ws.community.title": "4. CLB & Cộng Đồng",
    "ws.community.desc": "Quỹ hoạt động sinh viên, nhóm nghiên cứu hoặc hội nghề nghiệp với hạn mức chi tiêu được giám sát chặt chẽ.",

    // 4 Rule Templates
    "rules.badge": "4 Bộ Quy Tắc Tùy Biến (Composable Rules)",
    "rules.title": "Linh Hoạt Cấu Hình Cho Mọi Nhu Cầu Quản Trị Vốn",
    "rules.desc":
      "Mỗi Hũ tiền được khởi tạo với 1 trong 4 bộ quy tắc thông minh, tự động hóa giải ngân và phân bổ đệm thanh khoản liên chuỗi.",
    "rules.shield.badge": "Rule 0 • SHIELD",
    "rules.shield.title": "Bảo Vệ & Trợ Cấp An Sinh",
    "rules.shield.desc": "Rút nhỏ ≤ hạn mức giải ngân tức thì 0 gas từ đệm L1; Rút lớn cần đủ M/N chữ ký Guardians xác nhận on-chain phòng chống lừa đảo.",
    "rules.milestone.badge": "Rule 1 • MILESTONE",
    "rules.milestone.title": "Nhiệm Vụ & Cột Mốc (Chore-to-Earn)",
    "rules.milestone.desc": "Vốn gốc gửi sang Fuji C-Chain nhận 8% APY; mở khóa giải ngân tiền thưởng ngay khi nhiệm vụ/cột mốc được Admin nghiệm thu.",
    "rules.rosca.badge": "Rule 2 • ROSCA",
    "rules.rosca.title": "Góp Vốn Xoay Vòng (Hụi Họ Thông Minh)",
    "rules.rosca.desc": "Các thành viên góp vốn định kỳ, 100% tiền nhàn rỗi chuyển sang C-Chain sinh lãi 8% APY, đến kỳ xoay vòng 1 người nhận gốc + chia đều lãi.",
    "rules.goal.badge": "Rule 3 • SHARED_GOAL",
    "rules.goal.title": "Mục Tiêu Chung (Du Lịch / Mua Sắm)",
    "rules.goal.desc": "Nhóm cùng góp tiền hướng tới mục tiêu tài chính chung; vốn sinh lãi liên tục trên C-Chain cho đến khi đạt target và đủ M/N chữ ký mở quỹ.",

    // Architecture & Buffer
    "arch.badge": "Kiến Trúc Đệm Thanh Khoản Linh Hoạt",
    "arch.title": "Tùy Biến Tỷ Lệ Đệm L1 & C-Chain Qua Avalanche Teleporter",
    "arch.desc":
      "Giải quyết bài toán nan giải: vừa có tiền mặt rút nhanh thường nhật không mất phí, vừa tối ưu hóa lợi suất 8% APY cho phần vốn nhàn rỗi.",
    "arch.step1.title": "1. Nạp Quỹ Vào Hũ Động",
    "arch.step1.desc": "Thành viên nạp AVAX vào bất kỳ Hũ tiền nào trên Avalanche Family L1.",
    "arch.step2.title": "2. Đệm Thanh Khoản L1 (0% - 50%)",
    "arch.step2.desc": "Tỷ lệ giữ lại L1 do bạn tự chọn (vd: 10% hoặc 20%) để rút tức thì <1s, 0 gas fee.",
    "arch.step3.title": "3. Avalanche Teleporter ICM",
    "arch.step3.desc": "Thông điệp mã hóa liên chuỗi tự động đẩy phần vốn còn lại sang Fuji C-Chain an toàn 100%.",
    "arch.step4.title": "4. Tầng DeFi C-Chain (8% APY)",
    "arch.step4.desc": "Tiền nhàn rỗi sinh lời ~8% APY liên tục dựa trên block.timestamp thực tế.",

    // Security & Trust
    "sec.badge": "Tiêu Chuẩn Production",
    "sec.title": "Hạ Tầng Bảo Mật & Kết Nối Toàn Diện",
    "sec.item1.title": "Mạng Family L1 Khép Kín",
    "sec.item1.desc": "Bật Transaction Allowlist Precompile và Custom Fee Config, chỉ các ví thành viên được cấp quyền mới có thể tương tác.",
    "sec.item2.title": "Avalanche Core & Passkey/PIN",
    "sec.item2.desc": "Tương thích hoàn toàn với Avalanche Core Wallet (SIWE EIP-4361) kết hợp mã PIN 4 số giản tiện cho Ông Bà & Trẻ Nhỏ.",
    "sec.item3.title": "Tính Lãi Thực Tế (No Mock Time)",
    "sec.item3.desc": "Smart Contract FamilyYieldVault tính lãi nghiêm ngặt trên block.timestamp, tuyệt đối không dùng hàm giả lập thời gian.",
    "sec.item4.title": "Neon Serverless PostgreSQL",
    "sec.item4.desc": "Đồng bộ bền vững mọi Không gian, Hũ động, thành viên và thông báo qua Drizzle ORM.",

    // CTA
    "cta.title": "Sẵn Sàng Xây Dựng Không Gian Tài Chính Cho Nhóm Của Bạn?",
    "cta.desc": "Khởi tạo Không gian chung và Hũ tiền động đầu tiên chỉ trong 1 phút. Không mất phí gas.",
    "cta.btn": "Tạo Không Gian Mới Miễn Phí",

    // Footer
    "footer.desc": "The Dynamic & Composable Multi-Space Vault OS on Avalanche.",
    "footer.unihack": "Dự án dự thi Avalanche Team1 Vietnam - UniHack",
    "footer.docs": "Tài Liệu Kiến Trúc",
    "footer.security": "Báo Cáo Kiểm Thử (31/31 Passed)",
    "footer.rights": "© 2026 Kinetix Labs. Powered by Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Multi-Space OS",
    "auth.subtitle": "Hệ điều hành Quản trị Đa Không Gian & Hũ Tiền Động trên Avalanche",
    "auth.tab.login": "Đăng Nhập",
    "auth.tab.register": "Tạo Không Gian Mới",
    "auth.tab.join": "Tham Gia Bằng Mã",
    "auth.wallet.title": "Ví Avalanche Core",
    "auth.credentials.title": "Đăng Nhập Nhanh (PIN 4 số)",
    "auth.wallet.btn": "Kết Nối Ví Avalanche Core",
    "auth.wallet.connecting": "Đang xác thực chữ ký SIWE...",
    "auth.member.familyCode": "Mã Không Gian (Workspace Code)",
    "auth.member.identifier": "Số Điện Thoại Hoặc Họ Tên",
    "auth.member.pin": "Mã PIN Bảo Mật (Mặc định: 1234)",
    "auth.member.btn": "Đăng Nhập Thành Viên",
    "auth.register.familyName": "Tên Không Gian Mới",
    "auth.register.adminName": "Họ & Tên Người Quản Trị",
    "auth.register.phone": "Số Điện Thoại Liên Lạc",
    "auth.register.pin": "Mã PIN Quản Trị (4 số)",
    "auth.register.btn": "Ký Ví & Khởi Tạo Không Gian",
    "auth.join.familyCode": "Mã Không Gian Cần Tham Gia",
    "auth.join.name": "Họ & Tên Của Bạn",
    "auth.join.phone": "Số Điện Thoại",
    "auth.join.pin": "Mã PIN Cá Nhân",
    "auth.join.btn": "Gia Nhập Không Gian",

    // Dashboard Executive & KPIs
    "dash.title": "Trung Tâm Quản Trị Không Gian",
    "dash.subtitle": "Quản Trị Đa Không Gian & Hũ Tiền Động • Avalanche Family L1 (0 Gas)",
    "dash.kpi.totalWealth": "Tổng Tài Sản Không Gian",
    "dash.kpi.totalWealthSub": "Tích lũy từ tất cả Hũ động",
    "dash.kpi.bufferL1": "Đệm Thanh Khoản L1",
    "dash.kpi.bufferL1Sub": "Khả dụng rút tức thì, 0 gas fee",
    "dash.kpi.yieldCChain": "Vốn DeFi Sinh Lời (8% APY)",
    "dash.kpi.yieldCChainSub": "Staked Fuji C-Chain qua Teleporter",
    "dash.kpi.securityScore": "Chỉ Số An Toàn M/N",
    "dash.kpi.securityScoreSub": "Bảo hộ đa chữ ký phân tầng",
    
    // Dashboard Tabs
    "dash.tab.overview": "Tổng Quan & Ký Duyệt",
    "dash.tab.vaults": "Hũ Tiền Động & Lợi Suất",
    "dash.tab.members": "Thành Viên & Phân Quyền",
    "dash.tab.chores": "Việc Nhà & Cột Mốc",
    "dash.tab.audit": "Nhật Ký Dòng Tiền",

    // Dashboard Actions & Modals
    "dash.actions.deposit": "Nạp Tiền Vào Hũ",
    "dash.actions.createVault": "Tạo Hũ Tiền Mới",
    "dash.actions.addMember": "Thêm Thành Viên",
    "dash.actions.createChore": "Giao Việc Nhà",
    "dash.actions.videoCall": "Gọi Video Xác Minh",
    "dash.actions.approve": "Ký Phê Duyệt On-Chain",
    "dash.actions.reject": "Từ Chối Yêu Cầu",
    "dash.actions.compound": "Tái Đầu Tư Lợi Nhuận",
    "dash.actions.copyCode": "Mã Không Gian",
    
    // Multisig & Approvals
    "dash.multisig.title": "CẢNH BÁO: Yêu Cầu Rút Tiền Lớn Chờ Phê Duyệt",
    "dash.multisig.approvedTitle": "Yêu Cầu Rút Tiền Đã Được Phê Duyệt Đủ Chữ Ký",
    "dash.multisig.timelock": "Thời hạn phê duyệt: 48:00 còn lại",
    "dash.multisig.progress": "Tiến trình ký Multisig",
    "dash.multisig.signed": "ĐÃ KÝ DUYỆT ✅",
    "dash.multisig.pending": "CHỜ BẠN DUYỆT ⏳",
    "dash.multisig.waiting": "CHỜ KÝ ⏳",
    
    // Members Management
    "dash.members.title": "Thành Viên & Phân Quyền Trong Không Gian",
    "dash.members.desc": "Đồng bộ thời gian thực từ cơ sở dữ liệu Neon Serverless PostgreSQL",
    "dash.members.name": "Họ và Tên",
    "dash.members.role": "Vai Trò",
    "dash.members.wallet": "Địa Chỉ Ví",
    "dash.members.allowlist": "Trạng Thái L1",
    "dash.members.actions": "Thao Tác",
    "dash.members.addTitle": "Thêm Thành Viên Vào Không Gian",
    "dash.members.addDesc": "Cấp quyền tham gia và tương tác 0 gas trên Avalanche Family L1",
    
    // Chores
    "dash.chores.title": "Nhiệm Vụ & Cột Mốc (Chore-to-Earn)",
    "dash.chores.desc": "Gắn liền với Hũ MILESTONE, vốn sinh lời 8% APY trên C-Chain và giải ngân thưởng khi hoàn thành",
    "dash.chores.newBtn": "Tạo Nhiệm Vụ Mới",
    "dash.chores.todo": "Chưa Làm",
    "dash.chores.submitted": "Đã Nộp (Chờ Duyệt)",
    "dash.chores.rewarded": "Đã Nhận Thưởng",
    "dash.chores.verifyBtn": "Duyệt & Giải Ngân",
    
    // Audit Log
    "dash.audit.title": "Nhật Ký Giao Dịch & Dòng Tiền",
    "dash.audit.desc": "Mọi thay đổi số dư và lệnh rút tiền đều được kiểm toán minh bạch trên chuỗi",
    "dash.audit.time": "Thời Gian",
    "dash.audit.type": "Hoạt Động",
    "dash.audit.amount": "Số Tiền",
    "dash.audit.executor": "Thực Hiện",
    "dash.audit.status": "Trạng Thái",
  },
  en: {
    // Brand & Meta
    "brand.name": "Kinetix",
    "brand.tagline": "Multi-Space Vault OS",
    "brand.sub": "The Dynamic & Composable Multi-Space Vault OS on Avalanche",

    // Navbar
    "nav.about": "Overview",
    "nav.workspaces": "Multi-Space",
    "nav.rules": "4 Rule Templates",
    "nav.architecture": "L1/C-Chain Buffer",
    "nav.security": "Security",
    "nav.login": "Sign In",
    "nav.getStarted": "Get Started",
    "nav.dashboard": "Launch Dashboard",
    "nav.logout": "Sign Out",
    "nav.workspaceCode": "Workspace Code",
    "nav.familyCode": "Workspace Code",
    "nav.copiedCode": "Workspace code copied to clipboard!",

    // Hero Section
    "hero.badge.subnet": "Avalanche Custom L1",
    "hero.badge.gas": "Zero Gas Fee (0 Gwei)",
    "hero.badge.multisig": "Tiered Multisig M/N",
    "hero.badge.teleporter": "Avalanche Teleporter ICM",
    "hero.title": "The Dynamic & Composable Multi-Space Vault OS on",
    "hero.subtitle":
      "Create unlimited dynamic vaults for Families, Siblings, Friends, or Campus Clubs. Customize liquid L1 buffer ratios for instant zero-gas spending, while idle capital earns ~8% APY on Avalanche Fuji C-Chain.",
    "hero.cta.start": "Get Started Free",
    "hero.cta.explore": "Explore 4 Rule Templates",
    "hero.stat.gas": "L1 Transaction Fee",
    "hero.stat.gasVal": "$0.00 Gasless",
    "hero.stat.speed": "Instant Withdraw",
    "hero.stat.speedVal": "< 0.8 Seconds",
    "hero.stat.multisig": "Tiered Security",
    "hero.stat.multisigVal": "M/N Signatures",
    "hero.stat.yield": "C-Chain Yield",
    "hero.stat.yieldVal": "8.0% APY Live",

    // Workspaces Section
    "ws.badge": "Multi-Space Workspaces",
    "ws.title": "One Account, Unlimited Shared Workspaces",
    "ws.desc":
      "A user can simultaneously belong to multiple workspaces, each securely isolated with its own members, permissions, and dynamic vaults.",
    "ws.family.title": "1. Multi-Gen Family",
    "ws.family.desc": "Connect 3 generations: grandparents receive care allowances, adults co-govern, kids learn finance through chores.",
    "ws.siblings.title": "2. Siblings Group",
    "ws.siblings.desc": "Parental care funds, emergency healthcare buffers, and ancestral home renovation with multi-signature governance.",
    "ws.friends.title": "3. Close Friends",
    "ws.friends.desc": "Collaborative saving for vacations, camping, and dining; idle funds generate DeFi yield until opening day.",
    "ws.community.title": "4. Campus & Clubs",
    "ws.community.desc": "Student club activity budgets, research teams, or professional societies with transparent audit trails.",

    // 4 Rule Templates
    "rules.badge": "4 Composable Rule Templates",
    "rules.title": "Customizable Logic for Any Financial Objective",
    "rules.desc":
      "Each dynamic vault is instantiated with one of four smart rule templates, automating payouts and cross-chain liquidity rebalancing.",
    "rules.shield.badge": "Rule 0 • SHIELD",
    "rules.shield.title": "Protection & Care Allowance",
    "rules.shield.desc": "Instant zero-gas micro-withdrawals (≤ limit) from L1 buffer; large withdrawals require M/N guardian multisig approval against scams.",
    "rules.milestone.badge": "Rule 1 • MILESTONE",
    "rules.milestone.title": "Milestone & Chore-to-Earn",
    "rules.milestone.desc": "Principal earns 8% APY on Fuji C-Chain; unlocks reward disbursements as soon as chores or milestones are verified.",
    "rules.rosca.badge": "Rule 2 • ROSCA",
    "rules.rosca.title": "Rotating Credit & Savings",
    "rules.rosca.desc": "Periodic member contributions stay 100% on C-Chain earning 8% APY; rounds rotate principal while yield is shared equally.",
    "rules.goal.badge": "Rule 3 • SHARED_GOAL",
    "rules.goal.title": "Shared Group Goal",
    "rules.goal.desc": "Group saving for travel or shared purchases; continuously accumulates DeFi yields until target is reached and M/N approve.",

    // Architecture & Buffer
    "arch.badge": "Flexible Liquidity Buffer Architecture",
    "arch.title": "Dynamic L1 Buffer & Cross-Chain Yield via Teleporter",
    "arch.desc":
      "Solving the fundamental dilemma: instant zero-gas daily liquidity on Family L1, combined with maximized 8% APY compound DeFi yields on C-Chain.",
    "arch.step1.title": "1. Deposit into Dynamic Vault",
    "arch.step1.desc": "Deposit AVAX into any vault on Avalanche Family L1.",
    "arch.step2.title": "2. L1 Liquid Buffer (0% - 50%)",
    "arch.step2.desc": "Custom ratio kept on L1 (e.g. 10% or 20%) for instant sub-second zero-gas withdrawals.",
    "arch.step3.title": "3. Avalanche Teleporter ICM",
    "arch.step3.desc": "Native cryptographic cross-chain messaging routes remaining capital to Fuji C-Chain securely.",
    "arch.step4.title": "4. Fuji C-Chain DeFi Engine (8% APY)",
    "arch.step4.desc": "Idle capital generates continuous yield calculated on actual block.timestamp.",

    // Security & Trust
    "sec.badge": "Production Grade",
    "sec.title": "Enterprise Security & Native Avalanche Connectivity",
    "sec.item1.title": "Private Family L1 Subnet",
    "sec.item1.desc": "Transaction Allowlist Precompile with Custom Fee Config ensuring zero gas fees and strict access control.",
    "sec.item2.title": "Avalanche Core & Passkey/PIN",
    "sec.item2.desc": "Full compatibility with Avalanche Core Wallet (SIWE EIP-4361) paired with 4-digit PIN modes for seniors and children.",
    "sec.item3.title": "Actual Time-Based Yield (No Mock Time)",
    "sec.item3.desc": "FamilyYieldVault computes yields strictly from block.timestamp without artificial time travel jumps.",
    "sec.item4.title": "Neon Serverless PostgreSQL",
    "sec.item4.desc": "Robust persistence for workspaces, dynamic vaults, members, and audit notifications via Drizzle ORM.",

    // CTA
    "cta.title": "Ready to Build Your Shared Wealth Workspace?",
    "cta.desc": "Launch your shared workspace and first dynamic vault in under 60 seconds with zero gas fees.",
    "cta.btn": "Create Free Workspace",

    // Footer
    "footer.desc": "The Dynamic & Composable Multi-Space Vault OS on Avalanche.",
    "footer.unihack": "Avalanche Team1 Vietnam - UniHack Project",
    "footer.docs": "Architecture Specs",
    "footer.security": "Test Suite (31/31 Passed)",
    "footer.rights": "© 2026 Kinetix Labs. Powered by Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Multi-Space OS",
    "auth.subtitle": "The Dynamic & Composable Multi-Space Vault OS on Avalanche",
    "auth.tab.login": "Sign In",
    "auth.tab.register": "Create Workspace",
    "auth.tab.join": "Join by Code",
    "auth.wallet.title": "Avalanche Core Wallet",
    "auth.credentials.title": "Quick PIN Sign-in",
    "auth.wallet.btn": "Connect Avalanche Core",
    "auth.wallet.connecting": "Verifying SIWE signature...",
    "auth.member.familyCode": "Workspace Code",
    "auth.member.identifier": "Phone Number or Name",
    "auth.member.pin": "Security PIN (Default: 1234)",
    "auth.member.btn": "Sign In Member",
    "auth.register.familyName": "New Workspace Name",
    "auth.register.adminName": "Administrator Name",
    "auth.register.phone": "Contact Phone",
    "auth.register.pin": "Admin PIN (4 digits)",
    "auth.register.btn": "Sign Wallet & Create Workspace",
    "auth.join.familyCode": "Workspace Code to Join",
    "auth.join.name": "Your Name",
    "auth.join.phone": "Phone Number",
    "auth.join.pin": "Personal PIN",
    "auth.join.btn": "Join Workspace",

    // Dashboard Executive & KPIs
    "dash.title": "Workspace Command Center",
    "dash.subtitle": "Dynamic & Composable Multi-Space Vaults • Avalanche Family L1 (0 Gas)",
    "dash.kpi.totalWealth": "Workspace Total Wealth",
    "dash.kpi.totalWealthSub": "Aggregated across all dynamic vaults",
    "dash.kpi.bufferL1": "L1 Liquid Buffer",
    "dash.kpi.bufferL1Sub": "Instant zero-gas withdrawal buffer",
    "dash.kpi.yieldCChain": "DeFi Yield Engine (8% APY)",
    "dash.kpi.yieldCChainSub": "Staked in Fuji C-Chain via Teleporter",
    "dash.kpi.securityScore": "M/N Security Standard",
    "dash.kpi.securityScoreSub": "Tiered multisig protection",
    
    // Dashboard Tabs
    "dash.tab.overview": "Overview & Approvals",
    "dash.tab.vaults": "Dynamic Vaults & Yield",
    "dash.tab.members": "Members & Roles",
    "dash.tab.chores": "Chores & Milestones",
    "dash.tab.audit": "Audit Ledger",

    // Dashboard Actions & Modals
    "dash.actions.deposit": "Deposit to Vault",
    "dash.actions.createVault": "Create New Vault",
    "dash.actions.addMember": "Add Member",
    "dash.actions.createChore": "Create Task",
    "dash.actions.videoCall": "Verify Video Call",
    "dash.actions.approve": "Sign On-Chain Approval",
    "dash.actions.reject": "Reject Request",
    "dash.actions.compound": "Compound Yield",
    "dash.actions.copyCode": "Workspace Code",
    
    // Multisig & Approvals
    "dash.multisig.title": "ALERT: Large Withdrawal Request Pending Approval",
    "dash.multisig.approvedTitle": "Withdrawal Request Fully Approved by Multisig",
    "dash.multisig.timelock": "Approval timelock: 48:00 remaining",
    "dash.multisig.progress": "Multisig signing progress",
    "dash.multisig.signed": "SIGNED ✅",
    "dash.multisig.pending": "AWAITING YOU ⏳",
    "dash.multisig.waiting": "WAITING ⏳",
    
    // Members Management
    "dash.members.title": "Workspace Members & Access Control",
    "dash.members.desc": "Real-time synchronization with Neon Serverless PostgreSQL",
    "dash.members.name": "Full Name",
    "dash.members.role": "Role",
    "dash.members.wallet": "Wallet Address",
    "dash.members.allowlist": "L1 Allowlist",
    "dash.members.actions": "Actions",
    "dash.members.addTitle": "Add Member to Workspace",
    "dash.members.addDesc": "Grant zero-gas interaction rights on Avalanche Family L1",
    
    // Chores
    "dash.chores.title": "Tasks & Milestones (Chore-to-Earn)",
    "dash.chores.desc": "Coupled with MILESTONE vaults: capital earns 8% APY on C-Chain, dispatches rewards upon verification",
    "dash.chores.newBtn": "New Task",
    "dash.chores.todo": "To Do",
    "dash.chores.submitted": "Submitted (Review)",
    "dash.chores.rewarded": "Rewarded",
    "dash.chores.verifyBtn": "Verify & Reward",
    
    // Audit Log
    "dash.audit.title": "On-Chain Audit Ledger",
    "dash.audit.desc": "All balance shifts and disbursement commands are auditable on-chain",
    "dash.audit.time": "Timestamp",
    "dash.audit.type": "Activity",
    "dash.audit.amount": "Amount",
    "dash.audit.executor": "Initiator",
    "dash.audit.status": "Status",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("kinetix_lang") as Language;
    if (saved === "vi" || saved === "en") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("kinetix_lang", lang);
  };

  const toggleLanguage = () => {
    const next = language === "vi" ? "en" : "vi";
    setLanguage(next);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["vi"][key] || key;
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
