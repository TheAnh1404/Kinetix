import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { isWorkspaceOwner } from "../shared/workspacePermissions";

describe("Personal settings and family management presentation", () => {
  const React = require("../frontend/node_modules/react");
  const { renderToStaticMarkup } = require("../frontend/node_modules/react-dom/server");
  let workspace: any, user: any;
  const load = (file: string): any => {
    const module = { exports: {} as any };
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
    new Function("require", "module", "exports", code)((name: string): any => {
      if (name.endsWith(".css")) return {};
      if (name === "react") return React;
      if (name === "lucide-react") return require("../frontend/node_modules/lucide-react");
      if (name === "next/link") return ({ children, ...props }: any) => React.createElement("a", props, children);
      if (name === "@/hooks/useAuth") return { useAuth: () => ({ user, workspaces: [workspace], linkedWallet: { address: `0x${"1".repeat(40)}` } }) };
      if (name === "@/context/FamilyContext") return { useFamily: () => ({ currentWorkspace: workspace }) };
      if (name === "@/context/SettingsContext") return { useSettings: () => ({ theme: "light", soundEnabled: true }) };
      if (name === "@/hooks/useWorkspaceAccess") return load("frontend/src/hooks/useWorkspaceAccess.ts");
      if (name === "./useAuth") return { useAuth: () => ({ user, workspaces: [workspace] }) };
      if (name.includes("shared/workspacePermissions")) return { isWorkspaceOwner };
      throw new Error(`Unexpected import ${name}`);
    }, module, module.exports);
    return module.exports;
  };
  const render = (tab: string) => { const { SettingsView } = load(resolve("frontend/src/components/settings/SettingsView.tsx")); return renderToStaticMarkup(React.createElement(SettingsView, { initialTab: tab })); };
  beforeEach(() => { user = { id: "creator-a", fullName: "Family Owner", username: "owner" }; workspace = { id: "a", name: "Family A", creatorUserId: user.id, role: "ADMIN" }; });
  it("offers management only for the original creator of the selected family", () => { expect(render("family")).to.include('href="/dashboard/admin"').and.include("Mở quản trị"); workspace = { id: "b", name: "Family B", creatorUserId: "someone-else", role: "GUARDIAN", canManageMembers: true }; expect(render("family")).not.to.include('href="/dashboard/admin"'); expect(render("family")).to.include("Không gian thành viên"); });
  it("does not inherit ownership from global ADMIN or a forged local role", () => { user.role = "ADMIN"; workspace = { id: "b", name: "Family B", role: "ADMIN", canAdminister: true }; expect(render("family")).not.to.include("Mở quản trị"); });
  it("keeps legacy management deep links within the scoped family page", () => { workspace.creatorUserId = "someone-else"; for (const tab of ["family_setup", "allowances", "audit_logs"]) expect(render(tab)).to.include("Không gian thành viên").and.not.include('href="/dashboard/admin"'); });
  it("renders accessible personal inputs and password autocomplete without family controls", () => { const profile = render("profile"); expect(profile).to.include('autoComplete="name"').and.include("Hồ sơ cá nhân").and.not.include("Mở quản trị"); const security = render("security"); expect(security).to.include('type="password"').and.include('autoComplete="current-password"').and.include('autoComplete="new-password"'); });
  it("shows a verified wallet and accurate Fuji fees without a fabricated transaction", () => { const html = render("wallet"); expect(html).to.include("43113").and.include("Phí mạng bằng AVAX").and.include(`0x${"1".repeat(40)}`).and.not.include("SYNCED"); });
});
