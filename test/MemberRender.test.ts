import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { firstUseSteps } from "../shared/firstUse";

// Smoke test render cây React thật, thay các biên session/RPC; không giả kết quả E2E trình duyệt.
describe("Member page rendering and personal-data boundaries", function () {
  this.timeout(10000);
  const React = require("../frontend/node_modules/react");
  const {
    renderToStaticMarkup,
  } = require("../frontend/node_modules/react-dom/server");
  let family: any;
  let pathname: string;
  let cache: Map<string, any>;
  let source: string;
  let experience: any;
  const user = { id: "child-a", fullName: "Member fixture" };
  function load(file: string): any {
    const filename = resolve(file);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} as any };
    cache.set(filename, module.exports);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;
    const importer = (name: string): any => {
      if (name === "react") return React;
      if (name === "lucide-react")
        return require("../frontend/node_modules/lucide-react");
      if (name === "next/link")
        return ({ href, children, ...props }: any) =>
          React.createElement("a", { href, ...props }, children);
      if (name === "next/navigation")
        return {
          usePathname: () => pathname,
          useSearchParams: () => new URLSearchParams(`source=${source}`),
          useRouter: () => ({ push() {} }),
        };
      if (name === "@/context/FamilyContext")
        return { useFamily: () => family };
      if (name === "@/context/SettingsContext")
        return { useSettings: () => ({ theme: "light", toggleTheme() {} }) };
      if (name === "@/hooks/useVaultExperience") return { useVaultExperience: () => experience };
      if (name === "@/hooks/useAuth")
        return {
          useAuth: () => ({
            user,
            workspaces: [],
            linkedWallet: { address: `0x${"1".repeat(40)}` },
          }),
        };
      if (name === "@/hooks/useMemberTransaction")
        return {
          useMemberTransaction: () => ({
            state: "idle",
            busy: false,
            blocked: false,
          }),
        };
      if (name === "@/hooks/useVaultPolicy")
        return { useVaultPolicy: () => ({ policy: null }) };
      if (name === "@/contracts/config")
        return { DEPLOYMENT: { enabled: false }, hubChain: { id: 43113, nativeCurrency: { symbol: "AVAX" } } };
      if (name.endsWith(".css")) return {};
      if (name.startsWith("@/")) {
        const base = `frontend/src/${name.slice(2)}`;
        return load(`${base}.${name.includes("/lib/") ? "ts" : "tsx"}`);
      }
      if (name.startsWith("./"))
        return load(resolve(filename, "..", `${name}.tsx`));
      if (name.startsWith("../")) return require(resolve(filename, "..", name));
      if (name.includes("shared/treasury")) return require("../shared/treasury");
      if (name.includes("shared/deployment.json")) return require("../shared/deployment.json");
      if (name.includes("shared/vaultExperience")) return require("../shared/vaultExperience");
      return require(name);
    };
    new Function("require", "module", "exports", code)(
      importer,
      module,
      module.exports,
    );
    return module.exports;
  }
  beforeEach(() => {
    cache = new Map();
    source = "contract";
    experience = { data: null, loading: false, busy: false, error: "", message: "" };
    pathname = "/dashboard/kids";
    family = {
      chores: [],
      dynamicVaults: [],
      withdrawalRequests: [],
      dataErrors: [],
      isDataLoading: false,
      workspaces: [{ id: "space", name: "Family fixture" }],
      currentWorkspace: { id: "space", name: "Family fixture" },
    };
  });
  const fixture = (kind: string) => {
    source = "core";
    const jar = { id: "jar-core", name: "Hũ dữ liệu thật", balanceWei: "200000000000000000", reservedWei: "0", availableWei: "200000000000000000", remainingTodayWei: "1000000000000000000", beneficiary: true, reviewer: false, jobs: [], activity: [], policy: { kind, beneficiaries: [user.id], guardians: ["guardian"], quorum: 1, round: 0, roundStartedAt: "2026-11-10T00:00:00Z", contributionWei: "123456789123456", durationSeconds: 86400, goalName: "Xe đạp", goalWei: "1000000000000000000" } };
    experience.data = { userId: user.id, canManage: false, people: [{ id: user.id, name: "Member fixture", wallet: `0x${"a".repeat(40)}` }], jars: [jar], audit: [], checkedAt: "2026-11-10T00:00:00Z" };
    return jar;
  };
  it("renders the new support experience with accurate available funds and a review-first request", () => {
    fixture("SHIELD"); pathname = "/dashboard/elderly";
    const { ElderlyPortal } = load("frontend/src/components/member/ElderlyPortal.tsx");
    const html = renderToStaticMarkup(React.createElement(ElderlyPortal));
    expect(html).to.include("SỐ TIỀN KHẢ DỤNG CỦA HŨ"); expect(html).to.include("Xem lại yêu cầu"); expect(html).to.include("0.2"); expect(html).not.to.include("0 Gas");
  });
  it("renders actual savings separately from lifetime paid rewards", () => {
    fixture("SAVINGS"); pathname = "/dashboard/kids";
    const { KidsPortal } = load("frontend/src/components/member/KidsPortal.tsx");
    const html = renderToStaticMarkup(React.createElement(KidsPortal));
    expect(html).to.include("HEO ĐẤT HIỆN CÓ"); expect(html).to.include("20% mục tiêu"); expect(html).to.include("không phải số dư ví");
  });
  it("renders a dedicated ROSCA roster, exact contribution, and ordered payout schedule", () => {
    fixture("ROSCA"); pathname = "/dashboard/rosca";
    const { VaultExperience } = load("frontend/src/components/vaults/VaultExperience.tsx");
    const html = renderToStaticMarkup(React.createElement(VaultExperience, { kind: "ROSCA", legacy: null }));
    expect(html).to.include("0.000123456789123456"); expect(html).to.include("Ai đã góp kỳ này?"); expect(html).to.include("Lịch nhận luân phiên"); expect(html).not.to.include("8% APY");
  });
  it("renders a fresh child's empty state with zero rewards and no invented chores", () => {
    const { KidsPortal } = load(
      "frontend/src/components/member/KidsPortal.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(KidsPortal));
    expect(html).to.include("Con chưa có việc mới");
    expect(html).not.to.include("unsplash");
    expect(html).not.to.include("0.08");
  });
  it("renders a separate start shell with three dependent steps and no dashboard navigation", () => {
    const { StartShell } = load("frontend/src/components/auth/StartShell.tsx");
    const html = renderToStaticMarkup(React.createElement(StartShell, { name: user.fullName, familyName: "Family fixture", role: "CHILD", step: "WELCOME", steps: ["WELCOME", "READINESS", "FINISH"], busy: false, onLogout() {} }, "Private first-use content"));
    expect((html.match(/<main/g) || []).length).to.equal(1);
    expect((html.match(/aria-current="step"/g) || []).length).to.equal(1);
    expect(html).to.include("Private first-use content");
    expect(html).to.include("Family fixture");
    expect(html).not.to.include("/dashboard/");
    expect(html).not.to.include("sidebar");
    expect(html).not.to.include("Gia đình của bạn</span>");
  });
  it("keeps only a small reopen link inside the dashboard", () => {
    const { StartReminder } = load("frontend/src/components/auth/StartReminder.tsx");
    const html = renderToStaticMarkup(React.createElement(StartReminder));
    expect(html).to.include("/start?workspace=space");
    expect(html).to.include("Xem hướng dẫn");
    expect(html).not.to.include("Số tiền có thể sử dụng");
    expect(html).not.to.include("Kết nối không gian</button>");
  });
  it("renders the real first-use checklist with scoped help and no financial-admin CTA for a child", () => {
    const { FirstUseChecklist } = load("frontend/src/components/auth/FirstUseChecklist.tsx");
    const steps = firstUseSteps({ role: "CHILD", canManageMembers: false, otherMembers: 0, deployment: "DISABLED", workspace: "MISSING", allowlisted: null, vaults: 0, fundedVaults: 0, tasks: 0 });
    const html = renderToStaticMarkup(React.createElement(FirstUseChecklist, { steps, busy: false, onAction() {} }));
    expect(html).to.include("Liên hệ người bảo hộ");
    expect(html).to.include("Hũ nhiệm vụ dành cho con");
    expect(html).not.to.include("Quản lý thành viên");
    expect(html).not.to.include("Kết nối không gian</button>");
  });
  it("filters the UI by assignee and totals only paid rewards with exact units", () => {
    family.chores = [
      {
        id: "one",
        title: "Own paid task",
        childId: user.id,
        exactRewardAmount: "0.000000000000000001",
        status: "REWARDED",
      },
      {
        id: "two",
        title: "Own pending task",
        childId: user.id,
        exactRewardAmount: "10",
        status: "SUBMITTED",
      },
      {
        id: "other",
        title: "Other child private task",
        childId: "child-b",
        exactRewardAmount: "999",
        status: "TODO",
      },
    ];
    pathname = "/dashboard/kids/rewards";
    const { KidsPortal } = load(
      "frontend/src/components/member/KidsPortal.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(KidsPortal));
    expect(html).to.include("0,000000000000000001");
    expect(html).to.include("Own paid task");
    expect(html).not.to.include("Other child private task");
    expect(html).not.to.include("Own pending task</h3>");
  });
  it("never substitutes a non-SHIELD vault for an elderly member's support vault", () => {
    pathname = "/dashboard/elderly";
    family.dynamicVaults = [
      {
        id: "other",
        name: "Unrelated pool",
        ruleTemplate: "ROSCA",
        isActive: true,
        exactTotalBalance: "999",
      },
    ];
    const { ElderlyPortal } = load(
      "frontend/src/components/member/ElderlyPortal.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(ElderlyPortal));
    expect(html).to.include("Chưa có hũ hỗ trợ phù hợp");
    expect(html).not.to.include("Unrelated pool");
    expect(html).not.to.include("999");
  });
  it("renders one responsive main content region and keeps the same labelled routes", () => {
    const { MemberResponsiveShell } = load(
      "frontend/src/components/layout/MemberResponsiveShell.tsx",
    );
    const html = renderToStaticMarkup(
      React.createElement(
        MemberResponsiveShell,
        { elderly: true },
        "Fixture content",
      ),
    );
    expect((html.match(/<main/g) || []).length).to.equal(1);
    for (const route of [
      "/dashboard/elderly",
      "/dashboard/elderly/requests",
      "/dashboard/elderly/family",
    ])
      expect(html).to.include(`href="${route}?source=contract"`);
    expect(html).not.to.include("MobilePhoneContainer");
    expect(html).not.to.include("0 Gas");
  });
});
