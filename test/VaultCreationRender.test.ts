import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Drives the shipped component's handlers and React state at controlled API/wallet
// boundaries. Browser focus, layout and Core-extension acceptance remain separate.
describe("Vault creation component journey", () => {
  const React = require("../frontend/node_modules/react");
  const {
    renderToStaticMarkup,
  } = require("../frontend/node_modules/react-dom/server");
  const ids = [1, 2, 3].map(
    (value) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`,
  );
  let slots: any[],
    cursor: number,
    effects: (() => unknown)[],
    tree: any,
    Component: any,
    family: any,
    phases: any[],
    closed: number;
  let originalDocument: any, originalWindow: any;
  const candidates = ids.map((id, index) => ({
    id,
    name: ["Parent", "Child", "Friend"][index],
    fullName: ["Parent", "Child", "Friend"][index],
    role: index === 1 ? "CHILD" : "GUARDIAN",
    address: `0x${index + 1}`.padEnd(42, String(index + 1)),
    walletAddress: `0x${index + 1}`.padEnd(42, String(index + 1)),
    linked: true,
    permission: "ALLOWED",
    reason: "Verified",
    canGuard: index !== 1,
  }));
  const text = (node: any): string =>
    node == null || typeof node === "boolean"
      ? ""
      : Array.isArray(node)
        ? node.map(text).join(" ")
        : typeof node === "object"
          ? text(node.props?.children)
          : String(node);
  function nodes(node: any, predicate: (node: any) => boolean): any[] {
    if (Array.isArray(node))
      return node.flatMap((child) => nodes(child, predicate));
    if (!node || typeof node !== "object") return [];
    return [
      ...(predicate(node) ? [node] : []),
      ...nodes(node.props?.children, predicate),
    ];
  }
  const button = (label: string) =>
    nodes(
      tree,
      (node) =>
        (node.type === "button" || node.props?.role === "button") &&
        text(node).includes(label),
    )[0];
  const render = () => {
    cursor = 0;
    tree = Component({ isOpen: true, onClose: () => closed++ });
    return tree;
  };
  const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    render();
  };
  const click = async (label: string) => {
    const node = button(label);
    expect(node, label).to.exist;
    expect(!!node.props.disabled, label).to.equal(false);
    node.props.onClick?.({ preventDefault() {}, stopPropagation() {} });
    await settle();
  };
  const input = async (type: string, value: any) => {
    const node = nodes(
      tree,
      (item) => item.type === "input" && item.props.type === type,
    )[0];
    node.props.onChange({ target: { value, checked: value } });
    await settle();
  };
  beforeEach(async () => {
    slots = [];
    cursor = 0;
    effects = [];
    phases = [];
    closed = 0;
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;
    (globalThis as any).document = { activeElement: { focus() {} } };
    (globalThis as any).window = {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
    };
    family = {
      currentWorkspace: { id: ids[0], name: "Our family", type: "FAMILY" },
      dynamicVaults: [],
      members: candidates,
      refreshBalances: async () => {},
      setSelectedVault() {},
      createCustomVault: async (params: any) => {
        phases.push(params);
        return {
          success: true,
          vault: {
            id: ids[2],
            onchainVaultId: 7,
            name: params.name,
            ruleTemplate: params.ruleTemplate,
            bufferRatioBps: params.bufferRatioBps,
          },
        };
      },
    };
    const hooks = {
      ...React,
      useState: (initial: any) => {
        const index = cursor++;
        if (!(index in slots))
          slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (value: any) => {
            slots[index] =
              typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
      useRef: (value: any) => {
        const index = cursor++;
        return (slots[index] ||= { current: value });
      },
      useEffect: (effect: () => unknown) => effects.push(effect),
      useMemo: (factory: () => any) => factory(),
    };
    const code = ts.transpileModule(
      readFileSync(
        "frontend/src/components/vaults/CreateVaultModal.tsx",
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText;
    const module = { exports: {} as any };
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (name === "react") return hooks;
        if (name === "react/jsx-runtime")
          return require("../frontend/node_modules/react/jsx-runtime");
        if (name === "lucide-react")
          return require("../frontend/node_modules/lucide-react");
        if (name.endsWith(".css"))
          return new Proxy(
            {},
            {
              get: (_target, key) =>
                key === "__esModule" ? false : String(key),
            },
          );
        if (name.includes("FamilyContext")) return { useFamily: () => family };
        if (name.includes("workspacePresets"))
          return {
            getWorkspacePreset: (type: string) => ({
              type: type || "FAMILY",
              titleVi: "Đại Gia Đình",
              defaultVaultTemplates: [
                {
                  name: "Hũ Báo Hiếu Ông Bà",
                  ruleTemplate: "SHIELD",
                  bufferRatioBps: 1000,
                  fastWithdrawLimit: 50,
                  requiredApprovals: 2,
                  description: "Bảo vệ tài sản hưu trí, rút nhanh 0 gas",
                  icon: "🛡️",
                },
                {
                  name: "Hũ Lì Xì Bé Na",
                  ruleTemplate: "MILESTONE",
                  bufferRatioBps: 1000,
                  fastWithdrawLimit: 20,
                  requiredApprovals: 2,
                  description: "Quỹ nhiệm vụ Chore-to-Earn",
                  icon: "🎁",
                },
              ],
            }),
          };
        if (name.includes("shared/vaultCreation"))
          return require("../shared/vaultCreation");
        return require(name);
      },
      module,
      module.exports,
    );
    Component = module.exports.CreateVaultModal;
    render();
    for (const effect of [...effects]) effect();
    await settle();
  });
  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  it("completes the four-step vault creation wizard and creates vault onchain", async () => {
    expect(renderToStaticMarkup(tree)).to.include(
      "Bước 1: Chọn mẫu hũ phù hợp",
    );
    expect(text(tree)).to.include("Hũ Báo Hiếu Ông Bà");

    // Advance to Step 2
    await click("Tiếp theo");
    expect(text(tree)).to.include("Bước 2: Đặt tên và định mức tài chính");

    // Enter vault name
    const nameInput = nodes(
      tree,
      (node) => node.type === "input" && node.props?.type === "text",
    )[0];
    nameInput.props.onChange({ target: { value: "Quỹ Báo Hiếu Bố Mẹ" } });
    await settle();

    // Advance to Step 3
    await click("Tiếp theo");
    expect(text(tree)).to.include("Bước 3: Phân bổ đệm rút nhanh");

    // Advance to Step 4
    await click("Tiếp theo");
    expect(text(tree)).to.include("Bước 4: Chốt chặn an toàn");

    // Submit vault creation
    expect(phases).to.have.length(0);
    await click("Tạo Hũ Tiền Ngay");

    // Verified on-chain call
    expect(phases).to.have.length(1);
    expect(phases[0].name).to.equal("Quỹ Báo Hiếu Bố Mẹ");
    expect(phases[0].ruleTemplate).to.equal("SHIELD");
    expect(phases[0].bufferRatioBps).to.equal(1000);

    // Shows success screen
    expect(text(tree)).to.include("Đã Khởi Tạo Hũ Thành Công!");
    expect(button("Nạp Tiền Vào Hũ Ngay")).to.exist;

    // Closing after success increments closed
    await click("Đóng");
    expect(closed).to.equal(1);
  });

  it("validates that vault name is required before moving past step 2", async () => {
    await click("Tiếp theo");
    expect(text(tree)).to.include("Bước 2: Đặt tên và định mức tài chính");

    // Clear name
    const nameInput = nodes(
      tree,
      (node) => node.type === "input" && node.props?.type === "text",
    )[0];
    nameInput.props.onChange({ target: { value: "   " } });
    await settle();

    // Attempt to proceed
    await click("Tiếp theo");
    expect(text(tree)).to.include("Vui lòng nhập tên hũ tiền.");
    expect(text(tree)).to.include("Bước 2: Đặt tên và định mức tài chính");
  });

  it("switches buffer presets and calculates effective APY breakdown in step 3", async () => {
    await click("Tiếp theo");
    await click("Tiếp theo");
    expect(text(tree)).to.include("Bước 3: Phân bổ đệm rút nhanh");

    // Click preset "Tích lũy tối đa" (0% L1 / 100% C-Chain)
    await click("Tích lũy tối đa");
    const html = renderToStaticMarkup(tree);
    expect(html).to.include("Sinh Lời C-Chain: 100%");
    expect(html).to.include("8.0% APY");
  });

  it("closes modal safely via cancel button", async () => {
    await click("Hủy bỏ");
    expect(closed).to.equal(1);
  });
});
