"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Gift,
  Heart,
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
import { PiggyBankCard } from "./PiggyBankCard";
import { ChoreCardItem, choreLabels } from "./ChoreCardItem";
import { ProofSubmissionModal } from "./ProofSubmissionModal";
import { RewardsMilestonesTracker } from "./RewardsMilestonesTracker";
import { ConfettiEffect } from "./ConfettiEffect";

/**
 * Thẻ hiển thị việc nhà (ChoreCard) dành cho Trẻ em.
 * Xuất khẩu để duy trì tính tương thích với các view khác trong ứng dụng.
 */
export function ChoreCard({
  chore,
  onOpenSubmit,
}: {
  chore: ChoreItem;
  onOpenSubmit?: (chore: ChoreItem) => void;
}) {
  return <ChoreCardItem chore={chore} onOpenSubmit={onOpenSubmit} />;
}

/**
 * Cổng giao diện chính của Trẻ nhỏ (ContractKidsPortal).
 * Xử lý các đường dẫn:
 * - /dashboard/kids : Trang chính với Heo đất tương tác, thống kê, việc tiếp theo
 * - /dashboard/kids/chores : Danh sách việc nhà và bộ lọc trạng thái di động
 * - /dashboard/kids/chores/[id] : Chi tiết việc nhà & nộp minh chứng
 * - /dashboard/kids/rewards : Theo dõi cột mốc, thành tích và huy hiệu danh dự
 * - /dashboard/kids/profile : Thông tin gia đình của con
 */
function ContractKidsPortal({ preview = false }: { preview?: boolean }) {
  const auth = useAuth();
  const family = useFamily();
  const pathname = usePathname();
  const query = useSearchParams();
  const router = useRouter();

  // Modal nộp minh chứng di động
  const [activeSubmitChore, setActiveSubmitChore] = useState<ChoreItem | null>(null);

  const mode = pathname.split("/")[3];

  // Chỉ lấy danh sách việc được giao cho chính tài khoản trẻ nhỏ đang đăng nhập
  const chores = family.chores.filter(
    (item) => item.childId === auth.user?.id,
  );

  const total = (status: string) =>
    formatEther(
      chores
        .filter((item) => item.status === status)
        .reduce(
          (sum, item) => sum + parseEther(item.exactRewardAmount || "0"),
          0n,
        ),
    );

  const totalRewardedWei = chores
    .filter((item) => item.status === "REWARDED")
    .reduce(
      (sum, item) => sum + parseEther(item.exactRewardAmount || "0"),
      0n,
    )
    .toString();

  const totalPendingWei = chores
    .filter((item) => item.status === "SUBMITTED" || item.status === "VERIFIED")
    .reduce(
      (sum, item) => sum + parseEther(item.exactRewardAmount || "0"),
      0n,
    )
    .toString();

  const todo = chores.filter((item) => item.status === "TODO");
  const pending = chores.filter(
    (item) => item.status === "SUBMITTED" || item.status === "VERIFIED",
  );
  const rewarded = chores.filter((item) => item.status === "REWARDED");

  // Trang thông tin cá nhân & người thân
  if (!preview && mode === "profile") return <MemberFamily />;

  // Trang tiền thưởng & cột mốc huy hiệu
  if (!preview && mode === "rewards") {
    return (
      <>
        <PageHeader
          eyebrow="MỖI VIỆC TỐT ĐỀU ĐƯỢC GHI NHẬN"
          title="Tiền thưởng của con"
          description="Chỉ những khoản đã được chi trả mới tính vào tổng thưởng đã nhận."
        />

        {/* Khung tổng kết thưởng truyền thống tương thích thẻ phong cách Kinetix */}
        <div className="reward-summary">
          <section className="member-card">
            <Gift size={28} aria-hidden="true" />
            <h2>Con đã nhận</h2>
            <p className="member-amount">
              {amountLabel(total("REWARDED"))}{" "}
              <span>{hubChain.nativeCurrency.symbol}</span>
            </p>
            <p>Tổng thưởng đã chi trả, không phải số dư ví hiện tại.</p>
          </section>

          <section className="member-card">
            <Clock3 size={28} aria-hidden="true" />
            <h2>Đang chờ duyệt</h2>
            <p className="member-amount">
              {amountLabel(total("SUBMITTED"))}{" "}
              <span>{hubChain.nativeCurrency.symbol}</span>
            </p>
            <p>Chưa được cộng vào tổng đã nhận.</p>
          </section>
        </div>

        {/* Trình theo dõi cột mốc & huy hiệu danh dự */}
        <RewardsMilestonesTracker
          completedCount={rewarded.length}
          totalRewardedWei={totalRewardedWei}
          totalPendingWei={totalPendingWei}
          completedChores={rewarded}
        />

        {/* Danh sách việc nhà đã nhận thưởng */}
        <section className="member-card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />
              Những việc đã nhận thưởng
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {rewarded.length} việc hoàn thành
            </span>
          </div>

          {!rewarded.length ? (
            <EmptyState title="Mọi điều tốt đều bắt đầu từ một việc nhỏ">
              Sau khi người thân duyệt và chi trả, phần thưởng của con sẽ hiện ở
              đây.
            </EmptyState>
          ) : (
            <div className="chore-grid">
              {rewarded.map((chore) => (
                <ChoreCard key={chore.id} chore={chore} />
              ))}
            </div>
          )}
        </section>

        <ActivityList />
      </>
    );
  }

  // Trang danh sách hoặc chi tiết việc nhà
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

        {/* Bộ lọc trạng thái chuẩn di động (Touch target >= 48px) */}
        <div className="member-filters flex flex-wrap gap-2 mb-6" role="group" aria-label="Lọc việc">
          {[
            ["TODO", "Chưa làm"],
            ["SUBMITTED", "Chờ duyệt"],
            ["REWARDED", "Đã nhận thưởng"],
            ["ALL", "Tất cả"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`min-h-[48px] px-4 py-2.5 rounded-full border text-sm font-semibold transition-all active:scale-95 ${
                filter === value
                  ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              }`}
              aria-pressed={filter === value}
              onClick={() =>
                router.push(
                  `/dashboard/kids/chores?source=contract&status=${value}`,
                  { scroll: false },
                )
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
              <ChoreCard
                key={chore.id}
                chore={chore}
                onOpenSubmit={(targetChore) => setActiveSubmitChore(targetChore)}
              />
            ))}
          </div>
        )}

        {/* Modal nộp minh chứng di động */}
        <ProofSubmissionModal
          isOpen={!!activeSubmitChore}
          chore={activeSubmitChore}
          onClose={() => setActiveSubmitChore(null)}
          onSubmitted={() => setActiveSubmitChore(null)}
        />
      </>
    );
  }

  // Giao diện trang chủ mặc định (/dashboard/kids)
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

      {/* Thẻ Heo Đất tương tác (Interactive Piggy Bank Card) */}
      <div className="mb-6">
        <PiggyBankCard
          currentWei={totalRewardedWei}
          targetWei={parseEther("0.5").toString()}
          targetName="Món quà ước mơ"
          onExploreChores={() =>
            router.push("/dashboard/kids/chores?source=contract")
          }
        />
      </div>

      {/* Thẻ Hero hành trình trưởng thành */}
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
            {rewarded.length} việc
            được nhận thưởng.
          </p>
          <Link
            className="member-primary min-h-[48px] inline-flex items-center gap-2"
            href="/dashboard/kids/chores?source=contract"
          >
            Khám phá việc của con
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
        <div className="kids-hero-art" aria-hidden="true">
          <div className="hero-star one"><Sparkles size={16} aria-hidden="true" /></div>
          <div className="hero-pig">
            <Gift size={72} strokeWidth={1.4} />
          </div>
          <div className="hero-star two"><Sparkles size={16} aria-hidden="true" /></div>
          <span>TỪ NHỮNG ĐIỀU NHỎ</span>
        </div>
      </div>

      {/* Bộ 3 thống kê nhanh cho bé */}
      <div className="kids-stats">
        <section>
          <span className="stat-icon">
            <Star size={25} aria-hidden="true" />
          </span>
          <div>
            <strong>{todo.length}</strong>
            <p>Việc chưa làm</p>
          </div>
        </section>

        <section>
          <span className="stat-icon">
            <Clock3 size={25} aria-hidden="true" />
          </span>
          <div>
            <strong>{pending.length}</strong>
            <p>Đang chờ người thân</p>
          </div>
        </section>

        <section>
          <span className="stat-icon">
            <Gift size={25} aria-hidden="true" />
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

      {/* Phần danh sách việc tiếp theo */}
      <div className="section-heading mt-6 mb-3">
        <h2>
          <Sparkles size={24} aria-hidden="true" />
          Việc tiếp theo
        </h2>
        <Link href="/dashboard/kids/chores?source=contract">
          Xem tất cả
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>

      {todo.length ? (
        <div className="chore-grid">
          {todo.slice(0, 2).map((chore) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              onOpenSubmit={(targetChore) => setActiveSubmitChore(targetChore)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Con chưa có việc mới">
          Khi người thân giao việc, việc sẽ hiện ở đây. Con có thể quay lại sau
          nhé.
        </EmptyState>
      )}

      {/* Modal nộp minh chứng di động */}
      <ProofSubmissionModal
        isOpen={!!activeSubmitChore}
        chore={activeSubmitChore}
        onClose={() => setActiveSubmitChore(null)}
        onSubmitted={() => setActiveSubmitChore(null)}
      />
    </>
  );
}

/**
 * Điểm vào chính của Trải nghiệm Trẻ em (KidsPortal)
 */
export function KidsPortal({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  if (pathname.includes("/profile")) return <MemberFamily />;
  return (
    <VaultExperience
      kind="MILESTONE"
      legacy={<ContractKidsPortal preview={preview} />}
    />
  );
}

/**
 * Xem chi tiết việc nhà & Quy trình nộp minh chứng
 */
function ChoreDetail({ chore }: { chore: ChoreItem }) {
  const [attachmentId, setAttachmentId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filter = useSearchParams().get("status") || "ALL";
  const tx = useMemberTransaction();
  const canSubmit = chore.status === "TODO" && !tx.blocked;

  return (
    <>
      <PageHeader
        eyebrow="VIỆC CỦA CON"
        title={chore.title}
        back={`/dashboard/kids/chores?source=contract&status=${encodeURIComponent(filter)}`}
      />

      <div className="transaction-layout">
        <section className="member-card">
          <span className="member-status">{choreLabels[chore.status] || chore.status}</span>
          <h2>Hướng dẫn</h2>
          <p>
            {chore.description ||
              "Con hãy làm theo hướng dẫn của người giao việc. Nếu chưa rõ, hỏi người bảo hộ trước khi bắt đầu."}
          </p>
          <p>
            Hũ thưởng: <strong>{chore.vaultName}</strong>
          </p>
          <p className="chore-reward">
            <Gift size={22} aria-hidden="true" />
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

          {/* Nút nộp minh chứng di động nhanh */}
          {canSubmit && (
            <div className="my-4">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span>Mở máy ảnh nộp minh chứng ngay</span>
              </button>
            </div>
          )}

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
              className="member-primary min-h-[48px] w-full"
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
          <Link href="/dashboard/kids/profile" className="member-text-button min-h-[48px] inline-flex items-center">
            Nhờ người thân giúp
          </Link>
        </aside>
      </div>

      {/* Modal nộp minh chứng */}
      <ProofSubmissionModal
        isOpen={modalOpen}
        chore={chore}
        onClose={() => setModalOpen(false)}
        onSubmitted={() => setModalOpen(false)}
      />
    </>
  );
}

function HeartNote() {
  return (
    <span className="note-icon" aria-hidden="true">
      <Heart className="w-6 h-6 text-pink-500 inline" />
    </span>
  );
}
