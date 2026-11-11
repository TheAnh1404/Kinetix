"use client";
import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { getCoreProvider, switchNetwork } from "@/lib/web3/client";
import { DEPLOYMENT } from "@/contracts/config";

export function CoreDeploymentConsole() {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const workspaceId = currentWorkspace?.id;
  const storageKey = `kinetix-core-deployment:${auth.user?.id}:${workspaceId}`;
  const load = useCallback(async () => {
    if (!workspaceId) return;
    try { setPlan((await authRequest(`/api/deployment/core-plan?workspaceId=${encodeURIComponent(workspaceId)}`, undefined, "GET")).plan); setError(""); }
    catch (err) { setPlan(null); setError(err instanceof Error ? err.message : "Chưa chuẩn bị được deployment."); }
  }, [workspaceId]);
  useEffect(() => { if (!DEPLOYMENT.enabled) void load(); }, [load]);
  if (DEPLOYMENT.enabled || currentWorkspace?.role !== "ADMIN" && currentWorkspace?.userRole !== "ADMIN") return null;
  const submit = async () => {
    if (!plan || plan.completed || busy || !workspaceId) return;
    setBusy(true); setError("");
    try {
      let stored: any = null;
      try { stored = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { /* server journal also retains known hashes */ }
      let hash = plan.txHash || (stored?.sourceHash === plan.sourceHash && stored?.key === plan.key ? stored.txHash : null);
      if (!hash) {
        const provider = getCoreProvider();
        if (!provider) throw new Error("Kết nối Core để ký từng bước deployment.");
        if (!await switchNetwork(43113)) throw new Error("Chưa chuyển Core sang Fuji 43113.");
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts[0]?.toLowerCase() !== plan.admin) throw new Error("Chọn đúng ví Core đã liên kết với tài khoản.");
        const identity = await authRequest("/api/auth/me", undefined, "GET");
        if (identity.user?.id !== auth.user?.id || identity.linkedWallet?.address?.toLowerCase() !== plan.admin) throw new Error("Phiên hoặc ví đã thay đổi. Tải lại trước khi ký.");
        const transaction = { ...plan.transaction };
        if (transaction.to === null) delete transaction.to;
        hash = await provider.request({ method: "eth_sendTransaction", params: [transaction] });
        localStorage.setItem(storageKey, JSON.stringify({ key: plan.key, sourceHash: plan.sourceHash, txHash: hash }));
      }
      const result = await authRequest("/api/deployment/core-receipt", { workspaceId, key: plan.key, txHash: hash });
      if (!result.result.pending) localStorage.removeItem(storageKey);
      await load();
      if (result.result.pending) setError(`Đã lưu ${hash}. Chờ finalized rồi bấm đối soát; không ký lại.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Chưa hoàn tất deployment."); }
    finally { setBusy(false); }
  };
  return <section className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 p-5 space-y-3 text-slate-900 dark:text-slate-100 transition-colors" aria-label="Triển khai bằng Core">
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Triển khai T1 bằng Core</h2>
    <p className="text-xs text-slate-600 dark:text-slate-400">Dùng ví Core của bạn để ký 3 lần tạo contract và 2 lần nối cấu hình trên Fuji. Txhash được đối soát với bytecode và constructor của bản build.</p>
    <p className="break-all text-xs font-mono text-slate-500 dark:text-slate-400">Ví đã liên kết: {auth.linkedWallet?.address || "Chưa liên kết"}</p>
    <a className="underline block min-h-12 text-xs font-semibold text-red-600 dark:text-red-400" href="https://core.app/tools/testnet-faucet" target="_blank" rel="noopener noreferrer">Nhận AVAX Fuji từ faucet Core</a>
    {plan && !plan.completed && <>
      <p className="text-xs text-slate-700 dark:text-slate-300">Bước {plan.step}/{plan.totalSteps}: {plan.key}. Số dư ví: {formatEther(BigInt(plan.balanceWei))} AVAX. Phí trần ước tính cho bước này: {formatEther(BigInt(plan.estimatedMaximumFeeWei))} AVAX.</p>
      <details className="text-xs text-slate-600 dark:text-slate-400"><summary className="min-h-12 cursor-pointer font-semibold">Chi tiết bản build</summary><p className="break-all font-mono">{plan.sourceHash}</p><p>Chain ID: {plan.chainId} · Giá trị gửi: 0 AVAX</p></details>
      <button className="border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-red-600 hover:bg-black dark:hover:bg-red-700 text-white rounded-xl min-h-12 px-4 text-xs font-bold disabled:opacity-40 cursor-pointer" disabled={busy || !plan.txHash && BigInt(plan.balanceWei) < BigInt(plan.estimatedMaximumFeeWei)} onClick={() => void submit()}>{busy ? "Đang đối soát…" : plan.txHash ? "Đối soát txhash đã gửi" : "Ký bước này trong Core"}</button>
    </>}
    {plan?.completed && <><p className="text-xs text-emerald-600 dark:text-emerald-400">Đã tạo candidate từ 5 receipt finalized. Cần kiểm tra và kích hoạt manifest, rồi rebuild frontend và khởi động lại API/worker.</p><p className="break-all font-mono text-xs">{plan.candidatePath}</p></>}
    <button className="underline min-h-12 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer" disabled={busy} onClick={() => void load()}>Kiểm tra số dư và tiến độ</button>
    {error && <p role="alert" className="break-all text-xs text-red-600 dark:text-red-400">{error}</p>}
  </section>;
}
