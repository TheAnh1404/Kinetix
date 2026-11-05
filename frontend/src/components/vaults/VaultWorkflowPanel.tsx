"use client";
import { useState } from "react";
import { formatEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useVaultStates } from "@/hooks/useVaultStates";
import { useAuth } from "@/hooks/useAuth";

const avax = (wei: string) => formatEther(BigInt(wei));
export function VaultWorkflowPanel({ onlyRosca = false }: { onlyRosca?: boolean }) {
  const family = useFamily();
  const auth = useAuth();
  const { states, errors, refresh } = useVaultStates();
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const vaults = family.dynamicVaults.filter((vault) => !onlyRosca || vault.ruleTemplate === "ROSCA");
  const vault = vaults.find((item) => item.id === selected) || vaults[0];
  const data = vault && states[vault.id];
  const connected = !!auth.connectedAddress && auth.walletMatches;
  const act = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true); setFeedback("");
    try { setFeedback(await action() ? "Receipt đã xác nhận. Đang đối soát trạng thái." : "Chưa hoàn tất thao tác; xem thông báo giao dịch."); await refresh(); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Chưa hoàn tất thao tác."); }
    finally { setBusy(false); }
  };
  if (!vault) return <p>Chưa có hũ trong phạm vi này.</p>;
  return <section className="rounded-2xl border bg-white p-5 space-y-4" aria-label="Chi tiết và xử lý hũ">
    <h2 className="text-xl font-bold">Chi tiết hũ · Fuji</h2>
    <label className="block">Chọn hũ<select className="block w-full rounded-xl border p-3" value={vault.id} onChange={(event) => { setSelected(event.target.value); setFeedback(""); }}>{vaults.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ruleTemplate}</option>)}</select></label>
    {errors[vault.id] && <p role="alert">{errors[vault.id]}</p>}
    <button className="min-h-12 underline" onClick={() => void refresh()}>Đối soát lại</button>
    {data && <>
      <p>Tổng: {avax(data.balance.totalWei)} AVAX · Giữ cho việc nhà: {avax(data.balance.reservedWei)} · Khả dụng: {avax(data.balance.availableWei)}</p>
      <p className="text-sm text-slate-600">Block finalized {data.asOfBlock} · {new Date(data.checkedAt).toLocaleString("vi-VN")} · Indexer: {data.indexingStatus}</p>
      {vault.ruleTemplate === "SHIELD" && <p>Hạn mức ngày dùng chung toàn hũ: {avax(data.shield.dailyLimitWei)} AVAX. Đã dùng: {avax(data.shield.dailySpentWei)} AVAX. Đặt lại lúc {new Date(Number(data.shield.resetsAt) * 1000).toLocaleString("vi-VN")}.</p>}
      {vault.ruleTemplate === "SHARED_GOAL" && <>
        <p>Mục tiêu: {avax(data.state.targetGoalAmount)} AVAX · {data.goal.reached ? "Đã đạt" : "Chưa đạt"}. Hạn: {data.state.targetDeadline === "0" ? "Không đặt" : new Date(Number(data.state.targetDeadline) * 1000).toLocaleString("vi-VN")}.</p>
        <p>Mỗi lần quyết toán đều kiểm lại số dư so với mục tiêu hoặc thời hạn. Chi một phần trước hạn có thể làm yêu cầu tiếp theo phải chờ nạp thêm.</p>
      </>}
      {["SHIELD", "SHARED_GOAL"].includes(vault.ruleTemplate) && <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void act(async () => (await family.requestVaultWithdrawal(vault.onchainVaultId, amount, reason)).success); }}>
        <label className="block">Số AVAX yêu cầu<input className="block w-full border rounded-xl p-3" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
        <label className="block">Mục đích<input className="block w-full border rounded-xl p-3" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={500} /></label>
        <button className="min-h-12 rounded-xl border px-4 disabled:opacity-40" disabled={busy || !connected || !data.capabilities.requestLargeWithdrawal.allowed}>Tạo yêu cầu cần {data.state.requiredApprovals} chữ ký</button>
        {!data.capabilities.requestLargeWithdrawal.allowed && <p>{data.capabilities.requestLargeWithdrawal.reason}</p>}
      </form>}
      {data.requests.map((request: any) => <div key={request.id} className="border rounded-xl p-3 space-y-2">
        <p>{avax(request.amountWei)} AVAX · {request.approvals}/{request.required} chữ ký · {request.executed ? "Đã chi" : request.stale ? "Hết hiệu lực do đổi ví" : request.expired ? "Hết hạn" : "Chờ duyệt"}</p>
        <p className="break-all">Ví nhận: {request.recipient}</p>
        {request.canApprove && <button disabled={busy || !connected} className="min-h-12 border rounded-xl px-4" onClick={() => void act(() => family.approveWithdrawal(request.id))}>Ký duyệt yêu cầu</button>}
        {request.signed && <p>Bạn đã ký yêu cầu này.</p>}
      </div>)}
      {data.tasks.map((task: any) => <div key={task.id} className="border rounded-xl p-3 space-y-2">
        <p>{task.title} · {avax(task.rewardWei)} AVAX · {task.approvals}/{task.required} chữ ký ở epoch {data.epoch}</p>
        <p>{task.rewarded ? "Đã trả thưởng" : task.cancelled ? "Đã hủy và giải phóng khoản giữ" : task.completed ? "Chờ duyệt" : "Chờ hoàn thành"}{task.signed ? " · Bạn đã ký" : ""}</p>
        {task.canApprove && <button disabled={busy || !connected} className="min-h-12 border rounded-xl px-4" onClick={() => void act(() => family.verifyAndRewardChore(task.id))}>Ký duyệt thưởng</button>}
        {task.canCancel && <button disabled={busy || !connected} className="min-h-12 border rounded-xl px-4 ml-2" onClick={() => void act(() => family.cancelChore(task.id))}>Hủy nhiệm vụ</button>}
      </div>)}
      {vault.ruleTemplate === "ROSCA" && <>
        <p>Kỳ đã chi: {data.state.roscaCurrentRound}/{data.state.beneficiaries.length} · Góp mỗi kỳ: {avax(data.state.roscaRoundContribution)} AVAX.</p>
        <p className="break-all">{data.rosca.ended ? "Đã kết thúc chu kỳ" : `Ví nhận kỳ này: ${data.rosca.recipient}`}</p>
        {!data.rosca.ended && <p>Thời điểm có thể chi: {new Date(Number(data.rosca.nextPayoutAt) * 1000).toLocaleString("vi-VN")}. Cần tất cả thành viên đóng đủ.</p>}
        <ul>{data.rosca.contributions.map((item: any) => <li key={item.address} className="break-all">{item.address}: {item.contributed ? "Đã góp" : "Chưa góp"}</li>)}</ul>
        <button className="min-h-12 border rounded-xl px-4 disabled:opacity-40" disabled={busy || !connected || data.rosca.ended || !data.capabilities.contributeRoscaRound.allowed || data.rosca.contributions.some((item: any) => item.address.toLowerCase() === auth.linkedWallet?.address?.toLowerCase() && item.contributed)} onClick={() => void act(async () => (await family.depositToVault(vault.onchainVaultId, avax(data.state.roscaRoundContribution))).success)}>Góp đúng khoản của kỳ</button>
        <button className="min-h-12 border rounded-xl px-4 ml-2 disabled:opacity-40" disabled={busy || !connected || data.rosca.ended || !data.capabilities.payoutRoscaRound.allowed || data.rosca.contributions.some((item: any) => !item.contributed) || Date.now() < Number(data.rosca.nextPayoutAt) * 1000} onClick={() => void act(() => family.payoutRoscaRound(vault.onchainVaultId, vault.id))}>Giải ngân kỳ</button>
      </>}
    </>}
    {feedback && <p role="status">{feedback}</p>}
  </section>;
}
