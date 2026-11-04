"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { authRequest } from "@/hooks/useAuth";

/** Chuẩn hóa ảnh tại trình duyệt; server vẫn kiểm chữ ký file/CRC/stream và bỏ metadata. */
async function prepareImage(file: File) {
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    let longest = Math.min(1200, Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = longest / Math.max(bitmap.width, bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          "Thiết bị chưa hỗ trợ xử lý ảnh. Hãy thử ảnh nhỏ hơn hoặc trình duyệt khác.",
        );
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const content = canvas.toDataURL("image/png").split(",")[1];
      if (content.length < 900000) return content;
      longest = Math.round(longest * 0.72);
    }
    throw new Error("Ảnh quá lớn. Hãy chọn ảnh khác.");
  } finally {
    bitmap.close();
  }
}
export function ProofUploader({
  choreId,
  disabled,
  onUploaded,
}: {
  choreId: string;
  disabled: boolean;
  onUploaded: (id: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const lock = useRef(false);
  const uploadId = useRef("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const select = (selected?: File) => {
    if (!selected) return;
    uploadId.current = crypto.randomUUID();
    setFile(selected);
    setUploaded(false);
    setError("");
    onUploaded("");
  };
  return (
    <section className="proof-uploader">
      <h2>Ảnh việc con đã làm</h2>
      <p>
        Chỉ con và người có quyền duyệt được xem ảnh. Không chụp thông tin riêng
        tư, giấy tờ hay người khác khi chưa được đồng ý.
      </p>
      <div className="proof-choices">
        <label className="member-secondary">
          <Camera size={21} />
          Chụp ảnh
          <input
            aria-label="Chụp ảnh minh chứng"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={disabled || uploading}
            onChange={(event) => select(event.target.files?.[0])}
          />
        </label>
        <label className="member-secondary">
          <ImagePlus size={21} />
          Chọn ảnh
          <input
            aria-label="Chọn ảnh minh chứng"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => select(event.target.files?.[0])}
          />
        </label>
      </div>
      {preview && (
        <figure>
          <img src={preview} alt="Ảnh con đã chọn, xem lại trước khi gửi" />
          <figcaption>{file?.name}</figcaption>
        </figure>
      )}
      {file && !uploaded && (
        <button
          className="member-primary"
          disabled={disabled || uploading}
          onClick={() => {
            if (lock.current) return;
            lock.current = true;
            setUploading(true);
            setError("");
            void prepareImage(file)
              .then((content) =>
                authRequest("/api/member/attachments", {
                  choreId,
                  content,
                  uploadId: uploadId.current,
                }),
              )
              .then((data) => {
                onUploaded(data.attachmentId);
                setUploaded(true);
              })
              .catch((err) => setError(err.message))
              .finally(() => {
                setUploading(false);
                lock.current = false;
              });
          }}
        >
          {uploading ? "Đang tải ảnh riêng tư…" : "Dùng ảnh này"}
        </button>
      )}
      {uploaded && (
        <p role="status" className="member-notice">
          Ảnh đã tải lên. Tiếp theo, xác nhận đã làm xong trong Core.
        </p>
      )}
      {error && (
        <p role="alert" className="member-error">
          {error}
        </p>
      )}
      <p className="member-hint">
        Ảnh lưu tối đa 90 ngày. Sau tải lại trang, có thể cần chọn lại ảnh.
        Camera không dùng được thì chọn ảnh từ thư viện.
      </p>
    </section>
  );
}
