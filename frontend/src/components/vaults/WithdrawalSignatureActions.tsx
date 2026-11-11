"use client";

import React, { useEffect, useRef, useState } from "react";
import { createWalletClient, custom } from "viem";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { getCoreProvider } from "@/lib/web3/client";
import { DEPLOYMENT, hubChain } from "@/contracts/config";
import type { DynamicVaultItem } from "@/types";
import { ReviewDialog, type Review } from "./ExperiencePrimitives";

type Request = {
  id: string;
  recipient: string;
  amountWei: string;
  deadline: string;
  executed: boolean;
  expired: boolean;
  stale: boolean;
  signed: boolean;
  selfApproval?: boolean;
};

export function WithdrawalSignatureActions({
  vault,
  request,
  canSign,
  canExecute,
  onComplete,
}: {
  vault: DynamicVaultItem;
  request: Request;
  canSign: boolean;
  canExecute: boolean;
  onComplete: () => Promise<void>;
}) {
  const auth = useAuth();
  const family = useFamily();
  const transaction = useMemberTransaction();
  const [signatures, setSignatures] = useState("");
  const [generated, setGenerated] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const locked = useRef(false);
  const key = `${auth.user?.id}:${family.currentWorkspace?.id}:${vault.id}:${request.id}`;
  const scope = useRef(key);
  scope.current = key;
  useEffect(() => {
    scope.current = key;
    return () => {
      scope.current = "";
    };
  }, [key]);
  const pending = busy || transaction.busy;
  const unavailable =
    !DEPLOYMENT.enabled ||
    request.executed ||
    request.expired ||
    request.stale ||
    !auth.walletMatches;
  const ensureScope = () => {
    if (scope.current !== key)
      throw new Error("Gia đình hoặc yêu cầu đã thay đổi. Mở lại thao tác.");
  };
  const sign = async () => {
    if (locked.current || unavailable || !canSign || request.selfApproval) return;
    locked.current = true;
    setBusy(true);
    setNotice("");
    try {
      const mapped = family.withdrawalRequests.find(
        (item) => item.id === request.id,
      );
      if (!mapped?.onchainRequestId || !vault.onchainHub)
        throw new Error("Yêu cầu chưa có mã hợp đồng đã xác minh.");
      const snapshot = await authRequest(
        `/api/vaults/${vault.id}/state`,
        undefined,
        "GET",
      );
      ensureScope();
      const current: Request | undefined = snapshot.data.requests.find(
        (item: Request) => item.id === request.id,
      );
      if (
        !current ||
        current.executed ||
        current.expired ||
        current.stale ||
        current.selfApproval ||
        !snapshot.data.capabilities.approveWithdrawal.allowed
      )
        throw new Error(
          "Yêu cầu đã thay đổi hoặc bạn không còn quyền ký duyệt.",
        );
      const provider = getCoreProvider();
      if (!provider)
        throw new Error("Kết nối ví Core đã liên kết để ký duyệt.");
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${hubChain.id.toString(16)}` }],
      });
      ensureScope();
      const identity = await authRequest("/api/auth/me", undefined, "GET");
      ensureScope();
      if (
        identity.user?.id !== auth.user?.id ||
        identity.linkedWallet?.address?.toLowerCase() !==
          accounts[0]?.toLowerCase() ||
        accounts[0]?.toLowerCase() !==
          auth.linkedWallet?.address.toLowerCase() ||
        Number(await provider.request({ method: "eth_chainId" })) !==
          hubChain.id
      )
        throw new Error(
          "Chọn đúng ví đã liên kết và mạng Avalanche Fuji trước khi ký.",
        );
      ensureScope();
      const signature = await createWalletClient({
        transport: custom(provider),
      }).signTypedData({
        account: accounts[0],
        domain: {
          name: "FamilyHub",
          version: "1",
          chainId: hubChain.id,
          verifyingContract: vault.onchainHub as `0x${string}`,
        },
        types: {
          WithdrawalApproval: [
            { name: "requestId", type: "uint256" },
            { name: "vaultId", type: "uint256" },
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "WithdrawalApproval",
        message: {
          requestId: BigInt(mapped.onchainRequestId),
          vaultId: BigInt(vault.onchainVaultId),
          recipient: current.recipient as `0x${string}`,
          amount: BigInt(current.amountWei),
          nonce: BigInt(mapped.onchainRequestId),
        },
      });
      ensureScope();
      setGenerated(signature);
      setNotice(
        "Đã tạo chữ ký. Chưa gửi giao dịch hay chi tiền. Bạn có thể tự chuyển chữ ký này cho người tổng hợp trong gia đình.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const prepareExecution = () => {
    const collected = signatures
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (
      !collected.length ||
      collected.length > 50 ||
      collected.some((signature) => !/^0x[0-9a-f]{130}$/i.test(signature)) ||
      new Set(collected.map((signature) => signature.toLowerCase())).size !==
        collected.length
    ) {
      setNotice(
        "Dán mỗi chữ ký 0x gồm 130 ký tự hex trên một dòng; tối đa 50 chữ ký, không trùng lặp.",
      );
      return;
    }
    const mapped = family.withdrawalRequests.find(
      (item) => item.id === request.id,
    );
    if (!mapped?.onchainRequestId) {
      setNotice("Chưa có mã yêu cầu on-chain. Tải lại dữ liệu.");
      return;
    }
    setReview({
      title: "Xem lại khoản chi bằng chữ ký",
      detail: `${vault.name} · ${collected.length} chữ ký. Hợp đồng sẽ kiểm tra người ký, thời hạn và số chữ ký hợp lệ trước khi chi.`,
      amountWei: request.amountWei,
      recipient: request.recipient,
      confirmLabel: "Mở Core để gửi khoản chi",
      confirm: async () => {
        ensureScope();
        const completed = await transaction.execute({
          functionName: "executeWithdrawalWithSignatures",
          args: [BigInt(mapped.onchainRequestId!), collected],
          path: "/api/withdrawals/execute-signatures",
          body: { requestId: request.id },
        });
        if (!completed)
          throw new Error(
            "Chưa hoàn tất khoản chi. Kiểm tra thông báo ví và trạng thái giao dịch bên dưới.",
          );
        await onComplete();
      },
    });
  };
  if (
    request.executed ||
    request.expired ||
    request.stale ||
    (!canSign && !canExecute)
  )
    return null;
  return (
    <details className="vx-signature-actions">
      <summary>Duyệt bằng chữ ký & tổng hợp khoản chi</summary>
      <div className="vx-form">
        <p className="vx-muted">
          Có thể ký duyệt bằng Core rồi tự gửi chữ ký cho người tổng hợp. Tạo
          chữ ký chưa tính là đã duyệt on-chain; đủ chữ ký hợp lệ mới có thể gửi
          khoản chi.
        </p>
        {canSign && !request.signed && !request.selfApproval && (
          <button
            type="button"
            className="vx-button-secondary"
            disabled={pending || unavailable}
            onClick={() =>
              setReview({
                title: "Tạo chữ ký duyệt",
                detail: `Duyệt khoản chi từ ${vault.name}. Chữ ký có thể được dùng để thực hiện đúng khoản chi này trước khi yêu cầu hết hạn.`,
                amountWei: request.amountWei,
                recipient: request.recipient,
                confirmLabel: "Ký duyệt trong Core",
                confirm: sign,
              })
            }
          >
            Tạo chữ ký duyệt
          </button>
        )}
        {generated && (
          <>
            <label>
              Chữ ký vừa tạo
              <textarea value={generated} readOnly rows={4} />
            </label>
            <button
              type="button"
              className="vx-button-secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(generated)
                  .then(() => setNotice("Đã sao chép chữ ký."))
                  .catch(() =>
                    setNotice(
                      "Chưa sao chép được. Chọn và sao chép chữ ký trong ô phía trên.",
                    ),
                  )
              }
            >
              Sao chép chữ ký
            </button>
          </>
        )}
        {canExecute && (
          <>
            <label>
              Các chữ ký đã thu thập
              <textarea
                value={signatures}
                onChange={(event) => setSignatures(event.target.value)}
                rows={4}
                placeholder="Mỗi chữ ký 0x… trên một dòng"
                disabled={pending}
              />
            </label>
            <button
              type="button"
              className="vx-button"
              disabled={pending || unavailable || !signatures.trim()}
              onClick={prepareExecution}
            >
              Xem lại & gửi khoản chi
            </button>
          </>
        )}
        {notice && (
          <p role="status" className="vx-funding-warning">
            {notice}
          </p>
        )}
        {transaction.message && (
          <p role="status" className="vx-muted">
            {transaction.message}
          </p>
        )}
        <ReviewDialog
          review={review}
          close={() => setReview(null)}
          busy={pending}
        />
      </div>
    </details>
  );
}
