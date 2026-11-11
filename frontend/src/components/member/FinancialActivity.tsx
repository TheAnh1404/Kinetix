"use client";

import React, { useState } from "react";
import { ExternalLink, RefreshCw, ReceiptText } from "lucide-react";
import { useFinancialOperations } from "@/hooks/useFinancialOperations";
import { useAuth } from "@/hooks/useAuth";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";
import { Money } from "@/components/vaults/ExperiencePrimitives";
import { ActivityList } from "./MemberActivity";
import { AccountSignatureHistory } from "./AccountSignatureHistory";

const statuses: Record<string, string> = {
  BROADCAST: "Đã gửi · chờ mạng",
  CONFIRMED: "Đã vào block · chờ xác nhận cuối",
  SYNC_PENDING: "Đã xác nhận · chờ ghi sổ",
  COMPLETED: "Đã hoàn tất",
  REVERTED: "Giao dịch bị hoàn tác",
  NEEDS_REVIEW: "Cần kiểm tra tx thay thế",
};
const actions: Record<string, string> = {
  createCustomVault: "Tạo hũ",
  createAdvancedVault: "Tạo hũ nâng cao",
  depositToVault: "Nạp tiền",
  fastWithdraw: "Nhận tiền nhanh",
  requestLargeWithdrawal: "Yêu cầu nhận tiền",
  approveWithdrawal: "Ký duyệt nhận tiền",
  executeWithdrawalWithSignatures: "Chi bằng chữ ký đã thu thập",
  createChore: "Giao việc",
  claimChoreCompleted: "Nộp việc",
  verifyAndRewardChore: "Duyệt thưởng",
  cancelChore: "Hủy việc",
  contributeRoscaRound: "Góp vốn",
  payoutRoscaRound: "Chi quỹ góp vốn",
  recoverMemberWallet: "Khôi phục ví",
};

export function FinancialActivity({
  showConfirmedHistory = true,
}: {
  showConfirmedHistory?: boolean;
}) {
  const controller = useFinancialOperations();
  const auth = useAuth();
  const [filter, setFilter] = useState("ALL");
  const [hash, setHash] = useState("");
  const visible = controller.operations.filter(
    (item) =>
      filter === "ALL" ||
      (filter === "OPEN"
        ? !["COMPLETED", "REVERTED"].includes(item.status)
        : item.status === filter),
  );
  return (
    <div className="vx-content">
      <section className="vx-card" aria-labelledby="operations-title">
        <div className="vx-section-heading">
          <div>
            <h2 id="operations-title">
              <ReceiptText size={22} aria-hidden /> Giao dịch & đồng bộ
            </h2>
            <p className="vx-muted">
              Các giao dịch smart contract do ví của bạn gửi trong gia đình đang
              chọn.
            </p>
          </div>
          <button
            type="button"
            className="vx-button-secondary"
            disabled={controller.busy || controller.loading}
            onClick={() => void controller.reconcile()}
          >
            <RefreshCw size={18} aria-hidden />
            Kiểm tra & đồng bộ
          </button>
        </div>
        {controller.error && (
          <div className="vx-alert" role="alert">
            <p>{controller.error}</p>
            <button
              type="button"
              className="vx-text-link"
              disabled={controller.busy}
              onClick={() => void controller.load()}
            >
              Tải lại danh sách
            </button>
          </div>
        )}
        {controller.message && (
          <p className="vx-notice" role="status">
            {controller.message}
          </p>
        )}
        <label>
          Lọc giao dịch
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="ALL">Tất cả</option>
            <option value="OPEN">Đang xử lý</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="REVERTED">Bị hoàn tác</option>
            <option value="NEEDS_REVIEW">Cần kiểm tra</option>
          </select>
        </label>
        {controller.loading ? (
          <p role="status">Đang tải giao dịch…</p>
        ) : !visible.length ? (
          <p className="vx-muted">Chưa có giao dịch trong mục này.</p>
        ) : (
          <div className="vx-content">
            {visible.map((operation) => (
              <article className="vx-transaction" key={operation.id}>
                <div className="vx-heading">
                  <h3>
                    {actions[operation.functionName] || operation.functionName}
                  </h3>
                  <span className="vx-status">
                    {statuses[operation.status] || operation.status}
                  </span>
                </div>
                {operation.amountWei !== null && (
                  <Money wei={operation.amountWei} />
                )}
                <p className="vx-muted">
                  {new Date(operation.submittedAt).toLocaleString("vi-VN")} ·
                  Mạng {operation.chainId}
                </p>
                <a
                  className="vx-text-link vx-address"
                  href={`${SNOWTRACE_TESTNET_URL}/tx/${operation.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {operation.hash.slice(0, 10)}…{operation.hash.slice(-8)}
                  <ExternalLink size={16} aria-hidden />
                </a>
                {operation.status === "NEEDS_REVIEW" && (
                  <p className="vx-funding-warning">
                    Nonce đã được sử dụng nhưng chưa tìm thấy receipt. Mở Core
                    để lấy hash giao dịch thay thế rồi đối soát bên dưới.
                  </p>
                )}
                {operation.lastErrorCode && (
                  <details>
                    <summary>Chi tiết hỗ trợ</summary>
                    <p className="vx-address">{operation.lastErrorCode}</p>
                  </details>
                )}
                {!["COMPLETED", "REVERTED"].includes(operation.status) && (
                  <button
                    type="button"
                    className="vx-button-secondary"
                    disabled={controller.busy}
                    onClick={() => void controller.reconcile(operation.id)}
                  >
                    Kiểm tra giao dịch này
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
        <details className="vx-setup">
          <summary>Đã gửi trong Core nhưng chưa thấy giao dịch?</summary>
          <form
            className="vx-form"
            onSubmit={(event) => {
              event.preventDefault();
              void controller.record(hash);
            }}
          >
            <p className="vx-muted">
              Dán tx hash giao dịch gửi tới FamilyHub từ ví đã liên kết. Máy chủ
              sẽ kiểm tra người gửi, hợp đồng và gia đình. Tiếp tục giao dịch
              tạo hũ từ bản nháp nếu cần bổ sung cấu hình.
            </p>
            <label>
              Tx hash
              <input
                value={hash}
                onChange={(event) => setHash(event.target.value)}
                required
                pattern="0x[0-9a-fA-F]{64}"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                disabled={controller.busy}
              />
            </label>
            <button
              className="vx-button"
              disabled={controller.busy || !auth.linkedWallet}
            >
              {controller.busy ? "Đang kiểm tra…" : "Đối soát tx hash"}
            </button>
          </form>
        </details>
      </section>
      {showConfirmedHistory && <ActivityList />}
      <AccountSignatureHistory />
    </div>
  );
}
