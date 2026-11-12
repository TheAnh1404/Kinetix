import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

describe("GuardianMobileView Mobile UI & Executive Ergonomics", function () {
  this.timeout(10000);
  const React = require("../frontend/node_modules/react");
  const {
    renderToStaticMarkup,
  } = require("../frontend/node_modules/react-dom/server");

  let family: any;
  let tabParam = "all";
  let cache: Map<string, any>;
  const user = {
    id: "guardian-user-1",
    fullName: "Nguyễn Văn Cha",
    walletAddress: "0x1234567890123456789012345678901234567890",
    role: "GUARDIAN",
    avatarUrl: null,
  };

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
          usePathname: () => "/dashboard/member",
          useSearchParams: () => new URLSearchParams(`tab=${tabParam}`),
          useRouter: () => ({ push() {}, replace() {} }),
        };
      if (name === "@/context/FamilyContext")
        return { useFamily: () => family };
      if (name === "@/context/SettingsContext")
        return { useSettings: () => ({ theme: "light", toggleTheme() {} }) };
      if (name === "@/hooks/useAuth")
        return {
          useAuth: () => ({
            user,
            workspaces: [{ id: "ws-1", role: "GUARDIAN" }],
          }),
        };
      if (name === "@/contracts/config")
        return {
          hubChain: { nativeCurrency: { symbol: "AVAX" } },
        };
      if (name === "@/lib/member")
        return {
          amountLabel: (v: any) => String(v || "0"),
        };
      if (name === "@/components/ui/SafeAvatar")
        return {
          SafeAvatar: ({ name, role, size }: any) =>
            React.createElement("div", { className: "safe-avatar" }, name?.[0] || "U"),
        };
      if (name === "@/components/vaults/DepositVaultModal")
        return {
          DepositVaultModal: () => null,
        };
      if (name === "@/components/dashboard/ChoreProofModal")
        return {
          ChoreProofModal: () => null,
        };

      try {
        return require(name);
      } catch {
        return {};
      }
    };

    const fn = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      code,
    );
    fn(module.exports, importer, module, filename, resolve("."));
    return module.exports;
  }

  beforeEach(() => {
    cache = new Map();
    tabParam = "all";
    family = {
      currentWorkspace: { id: "ws-1", name: "Đại Gia Đình Kinetix" },
      dynamicVaults: [
        {
          id: "vault-1",
          workspaceId: "ws-1",
          onchainVaultId: 1,
          name: "Hũ Hưu Trí Ông Bà",
          ruleTemplate: "SHIELD",
          bufferRatioBps: 1500,
          totalBalance: 10.0,
          l1BufferBalance: 1.5,
          cChainPrincipal: 8.5,
          isActive: true,
        },
        {
          id: "vault-2",
          workspaceId: "ws-1",
          onchainVaultId: 2,
          name: "Heo Đất Con Yêu",
          ruleTemplate: "MILESTONE",
          bufferRatioBps: 2000,
          totalBalance: 5.0,
          l1BufferBalance: 1.0,
          cChainPrincipal: 4.0,
          isActive: true,
        },
      ],
      withdrawalRequests: [
        {
          id: "req-1",
          onchainRequestId: 101,
          requesterId: "elderly-user",
          requesterName: "Bà Nội",
          requesterAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          amount: 0.5,
          exactAmount: "0.5",
          vault: "Hũ Hưu Trí Ông Bà",
          reason: "Mua máy đo huyết áp",
          approvalsCount: 1,
          requiredApprovals: 2,
          status: "PENDING",
          createdAt: "2026-11-12",
          guardianSignatures: [
            { guardianName: "Chú Út", signed: true },
            { guardianName: "Nguyễn Văn Cha", signed: false },
          ],
        },
      ],
      chores: [
        {
          id: "chore-1",
          childId: "child-user",
          childName: "Bé Na",
          title: "Dọn dẹp góc học tập",
          description: "Đã xếp sách vở ngăn nắp và lau bàn học",
          rewardAmount: 0.05,
          exactRewardAmount: "0.05",
          status: "SUBMITTED",
          proofImageUrl: "https://example.com/proof.jpg",
          createdAt: "10:30 Hôm nay",
        },
      ],
      currentMember: {
        id: "guardian-user-1",
        name: "Nguyễn Văn Cha",
        role: "GUARDIAN",
        avatar: "",
      },
      members: [
        {
          id: "elderly-user",
          name: "Bà Nội",
          role: "ELDERLY",
          walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        },
        {
          id: "child-user",
          name: "Bé Na",
          role: "CHILD",
          walletAddress: "0x1111111111111111111111111111111111111111",
        },
      ],
      approveWithdrawal: async () => true,
      verifyAndRewardChore: async () => true,
      refreshBalances: async () => {},
      isDataLoading: false,
    };
  });

  it("renders executive header with guardian identity, workspace name, and KPI chips", () => {
    const { GuardianMobileView } = load(
      "frontend/src/components/member/GuardianMobileView.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuardianMobileView));

    expect(html).to.include("Người Giám Hộ");
    expect(html).to.include("Đại Gia Đình Kinetix");
    expect(html).to.include("Nguyễn Văn Cha");
    // KPI chips
    expect(html).to.include("Chờ ký");
    expect(html).to.include("Việc nhà");
    expect(html).to.include("Ngân quỹ");
  });

  it("renders Mobile Approval Center with pending withdrawal request and 1-tap approve button", () => {
    const { GuardianMobileView } = load(
      "frontend/src/components/member/GuardianMobileView.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuardianMobileView));

    // Request info
    expect(html).to.include("Yêu Cầu Rút Cần Ký Duyệt");
    expect(html).to.include("Bà Nội");
    expect(html).to.include("Mua máy đo huyết áp");
    expect(html).to.include("0.5 AVAX");
    expect(html).to.include("1 / 2 Chữ ký");
    // 1-tap Approve button with touch target >= 48px
    expect(html).to.include("Ký Duyệt Rút Tiền Ngay (1-Tap)");
    expect(html).to.include("min-h-[48px]");
  });

  it("renders Chore Verification Station with submitted chore and 1-tap reward button", () => {
    const { GuardianMobileView } = load(
      "frontend/src/components/member/GuardianMobileView.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuardianMobileView));

    expect(html).to.include("Trạm Kiểm Tra Việc Nhà &amp; Thưởng");
    expect(html).to.include("Bé Na");
    expect(html).to.include("Dọn dẹp góc học tập");
    expect(html).to.include("+0.05 AVAX");
    expect(html).to.include("Xem ảnh bằng chứng của con");
    expect(html).to.include("Duyệt &amp; Trao Thưởng");
    expect(html).to.include("min-h-[48px]");
  });

  it("renders Dual-Chain liquidity indicator and quick deposit action", () => {
    const { GuardianMobileView } = load(
      "frontend/src/components/member/GuardianMobileView.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuardianMobileView));

    expect(html).to.include("Thanh Khoản Dual-Chain (L1 &amp; C-Chain)");
    expect(html).to.include("Đệm Family L1");
    expect(html).to.include("Sinh Lời C-Chain");
    expect(html).to.include("Nạp Quỹ");
    expect(html).to.include("Hũ Hưu Trí Ông Bà");
  });

  it("gracefully displays empty states when no pending requests or chores exist", () => {
    family.withdrawalRequests = [];
    family.chores = [];
    const { GuardianMobileView } = load(
      "frontend/src/components/member/GuardianMobileView.tsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuardianMobileView));

    expect(html).to.include("Không có yêu cầu rút tiền nào cần duyệt");
    expect(html).to.include("Tất cả việc nhà đã được kiểm tra xong");
  });
});
