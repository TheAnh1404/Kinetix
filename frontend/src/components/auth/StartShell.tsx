"use client";
import React from "react";
import Link from "next/link";
import { HeartHandshake, Check, LogOut, ShieldCheck } from "lucide-react";
import type { StartStep } from "../../../../shared/startFlow";

export const startLabels: Record<StartStep, string> = {
  WELCOME: "Chào mừng",
  FAMILY: "Gia đình của bạn",
  READINESS: "Sẵn sàng sử dụng",
  FINISH: "Khởi đầu mới",
};
export function StartShell({
  name,
  familyName,
  role,
  step,
  steps,
  busy,
  onLogout,
  children,
}: {
  name: string;
  familyName: string;
  role: string;
  step: StartStep;
  steps: StartStep[];
  busy: boolean;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const index = steps.indexOf(step);
  return (
    <main className={`start-screen ${role === "ELDERLY" ? "start-large" : ""}`}>
      <header className="start-header">
        <Link href="/" className="start-brand">
          <span>K</span>kinetix<span className="start-brand-dot">.</span>
        </Link>
        <button
          type="button"
          className="start-text-button"
          disabled={busy}
          onClick={onLogout}
        >
          <LogOut size={17} aria-hidden />
          Đăng xuất
        </button>
      </header>
      <div className="start-layout">
        <aside className="start-story" aria-label="Chào mừng đến với Kinetix">
          <span className="start-eyebrow">KHỞI ĐẦU CÙNG GIA ĐÌNH</span>
          <h1>
            Một vài bước nhỏ.
            <br />
            <em>Gắn kết dài lâu.</em>
          </h1>
          <p>
            Không gian của {familyName} bắt đầu từ những điều gần gũi nhất: bạn
            và những người thân yêu.
          </p>
          <div className="start-symbol" aria-hidden>
            <span className="start-symbol-ring" />
            <HeartHandshake size={76} strokeWidth={1.4} />
            <span className="start-symbol-note">Cùng nhau, vững vàng hơn.</span>
          </div>
          <div className="start-privacy">
            <ShieldCheck size={22} aria-hidden />
            <p>
              Thông tin của bạn thuộc về bạn.
              <br />
              Kinetix không yêu cầu seed phrase hay private key.
            </p>
          </div>
        </aside>
        <section className="start-card" aria-label={`Thiết lập cho ${name}`}>
          <div className="start-card-top">
            <span>{familyName}</span>
            <span>
              Bước {index + 1} / {steps.length}
            </span>
          </div>
          <ol className="start-stepper" aria-label="Tiến trình bắt đầu">
            {steps.map((item, i) => (
              <li
                key={item}
                aria-current={item === step ? "step" : undefined}
                className={i < index ? "done" : item === step ? "active" : ""}
              >
                <span>
                  {i < index ? <Check size={15} aria-hidden /> : i + 1}
                </span>
                <span>{startLabels[item]}</span>
              </li>
            ))}
          </ol>
          <div className="start-step-body">{children}</div>
        </section>
      </div>
      <footer className="start-site-footer">
        Kinetix · Tài khoản riêng, gia đình chung.
      </footer>
    </main>
  );
}
