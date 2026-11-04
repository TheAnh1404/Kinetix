import { db, pool } from "../backend/src/db";
import {
  users,
  userCredentials,
  userWallets,
  workspaceMembers,
  guardianMemberLinks,
  vaults,
} from "../backend/src/db/schema";
import { eq, sql } from "drizzle-orm";

async function report() {
  // Read-only inventory. Never select PINs, password hashes or session tokens.
  const accounts = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      authMethod: users.authMethod,
      legacyWallet: users.walletAddress,
      credentialUserId: userCredentials.userId,
      verifiedWallet: userWallets.address,
    })
    .from(users)
    .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
    .leftJoin(userWallets, eq(userWallets.userId, users.id));
  const memberships = await db
    .select({
      userId: workspaceMembers.userId,
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers);
  const links = await db
    .select({
      memberId: guardianMemberLinks.memberId,
      workspaceId: guardianMemberLinks.workspaceId,
    })
    .from(guardianMemberLinks)
    .where(eq(guardianMemberLinks.active, true));
  const ambiguousVaults = await db
    .select({
      id: vaults.id,
      workspaceId: vaults.workspaceId,
      onchainVaultId: vaults.onchainVaultId,
    })
    .from(vaults)
    .where(
      sql`${vaults.onchainHub} is null or ${vaults.onchainChainId} is null`,
    );
  console.log(
    JSON.stringify(
      {
        accounts: accounts.map((account) => ({
          ...account,
          credentialRequired: !account.credentialUserId,
          walletReviewRequired:
            !!account.legacyWallet && !account.verifiedWallet,
          memberships: memberships.filter(
            (membership) => membership.userId === account.userId,
          ),
          managerWorkspaceIds: links
            .filter((link) => link.memberId === account.userId)
            .map((link) => link.workspaceId),
        })),
        unverifiedVaultMappings: ambiguousVaults,
      },
      null,
      2,
    ),
  );
}
report()
  .catch(() => {
    console.error(
      "Legacy inventory failed; verify migration and database configuration.",
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
