"use client";

import React, { useEffect, useState } from "react";
import { authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { amountLabel } from "@/lib/member";
import { EmptyState } from "./MemberPrimitives";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

export function ActivityList() {
  const { currentWorkspace } = useFamily();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<
    {
      id: string;
      kind: string;
      amount: string;
      asset: string;
      chainId: number;
      txHash: string;
      createdAt: string;
    }[]
  >([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!currentWorkspace) return;
    let stale = false;
    setLoading(true);
    setError("");
    void authRequest(
      `/api/member/activity?workspaceId=${currentWorkspace.id}&page=${page}`,
      undefined,
      "GET",
    )
      .then((result) => {
        if (!stale) {
          setData(result.data);
          setHasMore(result.hasMore);
        }
      })
      .catch((err) => {
        if (!stale) setError(err.message);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [currentWorkspace?.id, page, retry]);
  return (
    <section className="member-card activity-list">
      <h2>Lịch sử giao dịch cá nhân</h2>
      <p>
        Các giao dịch đã có receipt được server xác minh. Những giao dịch cũ
        chưa được đối soát có thể chưa xuất hiện.
      </p>
      {loading ? (
        <p role="status">Đang tải lịch sử…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            className="member-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử tải lại
          </button>
        </div>
      ) : !data.length ? (
        <EmptyState title="Chưa có giao dịch đã ghi nhận" />
      ) : (
        data.map((item) => (
          <article key={item.id} className="activity-row">
            <div>
              <h3>
                {(
                  {
                    DEPOSIT: "Nạp vào hũ",
                    WITHDRAW: "Đã rút về ví",
                    REWARD: "Đã nhận thưởng",
                    WITHDRAWAL: "Đã rút về ví",
                  } as Record<string, string>
                )[item.kind] || item.kind}
              </h3>
              <time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time>
              <details>
                <summary>Chi tiết giao dịch</summary>
                <p>Mạng {item.chainId} · Đã xác nhận on-chain</p>
                <p className="wallet-address">{item.txHash}</p>
                <a
                  href={`${SNOWTRACE_TESTNET_URL}/tx/${item.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 underline text-xs font-mono font-bold mt-1"
                >
                  <span>Xem trên Snowtrace: {item.txHash.slice(0, 10)}...{item.txHash.slice(-8)}</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </details>
            </div>
            <strong>
              {amountLabel(item.amount)} {item.asset}
            </strong>
          </article>
        ))
      )}
      <div className="pagination">
        <button
          className="member-secondary"
          disabled={page === 0 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Trang trước
        </button>
        <span>Trang {page + 1}</span>
        <button
          className="member-secondary"
          disabled={!hasMore || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
