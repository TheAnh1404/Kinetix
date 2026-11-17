"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, Users } from "lucide-react";
import { KinetixLogo } from "@/components/ui/KinetixLogo";
import styles from "./landingRedesign.module.css";

type FundKind = "OPERATING" | "GOAL";

const navigation = [
  { href: "#cac-loai-quy", label: "Các loại quỹ" },
  { href: "#cach-hoat-dong", label: "Duyệt và chi tiền" },
  { href: "#cau-hoi", label: "Câu hỏi" },
];

const questions = [
  {
    title: "Ai giữ tiền của nhóm?",
    answer:
      "Phiên bản hiện tại dùng ví cá nhân được công bố khi tạo quỹ. Chủ ví vẫn kiểm soát tiền. Phiếu duyệt trong ứng dụng không tạo ví đa chữ ký; số dư sổ quỹ có thể khác số dư thực tế của ví.",
  },
  {
    title: "Người quản lý nhóm có được tự chi tiền không?",
    answer:
      "Quyền quản lý thành viên và quyền duyệt quỹ được cấp riêng. Khoản chi đủ duyệt vẫn cần người giữ tiền ký giao dịch. Chỉ sau khi xác minh giao dịch, ứng dụng mới ghi nhận đã thanh toán.",
  },
  {
    title: "Dùng được với tiền thật chưa?",
    answer:
      "Chưa. Ứng dụng đang thử nghiệm với AVAX trên Avalanche Fuji, có phí mạng. Hoàn tiền, bàn giao và đóng quỹ chưa được hỗ trợ đầy đủ. Contract V2 chưa được kích hoạt; ví trên điện thoại thật chưa được nghiệm thu.",
  },
];

function Brand() {
  return (
    <KinetixLogo size="md" textMode="dark" subtitle="Quỹ chung cho nhóm" />
  );
}

function FundPreview({ kind }: { kind: FundKind }) {
  const goal = kind === "GOAL";
  return (
    <figure className={styles.previewFigure}>
      <div
        className={styles.appWindow}
        role="img"
        aria-label={
          goal
            ? "Ví dụ quỹ mục tiêu: đã góp 6,40 trên mục tiêu 10 AVAX, đạt 64%. Chưa mở đề nghị chi."
            : "Ví dụ quỹ hoạt động: khả dụng 3,60 AVAX, giữ chỗ 1,20 AVAX. Khoản thuê sân đã đủ duyệt nhưng chưa thanh toán."
        }
      >
        <div aria-hidden="true">
          <div className={styles.appTopbar}>
            <span className={styles.workspaceIcon}>
              <Users size={18} />
            </span>
            <strong>CLB Cầu lông</strong>
            <span className={styles.previewLabel}>VÍ DỤ MINH HỌA</span>
          </div>
          <div className={styles.appBody}>
            <div className={styles.fundSummary}>
              <span className={styles.fundType}>
                {goal ? "Quỹ mục tiêu" : "Quỹ hoạt động"}
              </span>
              <h3>{goal ? "Giải đấu cuối năm" : "Quỹ sinh hoạt tháng 11"}</h3>
              <div className={styles.balance}>
                <span>{goal ? "Đã góp" : "Khả dụng"}</span>
                <p>
                  {goal ? "6,40" : "3,60"} <span>AVAX</span>
                </p>
              </div>
              {goal ? (
                <div className={styles.goalProgress}>
                  <div>
                    <span>Mục tiêu 10 AVAX</span>
                    <strong>64%</strong>
                  </div>
                  <div className={styles.progressTrack}>
                    <span />
                  </div>
                  <p>Chưa mở đề nghị chi</p>
                </div>
              ) : (
                <dl className={styles.reservation}>
                  <dt>Giữ chỗ cho khoản chờ chi</dt>
                  <dd>1,20 AVAX</dd>
                </dl>
              )}
              <div className={styles.appFootnote}>
                AVAX thử nghiệm · Ví cá nhân giữ tiền
              </div>
            </div>
            <div className={styles.activity}>
              <div className={styles.activityHeading}>
                Sổ quỹ <span>Tháng 11</span>
              </div>
              <div className={styles.activityRow}>
                <div>
                  <strong>Lan góp quỹ</strong>
                  <span>Đã đối soát</span>
                </div>
                <p className={styles.received}>
                  +0,40 <span>AVAX</span>
                </p>
              </div>
              <div className={styles.activityRow}>
                <div>
                  <strong>
                    {goal ? "Minh góp quỹ" : "Thuê sân cuối tuần"}
                  </strong>
                  <span className={goal ? "" : styles.awaiting}>
                    {goal ? "Đã đối soát" : "Đủ duyệt · Chưa thanh toán"}
                  </span>
                </div>
                <p className={goal ? styles.received : ""}>
                  {goal ? "+0,60" : "1,20"} <span>AVAX</span>
                </p>
              </div>
              <div className={styles.activityRow}>
                <div>
                  <strong>{goal ? "An góp quỹ" : "Mua cầu tập"}</strong>
                  <span>{goal ? "Đã đối soát" : "Đã thanh toán"}</span>
                </div>
                <p className={goal ? styles.received : ""}>
                  {goal ? "+0,40" : "−0,20"} <span>AVAX</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>Số liệu minh họa, không phải số dư tài khoản.</figcaption>
    </figure>
  );
}

export function LandingPageNew() {
  const [fundKind, setFundKind] = useState<FundKind>("OPERATING");
  const preview = useRef<HTMLDivElement>(null);
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const showFund = (kind: FundKind) => {
    setFundKind(kind);
    preview.current?.focus({ preventScroll: true });
    preview.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className={styles.page}>
      <a href="#noi-dung" className={styles.skipLink}>
        Đến nội dung chính
      </a>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link
            href="/"
            className={styles.brandLink}
            aria-label="Kinetix, trang chủ"
          >
            <Brand />
          </Link>
          <nav
            className={styles.desktopNav}
            aria-label="Điều hướng trang giới thiệu"
          >
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <details
              ref={mobileMenu}
              className={styles.mobileMenu}
              onKeyDown={(event) => {
                if (event.key === "Escape" && mobileMenu.current) {
                  mobileMenu.current.open = false;
                  mobileMenu.current.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="Mở hoặc đóng điều hướng">
                <Menu size={22} aria-hidden="true" />
              </summary>
              <nav aria-label="Điều hướng trên điện thoại">
                {navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (mobileMenu.current) mobileMenu.current.open = false;
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="noi-dung" className={styles.container}>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroIntro}>
            <h1 id="hero-heading">
              Quản lý
              <br />
              quỹ chung<span>.</span>
            </h1>
            <div className={styles.heroCopy}>
              <p>
                Cho câu lạc bộ, nhóm bạn và gia đình. Ghi nhận tiền góp, duyệt
                chi và theo dõi khoản đã thanh toán.
              </p>
              <Link href="/register" className={styles.primaryButton}>
                Tạo nhóm <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className={styles.networkNote}>
                Bản thử nghiệm Fuji · AVAX · Có phí mạng
              </p>
            </div>
          </div>
          <div
            id="xem-truoc"
            ref={preview}
            className={styles.heroPreview}
            tabIndex={-1}
          >
            <div
              className={styles.previewTabs}
              role="group"
              aria-label="Chọn mẫu quỹ để xem minh họa"
            >
              <button
                type="button"
                aria-pressed={fundKind === "OPERATING"}
                onClick={() => setFundKind("OPERATING")}
              >
                Quỹ hoạt động
              </button>
              <button
                type="button"
                aria-pressed={fundKind === "GOAL"}
                onClick={() => setFundKind("GOAL")}
              >
                Quỹ mục tiêu
              </button>
            </div>
            <FundPreview kind={fundKind} />
            <span className={styles.srOnly} role="status">
              {fundKind === "GOAL"
                ? "Đang xem minh họa quỹ mục tiêu."
                : "Đang xem minh họa quỹ hoạt động."}
            </span>
          </div>
        </section>

        <section
          id="cac-loai-quy"
          className={styles.fundsSection}
          aria-labelledby="funds-heading"
        >
          <h2 id="funds-heading">Chọn quỹ theo việc cần làm.</h2>
          <div className={styles.fundModels}>
            <article>
              <h3>Quỹ hoạt động</h3>
              <p>
                Thu chi thường xuyên: tiền sân, hội phí, sinh hoạt nhóm. Xem
                riêng tiền khả dụng và khoản đang giữ chỗ để chi.
              </p>
              <button type="button" onClick={() => showFund("OPERATING")}>
                Xem ví dụ <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
            <article>
              <h3>Quỹ mục tiêu</h3>
              <p>
                Cùng góp cho một khoản dự kiến: chuyến đi, giải đấu, thiết bị
                mới. Đặt số tiền và hạn góp; chỉ đề nghị chi khi đã đạt mục
                tiêu.
              </p>
              <button type="button" onClick={() => showFund("GOAL")}>
                Xem ví dụ <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          </div>
          <p className={styles.fundTerms}>
            Khoản góp không tự tạo quyền rút lại. Hoàn tiền và đóng quỹ chưa
            được hỗ trợ đầy đủ.
          </p>
        </section>

        <section
          id="cach-hoat-dong"
          className={styles.workflow}
          aria-labelledby="workflow-heading"
        >
          <h2 id="workflow-heading">Từ đề nghị đến thanh toán.</h2>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <h3>Gửi đề nghị chi</h3>
              <p>Ghi số tiền, người nhận, mục đích và chứng từ.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Người có quyền duyệt</h3>
              <p>
                Xét duyệt theo quy tắc của quỹ. Đủ duyệt chưa phải đã trả tiền.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Chủ ví thanh toán</h3>
              <p>
                Ký chuyển tiền. Ứng dụng xác minh giao dịch rồi ghi nhận đã
                thanh toán.
              </p>
            </li>
          </ol>
        </section>

        <section
          id="cau-hoi"
          className={styles.faq}
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading">Trước khi dùng</h2>
          <div className={styles.questions}>
            {questions.map((question) => (
              <details key={question.title}>
                <summary>
                  {question.title}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{question.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <span>© 2026 Kinetix</span>
        <span>AVAX thử nghiệm · Chưa phát hành cho tiền thật</span>
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
          <Link href="/demo">Xem demo</Link>
        )}
      </footer>
    </div>
  );
}
