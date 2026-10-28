import { db } from "../backend/src/db";
import { workspaces, users, workspaceMembers, vaults, vaultMembers } from "../backend/src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("🚀 Bắt đầu đồng bộ dữ liệu thật cho Kinetix Multi-Space Vaults...");

  // Dọn dẹp trùng lặp trong workspace_members
  await db.execute(sql.raw(`
    DELETE FROM workspace_members a
    WHERE a.ctid <> (
      SELECT min(b.ctid)
      FROM workspace_members b
      WHERE a.workspace_id = b.workspace_id AND a.user_id = b.user_id
    )
  `));

  // 1. Lấy tất cả workspaces
  const allWorkspaces = await db.select().from(workspaces);
  console.log(`Tìm thấy ${allWorkspaces.length} workspaces.`);

  // Lấy hoặc tạo các user mẫu đa thế hệ
  async function getOrCreateUser(fullName: string, role: any, wallet: string, pin: string, phone: string, avatar: string) {
    const normalizedWallet = wallet.toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${normalizedWallet}`);

    if (existing.length > 0) {
      return existing[0];
    }

    const [newUser] = await db
      .insert(users)
      .values({
        fullName,
        role,
        defaultRole: role,
        walletAddress: wallet,
        authMethod: role === "ELDERLY" || role === "CHILD" ? "PASSKEY_EMBEDDED" : "CORE_WALLET",
        pinCode: pin,
        phoneNumber: phone,
        avatarUrl: avatar,
        isAllowlisted: true,
      })
      .returning();

    return newUser;
  }

  const elderlyUser = await getOrCreateUser(
    "Ông Nội (Cụ An)",
    "ELDERLY",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "1234",
    "0904567890",
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"
  );

  const childUser = await getOrCreateUser(
    "Bé Na (Con Gái)",
    "CHILD",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "1234",
    "0905678901",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"
  );

  const guardian1User = await getOrCreateUser(
    "Cô Út (Bảo Hộ 1)",
    "GUARDIAN",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "1234",
    "0902345678",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  );

  const guardian2User = await getOrCreateUser(
    "Anh Cả (Bảo Hộ 2)",
    "GUARDIAN",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "1234",
    "0903456789",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  );

  for (const ws of allWorkspaces) {
    console.log(`\n🏢 Đang xử lý Workspace: ${ws.name} (${ws.id})`);

    // Đảm bảo các thành viên được thêm vào workspaceMembers
    const requiredUsers = [guardian1User, guardian2User, elderlyUser, childUser];

    for (const reqU of requiredUsers) {
      const existing = await db
        .select()
        .from(workspaceMembers)
        .where(sql`${workspaceMembers.workspaceId} = ${ws.id} AND ${workspaceMembers.userId} = ${reqU.id}`);

      if (existing.length === 0) {
        console.log(`➕ Gán thành viên '${reqU.fullName}' (${reqU.role}) vào Workspace '${ws.name}'`);
        await db.insert(workspaceMembers).values({
          workspaceId: ws.id,
          userId: reqU.id,
          role: reqU.role,
        });
      }
    }

    // Lấy lại danh sách đầy đủ thành viên của Workspace
    const currentWUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: workspaceMembers.role,
        walletAddress: users.walletAddress,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, ws.id));

    console.log(`Tổng số thành viên trong ${ws.name}: ${currentWUsers.length}`);

    const finalGuardians = currentWUsers.filter((m) => m.role === "GUARDIAN" || m.role === "ADMIN");
    const finalElderly = currentWUsers.find((m) => m.role === "ELDERLY") || elderlyUser;
    const finalChild = currentWUsers.find((m) => m.role === "CHILD") || childUser;

    // Cập nhật và liên kết vault_members cho từng Hũ
    const wsVaults = await db.select().from(vaults).where(eq(vaults.workspaceId, ws.id));
    console.log(`Số Hũ tiền trong workspace: ${wsVaults.length}`);

    for (const v of wsVaults) {
      await db.delete(vaultMembers).where(eq(vaultMembers.vaultId, v.id));

      if (v.ruleTemplate === "SHIELD") {
        for (const g of finalGuardians) {
          await db.insert(vaultMembers).values({
            vaultId: v.id,
            userId: g.id,
            vaultRole: "GUARDIAN",
          });
        }
        await db.insert(vaultMembers).values({
          vaultId: v.id,
          userId: finalElderly.id,
          vaultRole: "BENEFICIARY",
        });
      } else if (v.ruleTemplate === "MILESTONE") {
        for (const g of finalGuardians) {
          await db.insert(vaultMembers).values({
            vaultId: v.id,
            userId: g.id,
            vaultRole: "GUARDIAN",
          });
        }
        await db.insert(vaultMembers).values({
          vaultId: v.id,
          userId: finalChild.id,
          vaultRole: "BENEFICIARY",
        });
      } else {
        for (const m of currentWUsers) {
          await db.insert(vaultMembers).values({
            vaultId: v.id,
            userId: m.id,
            vaultRole: m.role === "ADMIN" ? "CREATOR" : "GUARDIAN",
          });
        }
      }
    }
  }

  console.log("\n✅ Hoàn thành 100% đồng bộ thành viên đa thế hệ và phân quyền Hũ tiền!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Lỗi đồng bộ:", err);
  process.exit(1);
});
