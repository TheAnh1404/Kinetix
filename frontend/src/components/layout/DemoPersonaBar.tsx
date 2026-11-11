"use client";

import { useReducer, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import {
  DEMO_PERSONAS,
  DemoPersona,
  DemoGuardian,
} from "../../../../shared/demoPersonas";
import {
  initialJudgeDemo,
  judgeDemoReducer,
} from "../../../../shared/judgeDemo";
import styles from "./DemoPersonaBar.module.css";

const roles: {
  id: DemoPersona;
  icon: string;
  title: string;
  detail: string;
}[] = [
  { id: "admin", icon: "👨‍💼", title: "Bố Ba", detail: "Admin / Guardian" },
  {
    id: "elderly",
    icon: "👴",
    title: "Ông Nội Cụ Ba",
    detail: "Rút nhanh & gia đình duyệt",
  },
  {
    id: "child",
    icon: "👧",
    title: "Bé Na",
    detail: "Heo đất & Chore-to-Earn",
  },
];
const guardians: DemoGuardian[] = ["admin", "guardian1", "guardian2"];

/** Context cục bộ theo đúng seed; không sửa cookie đăng nhập hoặc ngắt kết nối Core. */
export function DemoPersonaBar({ onExit }: { onExit?: () => void }) {
  const family = useFamily();
  const [state, dispatch] = useReducer(
    judgeDemoReducer,
    undefined,
    initialJudgeDemo,
  );
  const [name, setName] = useState("");
  const [ratio, setRatio] = useState(1000);
  const [amount, setAmount] = useState("60");
  const select = (persona: DemoPersona) => {
    dispatch({ type: "switch", persona });
    const identity = DEMO_PERSONAS[persona];
    const member = family.members.find(
      (item) =>
        item.walletAddress.toLowerCase() === identity.wallet.toLowerCase(),
    );
    family.setCurrentMember(
      member || {
        id: `judge-demo-${persona}`,
        name: identity.name,
        role: identity.role,
        title: identity.role,
        walletAddress: identity.wallet,
        address: identity.wallet,
        avatar: "",
        defaultTab:
          persona === "admin"
            ? "quan-tri-cha-me"
            : persona === "elderly"
              ? "kinetix-shield"
              : "kinetix-kids",
      },
    );
  };
  const exit = () => {
    void family.refreshMembers();
    onExit?.();
  };
  const approveButtons = (chore: boolean) =>
    guardians.map((guardian) => (
      <button
        key={guardian}
        type="button"
        disabled={
          chore
            ? state.chore !== "SUBMITTED" ||
              state.choreApprovals.includes(guardian)
            : !state.pending ||
              state.pending.paid ||
              state.pending.approvals.includes(guardian)
        }
        onClick={() =>
          dispatch({ type: chore ? "reward" : "approve", guardian })
        }
      >
        {DEMO_PERSONAS[guardian].name.split(" (")[0]} · ký duyệt
      </button>
    ));
  return (
    <div className={styles.demo}>
      <nav className={styles.bar} aria-label="UNIHACK JUDGE QUICK SWITCHER">
        <div className={styles.brand}>
          <span className={styles.dot} aria-hidden="true" /> UNIHACK JUDGE QUICK
          SWITCHER
        </div>
        <div className={styles.roles}>
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              aria-pressed={state.persona === role.id}
              onClick={() => select(role.id)}
            >
              <span aria-hidden="true">{role.icon}</span>
              <span>
                <strong>{role.title}</strong>
                <small>{role.detail}</small>
              </span>
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "reset" });
              setName("");
              setRatio(1000);
              setAmount("60");
              select("admin");
            }}
          >
            Bắt đầu lại
          </button>
          {onExit && (
            <button type="button" onClick={exit}>
              Về tài khoản thật
            </button>
          )}
        </div>
      </nav>
      <main
        className={`${styles.main} ${state.persona === "elderly" ? styles.elderly : ""}`}
      >
        <p className={styles.label}>
          PHIÊN TRÌNH DIỄN CỤC BỘ · KHÔNG CHUYỂN TÀI SẢN THẬT
        </p>
        <h1>
          {state.persona === "admin"
            ? "Bàn Quản Trị của Bố Ba"
            : state.persona === "elderly"
              ? "Chào Ông Nội Cụ Ba"
              : "Heo đất 4.0 của Bé Na"}
        </h1>
        <p className={styles.intro}>
          Đại Gia Đình Bác Ba · Vai diễn dùng chung định danh với dữ liệu seed.
          Kết nối ví và quyền tài khoản thật được giữ nguyên.
        </p>
        <div role="status" aria-live="polite" className={styles.notice}>
          {state.notice}
        </div>
        {state.persona === "admin" ? (
          <div className={styles.grid}>
            <section className={styles.card}>
              <h2>Allowlist Security</h2>
              <p>
                Chỉ thành viên đã được cấp quyền mới tương tác với hũ gia đình.
                Admin chỉ được ký khi có trong danh sách Guardian.
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: "outsider" })}
              >
                Thử ví người lạ
              </button>
              <h2>Anti-Scam Multisig 2/3</h2>
              <p>
                {state.pending
                  ? `${state.pending.amount} AVAX · ${state.pending.approvals.length}/3 chữ ký · ${state.pending.paid ? "Đã chi trả" : "Chờ gia đình duyệt"}`
                  : "Chuyển sang Ông Nội để tạo yêu cầu rút lớn."}
              </p>
              <div className={styles.actions}>{approveButtons(false)}</div>
              <h2>Duyệt Chore-to-Earn</h2>
              <p>
                {state.chore === "TODO"
                  ? "Bé Na chưa báo hoàn thành."
                  : state.chore === "SUBMITTED"
                    ? `Đang chờ · ${state.choreApprovals.length}/3 xác nhận`
                    : "Đã thưởng 5 AVAX"}
              </p>
              <div className={styles.actions}>{approveButtons(true)}</div>
            </section>
            <section className={styles.card}>
              <h2>Tạo Hũ Động</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  dispatch({ type: "create", name, bufferRatioBps: ratio });
                }}
              >
                <label htmlFor="judge-vault-name">Tên hũ mới</label>
                <input
                  id="judge-vault-name"
                  value={name}
                  required
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                />
                <label htmlFor="judge-buffer">
                  Đệm Family L1: {ratio / 100}% / Fuji: {100 - ratio / 100}%
                </label>
                <input
                  id="judge-buffer"
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={ratio}
                  aria-valuetext={`${ratio / 100}% đệm Family L1`}
                  onChange={(event) => setRatio(Number(event.target.value))}
                />
                <p>
                  Mặc định 10% đệm / 90% Fuji · 8% APY chi từ reserve độc lập.
                </p>
                <button type="submit">+ Tạo Hũ mới trong demo</button>
              </form>
              <ul className={styles.jars}>
                {state.jars.map((jar) => (
                  <li key={jar.id}>
                    <strong>
                      #{jar.id} {jar.name}
                    </strong>
                    <span>
                      {jar.bufferRatioBps / 100}% L1 /{" "}
                      {100 - jar.bufferRatioBps / 100}% Fuji
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : state.persona === "elderly" ? (
          <section className={styles.card}>
            <h2>Hũ an sinh của Ông</h2>
            <p className={styles.balance}>{String(state.buffer)} AVAX</p>
            <p>Sẵn trong đệm rút nhanh · Tối đa 50 AVAX/lần</p>
            <button
              className={styles.primary}
              type="button"
              onClick={() => dispatch({ type: "fast", amount: 20n })}
            >
              Rút nhanh 20 AVAX · 0đ gas
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (/^[1-9]\d{0,3}$/.test(amount))
                  dispatch({ type: "request", amount: BigInt(amount) });
              }}
            >
              <label htmlFor="judge-withdraw">Số AVAX cần gia đình duyệt</label>
              <input
                id="judge-withdraw"
                type="number"
                min={1}
                max={1200}
                step={1}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <button type="submit">Gửi yêu cầu rút lớn</button>
            </form>
            {state.pending && (
              <p>
                Yêu cầu {String(state.pending.amount)} AVAX ·{" "}
                {state.pending.approvals.length}/3 chữ ký ·{" "}
                {state.pending.paid
                  ? "Đã nhận tiền trong demo"
                  : "Chờ 2 người bảo hộ đồng ý"}
              </p>
            )}
          </section>
        ) : (
          <section className={`${styles.card} ${styles.piggy}`}>
            <span className={styles.pig} aria-hidden="true">
              🐷
            </span>
            <h2>Con đã tích lũy {String(state.reward)} AVAX</h2>
            <p>Làm việc tốt, nhận thưởng sau khi gia đình xác nhận.</p>
            <article className={styles.task}>
              <h3>Dọn phòng và xếp sách gọn gàng</h3>
              <p>
                Thưởng 5 AVAX ·{" "}
                {state.chore === "TODO"
                  ? "Chưa hoàn thành"
                  : state.chore === "SUBMITTED"
                    ? "Chờ gia đình duyệt"
                    : "Đã nhận thưởng"}
              </p>
              <button
                type="button"
                disabled={state.chore !== "TODO"}
                onClick={() => dispatch({ type: "claim" })}
              >
                Con đã làm xong!
              </button>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
