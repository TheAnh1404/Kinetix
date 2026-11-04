"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { hubChain } from "@/contracts/config";
import {
  fetchVaultPolicy,
  useVaultPolicy,
  MemberVaultPolicy,
} from "@/hooks/useVaultPolicy";
import { amountLabel, parseAmount, requestStatus } from "@/lib/member";
import {
  AmountInput,
  EmptyState,
  PageHeader,
  StatusTimeline,
  TransactionReview,
} from "./MemberPrimitives";
import { MemberFamily } from "./MemberFamily";
import { ActivityList } from "./MemberActivity";

export function ElderlyPortal({ preview = false }: { preview?: boolean }) {
  const family = useFamily();
  const auth = useAuth();
  const pathname = usePathname();
  const query = useSearchParams();
  const router = useRouter();
  const [vaultId, setVaultId] = useState(query.get("vault") || "");
  const shields = family.dynamicVaults.filter(
    (vault) => vault.ruleTemplate === "SHIELD" && vault.isActive,
  );
  const vault =
    shields.find((item) => item.id === vaultId) ||
    (shields.length === 1 ? shields[0] : undefined);
  const policyState = useVaultPolicy(preview ? undefined : vault?.id);
  const requests = family.withdrawalRequests.filter(
    (item) => item.requesterId === auth.user?.id,
  );
  const asset = hubChain.nativeCurrency.symbol;
  const mode = pathname.split("/")[3];
  const scope = `${family.currentWorkspace?.id}:${auth.user?.id}`;
  useEffect(() => {
    setVaultId("");
  }, [scope]);
  if (!preview && mode === "family") return <MemberFamily elderly />;
  if (!preview && mode === "requests") {
    const id = pathname.split("/")[4];
    const request = requests.find((item) => item.id === id);
    if (id)
      return (
        <>
          <PageHeader
            eyebrow="YÊU CẦU CỦA BẠN"
            title="Theo dõi yêu cầu"
            back="/dashboard/elderly/requests"
          />
          {!request ? (
            <EmptyState title="Không tìm thấy yêu cầu">
              Yêu cầu này không thuộc tài khoản hoặc chưa được cập nhật.
            </EmptyState>
          ) : (
            <section className="member-card">
              <span className="member-status">{requestStatus(request)}</span>
              <h2 className="member-amount">
                {amountLabel(request.exactAmount)} {asset}
              </h2>
              <p>
                {request.vaultName} · {request.reason}
              </p>
              <StatusTimeline
                steps={["Đã gửi", "Gia đình duyệt", "Đã chi trả"]}
                current={request.status === "EXECUTED" ? 2 : 1}
              />
              <dl className="member-details">
                <div>
                  <dt>Đã có người duyệt</dt>
                  <dd>
                    {request.approvalsCount}/{request.requiredApprovals}
                  </dd>
                </div>
                <div>
                  <dt>Gửi lúc</dt>
                  <dd>{new Date(request.createdAt).toLocaleString("vi-VN")}</dd>
                </div>
                <div>
                  <dt>Hạn duyệt</dt>
                  <dd>
                    {request.deadline
                      ? new Date(request.deadline).toLocaleString("vi-VN")
                      : "Đang kiểm tra với mạng"}
                  </dd>
                </div>
              </dl>
              <p>
                Hết hạn thì liên hệ người bảo hộ để kiểm tra trước khi tạo yêu
                cầu mới.
              </p>
              <details>
                <summary>Chi tiết hỗ trợ</summary>
                <p className="wallet-address">
                  Mã yêu cầu: {request.onchainRequestId}
                </p>
                <p className="wallet-address">
                  Giao dịch tạo yêu cầu: {request.txHash || "Chưa cập nhật"}
                </p>
              </details>
            </section>
          )}
        </>
      );
    return (
      <>
        <PageHeader
          eyebrow="CÙNG GIA ĐÌNH THEO DÕI"
          title="Yêu cầu của bạn"
          description="Mọi bước duyệt và chi trả đều được cập nhật từ dữ liệu thật."
        />
        <RequestList requests={requests} />
        <ActivityList />
      </>
    );
  }
  if (!preview && mode === "withdraw")
    return (
      <WithdrawFlow vaults={shields} initialId={query.get("vault") || ""} />
    );
  let available = "0";
  if (policyState.policy) available = policyState.policy.availableNow;
  return (
    <>
      <PageHeader
        eyebrow="AN TÂM MỖI NGÀY"
        title={
          preview
            ? "Trải nghiệm người cao tuổi"
            : `Xin chào, ${auth.user?.fullName || "bạn"}`
        }
        description="Khoản hỗ trợ từ gia đình, luôn dễ xem và dễ sử dụng."
      />
      {policyState.error && (
        <div role="alert" className="member-error">
          <p>{policyState.error}</p>
          <button className="member-secondary" onClick={policyState.retry}>
            Kiểm tra hũ lại
          </button>
        </div>
      )}
      {policyState.policy && !policyState.policy.isBeneficiary && (
        <p className="member-notice">
          Bạn chưa được cấp quyền thụ hưởng hũ này. Hãy liên hệ người bảo hộ.
        </p>
      )}
      {preview && (
        <p className="member-notice">
          Chế độ xem trước. Đăng nhập tài khoản thành viên để thực hiện giao
          dịch cá nhân.
        </p>
      )}
      <div className="member-overview-grid">
        <div className="member-stack">
          <section className="support-vault">
            <div className="section-kicker">
              <ShieldCheck size={23} />
              HŨ HỖ TRỢ CỦA GIA ĐÌNH
            </div>
            {shields.length > 1 && (
              <label className="member-field">
                Chọn hũ hỗ trợ
                <select
                  value={vaultId}
                  onChange={(event) => setVaultId(event.target.value)}
                >
                  <option value="">Chọn hũ muốn sử dụng</option>
                  {shields.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {vault ? (
              <>
                <h2>{vault.name}</h2>
                <p className="vault-balance-label">Hũ đang có</p>
                <p className="vault-balance">
                  {amountLabel(
                    policyState.policy?.totalBalance || vault.exactTotalBalance,
                  )}{" "}
                  <span>{asset}</span>
                </p>
                <div className="available-row">
                  <span>Có thể rút ngay từ hũ</span>
                  <strong>
                    {policyState.policy
                      ? `${amountLabel(available)} ${asset}`
                      : "Đang kiểm tra"}
                  </strong>
                </div>
                <p className="vault-disclaimer">
                  Đây là số tiền chung của hũ. Khả dụng được kiểm tra lại khi
                  xác nhận.
                </p>
                <button
                  className="member-primary light"
                  disabled={
                    preview ||
                    !policyState.policy?.isBeneficiary ||
                    !policyState.policy?.isActive
                  }
                  onClick={() =>
                    router.push(`/dashboard/elderly/withdraw?vault=${vault.id}`)
                  }
                >
                  <ArrowDownLeft size={24} />
                  Rút về ví của tôi
                  <ArrowRight size={22} />
                </button>
              </>
            ) : (
              <EmptyState
                title={
                  shields.length
                    ? "Hãy chọn hũ hỗ trợ"
                    : "Chưa có hũ hỗ trợ phù hợp"
                }
              >
                Người bảo hộ cần cấp quyền thụ hưởng cho bạn trên hũ SHIELD.
              </EmptyState>
            )}
          </section>
          <section className="member-card reassurance">
            <ShieldCheck size={28} />
            <div>
              <h2>Bạn luôn được xem lại</h2>
              <p>
                Chọn số tiền, kiểm tra thông tin rồi mới xác nhận bằng ví Core.
              </p>
            </div>
          </section>
        </div>
        <div className="member-stack">
          <section className="member-card">
            <div className="section-heading">
              <h2>Yêu cầu gần đây</h2>
              <Link href="/dashboard/elderly/requests">
                Xem tất cả
                <ArrowRight size={18} />
              </Link>
            </div>
            <RequestList requests={requests.slice(0, 2)} />
          </section>
          <section className="family-help-card">
            <HeartHandshake size={34} />
            <h2>Cần người thân giúp?</h2>
            <p>Xem người bảo hộ được phân công và số liên hệ của gia đình.</p>
            <Link className="member-secondary" href="/dashboard/elderly/family">
              Gọi người thân
              <ArrowRight size={20} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function RequestList({
  requests,
}: {
  requests: ReturnType<typeof useFamily>["withdrawalRequests"];
}) {
  return requests.length ? (
    <div className="request-list">
      {requests.map((item) => (
        <Link
          key={item.id}
          className="request-card"
          href={`/dashboard/elderly/requests/${item.id}`}
        >
          <div>
            <span className="member-status">{requestStatus(item)}</span>
            <h3>
              {amountLabel(item.exactAmount)} {hubChain.nativeCurrency.symbol}
            </h3>
            <p>
              {item.vaultName} · {item.reason}
            </p>
            <time>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</time>
          </div>
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
      ))}
    </div>
  ) : (
    <EmptyState title="Chưa có yêu cầu">
      Khi bạn gửi yêu cầu cần duyệt, tiến độ sẽ hiện ở đây.
    </EmptyState>
  );
}

function WithdrawFlow({
  vaults,
  initialId,
}: {
  vaults: ReturnType<typeof useFamily>["dynamicVaults"];
  initialId: string;
}) {
  const auth = useAuth();
  const [vaultId, setVaultId] = useState(
    initialId || (vaults.length === 1 ? vaults[0].id : ""),
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Sinh hoạt");
  const [review, setReview] = useState(false);
  const [reviewPolicy, setReviewPolicy] = useState<MemberVaultPolicy | null>(
    null,
  );
  const [error, setError] = useState("");
  const tx = useMemberTransaction();
  const vault = vaults.find((item) => item.id === vaultId);
  const policyState = useVaultPolicy(vault?.id);
  const policy = review && reviewPolicy ? reviewPolicy : policyState.policy;
  const asset = hubChain.nativeCurrency.symbol;
  const units = (() => {
    try {
      return parseAmount(amount);
    } catch {
      return 0n;
    }
  })();
  const limit = parseEther(policy?.fastWithdrawLimit || "0");
  const large = units > limit;
  const maxQuick = parseEther(policy?.availableNow || "0");
  const validate = () => {
    if (!vault) throw new Error("Hãy chọn hũ hỗ trợ.");
    if (!policy?.isBeneficiary || !policy.isActive)
      throw new Error(
        "Đang kiểm tra quyền thụ hưởng. Hãy tải lại hoặc hỏi người bảo hộ.",
      );
    const value = parseAmount(amount);
    if (value > parseEther(policy.totalBalance))
      throw new Error("Số tiền vượt tổng hiện có của hũ.");
    if (value <= limit && value > maxQuick)
      throw new Error(
        "Hũ chưa đủ khoản có thể rút ngay. Hãy liên hệ người bảo hộ.",
      );
    return value;
  };
  const submit = async () => {
    try {
      const value = validate();
      await tx.execute({
        functionName: large ? "requestLargeWithdrawal" : "fastWithdraw",
        args: [
          BigInt(vault!.onchainVaultId),
          value,
          ...(large ? [reason] : []),
        ],
        path: large ? "/api/withdrawals/create" : "/api/vaults",
        method: large ? "POST" : "PATCH",
        body: large
          ? { vaultId: vault!.id }
          : { vaultId: vault!.id, action: "WITHDRAW" },
        preflight: async () => {
          const latest = await fetchVaultPolicy(vault!.id);
          if (!latest.isActive || !latest.isBeneficiary)
            throw new Error(
              "Quyền thụ hưởng đã thay đổi. Hãy tải lại trước khi xác nhận.",
            );
          if (
            value > parseEther(latest.fastWithdrawLimit) !== large ||
            latest.requiredApprovals !== policy!.requiredApprovals
          )
            throw new Error(
              "Chính sách hũ đã đổi. Hãy tải lại và xem lại giao dịch.",
            );
          if (
            value > parseEther(latest.totalBalance) ||
            (!large && value > parseEther(latest.availableNow))
          )
            throw new Error(
              "Khoản có thể rút đã thay đổi. Hãy tải lại trước khi xác nhận.",
            );
        },
      });
    } catch (err: any) {
      setError(err.message);
    }
  };
  const finished = tx.state === "success" || tx.state === "tracking";
  return (
    <>
      <PageHeader
        eyebrow="RÚT VỀ VÍ CÁ NHÂN"
        title={
          finished
            ? tx.state === "tracking"
              ? "Đang theo dõi giao dịch"
              : large
                ? "Đã gửi yêu cầu"
                : "Đã rút về ví"
            : review
              ? "Xem lại thông tin"
              : "Bạn muốn rút bao nhiêu?"
        }
        back="/dashboard/elderly"
      />
      <StatusTimeline
        steps={["Chọn số tiền", "Xem lại", "Xác nhận Core"]}
        current={finished ? 2 : review ? 1 : 0}
      />
      {policyState.error && (
        <div role="alert" className="member-error">
          <p>{policyState.error}</p>
          <button className="member-secondary" onClick={policyState.retry}>
            Kiểm tra hũ lại
          </button>
        </div>
      )}
      <div className="transaction-layout">
        <section className="member-card member-form">
          {!review && !finished ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  validate();
                  setReviewPolicy(policy);
                  setReview(true);
                  setError("");
                } catch (err: any) {
                  setError(err.message);
                }
              }}
            >
              <label className="member-field">
                Hũ nguồn
                <select
                  value={vaultId}
                  onChange={(event) => {
                    setVaultId(event.target.value);
                    setError("");
                  }}
                >
                  <option value="">Chọn hũ hỗ trợ</option>
                  {vaults.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <AmountInput value={amount} onChange={setAmount} asset={asset} />
              {maxQuick > 0n && (
                <div className="amount-suggestions">
                  {[
                    ...new Set(
                      [maxQuick / 4n, maxQuick / 2n, maxQuick]
                        .filter((value) => value > 0n)
                        .map((value) => formatEther(value)),
                    ),
                  ].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setAmount(value)}
                    >
                      {amountLabel(value)} {asset}
                    </button>
                  ))}
                </div>
              )}
              {large && (
                <label className="member-field">
                  Mục đích công khai
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  >
                    {[
                      "Sinh hoạt",
                      "Mua sắm",
                      "Việc gia đình",
                      "Hỗ trợ khác",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <small>
                    Nhãn này được ghi công khai trên blockchain. Không nhập
                    thông tin sức khỏe hay thông tin riêng tư.
                  </small>
                </label>
              )}
              {error && (
                <p className="member-error" role="alert">
                  {error}
                </p>
              )}
              <button className="member-primary" type="submit">
                Xem lại thông tin
                <ArrowRight size={22} />
              </button>
            </form>
          ) : (
            <>
              <TransactionReview
                amount={amountLabel(formatEther(units))}
                asset={asset}
                vault={vault?.name || ""}
                recipient={auth.linkedWallet?.address || ""}
              />
              {large && (
                <p className="member-notice">
                  Khoản này cần {policy?.requiredApprovals} người bảo hộ duyệt
                  trước khi chi trả. Mục đích: {reason}.
                </p>
              )}
              {(tx.message || error) && (
                <p
                  role={tx.state === "error" ? "alert" : "status"}
                  className={
                    tx.state === "error" ? "member-error" : "member-notice"
                  }
                >
                  {error || tx.message}
                </p>
              )}
              {tx.hash && (
                <details>
                  <summary>Chi tiết giao dịch</summary>
                  <p className="wallet-address">{tx.hash}</p>
                  <p>Mạng: {hubChain.name}</p>
                </details>
              )}
              {!finished && (
                <>
                  <button
                    className="member-primary"
                    disabled={tx.busy || tx.blocked}
                    onClick={() => void submit()}
                  >
                    {tx.busy ? "Đang chờ xác nhận…" : "Mở Core để xác nhận"}
                  </button>
                  <button
                    className="member-secondary"
                    disabled={tx.busy}
                    onClick={() => {
                      setReview(false);
                      setError("");
                    }}
                  >
                    Sửa số tiền
                  </button>
                </>
              )}
              {finished && (
                <Link
                  className="member-primary"
                  href={
                    large ? "/dashboard/elderly/requests" : "/dashboard/elderly"
                  }
                >
                  {large ? "Theo dõi yêu cầu" : "Về trang chính"}
                  <ArrowRight size={20} />
                </Link>
              )}
            </>
          )}
        </section>
        <aside className="member-card">
          <ShieldCheck size={32} />
          <h2>Bạn là người xác nhận</h2>
          <p>
            Kinetix chỉ gửi khi bạn xác nhận trong Core bằng đúng ví đã liên
            kết.
          </p>
          <p>
            Nếu đã có mã giao dịch, hãy tiếp tục theo dõi tại đây. Không gửi lại
            chỉ vì mạng chậm.
          </p>
          <Link href="/dashboard/elderly/family" className="member-text-button">
            Nhờ người thân hỗ trợ
          </Link>
        </aside>
      </div>
    </>
  );
}
