"use client";
import React, { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useVaultStates } from "@/hooks/useVaultStates";
import { useAuth } from "@/hooks/useAuth";
import { VaultMemberManagement } from "@/components/vaults/VaultMemberManagement";
import type { DynamicVaultItem } from "@/types";
import { WithdrawalSignatureActions } from "./WithdrawalSignatureActions";

const avax = (wei: string) => {
  try {
    return formatEther(BigInt(wei));
  } catch {
    return "Chưa xác minh";
  }
};

/**
 * Fintech On-Chain Control Terminal cho Kinetix Vaults
 * Xử lý mọi tương tác hợp đồng Fuji C-Chain & Family L1:
 * - Đối soát block finalized và trạng thái indexer
 * - Quản lý hạn mức và tạo đề xuất rút tiền lớn
 * - Ký duyệt đa chữ ký M/N Guardians
 * - Chấm điểm & giải ngân nhiệm vụ việc nhà (Chore-to-Earn)
 * - Điều phối chu kỳ góp vốn xoay vòng (ROSCA)
 */
type Props = { onlyRosca?: boolean; ruleTemplates?: DynamicVaultItem["ruleTemplate"][] };
export function VaultWorkflowPanel(props: Props) {
  const family = useFamily();
  const auth = useAuth();
  return <WorkflowPanel key={`${auth.user?.id}:${family.currentWorkspace?.id}:${props.ruleTemplates?.join(",") || props.onlyRosca}`} {...props} />;
}
function WorkflowPanel({ onlyRosca = false, ruleTemplates }: Props) {
  const family = useFamily();
  const auth = useAuth();
  const { states, errors, refresh } = useVaultStates();
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const locked = useRef(false);

  useEffect(() => {
    if (family.selectedVault?.id) setSelected(family.selectedVault.id);
  }, [family.selectedVault?.id]);

  useEffect(() => {
    const choose = (event: Event) => {
      setSelected((event as CustomEvent<string>).detail);
    };
    window.addEventListener("kinetix-vault-selected", choose);
    return () => window.removeEventListener("kinetix-vault-selected", choose);
  }, []);

  const vaults = family.dynamicVaults.filter(
    (vault) => (!onlyRosca || vault.ruleTemplate === "ROSCA") && (!ruleTemplates || ruleTemplates.includes(vault.ruleTemplate)),
  );
  const vault = vaults.find((item) => item.id === selected) || vaults[0];
  const data = vault && states[vault.id];
  const connected = !!auth.connectedAddress && auth.walletMatches;
  const membership = auth.workspaces.find((item) => item.id === family.currentWorkspace?.id);
  const manager = ["ADMIN", "GUARDIAN"].includes(membership?.role || "");
  useEffect(() => { setAmount(""); setReason(""); setFeedback(""); }, [vault?.id]);

  const act = async (action: () => Promise<boolean>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const ok = await action();
      setFeedback(
        ok
          ? "Giao dịch đã được xác nhận trên Avalanche. Trạng thái đang được đồng bộ đối soát."
          : "Chưa hoàn tất thao tác. Vui lòng kiểm tra lại thông báo ví Core.",
      );
      await refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi trong quá trình ký duyệt.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  if (!vault) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
        <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
          folder_off
        </span>
        <p className="text-sm font-semibold">Chưa có hũ tiền nào trong phạm vi không gian này.</p>
      </div>
    );
  }

  const getTemplateBadge = (tpl: string) => {
    switch (tpl) {
      case "SHIELD":
        return { label: "Bảo Vệ & Trợ Cấp", color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
      case "MILESTONE":
        return { label: "Việc Nhà & Thưởng", color: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" };
      case "ROSCA":
        return { label: "Góp Vốn Họ Hụi", color: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
      case "SHARED_GOAL":
        return { label: "Mục Tiêu Chung", color: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
      default:
        return { label: tpl, color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
    }
  };

  const badge = getTemplateBadge(vault.ruleTemplate);

  return (
    <section
      className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5 w-full text-slate-900 dark:text-slate-100 transition-colors"
      aria-label="Bàn điều khiển luồng ký duyệt On-Chain"
    >
      {/* 1. Header Điều Khiển & Live Finality Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[22px]">tune</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Bàn Điều Khiển On-Chain
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đối soát thời gian thực với hợp đồng Avalanche Fuji
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Block #{data.asOfBlock}</span>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Đồng bộ lại từ RPC"
          >
            <span className={`material-symbols-outlined text-[15px] ${busy ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>Đối soát</span>
          </button>
        </div>
      </div>

      {/* 2. Bộ Chọn Hũ Tiền Hoạt Động */}
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
          Chọn Hũ Tiền Quản Trị
        </label>
        <div className="relative">
          <select
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer appearance-none"
            value={vault.id}
            onChange={(event) => {
              setSelected(event.target.value);
              setFeedback("");
            }}
          >
            {vaults.map((item) => (
              <option key={item.id} value={item.id} className="dark:bg-slate-800 dark:text-white">
                {item.name} · ({item.ruleTemplate}) · ID: #{item.onchainVaultId}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none text-[20px]">
            unfold_more
          </span>
        </div>
      </div>

      {/* Thông báo lỗi mapping/RPC */}
      {errors[vault.id] && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">warning</span>
          <span>{errors[vault.id]}</span>
        </div>
      )}

      {vault && manager && (
        <VaultMemberManagement
          vault={vault}
          guardians={data?.state?.guardians || []}
          beneficiaries={data?.state?.beneficiaries || []}
        />
      )}
      {data && !connected && <div className="vx-funding-warning"><p>Kết nối đúng ví Core đã liên kết để sử dụng các thao tác được cấp quyền.</p><button type="button" className="vx-text-link" onClick={() => void auth.connectWallet().catch((cause) => setFeedback(cause.message))}>Kết nối Core</button></div>}
      {!data && !errors[vault.id] && <p role="status">Đang đối soát trạng thái hũ…</p>}

      {/* 3. Thẻ Số Dư Trực Quan (Balance Bento Deck) */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tổng Số Dư Hũ</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
              {avax(data.balance.totalWei)} <span className="text-xs font-bold text-red-600">AVAX</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Khoản Đã Giữ Chỗ</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              {avax(data.balance.reservedWei)} <span className="text-xs font-bold text-amber-700 dark:text-amber-300">AVAX</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Thanh Khoản Khả Dụng</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {avax(data.balance.availableWei)} <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">AVAX</span>
            </span>
          </div>
        </div>
      )}

      {/* 4. Quy Tắc Riêng Biệt Theo Từng Loại Hũ */}
      {data && (
        <div className="flex flex-col gap-4">
          {/* A. HŨ AN SINH (SHIELD) */}
          {vault.ruleTemplate === "SHIELD" && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-950 dark:text-emerald-200 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">shield</span>
                <span>Chính Sách Hạn Mức An Sinh Ông Bà</span>
              </div>
              <p className="leading-relaxed">
                Hạn mức ngày dùng chung toàn hũ: <strong>{avax(data.shield.dailyLimitWei)} AVAX</strong>.
                Đã giải ngân: <strong>{avax(data.shield.dailySpentWei)} AVAX</strong>.
                Thời điểm đặt lại hạn mức: <strong>{new Date(Number(data.shield.resetsAt) * 1000).toLocaleString("vi-VN")}</strong>.
              </p>
            </div>
          )}

          {/* B. MỤC TIÊU CHUNG (SHARED_GOAL) */}
          {vault.ruleTemplate === "SHARED_GOAL" && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-xs text-blue-950 dark:text-blue-200 flex flex-col gap-2">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-blue-600">flag</span>
                  Mục Tiêu Tích Lũy Nhóm
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px]">
                  {data.goal.reached ? "✓ Đã Đạt Mục Tiêu" : "Đang Tích Lũy"}
                </span>
              </div>
              <p>
                Mục tiêu: <strong>{avax(data.state.targetGoalAmount)} AVAX</strong>.
                Hạn chót: <strong>{data.state.targetDeadline === "0" ? "Không giới hạn" : new Date(Number(data.state.targetDeadline) * 1000).toLocaleString("vi-VN")}</strong>.
              </p>
            </div>
          )}

          {/* C. FORM TẠO YÊU CẦU RÚT TIỀN LỚN (CHO SHIELD VÀ SHARED_GOAL) */}
          {["SHIELD", "SHARED_GOAL"].includes(vault.ruleTemplate) && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => (await family.requestVaultWithdrawal(vault.onchainVaultId, amount, reason)).success);
              }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-3"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-600 dark:text-slate-400">send_money</span>
                Tạo Đề Xuất Rút Lớn (Cần {data.state.requiredApprovals} Chữ Ký Guardians)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Số AVAX
                  </label>
                  <input
                    inputMode="decimal"
                    placeholder="VD: 5.0"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lý Do Rút Tiền
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Viện phí định kỳ, Sắm đồ gia đình..."
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {!data.capabilities.requestLargeWithdrawal.allowed ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {data.capabilities.requestLargeWithdrawal.reason}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sẽ gửi thông báo đến các Guardians trong gia đình để ký duyệt
                  </span>
                )}
                <button
                  type="submit"
                  disabled={busy || !connected || !data.capabilities.requestLargeWithdrawal.allowed}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer active:scale-95"
                >
                  {busy ? "Đang gửi..." : "Gửi Đề Xuất"}
                </button>
              </div>
            </form>
          )}

          {/* D. DANH SÁCH YÊU CẦU RÚT TIỀN ĐANG CHỜ DUYỆT (PENDING MULTISIG) */}
          {data.requests && data.requests.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Yêu Cầu Rút Tiền On-Chain ({data.requests.length})
              </span>
              <div className="space-y-2.5">
                {data.requests.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                          {avax(request.amountWei)} AVAX
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            request.executed
                              ? "bg-emerald-50 text-emerald-700"
                              : request.stale
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {request.executed
                            ? "✓ Đã Giải Ngân"
                            : request.expired ? "Đã hết hạn" : request.stale
                              ? "Hết Hiệu Lực"
                              : `${request.approvals}/${request.required} Chữ Ký`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-mono">
                        Ví nhận: {request.recipient}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {request.signed && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                          ✓ Bạn đã ký
                        </span>
                      )}
                      {request.canApprove && (
                        <button
                          type="button"
                          disabled={busy || !connected}
                          onClick={() => void act(() => family.approveWithdrawal(request.id))}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                        >
                          Ký Duyệt On-chain
                        </button>
                      )}
                    </div>
                    <WithdrawalSignatureActions key={`${vault.id}:${request.id}`} vault={vault} request={request} canSign={data.capabilities.approveWithdrawal.allowed} canExecute={data.capabilities.executeWithdrawalWithSignatures.allowed} onComplete={refresh} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. DANH SÁCH NHIỆM VỤ VIỆC NHÀ (CHORES LIST CHO MILESTONE) */}
          {data.tasks && data.tasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Nhiệm Vụ Cột Mốc ({data.tasks.length})
              </span>
              <div className="space-y-2.5">
                {data.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold font-mono">
                          +{avax(task.rewardWei)} AVAX
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {task.rewarded
                          ? "✓ Đã trả thưởng thành công"
                          : task.cancelled
                            ? "Đã hủy nhiệm vụ"
                            : task.completed
                              ? "Chờ Guardians duyệt thưởng"
                              : "Đang thực hiện"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.canApprove && (
                        <button
                          type="button"
                          disabled={busy || !connected}
                          onClick={() => void act(() => family.verifyAndRewardChore(task.id))}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                        >
                          Ký Duyệt Thưởng
                        </button>
                      )}
                      {task.canCancel && (
                        <button
                          type="button"
                          disabled={busy || !connected}
                          onClick={() => void act(() => family.cancelChore(task.id))}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* F. ĐIỀU PHỐI HỌ HỤI XOAY VÒNG (ROSCA ROUND CONTROLLER) */}
          {vault.ruleTemplate === "ROSCA" && data.rosca && (
            <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔄</span>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                      Chu Kỳ Góp Vốn Xoay Vòng (Kỳ {data.state.roscaCurrentRound} / {data.state.beneficiaries?.length || 0})
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Số tiền góp mỗi kỳ: <strong>{avax(data.state.roscaRoundContribution)} AVAX</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold font-mono">
                  {data.rosca.ended ? "Đã Hoàn Tất Chu Kỳ" : "Đang Trong Kỳ"}
                </span>
              </div>

              {!data.rosca.ended && (
                <div className="text-xs text-amber-900 dark:text-amber-200 flex flex-col gap-1 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-200/60 dark:border-amber-800/40">
                  <span className="font-mono truncate">
                    🎯 Người nhận kỳ này: <strong>{data.rosca.recipient}</strong>
                  </span>
                  <span>
                    ⏰ Thời điểm có thể giải ngân: <strong>{new Date(Number(data.rosca.nextPayoutAt) * 1000).toLocaleString("vi-VN")}</strong>
                  </span>
                </div>
              )}

              {/* Danh sách thành viên đóng góp kỳ */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase">
                  Trạng Thái Đóng Góp Kỳ Này:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.rosca.contributions?.map((item: any) => (
                    <div
                      key={item.address}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300">{item.address}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.contributed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.contributed ? "✓ Đã Góp" : "Chưa Góp"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút hành động góp và giải ngân */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  disabled={
                    busy ||
                    !connected ||
                    data.rosca.ended ||
                    !data.capabilities.contributeRoscaRound.allowed ||
                    data.rosca.contributions?.some(
                      (item: any) =>
                        item.address.toLowerCase() === auth.linkedWallet?.address?.toLowerCase() &&
                        item.contributed,
                    )
                  }
                  onClick={() =>
                    void act(
                      async () =>
                        (await family.depositToVault(vault.onchainVaultId, formatEther(BigInt(data.state.roscaRoundContribution)))).success,
                    )
                  }
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  Góp Đúng Khoản Kỳ ({avax(data.state.roscaRoundContribution)} AVAX)
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !connected ||
                    data.rosca.ended ||
                    !data.capabilities.payoutRoscaRound.allowed ||
                    data.rosca.contributions?.some((item: any) => !item.contributed) ||
                    Date.now() < Number(data.rosca.nextPayoutAt) * 1000
                  }
                  onClick={() => void act(() => family.payoutRoscaRound(vault.onchainVaultId, vault.id))}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  Giải Ngân Kỳ Hụi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thông Báo Trạng Thái Giao Dịch */}
      {feedback && (
        <div
          className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-lg animate-in fade-in"
          role="status"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback("")}
            className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
