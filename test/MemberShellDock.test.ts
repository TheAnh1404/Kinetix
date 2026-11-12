import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

describe("MemberResponsiveShell & MemberMobileDock UI Ergonomics", function () {
  this.timeout(10000);
  const React = require("../frontend/node_modules/react");
  const { renderToStaticMarkup } = require("../frontend/node_modules/react-dom/server");

  let pathname = "/dashboard/elderly";
  let searchParamsStr = "source=contract";
  let mockRole = "ELDERLY";

  const mockFamily = {
    workspaces: [
      { id: "ws-1", name: "Đại Gia Đình", type: "FAMILY" },
      { id: "ws-2", name: "Nhóm Anh Em", type: "SIBLINGS" },
    ],
    currentWorkspace: { id: "ws-1", name: "Đại Gia Đình", type: "FAMILY", role: "ELDERLY" },
    switchWorkspace: async () => {},
    withdrawalRequests: [
      { id: "req-1", requesterId: "user-1", amount: 0.5, status: "PENDING" },
    ],
    chores: [
      { id: "chore-1", childId: "user-1", title: "Rửa bát", rewardAmount: 0.1, status: "TODO" },
      { id: "chore-2", childId: "user-2", title: "Quét nhà", rewardAmount: 0.2, status: "SUBMITTED" },
    ],
  };

  const mockAuth = {
    user: { id: "user-1", fullName: "Nguyễn Văn An" },
    workspaces: [{ id: "ws-1", role: "ELDERLY" }],
    logout: async () => {},
  };

  const mockSettings = {
    theme: "light",
    toggleTheme: () => {},
  };

  const cache = new Map<string, any>();

  function loadTsx(filePath: string): any {
    const filename = resolve(filePath);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} as any };
    cache.set(filename, module.exports);

    const sourceCode = readFileSync(filename, "utf8");
    const transpiled = ts.transpileModule(sourceCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;

    const importer = (name: string): any => {
      if (name === "react") return React;
      if (name === "lucide-react") return require("../frontend/node_modules/lucide-react");
      if (name === "next/link") {
        return ({ href, children, ...props }: any) =>
          React.createElement("a", { href, ...props }, children);
      }
      if (name === "next/navigation") {
        return {
          usePathname: () => pathname,
          useSearchParams: () => new URLSearchParams(searchParamsStr),
          useRouter: () => ({ push() {}, replace() {} }),
        };
      }
      if (name === "@/context/FamilyContext") return { useFamily: () => mockFamily };
      if (name === "@/hooks/useAuth") return { useAuth: () => mockAuth };
      if (name === "@/context/SettingsContext") return { useSettings: () => mockSettings };
      if (name === "@/components/navigation/MemberMobileDock") {
        return loadTsx("frontend/src/components/navigation/MemberMobileDock.tsx");
      }
      if (name === "@/components/ui/KinetixLogo") {
        return loadTsx("frontend/src/components/ui/KinetixLogo.tsx");
      }
      if (name === "@/types") return {};
      throw new Error(`Unhandled import: ${name}`);
    };

    const fn = new Function("exports", "require", "module", transpiled);
    fn(module.exports, importer, module);
    return module.exports;
  }

  it("renders MemberMobileDock with 3 large buttons for ELDERLY role", () => {
    const { MemberMobileDock } = loadTsx("frontend/src/components/navigation/MemberMobileDock.tsx");
    pathname = "/dashboard/elderly";

    const html = renderToStaticMarkup(
      React.createElement(MemberMobileDock, { role: "ELDERLY" })
    );

    // Kiểm tra 3 tab của vai trò ELDERLY
    expect(html).to.include("Trang chính");
    expect(html).to.include("Yêu cầu trợ cấp");
    expect(html).to.include("Người thân");

    // Kiểm tra class theme và thuộc tính aria-current
    expect(html).to.include("elderly-dock-theme");
    expect(html).to.include('aria-current="page"');

    // Kiểm tra liên kết bảo lưu query source=contract
    expect(html).to.include('href="/dashboard/elderly?source=contract"');

    // Kiểm tra huy hiệu yêu cầu đang chờ duyệt của ông bà
    expect(html).to.include("dock-badge");
  });

  it("renders MemberMobileDock with 3 gamified tabs for CHILD role", () => {
    const { MemberMobileDock } = loadTsx("frontend/src/components/navigation/MemberMobileDock.tsx");
    pathname = "/dashboard/kids";

    const html = renderToStaticMarkup(
      React.createElement(MemberMobileDock, { role: "CHILD" })
    );

    // Kiểm tra 3 tab gamified cho trẻ nhỏ
    expect(html).to.include("Việc nhà");
    expect(html).to.include("Heo đất &amp; Thưởng");
    expect(html).to.include("Của con");

    // Kiểm tra theme kids
    expect(html).to.include("kids-dock-theme");
    expect(html).to.include('aria-current="page"');
  });

  it("renders MemberMobileDock with 4 tabs for GUARDIAN role", () => {
    const { MemberMobileDock } = loadTsx("frontend/src/components/navigation/MemberMobileDock.tsx");
    pathname = "/dashboard/member";

    const html = renderToStaticMarkup(
      React.createElement(MemberMobileDock, { role: "GUARDIAN" })
    );

    // Kiểm tra 4 tab của người giám hộ
    expect(html).to.include("Hũ an sinh");
    expect(html).to.include("Duyệt yêu cầu");
    expect(html).to.include("Việc nhà");
    expect(html).to.include("Cài đặt");

    // Kiểm tra theme guardian
    expect(html).to.include("guardian-dock-theme");
    expect(html).to.include('aria-current="page"');

    // Kiểm tra huy hiệu số lượng yêu cầu chờ duyệt (> 0)
    expect(html).to.include("dock-badge");
  });

  it("renders MemberResponsiveShell with Mobile Top Bar elements (Workspace, Dual-Chain, Theme, Role)", () => {
    const { MemberResponsiveShell } = loadTsx("frontend/src/components/layout/MemberResponsiveShell.tsx");
    pathname = "/dashboard/elderly";

    const html = renderToStaticMarkup(
      React.createElement(
        MemberResponsiveShell,
        { elderly: true },
        React.createElement("div", { id: "child-content" }, "Nội dung kiểm thử")
      )
    );

    // Kiểm tra Top Bar chứa tên Workspace
    expect(html).to.include("Đại Gia Đình");

    // Kiểm tra Huy hiệu mạng kép Dual-Chain (L1 và Fuji)
    expect(html).to.include("L1");
    expect(html).to.include("Fuji");

    // Kiểm tra thông tin người dùng và vai trò
    expect(html).to.include("Nguyễn Văn An");
    expect(html).to.include("Ông Bà");

    // Kiểm tra thanh điều khiển trợ năng cho Người cao tuổi
    expect(html).to.include("Aa · Chữ lớn hơn");
    expect(html).to.include("Giọng đọc:");

    // Kiểm tra nội dung chính được hiển thị bên trong shell
    expect(html).to.include("Nội dung kiểm thử");

    // Kiểm tra có chứa MemberMobileDock
    expect(html).to.include("member-mobile-dock");
  });
});
