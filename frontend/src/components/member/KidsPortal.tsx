"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gift,
  Sparkles,
  Star,
} from "lucide-react";
import { formatEther, parseEther } from "viem";
import { ChoreItem, useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";
import { EmptyState, PageHeader, StatusTimeline } from "./MemberPrimitives";
import { ProofUploader } from "./ProofUploader";
import { MemberFamily } from "./MemberFamily";
import { ActivityList } from "./MemberActivity";
import { VaultExperience } from "@/components/vaults/VaultExperience";

const choreLabels = {
  TODO: "Chưa làm",
  SUBMITTED: "Chờ người thân duyệt",
  VERIFIED: "Đã duyệt, đang kiểm tra chi trả",
  REWARDED: "Đã nhận thưởng",
  CANCELLED: "Đã hủy",
};
export function ChoreCard({ chore }: { chore: ChoreItem }) {
  const Icon =
    chore.status === "REWARDED"
      ? CheckCircle2
      : chore.status === "TODO"
        ? Star
        : Clock3;
  return (
    <article className={`chore-card chore-${chore.status.toLowerCase()}`}>
      <div className="chore-card-top">
        <span className="chore-symbol">
          <Icon size={25} aria-hidden="true" />
        </span>
        <span className="member-status">{choreLabels[chore.status]}</span>
      </div>
      <h3>{chore.title}</h3>
      <p>
        {chore.description ||
          "Làm theo hướng dẫn của người giao việc. Nếu chưa rõ, con hãy hỏi người bảo hộ."}
      </p>
      <p className="chore-reward">
        <Gift size={20} />
        {chore.status === "REWARDED" ? "Đã nhận" : "Thưởng dự kiến"}:{" "}
        <strong>
          {amountLabel(chore.exactRewardAmount)}{" "}
          {hubChain.nativeCurrency.symbol}
        </strong>
      </p>
      <Link
        className="member-secondary"
        href={`/dashboard/kids/chores/${chore.id}?status=${chore.status}`}
      >
        Xem việc
        <ArrowRight size={20} />
      </Link>
    </article>
  );
}

function ContractKidsPortal({ preview = false }: { preview?: boolean }) {
  const auth = useAuth();
  const family = useFamily();
  const pathname = usePathname();
  const query = useSearchParams();
  const router = useRouter();
  const mode = pathname.split("/")[3];
  const chores = family.chores.filter((item) => item.childId === auth.user?.id);
  const total = (status: string) =>
    formatEther(
      chores
        .filter((item) => item.status === status)
        .reduce(
          (sum, item) => sum + parseEther(item.exactRewardAmount || "0"),
          0n,
        ),
    );
  const todo = chores.filter((item) => item.status === "TODO");
  const pending = chores.filter(
    (item) => item.status === "SUBMITTED" || item.status === "VERIFIED",
  );
  if (!preview && mode === "profile") return <MemberFamily />;
  if (!preview && mode === "rewards")
    return (
      <>
        <PageHeader
          eyebrow="MỖI VIỆC TỐT ĐỀU ĐƯỢC GHI NHẬN"
          title="Tiền thưởng của con"
          description="Chỉ những khoản đã được chi trả mới tính vào tổng thưởng đã nhận."
        />
        <div className="reward-summary">
          <section className="member-card">
            <Gift size={28} />
            <h2>Con đã nhận</h2>
            <p className="member-amount">
              {amountLabel(total("REWARDED"))}{" "}
              <span>{hubChain.nativeCurrency.symbol}</span>
            </p>
            <p>Tổng thưởng đã chi trả, không phải số dư ví hiện tại.</p>
          </section>
          <section className="member-card">
            <Clock3 size={28} />
            <h2>Đang chờ duyệt</h2>
            <p className="member-amount">
              {amountLabel(total("SUBMITTED"))}{" "}
              <span>{hubChain.nativeCurrency.symbol}</span>
            </p>
            <p>Chưa được cộng vào tổng đã nhận.</p>
          </section>
        </div>
        <section className="member-card">
          <h2>Những việc đã nhận thưởng</h2>
          {!chores.some((item) => item.status === "REWARDED") ? (
            <EmptyState title="Mọi điều tốt đều bắt đầu từ một việc nhỏ">
              Sau khi người thân duyệt và chi trả, phần thưởng của con sẽ hiện ở
              đây.
            </EmptyState>
          ) : (
            <div className="chore-grid">
              {chores
                .filter((item) => item.status === "REWARDED")
                .map((chore) => (
                  <ChoreCard key={chore.id} chore={chore} />
                ))}
            </div>
          )}
        </section>
        <ActivityList />
      </>
    );
  if (!preview && mode === "chores") {
    const id = pathname.split("/")[4];
    if (id) {
      const chore = chores.find((item) => String(item.id) === id);
      return chore ? (
        <ChoreDetail key={chore.id} chore={chore} />
      ) : (
        <>
          <PageHeader
            eyebrow="VIỆC CỦA CON"
            title="Không tìm thấy việc này"
            back="/dashboard/kids/chores"
          />
          <EmptyState title="Việc chưa được giao cho con hoặc đã thay đổi">
            Con hãy tải lại danh sách hoặc hỏi người bảo hộ.
          </EmptyState>
        </>
      );
    }
    const filter = query.get("status") || "TODO";
    const list =
      filter === "ALL"
        ? chores
        : chores.filter((item) => item.status === filter);
    return (
      <>
        <PageHeader
          eyebrow="TỪNG VIỆC NHỎ, TỪNG NIỀM VUI"
          title="Việc của con"
          description="Xem việc, làm thật tốt rồi gửi ảnh để người thân duyệt nhé."
        />
        <div className="member-filters" role="group" aria-label="Lọc việc">
          {[
            ["TODO", "Chưa làm"],
            ["SUBMITTED", "Chờ duyệt"],
            ["REWARDED", "Đã nhận thưởng"],
            ["ALL", "Tất cả"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() =>
                router.push(`/dashboard/kids/chores?status=${value}`, {
                  scroll: false,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        {!list.length ? (
          <EmptyState title="Chưa có việc ở mục này">
            Khi người thân giao việc, việc sẽ hiện ở đây.
          </EmptyState>
        ) : (
          <div className="chore-grid">
            {list.map((chore) => (
              <ChoreCard key={chore.id} chore={chore} />
            ))}
          </div>
        )}
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="HÔM NAY LÀ MỘT NGÀY THẬT TỐT"
        title={
          preview
            ? "Trải nghiệm trẻ em"
            : `Chào ${auth.user?.fullName || "con"}!`
        }
        description="Cùng làm một việc nhỏ, giúp gia đình thêm vui."
      />
      {preview && (
        <p className="member-notice">
          Chế độ xem trước. Dữ liệu cá nhân và thao tác nộp bài chỉ dành cho tài
          khoản được giao việc.
        </p>
      )}
      <div className="kids-hero">
        <div>
          <span className="member-eyebrow">HÀNH TRÌNH CỦA CON</span>
          <h2>
            Mỗi việc tốt,
            <br />
            một bước trưởng thành.
          </h2>
          <p>
            Con đã hoàn thành{" "}
            {chores.filter((item) => item.status === "REWARDED").length} việc
            được nhận thưởng.
          </p>
          <Link className="member-primary" href="/dashboard/kids/chores">
            Khám phá việc của con
            <ArrowRight size={20} />
          </Link>
        </div>
        <div className="kids-hero-art" aria-hidden="true">
          <div className="hero-star one">✦</div>
          <div className="hero-pig">
            <Gift size={72} strokeWidth={1.4} />
          </div>
          <div className="hero-star two">✦</div>
          <span>TỪ NHỮNG ĐIỀU NHỎ</span>
        </div>
      </div>
      <div className="kids-stats">
        <section>
          <span className="stat-icon">
            <Star size={25} />
          </span>
          <div>
            <strong>{todo.length}</strong>
            <p>Việc chưa làm</p>
          </div>
        </section>
        <section>
          <span className="stat-icon">
            <Clock3 size={25} />
          </span>
          <div>
            <strong>{pending.length}</strong>
            <p>Đang chờ người thân</p>
          </div>
        </section>
        <section>
          <span className="stat-icon">
            <Gift size={25} />
          </span>
          <div>
            <strong>
              {amountLabel(total("REWARDED"))}{" "}
              <small>{hubChain.nativeCurrency.symbol}</small>
            </strong>
            <p>Tổng thưởng đã nhận</p>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <h2>
          <Sparkles size={24} />
          Việc tiếp theo
        </h2>
        <Link href="/dashboard/kids/chores">
          Xem tất cả
          <ArrowRight size={18} />
        </Link>
      </div>
      {todo.length ? (
        <div className="chore-grid">
          {todo.slice(0, 2).map((chore) => (
            <ChoreCard key={chore.id} chore={chore} />
          ))}
        </div>
      ) : (
        <EmptyState title="Con chưa có việc mới">
          Khi người thân giao việc, việc sẽ hiện ở đây. Con có thể quay lại sau
          nhé.
        </EmptyState>
      )}
    </>
  );
}
export function KidsPortal({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  if (pathname.includes("/profile")) return <MemberFamily />;
  return <VaultExperience kind="MILESTONE" legacy={<ContractKidsPortal preview={preview} />} />;
}

function ChoreDetail({ chore }: { chore: ChoreItem }) {
  const [attachmentId, setAttachmentId] = useState("");
  const filter = useSearchParams().get("status") || "ALL";
  const tx = useMemberTransaction();
  const canSubmit = chore.status === "TODO" && !tx.blocked;
  return (
    <>
      <PageHeader
        eyebrow="VIỆC CỦA CON"
        title={chore.title}
        back={`/dashboard/kids/chores?status=${encodeURIComponent(filter)}`}
      />
      <div className="transaction-layout">
        <section className="member-card">
          <span className="member-status">{choreLabels[chore.status]}</span>
          <h2>Hướng dẫn</h2>
          <p>
            {chore.description ||
              "Con hãy làm theo hướng dẫn của người giao việc. Nếu chưa rõ, hỏi người bảo hộ trước khi bắt đầu."}
          </p>
          <p>
            Hũ thưởng: <strong>{chore.vaultName}</strong>
          </p>
          <p className="chore-reward">
            <Gift size={22} />
            Thưởng dự kiến:{" "}
            <strong>
              {amountLabel(chore.exactRewardAmount)}{" "}
              {hubChain.nativeCurrency.symbol}
            </strong>
          </p>
          <StatusTimeline
            steps={["Được giao", "Con gửi bài", "Nhận thưởng"]}
            current={
              chore.status === "REWARDED" ? 2 : chore.status === "TODO" ? 0 : 1
            }
          />
          {canSubmit && (
            <ProofUploader
              choreId={String(chore.id)}
              disabled={tx.busy}
              onUploaded={setAttachmentId}
            />
          )}
          {chore.proofImageUrl && (
            <div className="submitted-proof">
              <h2>Ảnh con đã gửi</h2>
              <img
                src={chore.proofImageUrl}
                alt={`Minh chứng cho việc ${chore.title}`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
              <p>
                Ảnh chỉ hiển thị khi còn trong thời hạn lưu và con có quyền xem.
              </p>
            </div>
          )}
          {tx.state === "success" && (
            <p className="member-notice" role="status">
              Đã gửi, đang chờ người bảo hộ duyệt. Phần thưởng chưa được cộng
              vào tổng đã nhận.
            </p>
          )}
          {tx.state !== "success" && tx.message && (
            <p
              className={
                tx.state === "error" ? "member-error" : "member-notice"
              }
              role={tx.state === "error" ? "alert" : "status"}
            >
              {tx.message}
            </p>
          )}
          {tx.hash && (
            <details>
              <summary>Chi tiết giao dịch gửi bài</summary>
              <p className="wallet-address">{tx.hash}</p>
            </details>
          )}
          {canSubmit && (
            <button
              className="member-primary"
              disabled={
                !attachmentId || tx.busy || chore.onchainTaskId === undefined
              }
              onClick={() =>
                void tx.execute({
                  functionName: "claimChoreCompleted",
                  args: [BigInt(chore.onchainTaskId!)],
                  path: "/api/chores/submit",
                  body: { choreId: chore.id, attachmentId },
                })
              }
            >
              {tx.busy
                ? "Đang chờ Core xác nhận…"
                : "Mở Core để xác nhận đã làm xong"}
            </button>
          )}
        </section>
        <aside className="member-card">
          <HeartNote />
          <h2>Gửi bài rồi, con chờ nhé</h2>
          <p>
            Ảnh tải lên trước, sau đó con xác nhận đã làm xong bằng ví Core của
            mình.
          </p>
          <p>
            Người bảo hộ kiểm tra và ký chi trả. Khi đã nhận thưởng, con không
            cần bấm nhận hay ký thêm lần nữa.
          </p>
          <Link href="/dashboard/kids/profile" className="member-text-button">
            Nhờ người thân giúp
          </Link>
        </aside>
      </div>
    </>
  );
}
function HeartNote() {
  return (
    <span className="note-icon" aria-hidden="true">
      ♡
    </span>
  );
}
