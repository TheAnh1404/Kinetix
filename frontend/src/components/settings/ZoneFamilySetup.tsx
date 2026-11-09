"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  ArrowRight,
  Phone,
  Sparkles,
  Layers,
  ExternalLink,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useFirstUseStatus } from "@/hooks/useFirstUseStatus";
import { FirstUseChecklist } from "@/components/auth/FirstUseChecklist";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { InvitationAcceptancePanel } from "@/components/auth/InvitationAcceptancePanel";
import { ProvisioningPanel } from "@/components/dashboard/ProvisioningPanel";
import { useVaultCreation } from "@/context/VaultCreationContext";
import type { FirstUseAction } from "../../../../shared/firstUse";
import type { StartProgress, StartStep } from "../../../../shared/startFlow";

interface StartApiData {
  workspace: { id: string; name: string };
  role: string;
  canManageMembers: boolean;
  progress: StartProgress;
  steps: StartStep[];
  dashboardUrl: string;
}

interface GuardianContact {
  fullName: string;
  phoneNumber?: string;
}

/**
 * Phân hệ "Thiết lập gia đình theo cách của bạn" bên trong trang Cài Đặt.
 * Quản lý tiến trình Onboarding, danh sách kiểm tra sẵn sàng (First-Use),
 * phân công người bảo hộ, và phê duyệt cấp quyền ví on-chain.
 */
export function ZoneFamilySetup() {
  const auth = useAuth();
  const family = useFamily();
  const vaultCreation = useVaultCreation();

  const currentWorkspaceId = family.currentWorkspace?.id;
  const member = auth.workspaces.find((item) => item.id === currentWorkspaceId);
  const userRole = currentWorkspaceId ? member?.role || "CHILD" : "CHILD";
  const isAdmin = userRole === "ADMIN" || userRole === "GUARDIAN";
  const canManageMembers = userRole === "ADMIN" || member?.canManageMembers === true;

  // Trạng thái kiểm tra sẵn sàng hạ tầng & tài chính (First-Use Hook)
  const readiness = useFirstUseStatus(currentWorkspaceId);

  // Tiến trình Onboarding từ API
  const [startData, setStartData] = useState<StartApiData | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");

  // Danh sách Người bảo hộ được phân công
  const [guardians, setGuardians] = useState<GuardianContact[] | null>(null);

  // Modal quản lý thành viên
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [provisioningRequest, setProvisioningRequest] = useState(0);

  // Tải dữ liệu tiến trình Start Flow
  const loadStartData = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setStartLoading(true);
    setStartError("");
    try {
      const response = await authRequest(
        `/api/workspaces/${currentWorkspaceId}/start`,
        undefined,
        "GET",
      );
      setStartData(response.data);
    } catch (err: any) {
      setStartError(err.message || "Chưa tải được tiến trình thiết lập.");
    } finally {
      setStartLoading(false);
    }
  }, [currentWorkspaceId]);

  // Tải danh sách Người bảo hộ
  const loadGuardians = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const res = await authRequest(
        `/api/member/guardians?workspaceId=${currentWorkspaceId}`,
        undefined,
        "GET",
      );
      setGuardians(res.data || []);
    } catch {
      // Giữ im lặng nếu chưa tải được
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    void loadStartData();
    void loadGuardians();
  }, [loadStartData, loadGuardians]);

  // Xử lý các hành động từ FirstUseChecklist
  const handleChecklistAction = (action: FirstUseAction) => {
    switch (action) {
      case "MANAGE_MEMBERS":
        if (canManageMembers) setIsMemberModalOpen(true);
        break;
      case "CREATE_VAULT":
      case "OPEN_VAULTS":
        vaultCreation.open();
        break;
      case "CONNECT_WORKSPACE":
      case "PROVISION":
        setProvisioningRequest((prev) => prev + 1);
        break;
      case "CONTACT_GUARDIAN":
        const contactSection = document.getElementById("guardian-contacts-box");
        contactSection?.scrollIntoView({ behavior: "smooth" });
        break;
      default:
        break;
    }
  };

  const status = startData?.progress?.status || member?.startStatus || "IN_PROGRESS";
  const step = startData?.progress?.step || "WELCOME";

  const statusLabel =
    status === "COMPLETED"
      ? "Đã Hoàn Thành"
      : status === "DEFERRED"
        ? "Tạm Hoãn Thiết Lập"
        : status === "LEGACY"
          ? "Không Gian Hiện Hữu"
          : "Đang Thiết Lập";

  const statusBadgeClass =
    status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
      : status === "DEFERRED"
        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. HERO BANNER: THIẾT LẬP GIA ĐÌNH THEO CÁCH CỦA BẠN */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8 text-white shadow-lg">
        {/* Họa tiết nền trang trí */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-6 opacity-15 hidden md:block pointer-events-none">
          <Users size={140} />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-mono font-bold uppercase tracking-wider text-white">
              Family Onboarding Hub
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Thiết Lập Gia Đình Theo Cách Của Bạn
          </h3>

          <p className="text-white/90 text-sm leading-relaxed">
            Tùy biến cấu hình các thành viên, phân công người bảo hộ đồng hành,
            và chuẩn bị hạ tầng đệm Family L1 / Fuji C-Chain sẵn sàng cho mọi nhu
            cầu chi tiêu và tích lũy.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href={`/start?workspace=${encodeURIComponent(currentWorkspaceId || "")}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
            >
              <span>Mở Hướng Dẫn Từng Bước (/start)</span>
              <ExternalLink size={14} />
            </Link>

            {canManageMembers && (
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/25 hover:bg-black/40 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Thêm Thành Viên & Người Bảo Hộ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void loadStartData();
                readiness.refresh();
              }}
              disabled={startLoading}
              className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              title="Làm mới tiến trình"
            >
              <RefreshCw
                size={16}
                className={startLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </div>

      <InvitationAcceptancePanel />

      {/* =================================================================== */}
      {/* 2. TIẾN TRÌNH 4 BƯỚC KHỞI TẠO (PROGRESS TIMELINE) */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sliders size={14} className="text-red-600" />
            <span>Tiến Trình Thiết Lập Hệ Thống</span>
          </h4>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {step === "FINISH"
              ? "Bước 4/4: Hoàn Tất"
              : step === "READINESS"
                ? "Bước 3/4: Kiểm Tra Sẵn Sàng"
                : step === "FAMILY"
                  ? "Bước 2/4: Thành Viên & Bảo Hộ"
                  : "Bước 1/4: Chào Mừng"}
          </span>
        </div>

        {/* Thanh tiến trình phân đoạn */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "WELCOME", label: "1. Chào Mừng" },
            { id: "FAMILY", label: "2. Thành Viên" },
            { id: "READINESS", label: "3. Hạ Tầng Ví" },
            { id: "FINISH", label: "4. Sẵn Sàng" },
          ].map((item, idx) => {
            const stepsOrder = ["WELCOME", "FAMILY", "READINESS", "FINISH"];
            const currentIdx = stepsOrder.indexOf(step);
            const isDone = currentIdx > idx || status === "COMPLETED";
            const isCurrent = currentIdx === idx && status !== "COMPLETED";

            return (
              <div key={item.id} className="space-y-1.5">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isDone
                      ? "bg-emerald-600"
                      : isCurrent
                        ? "bg-red-600"
                        : "bg-slate-100 dark:bg-slate-800"
                  }`}
                />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. DANH SÁCH KIỂM TRA SẴN SÀNG (FIRST-USE CHECKLIST) */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Danh Sách Kiểm Tra Sẵn Sàng Vận Hành</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Các điều kiện kỹ thuật và tài chính cần thiết trước khi giải ngân
            </p>
          </div>
        </div>

        {readiness.error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{readiness.error}</span>
          </div>
        ) : readiness.data?.steps ? (
          <FirstUseChecklist
            steps={readiness.data.steps}
            busy={false}
            onAction={handleChecklistAction}
          />
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Đang tải danh sách kiểm tra…
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 4. PHÊ DUYỆT VÍ ON-CHAIN & PROVISIONING PANEL */}
      {/* =================================================================== */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-red-600" />
                <span>Cấp Quyền Thành Viên On-Chain (Operator Provisioning)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ký xác nhận on-chain để ghi nhận địa chỉ ví thành viên vào hợp đồng FamilyHub
              </p>
            </div>
          </div>

          <ProvisioningPanel openRequest={provisioningRequest} />
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. LIÊN HỆ NGƯỜI THÂN ĐỒNG HÀNH (GUARDIAN CONTACTS) */}
      {/* =================================================================== */}
      <div
        id="guardian-contacts-box"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <span>Người Thân & Người Bảo Hộ Được Phân Công</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ Ông Bà và Trẻ Nhỏ trong các giao dịch vượt hạn mức và việc nhà
            </p>
          </div>

          {canManageMembers && (
            <button
              type="button"
              onClick={() => setIsMemberModalOpen(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Quản lý thành viên</span>
            </button>
          )}
        </div>

        {guardians === null ? (
          <p className="text-xs text-slate-400 py-3">Đang tìm danh sách người bảo hộ…</p>
        ) : guardians.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500">
            Chưa có người bảo hộ nào được cấu hình số điện thoại. Hãy bổ sung để các thành viên có thể liên hệ nhanh.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {guardians.map((person, idx) => {
              const cleanPhone = person.phoneNumber?.replace(/[\s().-]/g, "");
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {person.fullName}
                    </strong>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {person.phoneNumber || "Chưa có số điện thoại"}
                    </span>
                  </div>

                  {cleanPhone && /^\+?[0-9]{6,15}$/.test(cleanPhone) && (
                    <a
                      href={`tel:${cleanPhone}`}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors shrink-0"
                      title="Gọi điện nhanh"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Quản lý thành viên (Tái sử dụng) */}
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          void loadGuardians();
          readiness.refresh();
        }}
      />
    </div>
  );
}
