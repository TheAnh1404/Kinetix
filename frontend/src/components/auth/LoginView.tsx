"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  Users,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AuthFrame({
  children,
  activation = false,
}: {
  children: React.ReactNode;
  activation?: boolean;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Kinetix">
        <Link href="/" className="auth-brand">
          <span className="auth-brand-icon">K</span> kinetix
          <span className="auth-brand-dot">.</span>
        </Link>
        <div className="auth-story-content">
          <span className="auth-eyebrow">TÀI CHÍNH GẮN KẾT THẾ HỆ</span>
          <h1>
            Mỗi thế hệ.
            <br />
            Một điểm tựa<span>.</span>
          </h1>
          <p>
            Không gian tài chính chung của gia đình, với tài khoản riêng và ví
            do chính bạn làm chủ.
          </p>
          <div className="auth-orbit" aria-hidden="true">
            <div className="auth-orbit-ring" />
            <div className="auth-orbit-core">
              <ShieldCheck size={40} />
              <span>Gia đình bạn</span>
            </div>
            <span className="auth-orbit-label auth-orbit-top">
              <Users size={18} /> Gắn kết
            </span>
            <span className="auth-orbit-label auth-orbit-bottom">
              <Wallet size={18} /> Tự chủ
            </span>
          </div>
          <div className="auth-assurance">
            <LockKeyhole size={18} />
            <span>Tài khoản cá nhân · Ví Core cá nhân</span>
          </div>
        </div>
        <p className="auth-story-footer">
          Xây dựng trên Avalanche <span>●</span> Cùng nhau, vững vàng hơn.
        </p>
      </section>
      <section className="auth-content">
        <div className="auth-content-top">
          <span>{activation ? "BẮT ĐẦU AN TOÀN" : "CHÀO MỪNG VỀ NHÀ"}</span>
          <Link href="/">Về trang chủ ↗</Link>
        </div>
        <div className="auth-form-wrap">{children}</div>
        <p className="auth-bottom-note">
          <ShieldCheck size={15} /> Kinetix không yêu cầu seed phrase hoặc
          private key của bạn.
        </p>
      </section>
    </main>
  );
}
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  id = "password",
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  id?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-label" htmlFor={id}>
      {label}
      <span className="auth-password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={128}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
export function LoginView() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "register")
      setMode("register");
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err: any) {
      setError(
        err.code === 4001 || err.message?.includes("rejected")
          ? "Bạn đã hủy xác nhận trên Core. Có thể thử lại khi sẵn sàng."
          : err.message || "Không thể đăng nhập.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthFrame>
      <div className="auth-form-heading">
        <span className="auth-kicker">KHÔNG GIAN CỦA BẠN</span>
        <h2>
          {mode === "login" ? "Đăng nhập Kinetix" : "Khởi đầu cho gia đình"}
        </h2>
        <p>
          {mode === "login"
            ? "Một tài khoản riêng. Kết nối cả gia đình."
            : "Tạo tài khoản người bảo hộ và không gian đầu tiên bằng ví Core của bạn."}
        </p>
      </div>
      <div className="auth-tabs">
        <button
          type="button"
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          aria-pressed={mode === "register"}
          onClick={() => {
            setMode("register");
            setError("");
          }}
        >
          Tạo gia đình mới
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(() =>
            mode === "login"
              ? auth.login(username, password)
              : auth.registerFamily({
                  username,
                  password,
                  adminName: fullName,
                  familyName,
                  invitationToken: invitationToken || undefined,
                }),
          );
        }}
        className="auth-form"
      >
        {mode === "register" && (
          <>
            <label className="auth-label" htmlFor="full-name">
              Họ và tên người bảo hộ
              <input
                id="full-name"
                required
                maxLength={100}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="auth-label" htmlFor="family-name">
              {invitationToken
                ? "Tên gia đình · dùng không gian trong lời mời"
                : "Tên không gian gia đình"}
              <input
                id="family-name"
                required={!invitationToken}
                disabled={!!invitationToken}
                maxLength={100}
                placeholder="Gia đình của chúng mình"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </label>
            <details className="auth-help">
              <summary className="cursor-pointer">
                Bạn nhận được lời mời làm người bảo hộ?
              </summary>
              <label className="auth-label mt-3">
                Mã mời riêng từ Admin
                <input
                  autoComplete="off"
                  value={invitationToken}
                  maxLength={43}
                  onChange={(e) => setInvitationToken(e.target.value.trim())}
                />
              </label>
              <p className="mt-2">
                Dùng đúng địa chỉ Core được mời. Mã gia đình công khai không cấp
                quyền Guardian.
              </p>
            </details>
          </>
        )}
        <label className="auth-label" htmlFor="username">
          Tên đăng nhập
          <input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={50}
            pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,49}"
            placeholder="Tên đăng nhập của bạn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <PasswordField
          label="Mật khẩu"
          value={password}
          onChange={setPassword}
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          minLength={mode === "register" ? 12 : undefined}
        />
        {mode === "register" && (
          <p className="auth-help">
            Mật khẩu từ 12–128 ký tự. Bạn sẽ ký thông điệp xác minh ví, không
            gửi giao dịch.
          </p>
        )}
        <div aria-live="polite">
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {auth.sessionError && (
            <p className="auth-error">{auth.sessionError}</p>
          )}
        </div>
        <button className="auth-primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="animate-spin" size={20} />
          ) : (
            <>
              {mode === "login" ? "Đăng nhập" : "Xác minh Core & tạo gia đình"}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>
      {mode === "login" && (
        <>
          <div className="auth-divider">
            <span>hoặc dành cho người bảo hộ</span>
          </div>
          <button
            className="auth-secondary"
            disabled={busy}
            onClick={() => void run(auth.loginWithCoreWallet)}
          >
            <Wallet size={20} /> Tiếp tục với Core Wallet
          </button>
          <div className="auth-info">
            <Users size={21} />
            <p>
              <strong>Thành viên lần đầu đăng nhập?</strong>
              <br />
              Dùng tên đăng nhập và mật khẩu tạm người bảo hộ đã cấp. Chúng mình
              sẽ hướng dẫn từng bước.
            </p>
          </div>
          <p className="auth-help text-center">
            Quên mật khẩu? Liên hệ người bảo hộ được phân công để nhận mật khẩu
            tạm mới.
          </p>
        </>
      )}
    </AuthFrame>
  );
}
