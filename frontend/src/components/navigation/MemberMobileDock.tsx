"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  HeartHandshake,
  HandCoins,
  ReceiptText,
  ListChecks,
  Gift,
  PiggyBank,
  UserRound,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Settings2,
} from "lucide-react";
import { RoleType } from "@/types";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

export interface MemberMobileDockProps {
  /**
   * Vai trò thành viên hiện tại:
   * - ELDERLY: Người cao tuổi / Ông bà
   * - CHILD: Con trẻ / Bé yêu
   * - GUARDIAN: Người giám hộ / Phụ huynh (chế độ xem thành viên)
   */
  role: RoleType | "ELDERLY" | "CHILD" | "GUARDIAN";
  className?: string;
}

interface DockTabItem {
  key: string;
  href: string;
  label: string;
  Icon: React.ElementType;
  isActive: (pathname: string) => boolean;
  badge?: number;
  highlight?: boolean;
}

/**
 * Thanh Điều Hướng Đáy Nổi Di Động (Mobile Floating Bottom Dock)
 * Thiết kế theo chuẩn Ergonomic Thumb-Zone & ui-ux-pro-max:
 * - Tự động thích ứng tab theo từng vai trò (ELDERLY, CHILD, GUARDIAN)
 * - Hiệu ứng kính mờ (Backdrop Blur Glassmorphism)
 * - Ánh sáng viền khi kích hoạt (Active Tab Glow) theo bộ nhận diện từng vai trò
 * - Đảm bảo vùng an toàn (Safe Area Inset Bottom) trên iOS/Android
 * - Phản hồi xúc giác trực quan (active:scale-95)
 * - Kích thước chạm (Touch Target) >= 48px (và >= 56px cho Người cao tuổi)
 */
export const MemberMobileDock: React.FC<MemberMobileDockProps> = ({
  role,
  className = "",
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const auth = useAuth();
  const family = useFamily();

  // Xác định số lượng yêu cầu cần duyệt hoặc việc cần làm để hiển thị huy hiệu (Badge)
  const currentUserId = auth.user?.id;

  // Số lượng yêu cầu rút tiền của Người cao tuổi đang chờ duyệt
  const elderlyPendingRequestsCount = family.withdrawalRequests.filter(
    (req) => req.requesterId === currentUserId && req.status === "PENDING"
  ).length;

  // Số lượng việc nhà con chưa làm
  const childTodoChoresCount = family.chores.filter(
    (chore) => chore.childId === currentUserId && chore.status === "TODO"
  ).length;

  // Số lượng yêu cầu rút tiền hoặc việc nhà chờ Giám hộ phê duyệt
  const guardianPendingApprovalsCount =
    family.withdrawalRequests.filter((req) => req.status === "PENDING").length +
    family.chores.filter((chore) => chore.status === "SUBMITTED").length;

  const isElderly = role === "ELDERLY";
  const isChild = role === "CHILD";
  const isGuardian = role === "GUARDIAN" || role === "ADMIN";

  // Cấu hình danh sách Tab thích ứng theo từng vai trò
  let tabs: DockTabItem[] = [];

  if (isElderly) {
    // -----------------------------------------------------------------------
    // VAI TRÒ ÔNG BÀ / NGƯỜI CAO TUỔI (ELDERLY)
    // 3 nút kích thước cực đại (>= 56px), chữ to, biểu tượng trực quan
    // -----------------------------------------------------------------------
    tabs = [
      {
        key: "elderly-home",
        href: "/dashboard/elderly",
        label: "Trang chính",
        Icon: Home,
        isActive: (path) =>
          path === "/dashboard/elderly" || path === "/dashboard",
      },
      {
        key: "elderly-requests",
        href: "/dashboard/elderly/requests",
        label: "Yêu cầu trợ cấp",
        Icon: HandCoins,
        isActive: (path) =>
          path.startsWith("/dashboard/elderly/requests") ||
          path.includes("/withdraw"),
        badge: elderlyPendingRequestsCount,
      },
      {
        key: "elderly-family",
        href: "/dashboard/elderly/family",
        label: "Người thân",
        Icon: HeartHandshake,
        isActive: (path) => path.startsWith("/dashboard/elderly/family"),
      },
    ];
  } else if (isChild) {
    // -----------------------------------------------------------------------
    // VAI TRÒ CON TRẺ (CHILD)
    // 3 tab trò chơi hóa (Gamified tabs): Việc nhà, Heo đất & Thưởng, Của con
    // -----------------------------------------------------------------------
    tabs = [
      {
        key: "child-chores",
        href: "/dashboard/kids",
        label: "Việc nhà",
        Icon: Sparkles,
        isActive: (path) =>
          path === "/dashboard/kids" || path.startsWith("/dashboard/kids/chores"),
        badge: childTodoChoresCount,
      },
      {
        key: "child-rewards",
        href: "/dashboard/kids/rewards",
        label: "Heo đất & Thưởng",
        Icon: PiggyBank,
        isActive: (path) => path.startsWith("/dashboard/kids/rewards"),
      },
      {
        key: "child-profile",
        href: "/dashboard/kids/profile",
        label: "Của con",
        Icon: UserRound,
        isActive: (path) => path.startsWith("/dashboard/kids/profile"),
      },
    ];
  } else {
    // -----------------------------------------------------------------------
    // VAI TRÒ NGƯỜI GIÁM HỘ (GUARDIAN / ADULT MEMBER)
    // 4 tab: Hũ an sinh, Duyệt yêu cầu, Việc nhà, Cài đặt
    // -----------------------------------------------------------------------
    tabs = [
      {
        key: "guardian-vaults",
        href: "/dashboard/member",
        label: "Hũ an sinh",
        Icon: ShieldCheck,
        isActive: (path) =>
          path === "/dashboard/member" || path === "/dashboard",
      },
      {
        key: "guardian-approvals",
        href: "/dashboard/elderly/requests",
        label: "Duyệt yêu cầu",
        Icon: FileCheck2,
        isActive: (path) =>
          path.startsWith("/dashboard/elderly/requests") ||
          path.includes("requests"),
        badge: guardianPendingApprovalsCount,
      },
      {
        key: "guardian-kids",
        href: "/dashboard/kids",
        label: "Việc nhà",
        Icon: ListChecks,
        isActive: (path) => path.startsWith("/dashboard/kids"),
      },
      {
        key: "guardian-settings",
        href: "/settings",
        label: "Cài đặt",
        Icon: Settings2,
        isActive: (path) => path.startsWith("/settings"),
      },
    ];
  }

  // Tạo đường dẫn kèm tham số source=contract nếu đang ở chế độ hợp đồng
  const createHref = (href: string) => {
    if (source === "contract" && href.startsWith("/dashboard/") && href !== "/dashboard/tools") {
      return `${href}?source=contract`;
    }
    return href;
  };

  return (
    <nav
      className={`member-mobile-dock-wrapper md:hidden ${className}`}
      aria-label="Điều hướng di động dành cho thành viên"
    >
      <div
        className={`member-mobile-dock ${
          isElderly
            ? "elderly-dock-theme"
            : isChild
              ? "kids-dock-theme"
              : "guardian-dock-theme"
        }`}
      >
        {tabs.map(({ key, href, label, Icon, isActive, badge }) => {
          const active = isActive(pathname);
          const destination = createHref(href);

          return (
            <Link
              key={key}
              href={destination}
              aria-current={active ? "page" : undefined}
              className={`member-dock-item ${active ? "active" : ""}`}
            >
              {/* Biểu tượng Tab kèm huy hiệu thông báo nếu có */}
              <div className="relative flex items-center justify-center">
                <Icon
                  size={isElderly ? 26 : isChild ? 23 : 21}
                  className={`dock-icon transition-transform duration-200 ${
                    active ? "scale-110" : ""
                  }`}
                  aria-hidden="true"
                />
                {typeof badge === "number" && badge > 0 && (
                  <span
                    className="dock-badge"
                    aria-label={`${badge} mục cần chú ý`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>

              {/* Tên nhãn của Tab */}
              <span className="dock-label">{label}</span>

              {/* Điểm nhấn phát sáng viền khi tab đang được chọn */}
              {active && <span className="dock-active-indicator" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
