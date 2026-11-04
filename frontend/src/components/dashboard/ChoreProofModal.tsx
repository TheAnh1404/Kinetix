"use client";

import React, { useRef, useState } from "react";
import { ChoreItem } from "@/context/FamilyContext";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";
import { AccessibleDialog } from "@/components/member/MemberPrimitives";

export function ChoreProofModal({
  isOpen,
  onClose,
  chore,
  onApprove,
}: {
  isOpen: boolean;
  onClose: () => void;
  chore: ChoreItem | null;
  onApprove: (
    choreId: string | number,
    rewardAmount: number,
  ) => Promise<boolean | void>;
}) {
  if (!isOpen || !chore) return null;
  return (
    <ChoreReview
      key={chore.id}
      chore={chore}
      onClose={onClose}
      onApprove={onApprove}
    />
  );
}
function ChoreReview({
  chore,
  onClose,
  onApprove,
}: {
  chore: ChoreItem;
  onClose: () => void;
  onApprove: (id: string | number, amount: number) => Promise<boolean | void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const lock = useRef(false);
  return (
    <AccessibleDialog
      title="Xem bài và duyệt thưởng"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="member-preview kids-theme">
        <span className="member-status">Chờ người bảo hộ duyệt</span>
        <h3 className="font-bold text-xl my-3">{chore.title}</h3>
        <p>Người được giao: {chore.childName || "Thành viên"}</p>
        <p>
          Phần thưởng:{" "}
          <strong>
            {amountLabel(chore.exactRewardAmount || String(chore.rewardAmount))}{" "}
            {hubChain.nativeCurrency.symbol}
          </strong>
        </p>
        {chore.proofImageUrl?.startsWith("/api/member/attachments/") ? (
          <img
            className="w-full max-h-96 object-contain rounded-xl my-4"
            src={chore.proofImageUrl}
            alt={`Ảnh minh chứng: ${chore.title}`}
            onLoad={() => setImageReady(true)}
            onError={() => {
              setImageReady(false);
              setError(
                "Không đọc được ảnh hoặc ảnh đã hết hạn. Kiểm tra lại trước khi duyệt.",
              );
            }}
          />
        ) : (
          <p className="member-notice">
            Chưa có ảnh minh chứng riêng tư. Hãy liên hệ thành viên để kiểm tra
            bài.
          </p>
        )}
        <p className="my-4">
          Ảnh do thành viên gửi, chưa có xác thực tự động. Khi bạn duyệt trong
          Core, hợp đồng sẽ chi trả về ví người được giao việc.
        </p>
        {error && (
          <p className="member-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="member-primary"
          disabled={
            busy ||
            !imageReady ||
            !["SUBMITTED", "VERIFIED"].includes(chore.status)
          }
          onClick={() => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            void onApprove(chore.id, chore.rewardAmount)
              .then((result) => {
                if (result === true) onClose();
                else
                  setError(
                    "Chưa hoàn tất duyệt. Xem trạng thái giao dịch trước khi thử lại.",
                  );
              })
              .catch((err) => setError(err.message))
              .finally(() => {
                setBusy(false);
                lock.current = false;
              });
          }}
        >
          {busy
            ? "Đang chờ xác nhận trong Core…"
            : "Mở Core để duyệt và chi trả"}
        </button>
      </div>
    </AccessibleDialog>
  );
}
