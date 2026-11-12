"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { ChoreItem } from "@/context/FamilyContext";
import { authRequest } from "@/hooks/useAuth";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";
import { ConfettiEffect } from "./ConfettiEffect";

// Các gợi ý câu nhắn gửi nhanh cho bé bấm chọn trong 1 chạm
const QUICK_NOTES = [
  "Con đã dọn phòng sạch sẽ rồi ạ!",
  "Con tự giác làm xong đúng giờ!",
  "Con đã rửa bát đĩa sạch bóng!",
  "Ba mẹ xem ảnh con làm xong nhé!",
];

/**
 * Chuẩn hóa và nén ảnh minh chứng ở phía máy khách để tối ưu băng thông di động
 */
async function compressImageForUpload(file: File): Promise<string> {
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    file.size > 10 * 1024 * 1024
  ) {
    throw new Error("Con hãy chọn ảnh chụp JPG, PNG hoặc WebP dưới 10 MB nhé.");
  }

  if (typeof window === "undefined" || !("createImageBitmap" in window)) {
    throw new Error("Trình duyệt chưa hỗ trợ bộ xử lý ảnh.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    let longest = Math.min(1200, Math.max(bitmap.width, bitmap.height));

    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = longest / Math.max(bitmap.width, bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Không thể xử lý ảnh trên thiết bị này.");
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const content = canvas.toDataURL("image/png").split(",")[1];
      if (content.length < 900000) return content;
      longest = Math.round(longest * 0.72);
    }
    throw new Error("Ảnh quá lớn. Con hãy chọn hoặc chụp ảnh khác nhé.");
  } finally {
    bitmap.close();
  }
}

interface ProofSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: ChoreItem | null;
  onSubmitted?: () => void;
}

/**
 * Hộp thoại nộp minh chứng di động (Mobile Proof Submission Modal).
 * Thiết kế cho trẻ nhỏ với nút chụp ảnh cực lớn, gợi ý câu nhắn 1 chạm,
 * và nút gửi thumb-zone tiện lợi kèm pháo hoa chúc mừng.
 */
export function ProofSubmissionModal({
  isOpen,
  onClose,
  chore,
  onSubmitted,
}: ProofSubmissionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const tx = useMemberTransaction();
  const modalRef = useRef<HTMLDivElement>(null);
  const uploadIdRef = useRef("");

  // Tạo URL xem trước ảnh
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Reset form khi mở modal mới
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPreview("");
      setNote("");
      setError("");
      setIsSuccess(false);
      uploadIdRef.current = crypto.randomUUID();
    }
  }, [isOpen, chore?.id]);

  if (!isOpen || !chore) return null;

  const handleSelectFile = (selected?: File) => {
    if (!selected) return;
    setFile(selected);
    setError("");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Con hãy chụp hoặc chọn một bức ảnh minh chứng nhé.");
      return;
    }

    if (tx.busy || isUploading) return;

    try {
      setIsUploading(true);
      setError("");

      // 1. Nén ảnh và tải lên máy chủ bảo mật
      const content = await compressImageForUpload(file);
      const res = await authRequest("/api/member/attachments", {
        choreId: chore.id,
        content,
        uploadId: uploadIdRef.current,
        note: note.trim() || undefined,
      });

      const attachmentId = res.attachmentId;

      // 2. Kích hoạt giao dịch smart contract trên Family L1
      if (chore.onchainTaskId !== undefined) {
        await tx.execute({
          functionName: "claimChoreCompleted",
          args: [BigInt(chore.onchainTaskId)],
          path: "/api/chores/submit",
          body: { choreId: chore.id, attachmentId, note: note.trim() },
        });
      }

      setIsSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi nộp minh chứng.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
    >
      {/* Pháo hoa khi gửi bài thành công */}
      {isSuccess && <ConfettiEffect active={isSuccess} count={50} />}

      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-purple-100 dark:border-purple-900/40 max-h-[92vh] overflow-y-auto space-y-4"
      >
        {/* Tiêu đề & Nút đóng */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="proof-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Nộp kết quả việc nhà
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi ảnh cho ba mẹ duyệt và nhận thưởng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Đóng cửa sổ nộp kết quả"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {isSuccess ? (
          /* Màn hình chúc mừng sau khi nộp thành công */
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>Hoan hô con!</span>
                <Star className="w-6 h-6 text-amber-500 fill-amber-400" aria-hidden="true" />
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                Ảnh minh chứng đã được gửi tới ba mẹ. Ba mẹ sẽ sớm xem và duyệt
                thưởng{" "}
                <strong className="text-purple-600 dark:text-purple-400">
                  {amountLabel(chore.exactRewardAmount)}{" "}
                  {hubChain.nativeCurrency.symbol}
                </strong>{" "}
                cho con nhé!
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              Xem các việc khác
            </button>
          </div>
        ) : (
          /* Form chụp ảnh và nhập ghi chú */
          <div className="space-y-4">
            {/* Tóm tắt việc cần làm */}
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
              <h3 className="text-base font-bold text-purple-950 dark:text-purple-200">
                {chore.title}
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Phần thưởng khi hoàn thành:{" "}
                <strong>
                  {amountLabel(chore.exactRewardAmount)}{" "}
                  {hubChain.nativeCurrency.symbol}
                </strong>
              </p>
            </div>

            {/* Vùng tải / chụp ảnh */}
            {!preview ? (
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ảnh minh chứng việc con đã làm
                </span>

                {/* Nút chụp ảnh siêu to dành cho di động (>= 56px) */}
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer min-h-[120px] active:scale-[0.98] transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                    <Camera className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <span className="text-base font-bold text-purple-900 dark:text-purple-200">
                    Chụp ảnh ngay
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mở máy ảnh chụp góc phòng hoặc bài tập
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="sr-only"
                    disabled={isUploading || tx.busy}
                    onChange={(e) => handleSelectFile(e.target.files?.[0])}
                  />
                </label>

                {/* Nút chọn ảnh từ thư viện */}
                <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[48px] active:scale-[0.98] transition-all">
                  <ImagePlus className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  <span>Hoặc chọn ảnh có sẵn từ máy</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={isUploading || tx.busy}
                    onChange={(e) => handleSelectFile(e.target.files?.[0])}
                  />
                </label>
              </div>
            ) : (
              /* Khung hiển thị ảnh đã chụp kèm nút chụp lại */
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-purple-300 dark:border-purple-700 bg-black/5">
                  <img
                    src={preview}
                    alt="Ảnh minh chứng con đã chọn"
                    className="w-full max-h-56 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    aria-label="Chụp lại ảnh khác"
                  >
                    <RotateCcw className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Ảnh đã sẵn sàng. Con có thể gửi ngay hoặc thêm lời nhắn bên
                  dưới.
                </p>
              </div>
            )}

            {/* Ghi chú một câu gửi ba mẹ */}
            <div className="space-y-2">
              <label
                htmlFor="chore-note-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Nhắn gửi ba mẹ một câu (không bắt buộc):
              </label>

              {/* Các gợi ý 1 chạm */}
              <div className="flex flex-wrap gap-2">
                {QUICK_NOTES.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setNote(text)}
                    className={`text-xs py-1.5 px-3 rounded-full border transition-all min-h-[36px] ${
                      note === text
                        ? "bg-purple-100 dark:bg-purple-900/60 border-purple-400 text-purple-900 dark:text-purple-200 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>

              <input
                id="chore-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={100}
                placeholder="Ví dụ: Con đã làm xong rồi ba mẹ ơi..."
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Thông báo lỗi nếu có */}
            {error && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-800"
              >
                {error}
              </p>
            )}

            {/* Nút 1-tap gửi minh chứng cho ba mẹ (thumb-zone ở đáy modal) */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!file || isUploading || tx.busy}
                onClick={handleSubmit}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-base shadow-xl shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isUploading || tx.busy ? (
                  <span>Đang gửi minh chứng cho ba mẹ...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5" aria-hidden="true" />
                    <span>Gửi minh chứng cho ba mẹ ngay</span>
                    <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
