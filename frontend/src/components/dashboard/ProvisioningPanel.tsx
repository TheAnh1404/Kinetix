"use client";
import { useEffect, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { getWalletClient } from "@/lib/web3/client";
import { FAMILY_HUB_ABI } from "@/contracts/abis";
import { DEPLOYMENT } from "@/contracts/config";

export function ProvisioningPanel({
  openRequest = 0,
  onBusyChange,
}: {
  openRequest?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { currentWorkspace, members } = useFamily();
  const auth = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const id = currentWorkspace?.id;
  const load = async () => {
    if (!id || !DEPLOYMENT.enabled) return;
    try {
      setData(
        await authRequest(
          `/api/workspaces/${id}/provisioning`,
          undefined,
          "GET",
        ),
      );
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chưa đọc được yêu cầu cấp quyền.",
      );
    }
  };
  useEffect(() => {
    setData(null);
    void load();
  }, [id]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);
  if (!DEPLOYMENT.enabled) return null;
  const process = async (request: any, sign: boolean) => {
    setBusy(true);
    setError("");
    try {
      let hash = hashes[request.id];
      if (sign) {
        const wallet = getWalletClient();
        if (!wallet || !currentWorkspace?.l1HubAddress)
          throw new Error("Kết nối đúng ví operator Core.");
        hash = await wallet.writeContract({
          address: currentWorkspace.l1HubAddress,
          abi: FAMILY_HUB_ABI,
          functionName: "setAllowlistStatus",
          args: [request.address, true],
        } as any);
        setHashes((previous) => ({ ...previous, [request.id]: hash }));
      }
      await authRequest(
        `/api/workspaces/${id}/provisioning/${request.id}/confirm`,
        { txHash: hash },
      );
      await load();
      await auth.checkSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa hoàn tất cấp quyền.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 p-5 space-y-3 text-slate-900 dark:text-slate-100 transition-colors"
    >
      <summary className="min-h-12 font-bold cursor-pointer text-slate-900 dark:text-white">
        Cấp quyền giao dịch trên Hub
      </summary>
      <p className="break-all text-xs text-slate-600 dark:text-slate-400">
        Operator cần ký: {data?.operator || "Đang đối soát"}
      </p>
      <button className="underline min-h-12 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer" onClick={() => void load()}>
        Đối soát trạng thái
      </button>
      <div className="flex gap-2 flex-wrap">
        {members
          .filter(
            (member) =>
              !data?.requests?.some(
                (request: any) => request.userId === member.id,
              ),
          )
          .map((member) => (
            <button
              key={member.id}
              disabled={busy}
              className="border border-slate-300 dark:border-slate-700 min-h-12 rounded-xl p-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
              onClick={() => {
                setBusy(true);
                void authRequest(`/api/workspaces/${id}/provisioning/refresh`, {
                  userId: member.id,
                })
                  .then(load)
                  .catch((err) => setError(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              Tạo yêu cầu cho {member.name}
            </button>
          ))}
      </div>
      {data?.requests?.map((request: any) => (
        <div key={request.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {request.fullName}: {request.status} · Live:{" "}
            {request.liveAllowed ? "Đã allowlist" : "Chưa allowlist"}
          </p>
          <p className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">{request.address}</p>
          {data.canSign && request.status !== "CONFIRMED" && (
            <button
              disabled={busy || !auth.walletMatches}
              className="border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl min-h-12 px-3 text-xs font-bold cursor-pointer hover:bg-emerald-100"
              onClick={() => void process(request, true)}
            >
              Ký cấp quyền trong Core
            </button>
          )}
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Receipt operator đã ký
            <input
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 w-full text-xs font-mono text-slate-900 dark:text-white mt-1"
              value={hashes[request.id] || ""}
              onChange={(event) =>
                setHashes((previous) => ({
                  ...previous,
                  [request.id]: event.target.value.trim(),
                }))
              }
            />
          </label>
          <button
            disabled={
              busy || !/^0x[0-9a-f]{64}$/i.test(hashes[request.id] || "")
            }
            className="border border-slate-300 dark:border-slate-700 rounded-xl min-h-12 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            onClick={() => void process(request, false)}
          >
            Đối soát receipt
          </button>
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </details>
  );
}
