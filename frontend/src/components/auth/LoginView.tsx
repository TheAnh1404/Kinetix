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
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  FileKey,
  Home,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";

export function AuthFrame({
  children,
  activation = false,
}: {
  children: React.ReactNode;
  activation?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between selection:bg-[#E84142] selection:text-white relative overflow-hidden">
      {/* Background Ambient Glow Orbs */}
      <div
        className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-radial from-[#E84142]/15 via-transparent to-transparent blur-[80px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-radial from-[#F59E0B]/10 via-[#8B5CF6]/10 to-transparent blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E84142] via-[#F59E0B] to-[#8B5CF6] p-[1.5px] shadow-lg shadow-[#E84142]/20 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#090D16] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-xl text-white">K</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                Kinetix
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                  OS
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400 font-medium">
                  Avalanche Dual-Chain L1
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Về Trang Chủ</span>
          </Link>
        </div>
      </header>

      {/* Main 2-Column Split Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Story & Trust Badges */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activation ? "KÍCH HOẠT TÀI KHOẢN GIA ĐÌNH" : "TÀI CHÍNH GẮN KẾT THẾ HỆ"}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Mỗi Thế Hệ.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E84142] via-[#F59E0B] to-[#8B5CF6]">
                Một Điểm Tựa Vững Vàng.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Không gian tài chính chung nơi Ông Bà, Cha Mẹ và Con Trẻ cùng gắn kết. Tự do phân quyền, bảo vệ chống lừa đảo và sinh lời 8% APY trên Avalanche.
            </p>

            <div className="pt-2 space-y-3.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">0đ Phí Gas Giao Dịch</h2>
                  <p className="text-[11px] text-slate-400">Custom Fee Config trên Family L1 Appchain</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Đa Chữ Ký Phân Tầng 2/3</h2>
                  <p className="text-[11px] text-slate-400">Chặn đứng hành vi gian lận và rút tiền trái phép</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Xác Thực Ví Core (SIWE EIP-4361)</h2>
                  <p className="text-[11px] text-slate-400">Tự quản tài sản cá nhân, không ai giữ Private Key</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-lg p-6 sm:p-10 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 relative">
              {children}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Security Assurance Note */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center border-t border-white/10">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Kinetix cam kết không lưu giữ Seed Phrase hoặc Private Key của người dùng.</span>
        </div>
      </footer>
    </div>
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
    <div className="space-y-1.5 text-left">
      <label className="text-xs font-semibold text-slate-300 block" htmlFor={id}>
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-500 pointer-events-none">
          <LockKeyhole className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={128}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••••••"
          className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#E84142] focus:ring-2 focus:ring-[#E84142]/25 transition-all"
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible(!visible)}
          className="absolute right-3.5 text-slate-400 hover:text-white transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function LoginView({
  initialMode = "login",
}: {
  initialMode?: "login" | "register" | "invite";
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "invite">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [invitationPreview, setInvitationPreview] = useState<{
    workspaceName: string;
    expectedWallet: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    if (requested === "register" || requested === "invite" || requested === "login") {
      setMode(requested);
    }
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err: any) {
      setError(
        err.code === 4001 || err.message?.includes("rejected")
          ? "Bạn đã hủy xác nhận trên Core. Có thể thử lại khi sẵn sàng."
          : err.message || "Không thể xử lý yêu cầu.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      <div className="space-y-6">
        
        {/* Card Header */}
        <div className="text-left space-y-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400">
            {mode === "login"
              ? "XÁC THỰC BẢO MẬT"
              : mode === "invite"
                ? "LỜI MỜI BẢO HỘ"
                : "KHỞI ĐẦU KHÔNG GIAN GIA ĐÌNH"}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === "login"
              ? "Đăng Nhập Kinetix OS"
              : mode === "invite"
                ? "Tham Gia Gia Đình Được Mời"
                : "Tạo Không Gian Gia Đình Mới"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {mode === "login"
              ? "Một tài khoản riêng. Kết nối và đồng hành cùng cả gia đình."
              : mode === "invite"
                ? "Dùng ví Core được chỉ định để xác nhận quyền Guardian trong workspace."
                : "Trở thành Quản trị viên (Admin) và khởi tạo không gian quỹ đầu tiên của gia đình."}
          </p>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="p-1 rounded-2xl bg-slate-950/80 border border-white/10 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              mode === "login"
                ? "bg-white text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              mode === "register"
                ? "bg-white text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tạo Gia Đình
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("invite");
              setError("");
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              mode === "invite"
                ? "bg-white text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Nhận Lời Mời
          </button>
        </div>

        {/* SIWE Core Wallet Quick Login (Only for Login Mode) */}
        {mode === "login" && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(auth.loginWithCoreWallet)}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E84142] via-[#d93639] to-[#b51923] hover:from-[#d03031] hover:to-[#930014] shadow-xl shadow-[#E84142]/25 hover:shadow-[#E84142]/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Tiếp Tục Với Core Wallet (SIWE)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                hoặc tài khoản thành viên
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>
          </div>
        )}

        {/* Input Form */}
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
                    invitationToken: mode === "invite" ? invitationToken : undefined,
                  }),
            );
          }}
          className="space-y-4 text-left"
        >
          {/* Extended fields for Register & Invite */}
          {mode !== "login" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block" htmlFor="full-name">
                  Họ và tên người bảo hộ
                </label>
                <input
                  id="full-name"
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#E84142] focus:ring-2 focus:ring-[#E84142]/25 transition-all"
                />
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block" htmlFor="family-name">
                    Tên không gian gia đình
                  </label>
                  <input
                    id="family-name"
                    required
                    maxLength={100}
                    placeholder="Đại Gia Đình Bác Ba"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#E84142] focus:ring-2 focus:ring-[#E84142]/25 transition-all"
                  />
                </div>
              )}

              {mode === "invite" && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Mã Mời Riêng Từ Admin (Token 43 ký tự)</span>
                      <FileKey className="w-3.5 h-3.5 text-cyan-400" />
                    </label>
                    <input
                      autoComplete="off"
                      disabled={busy}
                      required
                      minLength={43}
                      maxLength={43}
                      value={invitationToken}
                      onChange={(e) => {
                        setInvitationToken(e.target.value.trim());
                        setInvitationPreview(null);
                      }}
                      placeholder="Dán mã mời 43 ký tự được cấp vào đây"
                      className="w-full font-mono px-3.5 py-2 rounded-xl bg-slate-950/90 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busy || invitationToken.length !== 43}
                    onClick={() =>
                      void run(async () => {
                        const data = await authRequest("/api/auth/invitations/preview", {
                          token: invitationToken,
                        });
                        setInvitationPreview(data.invitation);
                      })
                    }
                    className="w-full py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 transition-colors disabled:opacity-40"
                  >
                    Kiểm Tra Lời Mời Trước Khi Ký
                  </button>

                  {invitationPreview && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs text-slate-200 space-y-1">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hợp lệ: {invitationPreview.workspaceName}</span>
                      </div>
                      <p className="break-all text-[11px] text-slate-400">
                        Ví yêu cầu: <code className="text-cyan-300">{invitationPreview.expectedWallet}</code>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block" htmlFor="username">
              Tên đăng nhập
            </label>
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#E84142] focus:ring-2 focus:ring-[#E84142]/25 transition-all"
            />
          </div>

          {/* Password */}
          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete={mode !== "login" ? "new-password" : "current-password"}
            minLength={mode !== "login" ? 12 : undefined}
          />

          {mode !== "login" && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mật khẩu từ 12–128 ký tự. Bạn sẽ ký thông điệp xác minh ví trên Avalanche Core, không tốn phí gas.
            </p>
          )}

          {/* Error Display */}
          {(error || auth.sessionError) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error || auth.sessionError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-white/20 hover:border-white/30 transition-all duration-200 disabled:opacity-50 mt-2"
          >
            {busy ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === "login"
                    ? "Đăng Nhập Tài Khoản"
                    : mode === "invite"
                      ? "Xác Minh Core & Nhận Lời Mời"
                      : "Xác Minh Core & Tạo Gia Đình"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Member Note & Help */}
        {mode === "login" && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-left">
                <strong>Thành viên gia đình lần đầu đăng nhập?</strong> Dùng tên đăng nhập và mật khẩu tạm người bảo hộ đã cấp. Hệ thống sẽ hướng dẫn kích hoạt tài khoản.
              </p>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Quên mật khẩu? Vui lòng liên hệ Người bảo hộ trong gia đình để được cấp lại mật khẩu tạm.
            </p>
          </div>
        )}

      </div>
    </AuthFrame>
  );
}
