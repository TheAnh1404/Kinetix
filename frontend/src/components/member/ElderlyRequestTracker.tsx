"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HeartHandshake,
  HelpCircle,
  PhoneCall,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { ElderlySpeakerButton } from "./ElderlySpeakerButton";
import { WithdrawalRequestItem } from "@/context/FamilyContext";
export type { WithdrawalRequestItem };
import {
  formatElderlyAvax,
  formatElderlyDate,
  getElderlyRequestStatusInfo,
} from "./elderlyUtils";

interface ElderlyRequestTrackerProps {
  /** Danh sách yêu cầu rút tiền của tài khoản */
  requests: WithdrawalRequestItem[];
  /** Đơn vị tiền tệ (mặc định AVAX) */
  asset?: string;
  /** Giới hạn số lượng hiển thị (dùng cho trang chủ) */
  limit?: number;
  /** Tiêu đề phần (mặc định: "Theo dõi yêu cầu trợ cấp") */
  title?: string;
  /** Hiển thị link "Xem tất cả" */
  showViewAllLink?: boolean;
}

/**
 * Trình theo dõi yêu cầu trợ cấp bằng ngôn ngữ gia đình bình dân dành cho Người cao tuổi.
 * Đặc điểm nổi bật:
 * - KHÔNG hiển thị các chuỗi băm hex dài (0xabc...) gây bối rối.
 * - Trạng thái trực quan: "Chờ con cháu duyệt", "Đã nhận về ví", "Cần thêm người duyệt".
 * - Thanh tiến độ 3 bước rõ ràng (Đã gửi -> Con cháu duyệt -> Đã nhận về ví).
 * - Tích hợp nút nghe đọc trạng thái riêng cho từng thẻ yêu cầu.
 * - Nút "Gọi con cháu duyệt ngay" khi cần trợ cấp gấp.
 */
export function ElderlyRequestTracker({
  requests,
  asset = "AVAX",
  limit,
  title = "Yêu cầu trợ cấp gần đây",
  showViewAllLink = false,
}: ElderlyRequestTrackerProps) {
  const displayedRequests = limit ? requests.slice(0, limit) : requests;

  // Đoạn văn bản cho nút đọc tổng quan
  const overviewSpeech = requests.length
    ? `Ông bà đang có ${requests.length} yêu cầu rút tiền trợ cấp. Yêu cầu mới nhất là ${
        requests[0].reason || "Sinh hoạt"
      }, số tiền ${formatElderlyAvax(requests[0].exactAmount)} AVAX. ${
        requests[0].status === "EXECUTED"
          ? "Đã nhận thành công về ví."
          : `Đang chờ con cháu duyệt, hiện có ${requests[0].approvalsCount} trên ${requests[0].requiredApprovals} người đã đồng ý.`
      }`
    : "Hiện tại ông bà chưa có yêu cầu rút tiền nào cần duyệt.";

  return (
    <section
      className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-5 md:p-7 shadow-md transition-all"
      aria-labelledby="request-tracker-title"
    >
      {/* Header và Nút nghe đọc tổng quan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 border-2 border-amber-600 dark:border-amber-400 flex items-center justify-center text-amber-900 dark:text-amber-200 flex-shrink-0">
            <FileText className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
              Minh bạch · Cùng gia đình
            </span>
            <h2
              id="request-tracker-title"
              className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50 mt-1"
            >
              {title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <ElderlySpeakerButton
            textToSpeak={overviewSpeech}
            label="Nghe danh sách"
          />
          {showViewAllLink && requests.length > (limit || 0) && (
            <Link
              href="/dashboard/elderly/requests"
              className="min-h-[56px] px-4 rounded-2xl border-2 border-slate-400 dark:border-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-lg flex items-center gap-2 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              <span>Xem tất cả ({requests.length})</span>
              <ArrowRight className="w-6 h-6" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {/* Trạng thái trống */}
      {displayedRequests.length === 0 ? (
        <div className="py-12 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <HeartHandshake className="w-10 h-10" aria-hidden="true" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Chưa có yêu cầu rút tiền nào
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Khi ông bà gửi yêu cầu rút khoản tiền lớn, trạng thái duyệt của con cháu sẽ hiển thị rõ ràng tại đây.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {displayedRequests.map((req) => {
            const statusInfo = getElderlyRequestStatusInfo(
              req.status,
              req.approvalsCount,
              req.requiredApprovals
            );
            const amountFormatted = formatElderlyAvax(req.exactAmount);
            const dateFormatted = formatElderlyDate(req.createdAt);

            // Đoạn giọng nói riêng cho từng yêu cầu
            const cardSpeech = `Yêu cầu rút ${amountFormatted} AVAX từ hũ ${
              req.vaultName || "An sinh"
            }. Mục đích: ${req.reason || "Sinh hoạt"}. Gửi lúc ${dateFormatted}. Tình trạng: ${
              statusInfo.title
            }. ${statusInfo.subTitle}.`;

            return (
              <article
                key={req.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all shadow-sm space-y-4"
              >
                {/* Dòng trạng thái & Nút nghe đọc riêng */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-base sm:text-lg font-black tracking-wide ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.isExecuted && (
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    )}
                    {statusInfo.isPending && (
                      <Clock className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    )}
                    <span>{statusInfo.title}</span>
                  </span>

                  <ElderlySpeakerButton
                    textToSpeak={cardSpeech}
                    label="Nghe yêu cầu này"
                    className="h-12 min-h-[48px] py-1.5 text-base"
                  />
                </div>

                {/* Số tiền & Mục đích rút tiền */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-slate-50">
                      {amountFormatted} <span className="text-2xl font-bold">{asset}</span>
                    </h3>
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mt-1">
                      Mục đích: <strong className="text-emerald-800 dark:text-emerald-300">{req.reason || "Sinh hoạt hàng ngày"}</strong> · Hũ {req.vaultName || "An sinh"}
                    </p>
                  </div>
                  <time className="text-base font-semibold text-slate-600 dark:text-slate-400">
                    {dateFormatted}
                  </time>
                </div>

                {/* Thanh tiến độ 3 bước trực quan */}
                <div className="pt-2">
                  <div className="relative">
                    {/* Đường kẻ nối */}
                    <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1.5 bg-slate-200 dark:bg-slate-700 -z-0 rounded-full" />
                    <div
                      className={`absolute top-1/2 left-6 -translate-y-1/2 h-1.5 bg-emerald-600 dark:bg-emerald-400 -z-0 rounded-full transition-all duration-300 ${
                        statusInfo.stepIndex === 0
                          ? "w-1/4"
                          : statusInfo.stepIndex === 1
                          ? "w-1/2"
                          : "right-6"
                      }`}
                    />

                    {/* 3 mốc bước */}
                    <div className="relative z-10 flex items-center justify-between">
                      {/* Bước 1 */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-base border-2 border-white dark:border-slate-900 shadow">
                          <Check className="w-5 h-5 text-white" aria-hidden="true" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 text-center">
                          Đã gửi
                        </span>
                      </div>

                      {/* Bước 2 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border-2 border-white dark:border-slate-900 shadow ${
                            statusInfo.isExecuted
                              ? "bg-emerald-700 text-white"
                              : "bg-amber-500 text-white animate-pulse"
                          }`}
                        >
                          {statusInfo.isExecuted ? (
                            <Check className="w-5 h-5 text-white" aria-hidden="true" />
                          ) : (
                            `${req.approvalsCount}/${req.requiredApprovals}`
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 text-center">
                          Con cháu duyệt
                        </span>
                      </div>

                      {/* Bước 3 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border-2 border-white dark:border-slate-900 shadow ${
                            statusInfo.isExecuted
                              ? "bg-emerald-700 text-white"
                              : "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {statusInfo.isExecuted ? (
                            <Check className="w-5 h-5 text-white" aria-hidden="true" />
                          ) : (
                            "3"
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 text-center">
                          Đã nhận về ví
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lời giải thích và nút liên hệ nếu đang chờ duyệt */}
                {statusInfo.isPending && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-base text-slate-700 dark:text-slate-300">
                      {statusInfo.subTitle}. Nếu cần chi gấp, ông bà hãy bấm gọi người thân để được hỗ trợ ký duyệt.
                    </p>
                    <Link
                      href="/dashboard/elderly/family"
                      className="min-h-[52px] px-5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-100 border-2 border-amber-600 dark:border-amber-400 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-amber-400"
                    >
                      <PhoneCall className="w-5 h-5" aria-hidden="true" />
                      <span>Nhờ con cháu duyệt</span>
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
