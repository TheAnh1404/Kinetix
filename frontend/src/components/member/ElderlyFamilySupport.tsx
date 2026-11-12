"use client";

import React, { useEffect, useState } from "react";
import {
  HeartHandshake,
  Info,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { authRequest } from "@/hooks/useAuth";
import { ElderlySpeakerButton } from "./ElderlySpeakerButton";

export interface GuardianContact {
  id: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

interface ElderlyFamilySupportProps {
  /** Mã định danh Workspace gia đình */
  workspaceId?: string;
  /** Tiêu đề (mặc định: "Người thân luôn bên bạn") */
  title?: string;
  /** Chế độ xem thu gọn cho trang chủ */
  compact?: boolean;
}

/**
 * Thẻ hỗ trợ gia đình dành cho Người cao tuổi (Ông bà / Senior).
 * Tính năng chính:
 * - Hiển thị danh sách con cháu / người bảo hộ kèm ảnh đại diện tròn to rõ.
 * - Nút "Gọi ngay" 1 chạm trực tiếp (`tel:...`) đạt chuẩn >= 56px touch target.
 * - Tương phản màu sắc WCAG AAA, nhãn tiếng Việt rõ ràng, dễ đọc.
 * - Nút nghe đọc danh bạ bằng giọng nói tiếng Việt tự nhiên.
 */
export function ElderlyFamilySupport({
  workspaceId,
  title = "Người thân luôn bên bạn",
  compact = false,
}: ElderlyFamilySupportProps) {
  const [contacts, setContacts] = useState<GuardianContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Tải danh sách người bảo hộ từ backend API
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let isStale = false;
    setLoading(true);
    setError("");

    authRequest(
      `/api/member/guardians?workspaceId=${encodeURIComponent(workspaceId)}`,
      undefined,
      "GET"
    )
      .then((res) => {
        if (!isStale) {
          setContacts(res.data || []);
        }
      })
      .catch((err) => {
        if (!isStale) {
          setError(err.message || "Không thể tải danh sách người thân.");
        }
      })
      .finally(() => {
        if (!isStale) setLoading(false);
      });

    return () => {
      isStale = true;
    };
  }, [workspaceId, retryCount]);

  // Văn bản đọc âm thanh
  const speechText = contacts.length
    ? `Mục người thân hỗ trợ. Gia đình có ${contacts.length} người bảo hộ sẵn sàng trợ giúp ông bà: ${contacts
        .map(
          (c) =>
            `${c.fullName}, số điện thoại ${
              c.phoneNumber ? c.phoneNumber.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") : "chưa cập nhật"
            }`
        )
        .join(". ")}. Ông bà hãy bấm nút Gọi ngay màu xanh để gọi trực tiếp cho con cháu.`
    : "Danh sách người thân bảo hộ trong gia đình. Đang kiểm tra liên hệ.";

  return (
    <section
      className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-5 md:p-7 shadow-md transition-all"
      aria-labelledby="family-support-title"
    >
      {/* Tiêu đề & Nút nghe đọc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-500 dark:border-rose-400 flex items-center justify-center text-rose-900 dark:text-rose-200 flex-shrink-0">
            <HeartHandshake className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-rose-900 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-700">
              Điểm tựa yêu thương
            </span>
            <h2
              id="family-support-title"
              className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50 mt-1"
            >
              {title}
            </h2>
          </div>
        </div>

        <ElderlySpeakerButton
          textToSpeak={speechText}
          label="Nghe danh bạ"
          className="self-start sm:self-auto"
        />
      </div>

      <p className="text-lg text-slate-800 dark:text-slate-200 mt-4 font-medium">
        Khi cần rút tiền, cần duyệt yêu cầu hoặc muốn nhờ hướng dẫn, ông bà hãy bấm gọi ngay cho con cháu bên dưới.
      </p>

      {/* Trạng thái đang tải */}
      {loading ? (
        <div className="py-8 text-center text-slate-700 dark:text-slate-300 text-lg font-medium flex items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>Đang tìm số điện thoại của con cháu...</span>
        </div>
      ) : error ? (
        <div className="mt-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-3">
          <p className="text-lg font-bold flex items-center gap-2">
            <Info className="w-6 h-6 text-rose-600 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((v) => v + 1)}
            className="min-h-[56px] px-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-600 text-rose-900 dark:text-rose-200 font-bold text-lg active:scale-95 transition-all"
          >
            Tải lại danh bạ
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Chưa có người bảo hộ nào được thêm số điện thoại
          </p>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Hãy nhờ người quản trị gia đình cập nhật số điện thoại liên lạc để hiển thị nút gọi nhanh tại đây.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {contacts.map((contact) => {
            const cleanPhone = contact.phoneNumber?.replace(/[\s().-]/g, "") || "";
            const hasValidPhone = cleanPhone && /^\+?[0-9]{6,15}$/.test(cleanPhone);
            const initialLetter = contact.fullName.charAt(0).toUpperCase();

            return (
              <article
                key={contact.id}
                className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                {/* Thông tin đại diện & Họ tên */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-2xl border-4 border-white dark:border-slate-800 shadow-md flex-shrink-0">
                    {initialLetter}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-slate-50">
                      {contact.fullName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        Người bảo hộ gia đình
                      </span>
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {contact.phoneNumber || "Chưa có số điện thoại"}
                    </p>
                  </div>
                </div>

                {/* Nút bấm Gọi ngay (Touch target >= 56px) */}
                {hasValidPhone ? (
                  <a
                    href={`tel:${cleanPhone}`}
                    aria-label={`Gọi điện thoại cho ${contact.fullName}`}
                    className="min-h-[56px] min-w-[160px] px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border-2 border-emerald-950 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-black text-xl flex items-center justify-center gap-3 shadow-md active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400 self-stretch sm:self-auto"
                  >
                    <Phone className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    <span>Gọi ngay</span>
                  </a>
                ) : (
                  <span className="text-base text-slate-500 dark:text-slate-400 italic">
                    Chưa có số liên hệ
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
