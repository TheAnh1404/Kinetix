import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

describe("Mobile Navigation Bar & Responsive Settings presentation", () => {
  const React = require("../frontend/node_modules/react");
  const {
    renderToStaticMarkup,
  } = require("../frontend/node_modules/react-dom/server");

  let pathname: string;
  let currentLanguage: string;

  const load = (file: string): any => {
    const module = { exports: {} as any };
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (name: string): any => {
        if (name.endsWith(".css")) return {};
        if (name === "react") return React;
        if (name === "next/navigation") {
          return {
            useRouter: () => ({ push: () => {} }),
            usePathname: () => pathname,
            useSearchParams: () => new URLSearchParams(),
          };
        }
        if (name === "next/link") {
          return ({ href, children, ...props }: any) =>
            React.createElement("a", { href, ...props }, children);
        }
        if (name === "@/context/LanguageContext") {
          return {
            useLanguage: () => ({
              language: currentLanguage,
              t: (key: string) => key,
            }),
          };
        }
        if (name.startsWith("@/")) {
          return load(resolve(`frontend/src/${name.slice(2)}.tsx`));
        }
        return require(name);
      },
      module,
      module.exports,
    );
    return module.exports;
  };

  beforeEach(() => {
    pathname = "/dashboard/admin";
    currentLanguage = "vi";
  });

  it("renders MobileNavBar with all 4 core rules, center deposit FAB, and settings button", () => {
    const { MobileNavBar } = load(
      resolve("frontend/src/components/navigation/MobileNavBar.tsx"),
    );
    const html = renderToStaticMarkup(
      React.createElement(MobileNavBar, {
        activeTab: "quan-tri-cha-me",
        onTabChange: () => {},
        onOpenDeposit: () => {},
      }),
    );

    // Kiểm tra nhãn tiếng Việt
    expect(html).to.include("Quản Trị");
    expect(html).to.include("An Sinh");
    expect(html).to.include("Nạp Quỹ");
    expect(html).to.include("Việc Nhà");
    expect(html).to.include("Họ Hụi");
    expect(html).to.include("Cài Đặt");

    // Kiểm tra biểu tượng Material Symbols tương ứng
    expect(html).to.include("dashboard");
    expect(html).to.include("shield");
    expect(html).to.include("bolt");
    expect(html).to.include("savings");
    expect(html).to.include("groups");
    expect(html).to.include("settings");
  });

  it("highlights Cài Đặt button as active when activeTab is 'settings' or on /settings path", () => {
    pathname = "/settings";
    const { MobileNavBar } = load(
      resolve("frontend/src/components/navigation/MobileNavBar.tsx"),
    );
    const html = renderToStaticMarkup(
      React.createElement(MobileNavBar, {
        activeTab: "settings",
        onTabChange: () => {},
        onOpenDeposit: () => {},
      }),
    );

    // Cài Đặt được active (nền bg-white/10 và scale-110 text-red-500)
    expect(html).to.include("scale-110 text-red-500");
    expect(html).to.include("Cài Đặt");
  });

  it("renders English labels when language is set to 'en'", () => {
    currentLanguage = "en";
    const { MobileNavBar } = load(
      resolve("frontend/src/components/navigation/MobileNavBar.tsx"),
    );
    const html = renderToStaticMarkup(
      React.createElement(MobileNavBar, {
        activeTab: "quan-tri-cha-me",
        onTabChange: () => {},
        onOpenDeposit: () => {},
      }),
    );

    expect(html).to.include("Command");
    expect(html).to.include("Shield");
    expect(html).to.include("Deposit");
    expect(html).to.include("Kids");
    expect(html).to.include("ROSCA");
    expect(html).to.include("Settings");
  });
});
