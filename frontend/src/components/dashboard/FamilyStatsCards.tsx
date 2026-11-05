"use client";
import React from "react";
import { formatEther, parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { hubChain, CONTRACT_ADDRESSES, DEPLOYMENT } from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";

export const FamilyStatsCards: React.FC = () => {
  const { dynamicVaults, currentWorkspace } = useFamily();
  const reconciled = dynamicVaults.filter(
    (vault) =>
      DEPLOYMENT.enabled &&
      !vaultMappingIssue(vault, hubChain.id, CONTRACT_ADDRESSES.familyHub),
  );
  const total = reconciled.reduce(
    (sum, vault) => sum + parseEther(vault.exactTotalBalance || "0"),
    0n,
  );
  const local = reconciled.reduce(
    (sum, vault) => sum + parseEther(vault.exactL1Buffer || "0"),
    0n,
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        {
          title: "Tổng số dư đã đối soát",
          value: reconciled.length
            ? `${formatEther(total)} AVAX`
            : "Chưa có dữ liệu",
          note: `${reconciled.length} hũ có mapping receipt`,
        },
        {
          title: "Tài sản tại Fuji",
          value: reconciled.length
            ? `${formatEther(local)} AVAX`
            : "Chưa có dữ liệu",
          note: "Số dư đã đồng bộ từ contract",
        },
        {
          title: "Liên chuỗi và lợi suất",
          value: "Chưa bật",
          note: "T1 chưa triển khai bridge hoặc strategy lợi suất",
        },
      ].map((card) => (
        <div
          key={card.title}
          className="p-5 bg-white rounded-2xl border border-slate-200"
        >
          <h3 className="text-sm text-slate-600">{card.title}</h3>
          <p className="font-bold text-2xl my-3 break-all">{card.value}</p>
          <p className="text-xs text-slate-500">{card.note}</p>
        </div>
      ))}
    </div>
  );
};
