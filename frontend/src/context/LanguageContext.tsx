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
    "hero.badge.subnet": "Avalanche Fuji · Testnet",
    "hero.badge.gas": "Fuji có phí mạng",
    "hero.badge.multisig": "Đa Chữ Ký Phân Tầng M/N",
    "hero.badge.teleporter": "ICM · Đang thử nghiệm",
    "hero.title": "Hệ Điều Hành Quản Trị Đa Không Gian & Hũ Tiền Động Trên",
    "hero.subtitle":
      "Quản lý quỹ chung cho gia đình và cộng đồng với vai trò rõ ràng, hũ tiền theo mục đích và quy trình phê duyệt. T1 sử dụng AVAX trên một chain; giao dịch cần deployment đã xác minh.",
    "hero.cta.start": "Bắt Đầu Trải Nghiệm Ngay",
    "hero.cta.explore": "Khám Phá 4 Bộ Quy Tắc",
    "hero.stat.gas": "Phí giao dịch",
    "hero.stat.gasVal": "Theo mạng Fuji",
    "hero.stat.speed": "Xác nhận giao dịch",
    "hero.stat.speedVal": "Theo trạng thái mạng",
    "hero.stat.multisig": "Bảo Vệ Phân Tầng",
    "hero.stat.multisigVal": "M/N Chữ Ký Duyệt",
    "hero.stat.yield": "Lợi suất T1",
    "hero.stat.yieldVal": "Chưa bật",

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
    "ws.friends.desc": "Cùng đóng góp cho du lịch, sinh hoạt nhóm hoặc các kế hoạch chung với lịch sử hoạt động rõ ràng.",
    "ws.community.title": "4. CLB & Cộng Đồng",
    "ws.community.desc": "Quỹ hoạt động sinh viên, nhóm nghiên cứu hoặc hội nghề nghiệp với hạn mức chi tiêu được giám sát chặt chẽ.",

    // 4 Rule Templates
    "rules.badge": "4 Bộ Quy Tắc Tùy Biến (Composable Rules)",
    "rules.title": "Linh Hoạt Cấu Hình Cho Mọi Nhu Cầu Quản Trị Vốn",
    "rules.desc":
      "Mỗi hũ sử dụng một trong bốn bộ quy tắc về chi tiêu, nhiệm vụ, góp vốn xoay vòng hoặc mục tiêu chung.",
    "rules.shield.badge": "Rule 0 • SHIELD",
    "rules.shield.title": "Bảo Vệ & Trợ Cấp An Sinh",
    "rules.shield.desc": "Chi tiêu trong hạn mức đã cấu hình; yêu cầu lớn cần đủ chữ ký guardian độc lập với người nhận.",
    "rules.milestone.badge": "Rule 1 • MILESTONE",
    "rules.milestone.title": "Nhiệm Vụ & Cột Mốc (Chore-to-Earn)",
    "rules.milestone.desc": "Giữ chỗ phần thưởng cho nhiệm vụ; chỉ chi sau khi hoàn thành và đủ phê duyệt. Không tạo lợi suất DeFi.",
    "rules.rosca.badge": "Rule 2 • ROSCA",
    "rules.rosca.title": "Góp Vốn Xoay Vòng (Hụi Họ Thông Minh)",
    "rules.rosca.desc": "Đóng góp theo kỳ và nhận quỹ theo thứ tự. T1 không đầu tư vốn hoặc chia lợi suất.",
    "rules.goal.badge": "Rule 3 • SHARED_GOAL",
    "rules.goal.title": "Mục Tiêu Chung (Du Lịch / Mua Sắm)",
    "rules.goal.desc": "Cùng góp tiền cho mục tiêu chung; giải ngân theo mục tiêu, thời hạn và số phê duyệt cần thiết.",

    // Architecture & Buffer
    "arch.badge": "Mô hình phân bổ thử nghiệm",
    "arch.title": "Mô phỏng phân bổ L1 / C-Chain",
    "arch.desc":
      "Đây là mô hình thiết kế liên chuỗi. T1 giữ vốn trên chain Hub; cross-chain và yield chưa bật.",
    "arch.calc.title": "Mô Phỏng Phân Bổ Vốn Đệm Thanh Khoản",
    "arch.calc.subtitle": "Thanh trượt minh họa chính sách phân bổ, không chuyển tài sản hoặc tạo lợi suất.",
    "arch.calc.slider": "Tỷ lệ giữ lại Đệm L1",
    "arch.calc.deposit": "Số vốn nạp giả lập",
    "arch.calc.l1Share": "Đệm L1 giả lập",
    "arch.calc.cchainShare": "Phần C-Chain giả lập",
    "arch.calc.estYield": "Lãi giả định từ reserve:",
    "arch.step1.title": "1. Nạp Quỹ Vào Hũ Động",
    "arch.step1.desc": "T1 ghi nhận AVAX thực nhận trên chain Hub sau khi deployment được xác minh.",
    "arch.step2.title": "2. Chính sách phân bổ (0–100%)",
    "arch.step2.desc": "Tỷ lệ là chính sách; hiện không tự chuyển vốn sang chain khác.",
    "arch.step3.title": "3. Avalanche Teleporter ICM",
    "arch.step3.desc": "ICM truyền thông điệp, không tự chuyển AVAX. Cần adapter tài sản và quy trình retry được kiểm chứng.",
    "arch.step4.title": "4. Lãi mô phỏng từ reserve",
    "arch.step4.desc": "Mô hình độc lập tính lãi đơn giả định 8%/năm, chỉ chi từ reserve của operator. Chưa bật trong T1.",

    // Security & Trust
    "sec.badge": "Đang kiểm chứng trên testnet",
    "sec.title": "Kiểm soát truy cập và xác nhận giao dịch",
    "sec.item1.title": "Quyền ứng dụng và quyền mạng",
    "sec.item1.desc": "Allowlist của Hub tách biệt với Transaction AllowList ở tầng EVM của L1. Cấu hình L1 cần xác minh riêng.",
    "sec.item2.title": "Tài khoản và ví Core",
    "sec.item2.desc": "Đăng nhập bằng tài khoản hoặc chứng minh sở hữu ví. PIN đã ngừng; passkey chưa triển khai.",
    "sec.item3.title": "Lãi giả định giới hạn bởi reserve",
    "sec.item3.desc": "Timestamp dùng tính toán mô phỏng; không tạo lợi nhuận thực. Thiếu reserve sẽ chặn chi phần lãi.",
    "sec.item4.title": "Neon Serverless PostgreSQL",
    "sec.item4.desc": "Đồng bộ bền vững mọi Không gian, Hũ động, thành viên và thông báo qua Drizzle ORM.",

    // CTA
    "cta.title": "Sẵn Sàng Xây Dựng Không Gian Tài Chính Cho Nhóm Của Bạn?",
    "cta.desc": "Tạo không gian, mời thành viên và thiết lập hũ. Giao dịch thực cần deployment đã xác minh và có phí Fuji.",
    "cta.btn": "Tạo không gian",

    // Footer
    "footer.desc": "The Dynamic & Composable Multi-Space Vault OS on Avalanche.",
    "footer.unihack": "Dự án dự thi Avalanche Team1 Vietnam - UniHack",
    "footer.docs": "Tài Liệu Kiến Trúc",
    "footer.security": "Trạng thái kiểm chứng",
    "footer.rights": "© 2026 Kinetix Labs. Powered by Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Multi-Space OS",
    "auth.subtitle": "Hệ điều hành Quản trị Đa Không Gian & Hũ Tiền Động trên Avalanche",
    "auth.tab.login": "Đăng Nhập",
    "auth.tab.register": "Tạo Không Gian Mới",
    "auth.tab.join": "Tham Gia Bằng Mã",
    "auth.wallet.title": "Ví Avalanche Core",
    "auth.credentials.title": "Đăng nhập bằng tài khoản",
    "auth.wallet.btn": "Kết Nối Ví Avalanche Core",
    "auth.wallet.connecting": "Đang xác thực chữ ký SIWE...",
    "auth.member.familyCode": "Mã Không Gian (Workspace Code)",
    "auth.member.identifier": "Số Điện Thoại Hoặc Họ Tên",
    "auth.member.pin": "PIN đã ngừng sử dụng",
    "auth.member.btn": "Đăng Nhập Thành Viên",
    "auth.register.familyName": "Tên Không Gian Mới",
    "auth.register.adminName": "Họ & Tên Người Quản Trị",
    "auth.register.phone": "Số Điện Thoại Liên Lạc",
    "auth.register.pin": "PIN đã ngừng sử dụng",
    "auth.register.btn": "Ký Ví & Khởi Tạo Không Gian",
    "auth.join.familyCode": "Mã Không Gian Cần Tham Gia",
    "auth.join.name": "Họ & Tên Của Bạn",
    "auth.join.phone": "Số Điện Thoại",
    "auth.join.pin": "PIN đã ngừng sử dụng",
    "auth.join.btn": "Gia Nhập Không Gian",

    // Dashboard Executive & KPIs
    "dash.title": "Trung Tâm Quản Trị Không Gian",
    "dash.subtitle": "Quản lý quỹ chung · Avalanche Fuji testnet",
    "dash.kpi.totalWealth": "Tổng Tài Sản Không Gian",
    "dash.kpi.totalWealthSub": "Tích lũy từ tất cả Hũ động",
    "dash.kpi.bufferL1": "Đệm Thanh Khoản L1",
    "dash.kpi.bufferL1Sub": "Số dư khả dụng đã đối soát",
    "dash.kpi.yieldCChain": "Lợi suất T1 chưa bật",
    "dash.kpi.yieldCChainSub": "Không có nguồn lợi suất DeFi tích hợp",
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
    "dash.members.addDesc": "Cấp quyền theo vai trò; giao dịch cần ví và deployment được xác minh.",
    
    // Chores
    "dash.chores.title": "Nhiệm Vụ & Cột Mốc (Chore-to-Earn)",
    "dash.chores.desc": "Nhiệm vụ MILESTONE giữ chỗ thưởng, chỉ chi sau khi hoàn thành và đủ phê duyệt.",
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

    // 404 Not Found Page
    "notfound.badge": "HTTP 404 • Không Tìm Thấy Trang",
    "notfound.title": "Không Tìm Thấy Trang",
    "notfound.desc": "Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển sang giao diện mới của Kinetix.",
    "notfound.countdown": "Tự động chuyển hướng về Trang Chủ sau",
    "notfound.home": "Về Trang Chủ",
    "notfound.login": "Đăng Nhập",
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
    "hero.badge.subnet": "Avalanche Fuji · Testnet",
    "hero.badge.gas": "Fuji network fees apply",
    "hero.badge.multisig": "Tiered Multisig M/N",
    "hero.badge.teleporter": "ICM · Experimental",
    "hero.title": "The Dynamic & Composable Multi-Space Vault OS on",
    "hero.subtitle":
      "Manage shared funds through clear roles, purpose-driven vaults, and approval workflows. T1 uses native AVAX on one chain; transactions require a verified deployment.",
    "hero.cta.start": "Get Started Free",
    "hero.cta.explore": "Explore 4 Rule Templates",
    "hero.stat.gas": "Transaction fees",
    "hero.stat.gasVal": "Fuji network fees",
    "hero.stat.speed": "Transaction confirmation",
    "hero.stat.speedVal": "Network dependent",
    "hero.stat.multisig": "Tiered Security",
    "hero.stat.multisigVal": "M/N Signatures",
    "hero.stat.yield": "T1 yield",
    "hero.stat.yieldVal": "Disabled",

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
    "ws.friends.desc": "Contribute toward trips, group activities, or shared plans with a clear activity history.",
    "ws.community.title": "4. Campus & Clubs",
    "ws.community.desc": "Student club activity budgets, research teams, or professional societies with transparent audit trails.",

    // 4 Rule Templates
    "rules.badge": "4 Composable Rule Templates",
    "rules.title": "Customizable Logic for Any Financial Objective",
    "rules.desc":
      "Each vault uses one of four rule templates for spending, tasks, rotating contributions, or shared goals.",
    "rules.shield.badge": "Rule 0 • SHIELD",
    "rules.shield.title": "Protection & Care Allowance",
    "rules.shield.desc": "Spend within configured limits; larger requests require sufficient guardian approvals independent of the recipient.",
    "rules.milestone.badge": "Rule 1 • MILESTONE",
    "rules.milestone.title": "Milestone & Chore-to-Earn",
    "rules.milestone.desc": "Reserve task rewards and release them after completion and sufficient approvals. No DeFi yield is generated.",
    "rules.rosca.badge": "Rule 2 • ROSCA",
    "rules.rosca.title": "Rotating Credit & Savings",
    "rules.rosca.desc": "Contribute by round and receive the pool in an established order. T1 does not invest contributions or distribute yield.",
    "rules.goal.badge": "Rule 3 • SHARED_GOAL",
    "rules.goal.title": "Shared Group Goal",
    "rules.goal.desc": "Save toward a shared target, with release governed by the goal, deadline, and approval policy.",

    // Architecture & Buffer
    "arch.badge": "Experimental allocation model",
    "arch.title": "L1 / C-Chain allocation simulation",
    "arch.desc":
      "This illustrates an experimental cross-chain design. T1 keeps funds on the Hub chain; cross-chain transfers and yield are disabled.",
    "arch.calc.title": "Interactive Liquidity Buffer Simulator",
    "arch.calc.subtitle": "The slider illustrates an allocation policy; it does not transfer assets or generate returns.",
    "arch.calc.slider": "L1 Buffer Ratio",
    "arch.calc.deposit": "Simulated Deposit Amount",
    "arch.calc.l1Share": "Simulated L1 buffer",
    "arch.calc.cchainShare": "Simulated C-Chain allocation",
    "arch.calc.estYield": "Hypothetical reserve-funded accrual:",
    "arch.step1.title": "1. Deposit into Dynamic Vault",
    "arch.step1.desc": "T1 records native AVAX received on the Hub chain after deployment verification.",
    "arch.step2.title": "2. Allocation policy (0–100%)",
    "arch.step2.desc": "The ratio is policy configuration; it currently does not move funds to another chain.",
    "arch.step3.title": "3. Avalanche Teleporter ICM",
    "arch.step3.desc": "ICM carries messages; it does not itself transfer AVAX. A verified asset adapter and retry workflow are still required.",
    "arch.step4.title": "4. Reserve-funded simulation",
    "arch.step4.desc": "A standalone model accrues a hypothetical 8% simple annual rate, paid only from operator-funded reserves. Disabled in T1.",

    // Security & Trust
    "sec.badge": "Under testnet validation",
    "sec.title": "Access controls and transaction verification",
    "sec.item1.title": "Application and network permissions",
    "sec.item1.desc": "The Hub allowlist is separate from an L1 EVM Transaction AllowList. L1 configuration requires separate verification.",
    "sec.item2.title": "Account and Core wallet",
    "sec.item2.desc": "Use account credentials or wallet ownership proofs. PIN authentication is retired; passkeys are not implemented.",
    "sec.item3.title": "Reserve-limited hypothetical accrual",
    "sec.item3.desc": "Timestamps calculate simulated accrual; they do not generate returns. Insufficient reserves prevent interest payouts.",
    "sec.item4.title": "Neon Serverless PostgreSQL",
    "sec.item4.desc": "Robust persistence for workspaces, dynamic vaults, members, and audit notifications via Drizzle ORM.",

    // CTA
    "cta.title": "Ready to Build Your Shared Wealth Workspace?",
    "cta.desc": "Create a workspace, invite members, and configure funds. Live transactions require a verified deployment and incur Fuji network fees.",
    "cta.btn": "Create a workspace",

    // Footer
    "footer.desc": "The Dynamic & Composable Multi-Space Vault OS on Avalanche.",
    "footer.unihack": "Avalanche Team1 Vietnam - UniHack Project",
    "footer.docs": "Architecture Specs",
    "footer.security": "Validation status",
    "footer.rights": "© 2026 Kinetix Labs. Powered by Avalanche.",

    // Auth & Login
    "auth.title": "Kinetix Multi-Space OS",
    "auth.subtitle": "The Dynamic & Composable Multi-Space Vault OS on Avalanche",
    "auth.tab.login": "Sign In",
    "auth.tab.register": "Create Workspace",
    "auth.tab.join": "Join by Code",
    "auth.wallet.title": "Avalanche Core Wallet",
    "auth.credentials.title": "Account sign-in",
    "auth.wallet.btn": "Connect Avalanche Core",
    "auth.wallet.connecting": "Verifying SIWE signature...",
    "auth.member.familyCode": "Workspace Code",
    "auth.member.identifier": "Phone Number or Name",
    "auth.member.pin": "PIN authentication retired",
    "auth.member.btn": "Sign In Member",
    "auth.register.familyName": "New Workspace Name",
    "auth.register.adminName": "Administrator Name",
    "auth.register.phone": "Contact Phone",
    "auth.register.pin": "PIN authentication retired",
    "auth.register.btn": "Sign Wallet & Create Workspace",
    "auth.join.familyCode": "Workspace Code to Join",
    "auth.join.name": "Your Name",
    "auth.join.phone": "Phone Number",
    "auth.join.pin": "PIN authentication retired",
    "auth.join.btn": "Join Workspace",

    // Dashboard Executive & KPIs
    "dash.title": "Workspace Command Center",
    "dash.subtitle": "Shared fund management · Avalanche Fuji testnet",
    "dash.kpi.totalWealth": "Workspace Total Wealth",
    "dash.kpi.totalWealthSub": "Aggregated across all dynamic vaults",
    "dash.kpi.bufferL1": "L1 Liquid Buffer",
    "dash.kpi.bufferL1Sub": "Available balance from reconciled state",
    "dash.kpi.yieldCChain": "T1 yield disabled",
    "dash.kpi.yieldCChainSub": "No integrated DeFi yield source",
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
    "dash.members.addDesc": "Assign member roles; transactions require a verified wallet and deployment.",
    
    // Chores
    "dash.chores.title": "Tasks & Milestones (Chore-to-Earn)",
    "dash.chores.desc": "MILESTONE tasks reserve rewards and release them after completion and sufficient approvals.",
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

    // 404 Not Found Page
    "notfound.badge": "HTTP 404 • Page Not Found",
    "notfound.title": "Page Not Found",
    "notfound.desc": "The requested URL does not exist or has been relocated to the new Kinetix workspace.",
    "notfound.countdown": "Redirecting to Home in",
    "notfound.home": "Back to Home",
    "notfound.login": "Login",
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
