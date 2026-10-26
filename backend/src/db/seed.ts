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

async function seed() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu (Seed Data) cho Kinetix - Multi-Space & Dynamic Vaults...");

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

    const adminWalletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const guardian1Wallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const guardian2Wallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const elderlyWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    const childWallet = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

    const l1Hub = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const cChainVault = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    // 2. Tạo Workspace 1: "Đại Gia Đình Bác Ba" (FAMILY)
    console.log("👨‍👩‍👧‍👦 Đang tạo Workspace 1: Đại Gia Đình Bác Ba...");
    const [workspace1] = await db
      .insert(workspaces)
      .values({
        name: "Đại Gia Đình Bác Ba",
        workspaceCode: "KNTX-8888",
        type: "FAMILY",
        creatorWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    // 3. Tạo Workspace 2: "Hội Anh Em & Bạn Thân" (FRIENDS)
    console.log("👥 Đang tạo Workspace 2: Hội Anh Em & Bạn Thân...");
    const [workspace2] = await db
      .insert(workspaces)
      .values({
        name: "Hội Anh Em & Bạn Thân",
        workspaceCode: "KNTX-9999",
        type: "FRIENDS",
        creatorWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    // 4. Tạo Users (5 người dùng thực tế)
    console.log("👤 Đang tạo danh sách 5 người dùng...");
    const [adminUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: "Bố Ba (Admin)",
        role: "ADMIN",
        defaultRole: "ADMIN",
        walletAddress: adminWalletAddress,
        authMethod: "CORE_WALLET",
        pinCode: "1234",
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        phoneNumber: "+84901234567",
        isAllowlisted: true,
      })
      .returning();

    const [guardian1User] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: "Cô Út (Guardian 1)",
        role: "GUARDIAN",
        defaultRole: "GUARDIAN",
        walletAddress: guardian1Wallet,
        authMethod: "CORE_WALLET",
        pinCode: "1234",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        phoneNumber: "+84902345678",
        isAllowlisted: true,
      })
      .returning();

    const [guardian2User] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: "Anh Cả (Guardian 2)",
        role: "GUARDIAN",
        defaultRole: "GUARDIAN",
        walletAddress: guardian2Wallet,
        authMethod: "CORE_WALLET",
        pinCode: "1234",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        phoneNumber: "+84903456789",
        isAllowlisted: true,
      })
      .returning();

    const [elderlyUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: "Ông Nội (Cụ Ba)",
        role: "ELDERLY",
        defaultRole: "ELDERLY",
        walletAddress: elderlyWallet,
        authMethod: "PASSKEY_EMBEDDED",
        pinCode: "1234",
        avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
        phoneNumber: "+84904567890",
        isAllowlisted: true,
      })
      .returning();

    const [childUser] = await db
      .insert(users)
      .values({
        familyId: workspace1.id,
        fullName: "Bé Na (Con Gái)",
        role: "CHILD",
        defaultRole: "CHILD",
        walletAddress: childWallet,
        authMethod: "PASSKEY_EMBEDDED",
        pinCode: "1234",
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        phoneNumber: "+84905678901",
        isAllowlisted: true,
      })
      .returning();

    // 5. Gán Thành viên vào Workspaces (WorkspaceMembers)
    console.log("🔗 Gán thành viên vào Workspaces...");
    await db.insert(workspaceMembers).values([
      // Workspace 1: Đại gia đình (đầy đủ 5 người)
      { workspaceId: workspace1.id, userId: adminUser.id, role: "ADMIN" },
      { workspaceId: workspace1.id, userId: guardian1User.id, role: "GUARDIAN" },
      { workspaceId: workspace1.id, userId: guardian2User.id, role: "GUARDIAN" },
      { workspaceId: workspace1.id, userId: elderlyUser.id, role: "ELDERLY" },
      { workspaceId: workspace1.id, userId: childUser.id, role: "CHILD" },
      // Workspace 2: Hội bạn thân (Bố Ba, Cô Út, Anh Cả)
      { workspaceId: workspace2.id, userId: adminUser.id, role: "ADMIN" },
      { workspaceId: workspace2.id, userId: guardian1User.id, role: "GUARDIAN" },
      { workspaceId: workspace2.id, userId: guardian2User.id, role: "GUARDIAN" },
    ]);

    // 6. Tạo Dynamic Vaults cho Workspace 1: Đại Gia Đình
    console.log("🏦 Tạo các Hũ Động cho Workspace 1...");
    const [vault1] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace1.id,
        onchainVaultId: 1,
        name: "Quỹ Hưu Trí & Báo Hiếu (Ông Bà)",
        description: "Bảo vệ tài sản hưu trí, rút nhanh an toàn <= 50 AVAX và bảo hộ đa chữ ký 2/3",
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
        name: "Quỹ Cột Mốc & Lì Xì (Bé Na)",
        description: "Học tài chính thông minh qua Chore-to-Earn, tích lũy nhận thưởng khi hoàn thành việc nhà",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 2000, // 20% L1 / 80% C-Chain
        fastWithdrawLimit: "20",
        requiredApprovals: 2,
        cachedTotalBalance: "450",
        cachedL1Buffer: "90",
        cachedCChainYield: "28.8",
      })
      .returning();

    const [vault3] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace1.id,
        onchainVaultId: 3,
        name: "Hụi Họ Thân Tộc",
        description: "Góp vốn xoay vòng tương trợ họ hàng, 100% vốn chờ đẩy sang C-Chain sinh lời 8% APY",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0, // 0% L1 / 100% C-Chain
        fastWithdrawLimit: "0",
        requiredApprovals: 2,
        cachedTotalBalance: "3000",
        cachedL1Buffer: "0",
        cachedCChainYield: "240",
      })
      .returning();

    // 7. Tạo Dynamic Vaults cho Workspace 2: Hội Bạn Thân
    console.log("🏖️ Tạo các Hũ Động cho Workspace 2...");
    const [vault4] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace2.id,
        onchainVaultId: 4,
        name: "Quỹ Du Lịch Đà Lạt Cùng Bạn",
        description: "Mục tiêu chung tích lũy 800 AVAX đi du lịch, sinh lời DeFi cho đến ngày mở quỹ",
        ruleTemplate: "SHARED_GOAL",
        bufferRatioBps: 1500, // 15% L1 / 85% C-Chain
        fastWithdrawLimit: "100",
        requiredApprovals: 2,
        cachedTotalBalance: "800",
        cachedL1Buffer: "120",
        cachedCChainYield: "54.4",
      })
      .returning();

    const [vault5] = await db
      .insert(vaults)
      .values({
        workspaceId: workspace2.id,
        onchainVaultId: 5,
        name: "Hụi Mua Xe Mới",
        description: "Xoay vòng vốn hỗ trợ các thành viên nâng cấp phương tiện đi lại",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0,
        fastWithdrawLimit: "0",
        requiredApprovals: 2,
        cachedTotalBalance: "1500",
        cachedL1Buffer: "0",
        cachedCChainYield: "120",
      })
      .returning();

    // 8. Gán Phân quyền Hũ (Vault Members)
    console.log("🛡️ Phân quyền Guardian & Beneficiary theo từng Hũ...");
    await db.insert(vaultMembers).values([
      // Vault 1 (SHIELD): Elderly là Beneficiary, Admin + 2 Guardians là Guardians
      { vaultId: vault1.id, userId: elderlyUser.id, vaultRole: "BENEFICIARY" },
      { vaultId: vault1.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault1.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault1.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },

      // Vault 2 (MILESTONE): Child là Beneficiary, Admin là Guardian
      { vaultId: vault2.id, userId: childUser.id, vaultRole: "BENEFICIARY" },
      { vaultId: vault2.id, userId: adminUser.id, vaultRole: "GUARDIAN" },

      // Vault 3 (ROSCA)
      { vaultId: vault3.id, userId: adminUser.id, vaultRole: "GUARDIAN" },
      { vaultId: vault3.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault3.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },

      // Vault 4 & 5 (Workspace 2)
      { vaultId: vault4.id, userId: adminUser.id, vaultRole: "CREATOR" },
      { vaultId: vault4.id, userId: guardian1User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault4.id, userId: guardian2User.id, vaultRole: "GUARDIAN" },
      { vaultId: vault5.id, userId: adminUser.id, vaultRole: "CREATOR" },
    ]);

    // 9. Nạp Yêu cầu rút tiền mẫu (Multisig Pending Request)
    console.log("📝 Tạo yêu cầu rút tiền lớn đang chờ duyệt (Vault 1)...");
    await db.insert(withdrawalRequests).values([
      {
        familyId: workspace1.id,
        vaultId: vault1.id,
        requesterId: elderlyUser.id,
        amount: "150.000000",
        vault: "SHIELD",
        reason: "Rút tiền khám chữa bệnh định kỳ & mua thuốc huyết áp",
        onchainRequestId: 1,
        approvalsCount: 1, // Cô Út đã ký 1/2
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
    ]);

    // 10. Nạp Chores mẫu (Chore-to-Earn gắn liền Vault 2)
    console.log("🧹 Tạo nhiệm vụ Chore-to-Earn (Vault 2)...");
    await db.insert(chores).values([
      {
        familyId: workspace1.id,
        vaultId: vault2.id,
        childId: childUser.id,
        title: "Dọn dẹp phòng ngủ & góc học tập ngăn nắp",
        description: "Dọn dẹp bàn học, sắp xếp sách vở và chụp ảnh gửi bố mẹ kiểm tra",
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
        proofImageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500",
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
    ]);

    // 11. Nạp Notifications mẫu
    console.log("🔔 Tạo các thông báo mẫu...");
    await db.insert(notifications).values([
      {
        familyId: workspace1.id,
        userId: guardian1User.id,
        title: "Yêu cầu ký duyệt rút tiền mới",
        message: "Ông Nội vừa tạo yêu cầu rút 150 AVAX cho viện phí. Cần thêm 1 chữ ký để hoàn tất.",
        type: "APPROVAL_NEEDED",
        isRead: false,
      },
      {
        familyId: workspace1.id,
        userId: adminUser.id,
        title: "Bé Na đã nộp báo cáo việc nhà",
        message: "Bé Na đã gửi ảnh tưới cây ban công và chờ bạn nghiệm thu trao thưởng 8 AVAX.",
        type: "TASK_COMPLETED",
        isRead: false,
      },
      {
        familyId: workspace1.id,
        userId: adminUser.id,
        title: "Lợi suất C-Chain đã tự động kết toán",
        message: "Quỹ Hưu Trí & Báo Hiếu vừa nhận thêm 1.25 AVAX lợi nhuận DeFi 8% APY.",
        type: "YIELD_PAYOUT",
        isRead: true,
      },
    ]);

    console.log("🎉 Seed Data thành công rực rỡ! 2 Workspaces, 5 Dynamic Vaults, 5 Users đã sẵn sàng.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi nạp Seed Data:", error);
    process.exit(1);
  }
}

seed();
