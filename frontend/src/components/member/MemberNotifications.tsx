"use client";
import { Bell } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { EmptyState } from "./MemberPrimitives";

export function MemberNotifications() {
  const { notifications, markNotificationRead } = useFamily();
  return (
    <section className="member-card">
      <h2>
        <Bell size={24} />
        Thông báo của bạn
      </h2>
      {notifications.length ? (
        notifications.slice(0, 10).map((notice) => (
          <article className="notification-row" key={notice.id}>
            <h3>{notice.title}</h3>
            <p>{notice.message}</p>
            <time>{new Date(notice.createdAt).toLocaleString("vi-VN")}</time>
            {!notice.isRead && (
              <button
                className="member-secondary"
                onClick={() => markNotificationRead(notice.id)}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </article>
        ))
      ) : (
        <EmptyState title="Chưa có thông báo mới">
          Những cập nhật đã được ghi nhận sẽ xuất hiện ở đây.
        </EmptyState>
      )}
    </section>
  );
}
