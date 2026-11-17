"use client";
import React, { useState } from "react";
import { authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
export function GroupReportExport() {
  const { currentWorkspace } = useFamily();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <details className="bg-white border border-slate-300 rounded-xl p-3 mb-4">
      <summary className="min-h-[44px] cursor-pointer">
        Xuất báo cáo thu chi
      </summary>
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const end = new Date(`${to}T00:00:00`);
            end.setDate(end.getDate() + 1);
            const query = new URLSearchParams({
              from: new Date(`${from}T00:00:00`).toISOString(),
              to: end.toISOString(),
            });
            const response = await authRequest(
              `/api/groups/${currentWorkspace?.id}/report?${query}`,
              undefined,
              "GET",
            );
            const url = URL.createObjectURL(
              new Blob([response.data.csv], { type: "text/csv;charset=utf-8" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `kinetix-${from}-${to}.csv`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage(
              `Đã xuất ${response.data.count} khoản thu/chi đã xác nhận.`,
            );
          } catch (err) {
            setMessage((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Từ ngày
          <input
            className="block w-full p-2 rounded-lg border border-slate-400"
            type="date"
            required
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Đến hết ngày
          <input
            className="block w-full p-2 rounded-lg border border-slate-400"
            type="date"
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <p className="text-sm">
          Xuất khoản góp và thanh toán đã đối soát của nhóm, gồm số wei chính
          xác và mã giao dịch. Khoản chờ duyệt hoặc chờ đối soát chưa tính là
          tiền đã thu/chi.
        </p>
        <button
          className="p-3 rounded-lg bg-slate-900 text-white"
          disabled={busy}
        >
          {busy ? "Đang xuất…" : "Tải báo cáo CSV"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
