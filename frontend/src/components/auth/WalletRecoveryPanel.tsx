"use client";
import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { getCoreProvider, getWalletClient, queueTransactionSync, switchNetwork } from "@/lib/web3/client";
import { DEPLOYMENT } from "@/contracts/config";
import { FAMILY_HUB_ABI } from "@/contracts/abis";

export function WalletRecoveryPanel() {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = currentWorkspace?.id;
  const load = async () => {
    if (!id || !DEPLOYMENT.enabled) return;
    try { setRows((await authRequest(`/api/recovery?workspaceId=${id}`, undefined, "GET")).recoveries); setError(""); }
    catch (err) { setRows([]); setError(err instanceof Error ? err.message : "Chưa đọc được recovery."); }
  };
  useEffect(() => { setRows([]); }, [id, auth.user?.id]);
  if (!DEPLOYMENT.enabled) return null;
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await action(); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Chưa hoàn tất recovery."); }
    finally { setBusy(false); }
  };
  const prove = async () => {
    const provider = getCoreProvider();
    if (!provider || !await switchNetwork(43113)) throw new Error("Mở ví thay thế trong Core trên Fuji.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = accounts[0];
    if (!address || address.toLowerCase() === auth.linkedWallet?.address.toLowerCase()) throw new Error("Chọn ví thay thế khác ví hiện tại để chứng minh sở hữu.");
    const challenge = await authRequest("/api/auth/wallet/challenge", { purpose: "RECOVERY", address, chainId: 43113 });
    const signature = await createWalletClient({ transport: custom(provider) }).signMessage({ account: address, message: challenge.message });
    await authRequest("/api/recovery", { challengeId: challenge.challengeId, signature });
  };
  const approve = async (row: any) => {
    const wallet = getWalletClient();
    if (!wallet || !currentWorkspace?.l1HubAddress || !auth.user) throw new Error("Kết nối ví guardian đã liên kết.");
    const sync = { path: "/api/recovery/confirm", body: { stepId: row.step.id } };
    const hash = await wallet.writeContract({ address: currentWorkspace.l1HubAddress, abi: FAMILY_HUB_ABI, functionName: "recoverMemberWallet", args: [BigInt(row.step.onchainVaultId), row.oldWallet, row.newWallet], __kinetixSync: sync } as any);
    await queueTransactionSync(auth.user.id, hash, sync.path, { ...sync.body, txHash: hash }, "POST");
  };
  const mine = rows.filter((row) => row.userId === auth.user?.id && row.status !== "COMPLETED");
  return <details className="rounded-xl border p-4 space-y-3" onToggle={(event) => { if (event.currentTarget.open) void load(); }}><summary className="min-h-12 font-bold">Khôi phục ví bằng guardian</summary>
    <p>Đổi mật khẩu giữ nguyên ví. Đổi ví cần chứng minh ví mới, đủ quorum ở từng hũ và operator thu allowlist ví cũ. Các bước đã lên chain được giữ khi ứng dụng gián đoạn.</p>
    <button disabled={busy} className="border rounded-xl min-h-12 px-3" onClick={() => void run(prove)}>Chứng minh ví thay thế trong Core</button>
    <button disabled={busy} className="underline min-h-12 px-3" onClick={() => void load()}>Cập nhật tiến độ</button>
    {rows.map((row) => <div key={row.step.id} className="rounded-xl border p-3 space-y-2"><p>{row.step.name}: {row.step.approvals}/{row.step.requiredApprovals} chữ ký · {row.step.status}{row.step.stale ? " · Epoch đã thay đổi, cần đối soát" : ""}</p><p className="break-all">Ví cũ: {row.oldWallet}<br />Ví mới: {row.newWallet}</p>{row.step.canApprove && <button disabled={busy || !auth.walletMatches} className="border rounded-xl min-h-12 px-3" onClick={() => void run(() => approve(row))}>Guardian ký thay ví cho hũ này</button>}</div>)}
    {[...new Set(mine.map((row) => row.id))].map((recoveryId) => <button key={recoveryId} disabled={busy} className="border rounded-xl min-h-12 px-3" onClick={() => void run(async () => { await authRequest(`/api/recovery/${recoveryId}/finish`, {}); window.location.assign("/login"); })}>Đối soát toàn bộ scope và hoàn tất tài khoản</button>)}
    {error && <p role="alert">{error}</p>}
  </details>;
}
