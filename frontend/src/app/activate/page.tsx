"use client";
import React, { useEffect, useState } from "react";
import {
  Check,
  Wallet,
  ShieldCheck,
  ArrowRight,
  LoaderCircle,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthFrame, PasswordField } from "@/components/auth/LoginView";

export default function ActivatePage() {
  const auth = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!auth.isLoading && !auth.user) router.replace("/login");
  }, [auth.isLoading, auth.user, router]);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message || "Không thể hoàn tất. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };
  if (auth.isLoading || !auth.user)
    return <div className="p-16 text-center">Đang kiểm tra tài khoản…</div>;
  const passwordStep =
    auth.onboarding === "CHANGE_PASSWORD" || auth.onboarding === "SET_PASSWORD";
  return (
    <AuthFrame activation>
      <div className="auth-form-heading">
        <span className="auth-kicker">KÍCH HOẠT TÀI KHOẢN</span>
        <h2>
          Chào {auth.user.fullName}
          <span className="text-red-500">.</span>
        </h2>
        <p>Chỉ vài bước để không gian này thực sự thuộc về bạn.</p>
      </div>
      <ol className="auth-steps" aria-label="Tiến trình kích hoạt">
        {["Tài khoản", "Mật khẩu riêng", "Ví Core"].map((label, index) => (
          <li
            key={label}
            aria-current={(passwordStep ? 1 : 2) === index ? "step" : undefined}
            className={
              index === 0 ||
              (index === 1 && !passwordStep) ||
              auth.onboarding === "READY"
                ? "complete"
                : ""
            }
          >
            <span>
              {index === 0 ||
              (index === 1 && !passwordStep) ||
              auth.onboarding === "READY" ? (
                <Check size={16} />
              ) : (
                index + 1
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {passwordStep ? (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (password !== confirm) {
              setError("Hai mật khẩu mới chưa khớp.");
              return;
            }
            void run(() =>
              auth.onboarding === "SET_PASSWORD"
                ? auth.setupCredentials(username, password)
                : auth.changePassword(currentPassword, password),
            );
          }}
        >
          <h3 className="text-xl font-bold">
            {auth.onboarding === "SET_PASSWORD"
              ? "Tạo tài khoản đăng nhập của bạn"
              : "Đặt mật khẩu chỉ bạn biết"}
          </h3>
          <p className="auth-help">
            Dùng ít nhất 12 ký tự, có thể là một cụm từ dễ nhớ. Mật khẩu này
            dùng cho những lần đăng nhập sau.
          </p>
          {auth.onboarding === "SET_PASSWORD" ? (
            <label className="auth-label">
              Tên đăng nhập
              <input
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          ) : (
            <PasswordField
              label="Mật khẩu tạm / hiện tại"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
          )}
          <PasswordField
            id="new-password"
            label="Mật khẩu riêng của bạn"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={12}
          />
          <PasswordField
            id="confirm-password"
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={12}
          />
          <button className="auth-primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <>
                Lưu mật khẩu & tiếp tục <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      ) : auth.onboarding === "LINK_WALLET" ? (
        <div className="auth-form">
          <div className="auth-wallet-illustration">
            <Wallet size={48} />
          </div>
          <h3 className="text-2xl font-bold">Liên kết ví Core cá nhân</h3>
          <p className="auth-help">
            Kết nối Core, kiểm tra tài khoản và ký thông điệp liên kết. Thao tác
            này không gửi giao dịch và không cần nạp tiền.
          </p>
          <div className="auth-info">
            <ShieldCheck size={24} />
            <p>
              Sau khi liên kết, bạn có thể đăng nhập và xem dữ liệu mà không cần
              mở ví. Core chỉ cần thiết khi giao dịch.
            </p>
          </div>
          <a
            className="auth-link"
            href="https://core.app"
            target="_blank"
            rel="noreferrer"
          >
            Chưa có Core? Mở hướng dẫn và tạo ví ↗
          </a>
          <button
            className="auth-primary"
            disabled={busy}
            onClick={() => void run(auth.linkWallet)}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <>
                Kết nối & ký liên kết Core <Wallet size={20} />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="auth-form">
          <div className="auth-wallet-illustration">
            <ShieldCheck size={48} />
          </div>
          <h3 className="text-2xl font-bold">Tài khoản đã sẵn sàng</h3>
          <p className="auth-help break-all">
            Ví đã xác minh: {auth.linkedWallet?.address}
          </p>
          <p className="auth-help">
            Quyền giao dịch của từng mạng và hũ sẽ được kiểm riêng. Người bảo hộ
            có thể cần hoàn tất cấp quyền trên blockchain.
          </p>
          <button
            className="auth-primary"
            onClick={() => window.location.assign(auth.redirectUrl)}
          >
            Tiếp tục thiết lập <ArrowRight size={20} />
          </button>
        </div>
      )}
      {error && (
        <p className="auth-error mt-4" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="auth-link mt-6 flex items-center gap-2"
        disabled={busy}
        onClick={() => void run(auth.logout)}
      >
        <LogOut size={16} /> Đăng xuất
      </button>
    </AuthFrame>
  );
}
