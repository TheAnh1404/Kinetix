"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { parseEther, formatEther } from "viem";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import {
  GroupFundItem,
  GroupExpenseRequest,
  GroupObligation,
  GroupAuditEvent,
  CreateFundParams,
  ProposeExpenseParams,
  GroupExpenseApproval,
} from "@/types/groupFinance";
import { DEMO_PERSONAS } from "../../../shared/demoPersonas";

// Dữ liệu mẫu chuẩn nghiệp vụ ban đầu (Seed Data)
function getInitialFunds(workspaceId: string, adminWallet: string): GroupFundItem[] {
  return [
    {
      id: "fund-op-1",
      workspaceId,
      name: "Quỹ Hoạt Động & Vận Hành",
      description: "Ngân sách sinh hoạt thường nhật, thuê địa điểm, nước uống và chi phí định kỳ.",
      fundType: "OPERATING",
      custodyType: "ONCHAIN_HUB",
      balanceWei: parseEther("24.5").toString(),
      reservedWei: parseEther("3.2").toString(),
      availableWei: parseEther("21.3").toString(),
      balanceAvax: 24.5,
      reservedAvax: 3.2,
      availableAvax: 21.3,
      fastWithdrawLimitWei: parseEther("0.5").toString(),
      fastWithdrawLimitAvax: 0.5,
      requiredApprovals: 2,
      totalSigners: 3,
      signers: [
        adminWallet || DEMO_PERSONAS.admin.wallet,
        DEMO_PERSONAS.elderly.wallet,
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ],
      status: "ACTIVE",
      createdAt: "10/11/2026",
    },
    {
      id: "fund-goal-1",
      workspaceId,
      name: "Quỹ Mua Thiết Bị Workshop Subnet",
      description: "Góp tiền mua thiết bị quay hình và micro phục vụ chuỗi Workshop Avalanche L1.",
      fundType: "GOAL",
      custodyType: "ONCHAIN_HUB",
      balanceWei: parseEther("18.0").toString(),
      reservedWei: parseEther("0").toString(),
      availableWei: parseEther("18.0").toString(),
      balanceAvax: 18.0,
      reservedAvax: 0,
      availableAvax: 18.0,
      fastWithdrawLimitWei: "0",
      fastWithdrawLimitAvax: 0,
      requiredApprovals: 2,
      totalSigners: 3,
      signers: [
        adminWallet || DEMO_PERSONAS.admin.wallet,
        DEMO_PERSONAS.elderly.wallet,
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ],
      targetAmountWei: parseEther("25.0").toString(),
      targetAmountAvax: 25.0,
      targetDeadline: "30/11/2026",
      goalReached: false,
      status: "ACTIVE",
      createdAt: "08/11/2026",
    },
  ];
}

function getInitialExpenses(workspaceId: string, userWallet: string): GroupExpenseRequest[] {
  return [
    {
      id: "exp-req-1",
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      fundType: "OPERATING",
      proposerId: "user-member-2",
      proposerName: "Hoàng Minh",
      proposerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      recipientAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      recipientName: "Nhà xe & Đơn vị vận chuyển ABC",
      amountWei: parseEther("3.2").toString(),
      amountAvax: 3.2,
      title: "Chi phí thuê xe di chuyển dã ngoại CLB",
      purpose: "Hợp đồng thuê xe 29 chỗ đưa đón thành viên tham gia hoạt động thực tế ngoại thành.",
      category: "Đi lại & Vận chuyển",
      receiptAttachmentUrl: "/images/receipt-transport.jpg",
      receiptAttachmentHash: "0x8f3c1a4e7b2d5f6a9c0e1b2d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
      requiredApprovals: 2,
      approvedCount: 1,
      status: "PENDING_APPROVAL",
      deadline: "16/11/2026 18:00",
      createdAt: "14/11/2026 14:30",
      approvals: [
        {
          id: "app-1",
          approverUserId: "user-admin",
          approverName: "Chủ Nhiệm (Admin)",
          approverAddress: DEMO_PERSONAS.admin.wallet,
          decision: "APPROVE",
          comment: "Đã kiểm tra hợp đồng vận chuyển, đúng hạn mức duyệt.",
          createdAt: "14/11/2026 15:10",
        },
      ],
    },
    {
      id: "exp-req-2",
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      fundType: "OPERATING",
      proposerId: "user-current",
      proposerName: "Bạn (Current User)",
      proposerAddress: userWallet,
      recipientAddress: userWallet,
      recipientName: "Bạn (Hoàn tiền mua dụng cụ)",
      amountWei: parseEther("1.5").toString(),
      amountAvax: 1.5,
      title: "Hoàn ứng mua tài liệu in ấn và thẻ đeo thành viên",
      purpose: "Mua giấy in màu, phôi thẻ thành viên và dây đeo phục vụ sinh hoạt tháng 11.",
      category: "Văn phòng phẩm",
      receiptAttachmentUrl: "/images/receipt-stationery.jpg",
      receiptAttachmentHash: "0x2c4a6e8b0d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c",
      requiredApprovals: 2,
      approvedCount: 0,
      status: "PENDING_APPROVAL",
      deadline: "18/11/2026 12:00",
      createdAt: "15/11/2026 09:15",
      approvals: [],
    },
  ];
}

function getInitialObligations(userWallet: string): GroupObligation[] {
  return [
    {
      id: "ob-1",
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      memberUserId: "current-user",
      memberName: "Bạn",
      memberAddress: userWallet,
      amountWei: parseEther("0.5").toString(),
      amountAvax: 0.5,
      cycle: "MONTHLY",
      dueDate: "20/11/2026",
      status: "PENDING",
    },
    {
      id: "ob-2",
      fundId: "fund-goal-1",
      fundName: "Quỹ Mua Thiết Bị Workshop Subnet",
      memberUserId: "current-user",
      memberName: "Bạn",
      memberAddress: userWallet,
      amountWei: parseEther("1.0").toString(),
      amountAvax: 1.0,
      cycle: "ONCE",
      dueDate: "25/11/2026",
      status: "PENDING",
    },
  ];
}

function getInitialAuditEvents(workspaceId: string): GroupAuditEvent[] {
  return [
    {
      id: "audit-1",
      workspaceId,
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      actorName: "Bố Ba (Admin)",
      actorWallet: DEMO_PERSONAS.admin.wallet,
      action: "CONTRIBUTION_MADE",
      description: "Góp quỹ hoạt động tháng 11",
      amountAvax: 5.0,
      txHash: "0xa81c92d3f45e67b890123456789abcdef0123456789abcdef0123456789abcde",
      createdAt: "14/11/2026 10:20",
    },
    {
      id: "audit-2",
      workspaceId,
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      actorName: "Hoàng Minh",
      actorWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      action: "EXPENSE_PROPOSED",
      description: "Tạo đề nghị chi thuê xe dã ngoại CLB",
      amountAvax: 3.2,
      createdAt: "14/11/2026 14:30",
    },
    {
      id: "audit-3",
      workspaceId,
      fundId: "fund-op-1",
      fundName: "Quỹ Hoạt Động & Vận Hành",
      actorName: "Bố Ba (Admin)",
      actorWallet: DEMO_PERSONAS.admin.wallet,
      action: "EXPENSE_APPROVED",
      description: "Ký duyệt đề nghị chi thuê xe dã ngoại (1/2 chữ ký)",
      createdAt: "14/11/2026 15:10",
    },
  ];
}

export function useGroupFinance() {
  const auth = useAuth();
  const family = useFamily();
  const workspaceId = family.currentWorkspace?.id || "default-ws";
  const userWallet = auth.linkedWallet?.address || auth.user?.walletAddress || DEMO_PERSONAS.admin.wallet;
  const adminWallet = family.currentWorkspace?.creatorWallet || DEMO_PERSONAS.admin.wallet;

  const [funds, setFunds] = useState<GroupFundItem[]>(() =>
    getInitialFunds(workspaceId, adminWallet)
  );
  const [selectedFundId, setSelectedFundId] = useState<string>("all");
  const [expenses, setExpenses] = useState<GroupExpenseRequest[]>(() =>
    getInitialExpenses(workspaceId, userWallet)
  );
  const [obligations, setObligations] = useState<GroupObligation[]>(() =>
    getInitialObligations(userWallet)
  );
  const [auditEvents, setAuditEvents] = useState<GroupAuditEvent[]>(() =>
    getInitialAuditEvents(workspaceId)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cố gắng đồng bộ với backend nếu có
  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await authRequest(`/api/groups/${workspaceId}/funds`, undefined, "GET");
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFunds(res.data);
      }
    } catch {
      // Giữ nguyên dữ liệu cục bộ nếu endpoint backend chưa sẵn sàng
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Danh sách các đề nghị chi đang chờ người dùng hiện tại ký duyệt
  const pendingUserApprovals = useMemo(() => {
    return expenses.filter((req) => {
      if (req.status !== "PENDING_APPROVAL") return false;
      // Ràng buộc bảo mật: Người thụ hưởng không được tự duyệt
      if (req.recipientAddress.toLowerCase() === userWallet.toLowerCase()) return false;
      // Kiểm tra người dùng đã ký duyệt chưa
      const hasSigned = req.approvals.some(
        (a) => a.approverAddress.toLowerCase() === userWallet.toLowerCase()
      );
      return !hasSigned;
    });
  }, [expenses, userWallet]);

  // Danh sách các đề nghị chi đã đủ phiếu nhưng chờ thanh toán
  const awaitingPaymentExpenses = useMemo(() => {
    return expenses.filter((req) => req.status === "APPROVED");
  }, [expenses]);

  // Tổng hợp số dư toàn nhóm
  const summary = useMemo(() => {
    let totalBalanceAvax = 0;
    let totalReservedAvax = 0;
    let totalAvailableAvax = 0;

    for (const fund of funds) {
      totalBalanceAvax += fund.balanceAvax;
      totalReservedAvax += fund.reservedAvax;
      totalAvailableAvax += fund.availableAvax;
    }

    return {
      totalBalanceAvax: Number(totalBalanceAvax.toFixed(4)),
      totalReservedAvax: Number(totalReservedAvax.toFixed(4)),
      totalAvailableAvax: Number(totalAvailableAvax.toFixed(4)),
      fundsCount: funds.length,
      pendingApprovalsCount: pendingUserApprovals.length,
      awaitingPaymentCount: awaitingPaymentExpenses.length,
    };
  }, [funds, pendingUserApprovals.length, awaitingPaymentExpenses.length]);

  // Tạo Quỹ Mới (Operating hoặc Goal)
  const createFund = useCallback(
    async (params: CreateFundParams) => {
      try {
        setError(null);
        if (!params.name.trim()) throw new Error("Vui lòng nhập tên quỹ.");
        if (params.requiredApprovals < 1) throw new Error("Ngưỡng duyệt phải từ 1 người trở lên.");
        if (params.fundType === "GOAL" && (!params.targetAmountAvax || params.targetAmountAvax <= 0)) {
          throw new Error("Quỹ mục tiêu cần số tiền mục tiêu lớn hơn 0.");
        }

        const newFundId = `fund-${Date.now()}`;
        const newFund: GroupFundItem = {
          id: newFundId,
          workspaceId,
          name: params.name.trim(),
          description: params.description?.trim(),
          fundType: params.fundType,
          custodyType: params.custodyType,
          balanceWei: "0",
          reservedWei: "0",
          availableWei: "0",
          balanceAvax: 0,
          reservedAvax: 0,
          availableAvax: 0,
          fastWithdrawLimitWei:
            params.fundType === "OPERATING" && params.fastWithdrawLimitAvax
              ? parseEther(params.fastWithdrawLimitAvax.toString()).toString()
              : "0",
          fastWithdrawLimitAvax:
            params.fundType === "OPERATING" && params.fastWithdrawLimitAvax
              ? params.fastWithdrawLimitAvax
              : 0,
          requiredApprovals: params.requiredApprovals,
          totalSigners: params.guardianWallets.length || 3,
          signers:
            params.guardianWallets.length > 0
              ? params.guardianWallets
              : [userWallet, adminWallet],
          targetAmountWei:
            params.fundType === "GOAL" && params.targetAmountAvax
              ? parseEther(params.targetAmountAvax.toString()).toString()
              : undefined,
          targetAmountAvax: params.targetAmountAvax,
          targetDeadline: params.targetDeadline,
          goalReached: false,
          status: "ACTIVE",
          createdAt: new Date().toLocaleDateString("vi-VN"),
        };

        // Ghi nhận audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: newFundId,
          fundName: newFund.name,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "FUND_CREATED",
          description: `Khởi tạo ${params.fundType === "OPERATING" ? "Quỹ Hoạt Động" : "Quỹ Mục Tiêu"}: ${params.name}`,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay",
        };

        setFunds((prev) => [newFund, ...prev]);
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Thử đồng bộ backend nếu có
        try {
          await authRequest(`/api/groups/${workspaceId}/funds`, params, "POST");
        } catch {
          // Bỏ qua lỗi backend fallback
        }

        return { success: true, fund: newFund };
      } catch (err: any) {
        const msg = err.message || "Không thể khởi tạo quỹ.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [workspaceId, userWallet, adminWallet, auth.user?.fullName]
  );

  // Đóng góp vào quỹ (Contribution)
  const contribute = useCallback(
    async (params: { fundId: string; amount: string; txHash?: string }) => {
      try {
        setError(null);
        const amountNum = parseFloat(params.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error("Số tiền góp phải lớn hơn 0.");
        }

        const targetFund = funds.find((f) => f.id === params.fundId);
        if (!targetFund) throw new Error("Không tìm thấy quỹ chỉ định.");

        const simulatedTxHash =
          params.txHash ||
          `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

        // Cập nhật số dư Quỹ
        setFunds((prev) =>
          prev.map((f) => {
            if (f.id !== params.fundId) return f;
            const newBalanceAvax = Number((f.balanceAvax + amountNum).toFixed(4));
            const newAvailableAvax = Number((f.availableAvax + amountNum).toFixed(4));
            const goalReached =
              f.fundType === "GOAL" && f.targetAmountAvax
                ? newBalanceAvax >= f.targetAmountAvax
                : f.goalReached;

            return {
              ...f,
              balanceAvax: newBalanceAvax,
              balanceWei: parseEther(newBalanceAvax.toString()).toString(),
              availableAvax: newAvailableAvax,
              availableWei: parseEther(newAvailableAvax.toString()).toString(),
              goalReached,
            };
          })
        );

        // Đánh dấu nghĩa vụ nộp nếu có
        setObligations((prev) =>
          prev.map((ob) => {
            if (ob.fundId === params.fundId && ob.memberAddress.toLowerCase() === userWallet.toLowerCase()) {
              return { ...ob, status: "PAID" };
            }
            return ob;
          })
        );

        // Ghi nhận Audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: targetFund.id,
          fundName: targetFund.name,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "CONTRIBUTION_MADE",
          description: `Đóng góp vào quỹ ${targetFund.name}`,
          amountAvax: amountNum,
          txHash: simulatedTxHash,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay",
        };
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Thử đồng bộ backend
        try {
          await authRequest(`/api/groups/${workspaceId}/funds/${params.fundId}/contributions/reconcile`, {
            amountWei: parseEther(params.amount).toString(),
            txHash: simulatedTxHash,
          });
        } catch {
          // Bỏ qua lỗi backend fallback
        }

        return { success: true, txHash: simulatedTxHash };
      } catch (err: any) {
        const msg = err.message || "Không thể xử lý đóng góp quỹ.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [funds, userWallet, workspaceId, auth.user?.fullName]
  );

  // Tạo đề nghị chi (Expense Request)
  const proposeExpense = useCallback(
    async (params: ProposeExpenseParams) => {
      try {
        setError(null);
        if (!params.title.trim()) throw new Error("Vui lòng nhập tên khoản chi.");
        if (!params.recipientAddress.trim().startsWith("0x")) {
          throw new Error("Địa chỉ ví người nhận không đúng định dạng Avalanche.");
        }
        if (params.amountAvax <= 0) throw new Error("Số tiền chi phải lớn hơn 0.");

        const fund = funds.find((f) => f.id === params.fundId);
        if (!fund) throw new Error("Không tìm thấy quỹ tương ứng.");

        // Kiểm tra số dư khả dụng (Invariant Check: availableBalance >= amount)
        if (fund.availableAvax < params.amountAvax) {
          throw new Error(
            `Số dư khả dụng (${fund.availableAvax.toFixed(2)} AVAX) không đủ để giữ chỗ cho khoản chi này.`
          );
        }

        // Kiểm tra điều kiện mở khóa với Quỹ mục tiêu
        if (fund.fundType === "GOAL" && !fund.goalReached) {
          throw new Error(
            `Quỹ mục tiêu chưa đạt 100% chỉ tiêu (${fund.balanceAvax}/${fund.targetAmountAvax} AVAX) nên chưa mở khóa đề nghị chi.`
          );
        }

        // Xác định xem khoản chi có đủ điều kiện rút nhanh (Fast Spend) hay không
        const isFastSpend =
          fund.fundType === "OPERATING" &&
          fund.fastWithdrawLimitAvax > 0 &&
          params.amountAvax <= fund.fastWithdrawLimitAvax;

        const newExpenseId = `exp-req-${Date.now()}`;
        const newExpense: GroupExpenseRequest = {
          id: newExpenseId,
          fundId: fund.id,
          fundName: fund.name,
          fundType: fund.fundType,
          proposerId: auth.user?.id || "user-current",
          proposerName: auth.user?.fullName || "Bạn",
          proposerAddress: userWallet,
          recipientAddress: params.recipientAddress.trim(),
          recipientName: params.recipientName.trim() || "Người nhận bên ngoài",
          amountWei: parseEther(params.amountAvax.toString()).toString(),
          amountAvax: params.amountAvax,
          title: params.title.trim(),
          purpose: params.purpose.trim(),
          category: params.category || "Chi tiêu khác",
          receiptAttachmentUrl: params.receiptAttachmentUrl || null,
          requiredApprovals: isFastSpend ? 1 : fund.requiredApprovals,
          approvedCount: isFastSpend ? 1 : 0,
          status: isFastSpend ? "APPROVED" : "PENDING_APPROVAL",
          deadline: "Trong vòng 48 giờ",
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay",
          approvals: isFastSpend
            ? [
                {
                  id: `app-${Date.now()}`,
                  approverUserId: auth.user?.id || "user-current",
                  approverName: auth.user?.fullName || "Bạn",
                  approverAddress: userWallet,
                  decision: "APPROVE",
                  comment: "Giải ngân nhanh theo hạn mức quy định",
                  createdAt: "Vừa xong",
                },
              ]
            : [],
        };

        // Giữ chỗ (Reserve) số tiền này khỏi số dư khả dụng
        setFunds((prev) =>
          prev.map((f) => {
            if (f.id !== fund.id) return f;
            const newReserved = Number((f.reservedAvax + params.amountAvax).toFixed(4));
            const newAvailable = Number((f.availableAvax - params.amountAvax).toFixed(4));
            return {
              ...f,
              reservedAvax: newReserved,
              reservedWei: parseEther(newReserved.toString()).toString(),
              availableAvax: newAvailable,
              availableWei: parseEther(newAvailable.toString()).toString(),
            };
          })
        );

        setExpenses((prev) => [newExpense, ...prev]);

        // Ghi Audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: fund.id,
          fundName: fund.name,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "EXPENSE_PROPOSED",
          description: `Đề nghị chi: ${params.title} (${params.amountAvax} AVAX)${isFastSpend ? " [Đủ điều kiện chi nhanh]" : ""}`,
          amountAvax: params.amountAvax,
          createdAt: "Vừa xong",
        };
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Thử đồng bộ backend
        try {
          await authRequest(`/api/groups/${workspaceId}/funds/${fund.id}/expenses`, {
            title: params.title,
            purpose: params.purpose,
            category: params.category,
            amountWei: parseEther(params.amountAvax.toString()).toString(),
            recipientAddress: params.recipientAddress,
            recipientName: params.recipientName,
            receiptAttachmentUrl: params.receiptAttachmentUrl,
          });
        } catch {
          // Bỏ qua lỗi fallback
        }

        return { success: true, expense: newExpense };
      } catch (err: any) {
        const msg = err.message || "Không thể tạo đề nghị chi.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [funds, userWallet, workspaceId, auth.user?.fullName, auth.user?.id]
  );

  // Ký duyệt đề nghị chi (Approval)
  const approveExpense = useCallback(
    async (expenseId: string, comment?: string) => {
      try {
        setError(null);
        const req = expenses.find((e) => e.id === expenseId);
        if (!req) throw new Error("Không tìm thấy đề nghị chi tiêu.");

        // RÀNG BUỘC BẢO MẬT: Người thụ hưởng không được tự duyệt cho chính mình
        if (req.recipientAddress.toLowerCase() === userWallet.toLowerCase()) {
          throw new Error("Bạn là người thụ hưởng khoản chi này, không thể tự duyệt theo quy tắc an toàn.");
        }

        // Chống bỏ phiếu trùng
        const alreadyVoted = req.approvals.some(
          (a) => a.approverAddress.toLowerCase() === userWallet.toLowerCase()
        );
        if (alreadyVoted) throw new Error("Bạn đã ký duyệt đề nghị này rồi.");

        const newApproval: GroupExpenseApproval = {
          id: `app-${Date.now()}`,
          approverUserId: auth.user?.id || "user-current",
          approverName: auth.user?.fullName || "Bạn",
          approverAddress: userWallet,
          decision: "APPROVE",
          comment: comment || "Đồng thuận giải ngân",
          createdAt: "Vừa xong",
        };

        const updatedApprovals = [...req.approvals, newApproval];
        const newApprovedCount = updatedApprovals.length;
        const reachedQuorum = newApprovedCount >= req.requiredApprovals;
        const newStatus = reachedQuorum ? "APPROVED" : "PENDING_APPROVAL";

        setExpenses((prev) =>
          prev.map((e) => {
            if (e.id !== expenseId) return e;
            return {
              ...e,
              approvals: updatedApprovals,
              approvedCount: newApprovedCount,
              status: newStatus,
            };
          })
        );

        // Ghi Audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: req.fundId,
          fundName: req.fundName,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "EXPENSE_APPROVED",
          description: `Ký duyệt khoản chi: ${req.title} (${newApprovedCount}/${req.requiredApprovals} chữ ký)${reachedQuorum ? " [Đã đủ phiếu]" : ""}`,
          amountAvax: req.amountAvax,
          createdAt: "Vừa xong",
        };
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Thử đồng bộ backend
        try {
          await authRequest(`/api/expenses/${expenseId}/approve`, {
            comment: comment || "Đồng thuận giải ngân",
          });
        } catch {
          // Fallback
        }

        return { success: true };
      } catch (err: any) {
        const msg = err.message || "Không thể ký duyệt đề nghị chi.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [expenses, userWallet, workspaceId, auth.user?.fullName, auth.user?.id]
  );

  // Từ chối đề nghị chi (Reject)
  const rejectExpense = useCallback(
    async (expenseId: string, reason: string) => {
      try {
        setError(null);
        if (!reason.trim()) throw new Error("Vui lòng cung cấp lý do từ chối.");

        const req = expenses.find((e) => e.id === expenseId);
        if (!req) throw new Error("Không tìm thấy đề nghị chi tiêu.");

        // Giải phóng khoản giữ chỗ (reservedBalance -= amount)
        setFunds((prev) =>
          prev.map((f) => {
            if (f.id !== req.fundId) return f;
            const newReserved = Math.max(0, Number((f.reservedAvax - req.amountAvax).toFixed(4)));
            const newAvailable = Number((f.availableAvax + req.amountAvax).toFixed(4));
            return {
              ...f,
              reservedAvax: newReserved,
              reservedWei: parseEther(newReserved.toString()).toString(),
              availableAvax: newAvailable,
              availableWei: parseEther(newAvailable.toString()).toString(),
            };
          })
        );

        setExpenses((prev) =>
          prev.map((e) => {
            if (e.id !== expenseId) return e;
            return {
              ...e,
              status: "REJECTED",
            };
          })
        );

        // Ghi Audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: req.fundId,
          fundName: req.fundName,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "EXPENSE_REJECTED",
          description: `Từ chối khoản chi: ${req.title}. Lý do: ${reason}`,
          createdAt: "Vừa xong",
        };
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Đồng bộ backend
        try {
          await authRequest(`/api/expenses/${expenseId}/reject`, { reason });
        } catch {
          // Fallback
        }

        return { success: true };
      } catch (err: any) {
        const msg = err.message || "Không thể từ chối đề nghị chi.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [expenses, userWallet, workspaceId, auth.user?.fullName]
  );

  // Ký phát lệnh thanh toán / Giải ngân (Payment Settlement Execution)
  const executePayment = useCallback(
    async (expenseId: string) => {
      try {
        setError(null);
        const req = expenses.find((e) => e.id === expenseId);
        if (!req) throw new Error("Không tìm thấy đề nghị chi tiêu.");
        if (req.status !== "APPROVED") {
          throw new Error("Đề nghị chi chưa đạt đủ số chữ ký phê duyệt hợp lệ.");
        }

        const simulatedTxHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;

        // Trừ số dư thực tế và giải phóng giữ chỗ: balance -= amount, reserved -= amount
        setFunds((prev) =>
          prev.map((f) => {
            if (f.id !== req.fundId) return f;
            const newBalance = Math.max(0, Number((f.balanceAvax - req.amountAvax).toFixed(4)));
            const newReserved = Math.max(0, Number((f.reservedAvax - req.amountAvax).toFixed(4)));
            return {
              ...f,
              balanceAvax: newBalance,
              balanceWei: parseEther(newBalance.toString()).toString(),
              reservedAvax: newReserved,
              reservedWei: parseEther(newReserved.toString()).toString(),
            };
          })
        );

        // Cập nhật trạng thái đề nghị chi sang EXECUTED
        setExpenses((prev) =>
          prev.map((e) => {
            if (e.id !== expenseId) return e;
            return {
              ...e,
              status: "EXECUTED",
              payment: {
                id: `pay-${Date.now()}`,
                txHash: simulatedTxHash,
                status: "CONFIRMED",
                amountAvax: req.amountAvax,
                senderAddress: userWallet,
                recipientAddress: req.recipientAddress,
                executedBy: auth.user?.fullName || "Bạn",
                confirmedAt: "Vừa xong",
              },
            };
          })
        );

        // Ghi Audit
        const newAudit: GroupAuditEvent = {
          id: `audit-${Date.now()}`,
          workspaceId,
          fundId: req.fundId,
          fundName: req.fundName,
          actorName: auth.user?.fullName || "Bạn",
          actorWallet: userWallet,
          action: "PAYMENT_EXECUTED",
          description: `Giải ngân hoàn tất: ${req.amountAvax} AVAX tới ${req.recipientName}`,
          amountAvax: req.amountAvax,
          txHash: simulatedTxHash,
          createdAt: "Vừa xong",
        };
        setAuditEvents((prev) => [newAudit, ...prev]);

        // Thử đồng bộ backend
        try {
          await authRequest(`/api/expenses/${expenseId}/verify-payment`, {
            txHash: simulatedTxHash,
          });
        } catch {
          // Fallback
        }

        return { success: true, txHash: simulatedTxHash };
      } catch (err: any) {
        const msg = err.message || "Không thể thực thi thanh toán.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [expenses, userWallet, workspaceId, auth.user?.fullName]
  );

  return {
    funds,
    selectedFundId,
    setSelectedFundId,
    expenses,
    obligations,
    auditEvents,
    pendingUserApprovals,
    awaitingPaymentExpenses,
    summary,
    isLoading,
    error,
    createFund,
    contribute,
    proposeExpense,
    approveExpense,
    rejectExpense,
    executePayment,
    refresh,
  };
}
