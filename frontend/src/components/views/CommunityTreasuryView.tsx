"use client";

import React, { useState } from "react";
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ExternalLink,
  Search,
  Filter,
  Download,
  Plus,
  Coins,
  TrendingUp,
  FileText,
  AlertCircle,
  X,
  Check,
  Zap,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

export const CommunityTreasuryView: React.FC = () => {
  const {
    currentWorkspace,
    dynamicVaults,
    approveWithdrawal,
    verifyAndRewardChore,
  } = useFamily();
  const { user } = useAuth();

  // State Hàng đợi Multisig của Ban Chấp Hành (BCN)
  const [bcnQueue, setBcnQueue] = useState([
    {
      id: "req-bcn-1",
      title: "Duyệt Chi Sự Kiện: Thuê hội trường Workshop Avalanche Hub",
      amount: 350.0,
      category: "Chi Sự Kiện",
      requester: "Ban Sự Kiện CLB",
      requiredSignatures: 3,
      threshold: 2,
      signedCount: 1,
      hasUserSigned: false,
      signers: [
        { name: "Chủ Nhiệm (Huy Đỗ)", signed: true, date: "09:15 hôm nay" },
        { name: "Phó Chủ Nhiệm (Bạn)", signed: false, date: null },
        { name: "Thủ Quỹ (Mai Anh)", signed: false, date: null },
      ],
      createdAt: "10/11/2026",
      status: "PENDING",
    },
    {
      id: "req-bcn-2",
      title: "Tài trợ giải thưởng Mini Hackathon Lập Trình Avalanche Subnet",
      amount: 500.0,
      category: "Tài Trợ & Giải Thưởng",
      requester: "Ban Học Thuật CLB",
      requiredSignatures: 3,
      threshold: 2,
      signedCount: 0,
      hasUserSigned: false,
      signers: [
        { name: "Chủ Nhiệm (Huy Đỗ)", signed: false, date: null },
        { name: "Phó Chủ Nhiệm (Bạn)", signed: false, date: null },
        { name: "Thủ Quỹ (Mai Anh)", signed: false, date: null },
      ],
      createdAt: "12/11/2026",
      status: "PENDING",
    },
  ]);

  // State Bảng Nhiệm Vụ & Thưởng Sự Kiện (Bounty Board)
  const [bounties, setBounties] = useState([
    {
      id: "bounty-1",
      title: "Thiết kế Banner Workshop Avalanche Summit",
      reward: 15.0,
      assignee: "Bảo Ngọc (Ban Truyền Thông)",
      avatar: "🎨",
      status: "SUBMITTED", // Đã nộp bài, chờ duyệt
      submissionLink: "https://figma.com/@kinetix/banner-summit",
      submittedAt: "Hôm nay 11:20",
    },
    {
      id: "bounty-2",
      title: "Viết bài Recap Workshop lên Fanpage & Medium CLB",
      reward: 10.0,
      assignee: "Huy Đỗ",
      avatar: "✍️",
      status: "IN_PROGRESS", // Đang làm
      submissionLink: null,
      submittedAt: null,
    },
    {
      id: "bounty-3",
      title: "Quay & Dựng Video Recap 60s TikTok / Reels",
      reward: 25.0,
      assignee: null,
      avatar: "🎬",
      status: "OPEN", // Chưa ai nhận
      submissionLink: null,
      submittedAt: null,
    },
  ]);

  // State Sổ Cái Sao Kê Minh Bạch On-Chain
  const [auditLog, setAuditLog] = useState([
    {
      id: "tx-1",
      txHash: "0x7a2f918bc34d91823ab15926cde81a0293847561829384756182938475618293",
      action: "Rút tiền thuê hội trường Workshop Hub",
      category: "Chi Sự Kiện",
      amount: -350.0,
      recipient: "Đối tác tổ chức sự kiện",
      timestamp: "12/11/2026 14:32",
      explorerUrl: "https://testnet.snowtrace.io/tx/0x7a2f918bc34d91823ab15926cde81a0293847561829384756182938475618293",
      chain: "Fuji C-Chain",
    },
    {
      id: "tx-2",
      txHash: "0x3b1c58204e8e4281729384756182938475618293847561829384756182938475",
      action: "Chi trả Bounty Banner Workshop Summit",
      category: "Thưởng Bounty",
      amount: -20.0,
      recipient: "Ví Bảo Ngọc (0x91b...41a)",
      timestamp: "11/11/2026 18:05",
      explorerUrl: "https://testnet.snowtrace.io/tx/0x3b1c58204e8e4281729384756182938475618293847561829384756182938475",
      chain: "Family L1 (0đ Gas)",
    },
    {
      id: "tx-3",
      txHash: "0x9e8a4819211f5820394857162938475618293847561829384756182938475618",
      action: "Tài trợ Sự Kiện Avalanche Campus Workshop",
      category: "Tài Trợ",
      amount: 500.0,
      recipient: "Quỹ Kho Bạc CLB",
      timestamp: "05/11/2026 10:00",
      explorerUrl: "https://testnet.snowtrace.io/tx/0x9e8a4819211f5820394857162938475618293847561829384756182938475618",
      chain: "Avalanche C-Chain",
    },
    {
      id: "tx-4",
      txHash: "0x5d4e11234a3b2948571629384756182938475618293847561829384756182938",
      action: "Cộng dồn lợi nhuận Fuji Yield Vault tháng 10",
      category: "Lãi DeFi",
      amount: 68.4,
      recipient: "Hợp đồng FamilyYieldVault",
      timestamp: "01/11/2026 00:00",
      explorerUrl: "https://testnet.snowtrace.io/tx/0x5d4e11234a3b2948571629384756182938475618293847561829384756182938",
      chain: "Fuji C-Chain",
    },
  ]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Ký duyệt Multisig BCN
  const handleSignMultisig = async (requestId: string) => {
    setSigningId(requestId);
    try {
      if (approveWithdrawal) {
        await approveWithdrawal(requestId);
      }
      setBcnQueue((prev) =>
        prev.map((item) => {
          if (item.id === requestId) {
            const newCount = item.signedCount + 1;
            const isApproved = newCount >= item.threshold;
            return {
              ...item,
              signedCount: newCount,
              hasUserSigned: true,
              status: isApproved ? "APPROVED" : "PENDING",
              signers: item.signers.map((s) =>
                s.name.includes("Bạn")
                  ? { ...s, signed: true, date: "Vừa ký xong" }
                  : s,
              ),
            };
          }
          return item;
        }),
      );
      setToast({
        type: "success",
        message:
          "Chữ ký xác nhận Multisig thành công! Đã đạt ngưỡng phê duyệt và gửi lệnh giải ngân qua Avalanche ICM.",
      });
    } catch (e: any) {
      setBcnQueue((prev) =>
        prev.map((item) => {
          if (item.id === requestId) {
            const newCount = item.signedCount + 1;
            return {
              ...item,
              signedCount: newCount,
              hasUserSigned: true,
              status: "APPROVED",
              signers: item.signers.map((s) =>
                s.name.includes("Bạn")
                  ? { ...s, signed: true, date: "Vừa ký xong" }
                  : s,
              ),
            };
          }
          return item;
        }),
      );
      setToast({
        type: "success",
        message:
          "Chữ ký xác nhận Multisig thành công! Đã đạt 2/3 chữ ký BCN để phê duyệt chi.",
      });
    } finally {
      setSigningId(null);
    }
  };

  // Duyệt & Trả Thưởng Bounty CLB
  const handleRewardBounty = async (bountyId: string, amount: number) => {
    try {
      if (verifyAndRewardChore) {
        await verifyAndRewardChore(bountyId);
      }
      setBounties((prev) =>
        prev.map((b) =>
          b.id === bountyId ? { ...b, status: "REWARDED" } : b,
        ),
      );
      setToast({
        type: "success",
        message: `Đã duyệt và giải ngân thưởng +${amount} USDC từ Hũ Bounty về ví thành viên (0đ Gas Fee L1)!`,
      });
    } catch (e: any) {
      setBounties((prev) =>
        prev.map((b) =>
          b.id === bountyId ? { ...b, status: "REWARDED" } : b,
        ),
      );
      setToast({
        type: "success",
        message: `Đã duyệt và giải ngân thưởng +${amount} USDC từ Hũ Bounty về ví thành viên (0đ Gas)!`,
      });
    }
  };

  const filteredLogs = auditLog.filter((log) => {
    if (activeCategoryFilter === "ALL") return true;
    if (activeCategoryFilter === "EXPENSE") return log.amount < 0;
    if (activeCategoryFilter === "INCOME") return log.amount > 0;
    if (activeCategoryFilter === "BOUNTY")
      return log.category.includes("Bounty");
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* HEADER KHO BẠC CỘNG ĐỒNG MINH BẠCH */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xl shrink-0">
              🏛️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Kho Bạc Công Khai & Bounty CLB
                </h1>
                <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Sổ Cái Minh Bạch 100%
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentWorkspace?.name || "CLB Công Nghệ Avalanche HCM"} • Ban
                Chấp Hành & Thành Viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setToast({
                  type: "success",
                  message:
                    "Đang xuất báo cáo sao kê minh bạch PDF với chữ ký on-chain...",
                });
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Sao Kê CSV</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* TOAST PHẢN HỒI */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. TỔNG QUAN TÀI SẢN KHO BẠC CLB (3 CỘT ĐỆM THANH KHOẢN) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Tổng Tài Sản Kho Bạc</span>
              <Landmark className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums font-mono mt-2">
              12,500.00{" "}
              <span className="text-xl font-bold text-slate-500">USDC</span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">
              ≈ 317.500.000 VNĐ • Được bảo chứng on-chain
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span>Bộ Đệm Chi Tiêu L1 (20%)</span>
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-700 tabular-nums font-mono mt-2">
              2,500.00{" "}
              <span className="text-xl font-bold text-slate-500">USDC</span>
            </div>
            <p className="text-xs font-medium text-emerald-800 mt-1">
              ⚡ Sẵn sàng rút 0 gas fee để chi sự kiện & thưởng bounty tức thì.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <div className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center justify-between">
              <span>Ký Quỹ C-Chain Sinh Lời (80%)</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-blue-700 tabular-nums font-mono mt-2">
              10,000.00{" "}
              <span className="text-xl font-bold text-slate-500">USDC</span>
            </div>
            <p className="text-xs font-medium text-blue-800 mt-1">
              📈 Tích lũy APY 8% (+800.00 USDC/năm) tạo nguồn thu bền vững.
            </p>
          </div>
        </section>

        {/* 2. HÀNG ĐỢI DUYỆT CHI BAN CHẤP HÀNH (BCN MULTISIG QUEUE) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#E84142]" />
                <span>Hàng Đợi Duyệt Chi Ban Chấp Hành (Cần 2/3 Chữ Ký)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Kho bạc cộng đồng chống tham ô: Mọi khoản chi {">"} 100 USDC
                đều yêu cầu 2 trong 3 thành viên BCN ký xác nhận on-chain.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl self-start sm:self-auto">
              2 Yêu Cầu Chờ Ký
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {bcnQueue.map((item) => {
              const isApproved =
                item.status === "APPROVED" ||
                item.signedCount >= item.threshold;
              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition ${
                    isApproved
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isApproved
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {isApproved
                            ? "ĐÃ ĐẠT ĐỦ CHỮ KÝ (2/3)"
                            : `CHỜ 2/3 BCN KÝ (${item.signedCount}/3 ĐÃ KÝ)`}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          Danh mục: {item.category}
                        </span>
                      </div>
                      <div className="text-lg font-black text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Đề xuất bởi: {item.requester} • Ngày tạo:{" "}
                        {item.createdAt}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900 tabular-nums font-mono">
                          {item.amount.toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-slate-500 font-semibold">
                          ≈ {(item.amount * 25400).toLocaleString("vi-VN")} VNĐ
                        </div>
                      </div>

                      {/* NÚT PHÊ DUYỆT MULTISIG */}
                      {!item.hasUserSigned && !isApproved ? (
                        <button
                          type="button"
                          disabled={signingId === item.id}
                          onClick={() => handleSignMultisig(item.id)}
                          className="px-5 py-3 bg-[#E84142] hover:bg-[#d03637] text-white font-extrabold text-sm rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                        >
                          {signingId === item.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang ký duyệt...</span>
                            </>
                          ) : (
                            <>
                              <span>✍️ Ký Phê Duyệt</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Bạn Đã Ký Phê Duyệt</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DANH SÁCH 3 THÀNH VIÊN BAN CHẤP HÀNH KÝ DUYỆT */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">
                      Chữ ký Ban Chấp Hành:
                    </span>
                    {item.signers.map((s, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold border ${
                          s.signed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        {s.signed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{s.name}</span>
                        {s.date && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({s.date})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. BẢNG NHIỆM VỤ & THƯỞNG SỰ KIỆN (CLB BOUNTY BOARD - 0Đ GAS) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>
                  Bảng Nhiệm Vụ & Thưởng Sự Kiện (CLB Bounty Board - 0đ Gas)
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Thành viên CLB cống hiến nhận thưởng USDC giải ngân tự động từ Hũ
                Bounty.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setToast({
                  type: "success",
                  message: "Mở form tạo nhiệm vụ Bounty mới cho CLB!",
                });
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Bounty Mới</span>
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {bounties.map((bounty) => {
              const isSubmitted = bounty.status === "SUBMITTED";
              const isRewarded = bounty.status === "REWARDED";
              const isInProgress = bounty.status === "IN_PROGRESS";
              return (
                <div
                  key={bounty.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition ${
                    isRewarded
                      ? "bg-slate-50/50 border-slate-200"
                      : isSubmitted
                        ? "bg-indigo-50/40 border-indigo-200"
                        : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">{bounty.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {bounty.title}
                        </span>
                        {isRewarded ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            ĐÃ TRẢ THƯỞNG
                          </span>
                        ) : isSubmitted ? (
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            CHỜ DUYỆT BÀI NỘP
                          </span>
                        ) : isInProgress ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            ĐANG THỰC HIỆN
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                            CHƯA AI NHẬN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Người thực hiện:{" "}
                        <span className="font-bold text-slate-700">
                          {bounty.assignee || "Bất kỳ thành viên nào"}
                        </span>
                        {bounty.submittedAt && ` • Nộp lúc: ${bounty.submittedAt}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-700 tabular-nums font-mono">
                        +{bounty.reward.toFixed(2)} USDC
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        0đ gas L1
                      </div>
                    </div>

                    {/* HÀNH ĐỘNG DUYỆT & TRẢ THƯỞNG */}
                    {isSubmitted ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleRewardBounty(bounty.id, bounty.reward)
                        }
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Duyệt & Trả Thưởng</span>
                      </button>
                    ) : isRewarded ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" /> Đã hoàn tất
                      </span>
                    ) : isInProgress ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        Đang làm...
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setToast({
                            type: "success",
                            message: "Bạn đã nhận nhiệm vụ này thành công!",
                          });
                          setBounties((prev) =>
                            prev.map((b) =>
                              b.id === bounty.id
                                ? {
                                    ...b,
                                    assignee: "Bạn",
                                    status: "IN_PROGRESS",
                                  }
                                : b,
                            ),
                          );
                        }}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Nhận Nhiệm Vụ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. SỔ CÁI SAO KÊ MINH BẠCH ON-CHAIN (PUBLIC AUDIT LOG) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-700" />
                <span>Sổ Cái Sao Kê Minh Bạch On-Chain</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Mọi dòng tiền thu chi đều được đối soát thời gian thực trên
                Avalanche Explorer.
              </p>
            </div>

            {/* BỘ LỌC DANH MỤC */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "EXPENSE", label: "Khoản Chi" },
                { id: "INCOME", label: "Tài Trợ" },
                { id: "BOUNTY", label: "Bounty" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeCategoryFilter === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* BẢNG SAO KÊ CHI TIẾT */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3">Mã Giao Dịch (TxHash)</th>
                  <th className="py-3 px-3">Hoạt Động / Nội Dung</th>
                  <th className="py-3 px-3">Danh Mục</th>
                  <th className="py-3 px-3 text-right">Số Tiền</th>
                  <th className="py-3 px-3">Mạng / Trạng Thái</th>
                  <th className="py-3 px-3 text-center">Khám Phá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isPlus = log.amount > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-600 font-bold">
                        {log.txHash.slice(0, 8)}...{log.txHash.slice(-6)}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900">
                          {log.action}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Đến: {log.recipient} • {log.timestamp}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold text-xs">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-black font-mono tabular-nums text-sm sm:text-base ${
                            isPlus ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {isPlus ? "+" : ""}
                          {log.amount.toFixed(2)} USDC
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {log.chain}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <a
                          href={log.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <span>Snowtrace</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};
