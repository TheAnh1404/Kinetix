import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

describe("Kids Portal Gamified Mobile UI & Ergonomics", function () {
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
  const user = { id: "child-a", fullName: "Bé An" };

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
          useRouter: () => ({ push() {}, replace() {} }),
        };
      if (name === "@/context/FamilyContext")
        return { useFamily: () => family };
      if (name === "@/context/SettingsContext")
        return { useSettings: () => ({ theme: "light", toggleTheme() {} }) };
      if (name === "@/hooks/useVaultExperience")
        return { useVaultExperience: () => experience };
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
            execute: async () => {},
          }),
        };
      if (name === "@/contracts/config")
        return {
          DEPLOYMENT: { enabled: false },
          hubChain: { id: 43113, nativeCurrency: { symbol: "AVAX" } },
        };
      if (name.endsWith(".css")) return {};
      if (name.startsWith("@/")) {
        const base = `frontend/src/${name.slice(2)}`;
        return load(`${base}.${name.includes("/lib/") ? "ts" : "tsx"}`);
      }
      if (name.startsWith("./"))
        return load(resolve(filename, "..", `${name}.tsx`));
      if (name.startsWith("../")) return require(resolve(filename, "..", name));
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
      workspaces: [{ id: "space", name: "Family Space" }],
      currentWorkspace: { id: "space", name: "Family Space" },
    };
  });

  it("renders the interactive PiggyBankCard with coin fill level and shake action", () => {
    const { PiggyBankCard } = load("frontend/src/components/member/PiggyBankCard.tsx");
    const html = renderToStaticMarkup(
      React.createElement(PiggyBankCard, {
        currentWei: "250000000000000000", // 0.25 AVAX
        targetWei: "500000000000000000", // 0.5 AVAX
        targetName: "Xe đạp mới",
      })
    );

    expect(html).to.include("Mục tiêu: Xe đạp mới");
    expect(html).to.include("50%");
    expect(html).to.include("Lắc heo đất");
    expect(html).to.include("0,25");
    expect(html).to.include("Làm việc nhận thưởng");
    expect(html).to.include("Lắc thử con nhé!");
  });

  it("renders ChoreCardItem with colorful status pills and prominent 1-tap action buttons", () => {
    const { ChoreCardItem } = load("frontend/src/components/member/ChoreCardItem.tsx");
    
    // 1. Task TODO
    const htmlTodo = renderToStaticMarkup(
      React.createElement(ChoreCardItem, {
        chore: {
          id: "chore-1",
          title: "Dọn dẹp phòng ngủ",
          description: "Gấp chăn màn và cất đồ chơi gọn gàng",
          status: "TODO",
          exactRewardAmount: "0.05",
          childId: "child-a",
        },
        onOpenSubmit: () => {},
      })
    );

    expect(htmlTodo).to.include("Chưa làm");
    expect(htmlTodo).to.include("Dọn dẹp phòng ngủ");
    expect(htmlTodo).to.include("0,05 AVAX");
    expect(htmlTodo).to.include("Nộp kết quả");
    expect(htmlTodo).to.include("Xem việc");

    // 2. Task SUBMITTED
    const htmlSubmitted = renderToStaticMarkup(
      React.createElement(ChoreCardItem, {
        chore: {
          id: "chore-2",
          title: "Rửa bát sau bữa tối",
          description: "Rửa sạch và úp bát lên giá",
          status: "SUBMITTED",
          exactRewardAmount: "0.1",
          childId: "child-a",
        },
      })
    );

    expect(htmlSubmitted).to.include("Chờ ba mẹ duyệt");
    expect(htmlSubmitted).not.to.include("Nộp kết quả");

    // 3. Task REWARDED
    const htmlRewarded = renderToStaticMarkup(
      React.createElement(ChoreCardItem, {
        chore: {
          id: "chore-3",
          title: "Tưới cây ban công",
          status: "REWARDED",
          exactRewardAmount: "0.02",
          childId: "child-a",
        },
      })
    );

    expect(htmlRewarded).to.include("Đã nhận thưởng");
  });

  it("renders ProofSubmissionModal with camera capture button and quick note suggestions", () => {
    const { ProofSubmissionModal } = load(
      "frontend/src/components/member/ProofSubmissionModal.tsx"
    );

    const html = renderToStaticMarkup(
      React.createElement(ProofSubmissionModal, {
        isOpen: true,
        onClose: () => {},
        chore: {
          id: "chore-1",
          title: "Quét nhà sạch sẽ",
          status: "TODO",
          exactRewardAmount: "0.05",
          childId: "child-a",
        },
      })
    );

    expect(html).to.include("Nộp kết quả việc nhà");
    expect(html).to.include("Chụp ảnh ngay");
    expect(html).to.include("Hoặc chọn ảnh có sẵn từ máy");
    expect(html).to.include("Con đã dọn phòng sạch sẽ rồi ạ!");
    expect(html).to.include("Gửi minh chứng cho ba mẹ ngay");
  });

  it("renders RewardsMilestonesTracker with badge timeline and unlocked badges", () => {
    const { RewardsMilestonesTracker } = load(
      "frontend/src/components/member/RewardsMilestonesTracker.tsx"
    );

    const html = renderToStaticMarkup(
      React.createElement(RewardsMilestonesTracker, {
        completedCount: 3,
        totalRewardedWei: "300000000000000000", // 0.3 AVAX
        totalPendingWei: "50000000000000000",
        completedChores: [],
      })
    );

    expect(html).to.include("Thành tích của con");
    expect(html).to.include("0,3");
    expect(html).to.include("Huy hiệu danh dự");
    expect(html).to.include("Tập sự tự giác");
    expect(html).to.include("Chiến binh chăm chỉ");
    expect(html).to.include("Siêu nhân ngăn nắp");
    expect(html).to.include("Bậc thầy tự lập");
    expect(html).to.include("Đã mở khóa 2/4 danh hiệu");
    expect(html).to.include("Đã đạt");
  });

  it("renders full KidsPortal home page with interactive piggy bank, stats and chore cards", () => {
    family.chores = [
      {
        id: "chore-todo",
        title: "Lau bàn học",
        description: "Lau sạch bụi bàn học của con",
        status: "TODO",
        exactRewardAmount: "0.05",
        childId: "child-a",
      },
      {
        id: "chore-done",
        title: "Tưới cây cảnh",
        status: "REWARDED",
        exactRewardAmount: "0.1",
        childId: "child-a",
      },
    ];

    const { KidsPortal } = load("frontend/src/components/member/KidsPortal.tsx");
    const html = renderToStaticMarkup(React.createElement(KidsPortal));

    expect(html).to.include("Chào Bé An!");
    expect(html).to.include("Lắc heo đất");
    expect(html).to.include("Mục tiêu: Món quà ước mơ");
    expect(html).to.include("Việc tiếp theo");
    expect(html).to.include("Lau bàn học");
    expect(html).to.include("Việc chưa làm");
    expect(html).to.include("Tổng thưởng đã nhận");
  });
});
