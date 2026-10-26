import { db } from "./index";
import {
  families,
  users,
  withdrawalRequests,
  chores,
  notifications,
} from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu (Seed Data) cho Kinetix...");

  try {
    // 1. Xóa dữ liệu cũ theo thứ tự ràng buộc khóa ngoại
    console.log("🧹 Dọn dẹp dữ liệu cũ...");
    await db.delete(notifications);
    await db.delete(chores);
    await db.delete(withdrawalRequests);
    await db.delete(users);
    await db.delete(families);

    // 2. Tạo Gia đình Hạnh Phúc
    console.log("👨‍👩‍👧‍👦 Đang tạo 'Gia đình Hạnh Phúc'...");
    const adminWalletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const l1Hub = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const cChainVault = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const [family] = await db
      .insert(families)
      .values({
        name: "Gia đình Hạnh Phúc",
        adminWallet: adminWalletAddress,
        l1HubAddress: l1Hub,
        cchainVaultAddress: cChainVault,
      })
      .returning();

    console.log(`✅ Đã tạo gia đình: ${family.name} (ID: ${family.id})`);

    // 3. Tạo 5 thành viên thuộc 3 thế hệ
    console.log("👥 Đang tạo 5 thành viên gia đình (3 thế hệ)...");

    const [adminUser] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: "Bố Ba (Admin)",
        role: "ADMIN",
        walletAddress: adminWalletAddress,
        authMethod: "CORE_WALLET",
        phoneNumber: "+84901234567",
        isAllowlisted: true,
      })
      .returning();

    const [guardian1User] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: "Cô Út (Guardian 1)",
        role: "GUARDIAN",
        walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        authMethod: "CORE_WALLET",
        phoneNumber: "+84902345678",
        isAllowlisted: true,
      })
      .returning();

    const [guardian2User] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: "Anh Cả (Guardian 2)",
        role: "GUARDIAN",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        authMethod: "CORE_WALLET",
        phoneNumber: "+84903456789",
        isAllowlisted: true,
      })
      .returning();

    const [elderlyUser] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: "Ông Nội (Beneficiary)",
        role: "ELDERLY",
        walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        authMethod: "CORE_WALLET",
        phoneNumber: "+84904567890",
        isAllowlisted: true,
      })
      .returning();

    const [childUser] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: "Bé Na (Con gái nhỏ)",
        role: "CHILD",
        walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        authMethod: "PASSKEY_EMBEDDED",
        phoneNumber: "+84905678901",
        isAllowlisted: true,
      })
      .returning();

    console.log("✅ Đã tạo thành công 5 thành viên gia đình.");

    // 4. Tạo nhiệm vụ Chore-to-Earn mẫu
    console.log("📝 Đang tạo nhiệm vụ Chore-to-Earn mẫu...");
    const [chore] = await db
      .insert(chores)
      .values({
        familyId: family.id,
        childId: childUser.id,
        title: "Đạt điểm 10 kiểm tra Toán",
        description: "Bé Na học bài chăm chỉ, đạt điểm 10 môn Toán học kỳ và nộp ảnh phiếu điểm",
        rewardAmount: "5.000000", // 5 USDC
        proofImageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800",
        onchainTaskId: 1,
        status: "TODO",
      })
      .returning();

    console.log(`✅ Đã tạo nhiệm vụ: '${chore.title}' (Thưởng: 5 USDC)`);

    // 5. Tạo yêu cầu rút tiền lớn (Pending Multisig) từ Ông Nội
    console.log("🚨 Đang tạo yêu cầu rút tiền lớn cảnh báo lừa đảo (Multisig Pending)...");
    const [withdrawalReq] = await db
      .insert(withdrawalRequests)
      .values({
        familyId: family.id,
        requesterId: elderlyUser.id,
        amount: "1000.000000", // 1,000 USDC > 50 USDC limit
        vault: "RetirementShield",
        reason: "Chi phí thuốc men và chăm sóc sức khỏe định kỳ",
        onchainRequestId: 1,
        approvalsCount: 0,
        requiredApprovals: 2,
        status: "PENDING",
      })
      .returning();

    console.log(`✅ Đã tạo yêu cầu rút tiền lớn: 1,000 USDC từ Ông Nội (Trạng thái: PENDING)`);

    // 6. Tạo cảnh báo tức thời gửi tới Bố và 2 Guardians
    console.log("🔔 Đang tạo thông báo cảnh báo tức thời cho Guardians...");
    const alertRecipients = [adminUser, guardian1User, guardian2User];

    for (const recipient of alertRecipients) {
      await db.insert(notifications).values({
        familyId: family.id,
        userId: recipient.id,
        title: "🚨 CẢNH BÁO RÚT TIỀN LỚN TỪ ÔNG NỘI",
        message: `Phát hiện yêu cầu rút 1,000 USDC từ quỹ RetirementShield với lý do: '${withdrawalReq.reason}'. Cần ít nhất 2 Guardians ký duyệt on-chain để phòng chống lừa đảo!`,
        type: "ALERT_SCAM",
        isRead: false,
      });
    }

    console.log(`✅ Đã gửi cảnh báo tức thời đến ${alertRecipients.length} người bảo hộ.`);

    console.log("\n========================================================");
    console.log("🎉 KHỞI TẠO DỮ LIỆU SEED HOÀN TẤT THÀNH CÔNG 100%!");
    console.log("========================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi trong quá trình seed database:", error);
    process.exit(1);
  }
}

seed();
