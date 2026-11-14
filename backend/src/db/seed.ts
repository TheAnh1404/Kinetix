import { db } from "./index";
import {
  workspaces,
  users,
  workspaceMembers,
  vaults,
  vaultMembers,
  withdrawalRequests,
  chores,
  notifications,
} from "./schema";
import { sql } from "drizzle-orm";
import { DEMO_PERSONAS } from "../../../shared/demoPersonas";

async function seed() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.AUTH_SEED_ALLOW_RESET !== "true"
  ) {
    throw new Error(
      "Demo seeding is destructive. Use only a disposable database with AUTH_SEED_ALLOW_RESET=true.",
    );
  }
  console.log(
    "🌱 Bắt đầu nạp dữ liệu mẫu (Seed Data) cho Kinetix - Multi-Space & Dynamic Vaults (4 Workspaces)...",
  );

  try {
    // 1. Dọn dẹp dữ liệu cũ an toàn
    console.log("🧹 Dọn dẹp dữ liệu cũ...");
    await db.execute(sql`
      TRUNCATE TABLE 
        notifications, 
        chores, 
        withdrawal_requests, 
        vault_members, 
        vaults, 
        workspace_members, 
        auth_nonces, 
        users, 
        workspaces 
      CASCADE;
    `);

    const adminWalletAddress = DEMO_PERSONAS.admin.wallet;
    const guardian1Wallet = DEMO_PERSONAS.guardian1.wallet;
    const guardian2Wallet = DEMO_PERSONAS.guardian2.wallet;
    const elderlyWallet = DEMO_PERSONAS.elderly.wallet;
    const childWallet = DEMO_PERSONAS.child.wallet;

    const l1Hub = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const cChainVault = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    // 2. Tạo 4 Workspaces theo đúng kiến trúc Multi-Space
    console.log("👨‍👩‍👧‍👦 Đang tạo Workspace 1: Đại Gia Đình Bác Ba (FAMILY)...");
    const [workspace1] = await db
      .insert(workspaces)
      .values({
        name: "Đại Gia Đình Bác Ba",
        workspaceCode: "KNTX-8888",
        familyCode: "KNTX-8888",
        type: "FAMILY",
        creatorWallet: adminWalletAddress,
        adminWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    console.log("🤝 Đang tạo Workspace 2: Anh Chị Em Nhà Họ Nguyễn (SIBLINGS)...");
    const [workspace2] = await db
      .insert(workspaces)
      .values({
        name: "Anh Chị Em Nhà Họ Nguyễn",
        workspaceCode: "KNTX-7777",
        familyCode: "KNTX-7777",
        type: "SIBLINGS",
        creatorWallet: adminWalletAddress,
        adminWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    console.log("🎒 Đang tạo Workspace 3: Nhóm Bạn Thân Đại Học Bách Khoa (FRIENDS)...");
    const [workspace3] = await db
      .insert(workspaces)
      .values({
        name: "Nhóm Bạn Thân Đại Học Bách Khoa",
        workspaceCode: "KNTX-9999",
        familyCode: "KNTX-9999",
        type: "FRIENDS",
        creatorWallet: adminWalletAddress,
        adminWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    console.log("🏛️ Đang tạo Workspace 4: CLB Avalanche Campus (COMMUNITY)...");
    const [workspace4] = await db
      .insert(workspaces)
      .values({
        name: "CLB Avalanche Campus",
        workspaceCode: "KNTX-6666",
        familyCode: "KNTX-6666",
        type: "COMMUNITY",
        creatorWallet: adminWalletAddress,
        adminWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    // 3. Tạo Users (5 người dùng thực tế)
    console.log("👤 Đang tạo danh sách 5 người dùng...");
    const [adminUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: DEMO_PERSONAS.admin.name,
        role: "ADMIN",
        defaultRole: "ADMIN",
        walletAddress: adminWalletAddress,
        authMethod: "CORE_WALLET",
        avatarUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        phoneNumber: "+84901234567",
        isAllowlisted: true,
      })
      .returning();

    const [guardian1User] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: DEMO_PERSONAS.guardian1.name,
        role: "GUARDIAN",
        defaultRole: "GUARDIAN",
        walletAddress: guardian1Wallet,
        authMethod: "CORE_WALLET",
        avatarUrl:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        phoneNumber: "+84902345678",
        isAllowlisted: true,
      })
      .returning();

    const [guardian2User] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: DEMO_PERSONAS.guardian2.name,
        role: "GUARDIAN",
        defaultRole: "GUARDIAN",
        walletAddress: guardian2Wallet,
        authMethod: "CORE_WALLET",
        avatarUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        phoneNumber: "+84903456789",
        isAllowlisted: true,
      })
      .returning();

    const [elderlyUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: DEMO_PERSONAS.elderly.name,
        role: "ELDERLY",
        defaultRole: "ELDERLY",
        walletAddress: elderlyWallet,
        authMethod: "CORE_WALLET",
        avatarUrl:
          "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
        phoneNumber: "+84904567890",
        isAllowlisted: true,
      })
      .returning();

    const [childUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: DEMO_PERSONAS.child.name,
        role: "CHILD",
        defaultRole: "CHILD",
        walletAddress: childWallet,
        authMethod: "CORE_WALLET",
        avatarUrl:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        phoneNumber: "+84905678901",
        isAllowlisted: true,
      })
      .returning();

    // 4. Gán Thành viên vào 4 Workspaces (WorkspaceMembers)
    console.log("🔗 Gán thành viên vào 4 Workspaces...");
    await db.insert(workspaceMembers).values([
      // Workspace 1: Đại gia đình (đầy đủ 5 thành viên)
      { workspaceId: workspace1.id, userId: adminUser.id, role: "ADMIN", canManageMembers: true },
      { workspaceId: workspace1.id, userId: guardian1User.id, role: "GUARDIAN", canManageMembers: true },
      { workspaceId: workspace1.id, userId: guardian2User.id, role: "GUARDIAN", canManageMembers: true },
      { workspaceId: workspace1.id, userId: elderlyUser.id, role: "ELDERLY", canManageMembers: false },
      { workspaceId: workspace1.id, userId: childUser.id, role: "CHILD", canManageMembers: false },

      // Workspace 2: Nhóm Anh Chị Em Ruột (Bố Ba, Cô Út, Anh Cả)
      { workspaceId: workspace2.id, userId: adminUser.id, role: "ADMIN", canManageMembers: true },
      { workspaceId: workspace2.id, userId: guardian1User.id, role: "GUARDIAN", canManageMembers: true },
      { workspaceId: workspace2.id, userId: guardian2User.id, role: "GUARDIAN", canManageMembers: true },

      // Workspace 3: Hội Bạn Thân (Bố Ba, Cô Út, Anh Cả, Bé Na)
      { workspaceId: workspace3.id, userId: adminUser.id, role: "ADMIN", canManageMembers: true },
      { workspaceId: workspace3.id, userId: guardian1User.id, role: "GUARDIAN", canManageMembers: true },
      { workspaceId: workspace3.id, userId: guardian2User.id, role: "GUARDIAN", canManageMembers: false },
      { workspaceId: workspace3.id, userId: childUser.id, role: "CHILD", canManageMembers: false },

      // Workspace 4: CLB Sinh Viên Sáng Tạo (Bố Ba, Cô Út, Anh Cả, Bé Na)
      { workspaceId: workspace4.id, userId: adminUser.id, role: "ADMIN", canManageMembers: true },
      { workspaceId: workspace4.id, userId: guardian1User.id, role: "GUARDIAN", canManageMembers: true },
      { workspaceId: workspace4.id, userId: guardian2User.id, role: "GUARDIAN", canManageMembers: false },
      { workspaceId: workspace4.id, userId: childUser.id, role: "CHILD", canManageMembers: false },
    ]);

    // 5. Tạo Dynamic Vaults cho 4 Workspaces
    console.log("🏦 Tạo các Hũ Động cho Workspace 1: Đại Gia Đình...");
    const [vault1] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace1.id,
        onchainVaultId: 1,
        name: "Hũ Báo Hiếu Ông Bà",
        description:
          "Bảo vệ tài sản hưu trí, rút nhanh tức thì 0 gas <= 50 USDC từ L1; rút lớn cần 2/3 chữ ký bảo hộ gia đình.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: "50",
        requiredApprovals: 2,
        cachedTotalBalance: "1200",
        cachedL1Buffer: "120",
        cachedCChainYield: "86.4",
      })
      .returning();

    const [vault2] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace1.id,
        onchainVaultId: 2,
        name: "Hũ Lì Xì Bé Na",
        description:
          "Quỹ nhiệm vụ Chore-to-Earn, vốn gửi C-Chain sinh lời, mở khóa thưởng khi hoàn thành việc nhà được cha mẹ duyệt.",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: "20",
        requiredApprovals: 2,
        cachedTotalBalance: "450",
        cachedL1Buffer: "45",
        cachedCChainYield: "32.4",
      })
      .returning();

    console.log("🏦 Tạo các Hũ Động cho Workspace 2: Nhóm Anh Chị Em Ruột...");
    const [vault3] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace2.id,
        onchainVaultId: 3,
        name: "Vòng Quay Tương Trợ Mua Xe",
        description:
          "Góp vốn xoay vòng tương trợ anh chị em mua sắm, tiền nhàn rỗi sinh lời C-Chain 8% APY, đến kỳ giải ngân gốc + lãi.",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0, // 0% L1 / 100% C-Chain
        fastWithdrawLimit: "0",
        requiredApprovals: 2,
        cachedTotalBalance: "3000",
        cachedL1Buffer: "0",
        cachedCChainYield: "240",
        roscaRoundContribution: "250",
        roscaRoundDuration: 2592000, // 30 ngày
        roscaCurrentRound: 3,
      })
      .returning();

    const [vault4] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace2.id,
        onchainVaultId: 4,
        name: "Quỹ Chung Phụng Dưỡng Bố Mẹ",
        description:
          "Anh chị em cùng đóng góp phụng dưỡng cha mẹ hàng tháng, rút chi tiêu minh bạch on-chain.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: "100",
        requiredApprovals: 2,
        cachedTotalBalance: "800",
        cachedL1Buffer: "80",
        cachedCChainYield: "57.6",
      })
      .returning();

    console.log("🏦 Tạo các Hũ Động cho Workspace 3: Hội Bạn Thân...");
    const [vault5] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace3.id,
        onchainVaultId: 5,
        name: "Quỹ Đi Phượt Đà Lạt Cuối Năm",
        description:
          "Cả nhóm cùng tích lũy cho chuyến đi phượt Đà Lạt cuối năm, vốn sinh lãi DeFi 8% APY trên C-Chain cho đến khi đạt mục tiêu.",
        ruleTemplate: "SHARED_GOAL",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: "50",
        requiredApprovals: 2,
        targetGoalAmount: "1000",
        cachedTotalBalance: "750",
        cachedL1Buffer: "75",
        cachedCChainYield: "54.0",
      })
      .returning();

    const [vault6] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace3.id,
        onchainVaultId: 6,
        name: "Hũ Ăn Uống Hàng Tuần",
        description:
          "Quỹ sinh hoạt ăn uống hàng tuần, 30% giữ L1 rút nhanh 1 giây 0đ phí quét VietQR, 70% sinh lời.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 3000, // 30% L1 / 70% C-Chain
        fastWithdrawLimit: "30",
        requiredApprovals: 2,
        cachedTotalBalance: "200",
        cachedL1Buffer: "60",
        cachedCChainYield: "11.2",
      })
      .returning();

    console.log("🏦 Tạo các Hũ Động cho Workspace 4: CLB Sinh Viên Sáng Tạo Blockchain...");
    const [vault7] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace4.id,
        onchainVaultId: 7,
        name: "Quỹ Hoạt Động & Sự Kiện CLB",
        description:
          "Ngân sách sự kiện workshop, chi tiêu minh bạch on-chain cần tối thiểu 2/3 chữ ký BCN duyệt.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 2000, // 20% L1 / 80% C-Chain
        fastWithdrawLimit: "100",
        requiredApprovals: 2,
        cachedTotalBalance: "2500",
        cachedL1Buffer: "500",
        cachedCChainYield: "160.0",
      })
      .returning();

    const [vault8] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace4.id,
        onchainVaultId: 8,
        name: "Quỹ Thưởng Bounty Thành Viên",
        description:
          "Quỹ khen thưởng nhiệm vụ & bounty cho thành viên tích cực, sinh lời tự động trên Fuji C-Chain.",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
        fastWithdrawLimit: "25",
        requiredApprovals: 2,
        cachedTotalBalance: "600",
        cachedL1Buffer: "60",
        cachedCChainYield: "43.2",
      })
      .returning();

    // 6. Gán Phân quyền Hũ (Vault Members)
    console.log("🛡️ Phân quyền Guardian & Beneficiary theo từng Hũ...");
    await db.insert(vaultMembers).values([
      // Vault 1 (SHIELD FAMILY)
      { vaultId: vault1.id, userId: elderlyUser.id, vaultRole: "BENEFICIARY" },
      { vaultId: vault1.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault1.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault1.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },

      // Vault 2 (MILESTONE FAMILY)
      { vaultId: vault2.id, userId: childUser.id, vaultRole: "BENEFICIARY" },
      { vaultId: vault2.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault2.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },

      // Vault 3 (ROSCA SIBLINGS)
      { vaultId: vault3.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault3.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault3.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },

      // Vault 4 (SHIELD SIBLINGS)
      { vaultId: vault4.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault4.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault4.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },

      // Vault 5 & 6 (FRIENDS)
      { vaultId: vault5.id, userId: adminUser.id, vaultRole: "CREATOR" },
      { vaultId: vault5.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault5.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault6.id, userId: adminUser.id, vaultRole: "CREATOR" },
      { vaultId: vault6.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },

      // Vault 7 & 8 (COMMUNITY)
      { vaultId: vault7.id, userId: adminUser.id, vaultRole: "CREATOR" },
      { vaultId: vault7.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault7.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault8.id, userId: childUser.id, vaultRole: "BENEFICIARY" },
      { vaultId: vault8.id, userId: adminUser.id, vaultRole: "CREATOR" },
      { vaultId: vault8.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
    ]);

    // 7. Nạp Yêu cầu rút tiền mẫu (Multisig Pending Requests)
    console.log("📝 Tạo yêu cầu rút tiền đa chữ ký đang chờ duyệt...");
    await db.insert(withdrawalRequests).values([
      // Workspace 1: Viện phí Cụ Ba
      {
        familyId: workspace1.id,
        vaultId: vault1.id,
        requesterId: elderlyUser.id,
        amount: "1000.000000",
        vault: "SHIELD",
        reason: "Viện phí kiểm tra tim mạch đột xuất Cụ Ba",
        onchainRequestId: 1,
        approvalsCount: 1, // Đã ký 1/2
        requiredApprovals: 2,
        status: "PENDING",
      },
      {
        familyId: workspace1.id,
        vaultId: vault1.id,
        requesterId: elderlyUser.id,
        amount: "30.000000",
        vault: "SHIELD",
        reason: "Rút tiền mua nhu yếu phẩm hàng ngày",
        onchainRequestId: 2,
        approvalsCount: 2,
        requiredApprovals: 2,
        status: "EXECUTED",
      },
      // Workspace 2: Quỹ Phụng Dưỡng
      {
        familyId: workspace2.id,
        vaultId: vault4.id,
        requesterId: guardian1User.id,
        amount: "200.000000",
        vault: "SHIELD",
        reason: "Chi phí mua thuốc bổ & thực phẩm dinh dưỡng biếu Bố Mẹ",
        onchainRequestId: 3,
        approvalsCount: 1,
        requiredApprovals: 2,
        status: "PENDING",
      },
      // Workspace 3: Homestay Đà Lạt
      {
        familyId: workspace3.id,
        vaultId: vault5.id,
        requesterId: guardian2User.id,
        amount: "120.000000",
        vault: "SHARED_GOAL",
        reason: "Đặt cọc homestay Đà Lạt cho cả nhóm",
        onchainRequestId: 4,
        approvalsCount: 1,
        requiredApprovals: 2,
        status: "PENDING",
      },
      // Workspace 4: Thuê hội trường CLB
      {
        familyId: workspace4.id,
        vaultId: vault7.id,
        requesterId: guardian1User.id,
        amount: "350.000000",
        vault: "SHIELD",
        reason: "Duyệt Chi Sự Kiện: Thuê hội trường Workshop Avalanche UniHack (Chờ 2/3 BCN ký)",
        onchainRequestId: 5,
        approvalsCount: 1, // Phó CN đã ký 1/3
        requiredApprovals: 2,
        status: "PENDING",
      },
    ]);

    // 8. Nạp Chores mẫu (Chore-to-Earn & Community Bounties)
    console.log("🧹 Tạo nhiệm vụ Chore-to-Earn & CLB Bounty Board...");
    await db.insert(chores).values([
      // Family Chores (Vault 2)
      {
        familyId: workspace1.id,
        vaultId: vault2.id,
        childId: childUser.id,
        title: "Dọn dẹp phòng ngủ & góc học tập ngăn nắp",
        description:
          "Dọn dẹp bàn học, sắp xếp sách vở và chụp ảnh gửi bố mẹ kiểm tra",
        rewardAmount: "5.000000",
        onchainTaskId: 1,
        status: "TODO",
      },
      {
        familyId: workspace1.id,
        vaultId: vault2.id,
        childId: childUser.id,
        title: "Tưới cây cảnh ban công và lau bàn phòng khách",
        description: "Hoàn thành buổi sáng trước 9h để nhận thưởng",
        rewardAmount: "8.000000",
        proofImageUrl:
          "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500",
        onchainTaskId: 2,
        status: "SUBMITTED",
      },
      {
        familyId: workspace1.id,
        vaultId: vault2.id,
        childId: childUser.id,
        title: "Đạt điểm 10 kiểm tra môn Toán",
        description: "Khen thưởng thành tích học tập xuất sắc của Bé Na",
        rewardAmount: "15.000000",
        onchainTaskId: 3,
        status: "REWARDED",
      },
      // Community Bounties (Vault 8)
      {
        familyId: workspace4.id,
        vaultId: vault8.id,
        childId: childUser.id,
        title: "Thiết kế Banner Workshop Avalanche Team1",
        description: "Thiết kế poster tỷ lệ 16:9 và avatar đại diện theo chuẩn nhận diện Kinetix",
        rewardAmount: "15.000000",
        proofImageUrl:
          "https://images.unsplash.com/photo-1542744094-24638eff58bb?w=500",
        onchainTaskId: 4,
        status: "SUBMITTED",
      },
      {
        familyId: workspace4.id,
        vaultId: vault8.id,
        childId: childUser.id,
        title: "Viết bài Recap Workshop lên Fanpage",
        description: "Tóm tắt 3 điểm cốt lõi về Avalanche Teleporter ICM và Family L1 0đ gas",
        rewardAmount: "10.000000",
        onchainTaskId: 5,
        status: "TODO",
      },
      {
        familyId: workspace4.id,
        vaultId: vault8.id,
        childId: childUser.id,
        title: "Quay dựng video Highlight sự kiện",
        description: "Video ngắn 60s phỏng vấn người tham dự",
        rewardAmount: "25.000000",
        onchainTaskId: 6,
        status: "REWARDED",
      },
    ]);

    // 9. Nạp Notifications mẫu
    console.log("🔔 Tạo các thông báo mẫu...");
    await db.insert(notifications).values([
      {
        familyId: workspace1.id,
        userId: guardian1User.id,
        title: "Yêu cầu ký duyệt rút tiền viện phí",
        message:
          "Cụ Ba vừa tạo yêu cầu rút 150 USDC cho viện phí định kỳ. Cần thêm 1 chữ ký bảo hộ.",
        type: "APPROVAL_NEEDED",
        isRead: false,
      },
      {
        familyId: workspace1.id,
        userId: adminUser.id,
        title: "Bé Na đã nộp báo cáo việc nhà",
        message:
          "Bé Na đã gửi ảnh tưới cây ban công và chờ bạn nghiệm thu trao thưởng 8 USDC.",
        type: "TASK_COMPLETED",
        isRead: false,
      },
      {
        familyId: workspace2.id,
        userId: adminUser.id,
        title: "Mở kỳ đóng quỹ Vòng Quay Tương Trợ",
        message:
          "Kỳ 3 đang diễn ra: đóng góp 250 USDC (0đ gas trên Family L1) để tiếp tục quay vòng.",
        type: "APPROVAL_NEEDED",
        isRead: false,
      },
      {
        familyId: workspace3.id,
        userId: adminUser.id,
        title: "Quỹ Đi Phượt Đà Lạt đạt 75% mục tiêu",
        message:
          "Cả nhóm đã tích lũy 750 / 1,000 USDC. Tiền lãi C-Chain tích lũy đạt +12.40 USDC.",
        type: "YIELD_PAYOUT",
        isRead: true,
      },
      {
        familyId: workspace4.id,
        userId: adminUser.id,
        title: "Ban Chấp Hành: Duyệt Chi Sự Kiện",
        message:
          "Phó CN vừa ký 1/3 cho phiếu chi 350 USDC thuê hội trường. Cần bạn ký tiếp để giải ngân.",
        type: "APPROVAL_NEEDED",
        isRead: false,
      },
    ]);

    console.log(
      "🎉 Seed Data thành công rực rỡ! Đầy đủ 4 Workspaces (FAMILY, SIBLINGS, FRIENDS, COMMUNITY), 8 Dynamic Vaults, 5 Users sẵn sàng.",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi nạp Seed Data:", error);
    process.exit(1);
  }
}

seed();
