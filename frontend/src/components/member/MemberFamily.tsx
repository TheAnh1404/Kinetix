"use client";

import React, { useEffect, useState } from "react";
import { Phone, Copy, HeartHandshake, LogOut, Wallet } from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useMemberPreferences } from "@/components/layout/MemberResponsiveShell";
import { EmptyState, PageHeader } from "./MemberPrimitives";
import { MemberNotifications } from "./MemberNotifications";

export function MemberFamily({ elderly = false }: { elderly?: boolean }) {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const preferences = useMemberPreferences();
  const [contacts, setContacts] = useState<
    { id: string; fullName: string; phoneNumber?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!currentWorkspace) return;
    let stale = false;
    setLoading(true);
    setContacts([]);
    setError("");
    void authRequest(
      `/api/member/guardians?workspaceId=${currentWorkspace.id}`,
      undefined,
      "GET",
    )
      .then((data) => {
        if (!stale) setContacts(data.data);
      })
      .catch((err) => {
        if (!stale) setError(err.message);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [currentWorkspace?.id, retry]);
  return (
    <>
      <PageHeader
        eyebrow={elderly ? "LUÔN CÓ NGƯỜI ĐỒNG HÀNH" : "GÓC NHỎ CỦA CON"}
        title={
          elderly
            ? "Người thân của bạn"
            : `Xin chào, ${auth.user?.fullName || "con"}`
        }
        description="Liên hệ được gia đình phân công trong không gian hiện tại."
      />
      <div className="member-overview-grid">
        <section className="member-card">
          <div className="section-heading">
            <h2>
              <HeartHandshake size={24} />
              Người bảo hộ
            </h2>
          </div>
          {loading ? (
            <p role="status">Đang tải liên hệ…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button
                className="member-secondary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Kiểm tra lại
              </button>
            </div>
          ) : !contacts.length ? (
            <EmptyState title="Chưa có liên hệ được phân công">
              Nhờ quản trị gia đình thêm người bảo hộ và số điện thoại để có thể
              gọi.
            </EmptyState>
          ) : (
            <div className="member-stack">
              {contacts.map((contact) => {
                const phone = contact.phoneNumber?.replace(/[\s().-]/g, "");
                const valid = phone && /^\+?[0-9]{6,15}$/.test(phone);
                return (
                  <article className="contact-card" key={contact.id}>
                    <span className="contact-initial" aria-hidden="true">
                      {contact.fullName.charAt(0)}
                    </span>
                    <h3>{contact.fullName}</h3>
                    <p>
                      {valid
                        ? contact.phoneNumber
                        : "Chưa có số liên hệ hợp lệ"}
                    </p>
                    {valid && (
                      <div className="contact-actions">
                        <a className="member-primary" href={`tel:${phone}`}>
                          <Phone size={21} />
                          Gọi điện
                        </a>
                        <button
                          className="member-secondary"
                          onClick={() =>
                            void navigator.clipboard
                              .writeText(contact.phoneNumber!)
                              .then(() =>
                                setStatus("Đã sao chép số điện thoại."),
                              )
                              .catch(() =>
                                setStatus(
                                  `Số điện thoại: ${contact.phoneNumber}`,
                                ),
                              )
                          }
                        >
                          <Copy size={20} />
                          Sao chép số
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <div className="member-stack">
          <section className="member-card">
            <h2>Tùy chọn dễ sử dụng</h2>
            <button
              className="member-setting"
              aria-pressed={preferences.largeText}
              onClick={preferences.toggleLarge}
            >
              <span>Chữ lớn hơn</span>
              <strong>{preferences.largeText ? "Bật" : "Tắt"}</strong>
            </button>
            <button
              className="member-setting"
              aria-pressed={preferences.voice}
              onClick={preferences.toggleVoice}
            >
              <span>Giọng đọc tiếng Việt</span>
              <strong>{preferences.voice ? "Bật" : "Tắt"}</strong>
            </button>
            {preferences.voice && (
              <div className="contact-actions">
                <button
                  className="member-secondary"
                  onClick={() =>
                    preferences.read(
                      "Đây là trang người thân và tùy chọn của bạn. Bạn có thể gọi điện cho người bảo hộ được gia đình phân công.",
                    )
                  }
                >
                  Đọc lại
                </button>
                <button
                  className="member-secondary"
                  onClick={() => window.speechSynthesis?.cancel()}
                >
                  Dừng đọc
                </button>
              </div>
            )}
            <p>
              Giọng đọc tùy thuộc thiết bị. Nội dung luôn hiển thị để bạn đọc
              trực tiếp.
            </p>
          </section>
          <section className="member-card">
            <h2>
              <Wallet size={23} />
              Ví và tài khoản
            </h2>
            <details>
              <summary>Xem ví đã liên kết</summary>
              <p className="wallet-address">
                {auth.linkedWallet?.address || "Chưa liên kết ví"}
              </p>
              <p>
                Đăng nhập trên thiết bị khác vẫn dùng ví này. Kết nối Core riêng
                trên từng thiết bị khi cần ký.
              </p>
              <button
                className="member-secondary"
                onClick={() =>
                  void auth
                    .connectWallet()
                    .then(() =>
                      setStatus(
                        "Đã kết nối. Địa chỉ ví sẽ được kiểm lại khi giao dịch.",
                      ),
                    )
                    .catch((err) => setStatus(err.message))
                }
              >
                Kết nối Core
              </button>
            </details>
            <button
              className="member-logout"
              onClick={() =>
                void auth.logout().catch((err) => setStatus(err.message))
              }
            >
              <LogOut size={20} />
              Đăng xuất tài khoản
            </button>
          </section>
        </div>
      </div>
      <MemberNotifications />
      {status && (
        <p role="status" className="member-notice">
          {status}
        </p>
      )}
    </>
  );
}
