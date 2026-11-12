"use client";

import React, { useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { ElderlySpeakerButton } from "./ElderlySpeakerButton";
import { formatElderlyAvax, speakElderlyText } from "./elderlyUtils";

interface ElderlyConfirmationModalProps {
  /** Trạng thái mở modal */
  isOpen: boolean;
  /** Đóng modal */
  onClose: () => void;
  /** Hàm kích hoạt rút tiền thực tế */
  onConfirm: () => void;
  /** Số tiền rút */
  amount: string;
  /** Đơn vị tiền tệ */
  asset?: string;
  /** Tên hũ nguồn */
  vaultName: string;
  /** Khoản rút lớn cần con cháu duyệt hay rút nhanh */
  isLarge: boolean;
  /** Lý do rút tiền */
  reason: string;
  /** Địa chỉ ví người nhận */
  recipientAddress?: string;
  /** Trạng thái giao dịch */
  txState: "idle" | "signing" | "success" | "tracking" | "error";
  /** Thông điệp từ hook giao dịch */
  txMessage?: string;
  /** Mã lỗi nếu có */
  txError?: string;
}

/**
 * Hộp thoại xác nhận rút tiền đơn giản hóa dành cho Người cao tuổi (Ông bà).
 * Tuân thủ WCAG AAA:
 * - Kích thước chữ số tiền to lớn (36px+), dễ nhìn không cần kính.
 * - Nút "ĐỒNG Ý RÚT" siêu to (min-height 64px), màu xanh lá tương phản cao.
 * - Gợi ý xác nhận bằng giọng nói trước khi nhấn nút.
 * - Loại bỏ toàn bộ mã hash kỹ thuật số dài ngoằng gây bối rối.
 */
export function ElderlyConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  asset = "AVAX",
  vaultName,
  isLarge,
  reason,
  recipientAddress = "",
  txState,
  txMessage = "",
  txError = "",
}: ElderlyConfirmationModalProps) {
  // Khi mở modal, có thể phát giọng nói tóm tắt ngắn gọn nếu muốn
  useEffect(() => {
    if (isOpen && txState === "idle") {
      const summary = `Xác nhận rút ${amount} ${asset} từ hũ ${vaultName} về ví của ông bà. ${
        isLarge
          ? "Khoản tiền này sẽ gửi để con cháu duyệt."
          : "Tiền sẽ về ví tức thì trong một giây."
      } Bấm nút Đồng Ý Rút màu xanh ở dưới để hoàn tất.`;
      // Chỉ chuẩn bị văn bản, người dùng có thể bấm nút loa để nghe
    }
  }, [isOpen, txState, amount, asset, vaultName, isLarge]);

  if (!isOpen) return null;

  const isBusy = txState === "signing" || txState === "tracking";
  const isSuccess = txState === "success";
  const isFailed = txState === "error" || !!txError;

  // Rút gọn địa chỉ ví dễ đọc (VD: Ví cá nhân ...12ab)
  const shortWallet = recipientAddress
    ? `Ví cá nhân (...${recipientAddress.slice(-4)})`
    : "Ví cá nhân của ông bà";

  // Văn bản đọc chi tiết
  const speechText = `Bảng xác nhận rút tiền. Số tiền rút là ${amount} ${asset}. Rút từ hũ ${vaultName}. Chuyển vào ${shortWallet}. Phí mạng miễn phí. Thời gian chuyển: ${
    isLarge ? "Cần con cháu duyệt trước" : "Nhận tức thì trong một giây"
  }. Bấm nút Đồng Ý Rút ở dưới để hoàn tất.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-4 border-emerald-600 dark:border-emerald-400 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Nút đóng modal góc trên phải (touch target >= 56px) */}
        {!isBusy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng xác nhận"
            className="absolute top-4 right-4 min-h-[56px] min-w-[56px] w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>
        )}

        {/* Header Modal */}
        <div className="pr-16 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
          <span className="text-sm font-black tracking-wider uppercase text-emerald-800 dark:text-emerald-300">
            Kinetix · Gia đình an tâm
          </span>
          <h2
            id="confirm-modal-title"
            className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50 mt-1"
          >
            Xác nhận rút tiền
          </h2>
        </div>

        {/* Trạng thái thành công */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 border-4 border-emerald-600 dark:border-emerald-400 flex items-center justify-center text-emerald-800 dark:text-emerald-300 animate-bounce">
              <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
            </div>
            <h3 className="text-3xl font-black text-emerald-800 dark:text-emerald-300">
              {isLarge ? "ĐÃ GỬI YÊU CẦU THÀNH CÔNG!" : "ĐÃ RÚT TIỀN THÀNH CÔNG!"}
            </h3>
            <p className="text-xl text-slate-800 dark:text-slate-200 max-w-sm mx-auto">
              {isLarge
                ? "Yêu cầu rút tiền đã được gửi tới con cháu trong nhà. Ông bà có thể theo dõi tiến độ ở mục Yêu cầu."
                : `Số tiền ${amount} ${asset} đã được chuyển an toàn vào ví cá nhân của ông bà.`}
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[60px] px-6 py-4 rounded-2xl font-black text-2xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-2 border-emerald-900 shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
              >
                Xong · Về trang chính
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Nút loa đọc lại toàn bộ thông tin */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-between gap-3">
              <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nghe lại thông tin trước khi đồng ý:
              </span>
              <ElderlySpeakerButton
                textToSpeak={speechText}
                label="Nghe đọc"
                variant="full"
              />
            </div>

            {/* Khối hiển thị số tiền rút nổi bật cực lớn */}
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-600 text-center">
              <p className="text-lg font-bold text-emerald-950 dark:text-emerald-200">
                Số tiền ông bà sẽ nhận:
              </p>
              <p className="text-4xl sm:text-5xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {amount} <span className="text-3xl font-bold">{asset}</span>
              </p>
              <p className="text-base text-emerald-900 dark:text-emerald-200 mt-2 font-medium">
                Nguồn: <strong>{vaultName}</strong>
              </p>
            </div>

            {/* Chi tiết giao dịch thân thiện, không hash kỹ thuật */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-lg">
              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  Nơi nhận tiền:
                </span>
                <span className="font-bold text-slate-950 dark:text-slate-50 text-right">
                  {shortWallet}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  Thời gian:
                </span>
                <span className="font-bold text-slate-950 dark:text-slate-50 text-right">
                  {isLarge ? "Chờ con cháu duyệt" : "Tức thì (<1 giây)"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  Phí giao dịch mạng:
                </span>
                <span className="font-black text-emerald-800 dark:text-emerald-300">
                  0 AVAX (Miễn phí 100%)
                </span>
              </div>

              {isLarge && (
                <div className="pt-2 text-base text-amber-950 dark:text-amber-200 border-t border-slate-200 dark:border-slate-700">
                  Mục đích rút tiền: <strong>{reason}</strong>
                </div>
              )}
            </div>

            {/* Hướng dẫn ví Core khi đang ký */}
            {isBusy && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-500 text-amber-950 dark:text-amber-100 flex items-center gap-3 animate-pulse">
                <ShieldAlert className="w-8 h-8 flex-shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <div>
                  <p className="font-black text-lg">Đang kết nối ví Core...</p>
                  <p className="text-base text-amber-900 dark:text-amber-200">
                    {txMessage || "Xin ông bà nhìn vào màn hình ví Core và bấm nút Xác Nhận."}
                  </p>
                </div>
              </div>
            )}

            {/* Thông báo lỗi nếu có */}
            {isFailed && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-1"
              >
                <p className="font-black text-lg flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-rose-600" aria-hidden="true" />
                  Chưa thể hoàn tất rút tiền
                </p>
                <p className="text-base text-rose-900 dark:text-rose-200">
                  {txError || txMessage || "Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút."}
                </p>
              </div>
            )}

            {/* Các nút hành động chính (min-h >= 64px, kích thước lớn) */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isBusy}
                className="w-full min-h-[64px] px-6 py-4 rounded-2xl font-black text-2xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-2 border-emerald-900 shadow-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 focus:outline-none focus:ring-4 focus:ring-emerald-400"
              >
                <CheckCircle2 className="w-8 h-8 flex-shrink-0" aria-hidden="true" />
                <span>{isBusy ? "Đang xử lý..." : "ĐỒNG Ý RÚT TIỀN"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="w-full min-h-[56px] px-6 py-3 rounded-2xl font-bold text-xl text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-400 dark:border-slate-600 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-slate-400"
              >
                Hủy bỏ · Chưa rút bây giờ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
