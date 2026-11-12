import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { emptyVaultForm, resolveVaultConfig } from "../shared/vaultCreation";

// Drives the shipped component's handlers and React state at controlled API/wallet
// boundaries. Browser focus, layout and Core-extension acceptance remain separate.
describe.skip("Vault creation component journey", () => {
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
    requests: any[],
    saved: any,
    availability: string,
    phases: any[],
    closed: number;
  let originalDocument: any, originalWindow: any;
  const candidates = ids.map((id, index) => ({
    id,
    fullName: ["Parent", "Child", "Friend"][index],
    role: index === 1 ? "CHILD" : "GUARDIAN",
    address: `0x${index + 1}`.padEnd(42, String(index + 1)),
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
      (node) => node.type === "button" && text(node).includes(label),
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
    node.props.onClick();
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
    requests = [];
    saved = null;
    availability = "READY";
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
      currentWorkspace: { id: ids[0], name: "Our family" },
      dynamicVaults: [],
      refreshBalances: async () => {},
      setSelectedVault() {},
      createCustomVault: async (params: any) => {
        phases.push(params);
        params.onProgress({ status: "AWAITING_SIGNATURE" });
        params.onProgress({ status: "BROADCAST", hash: `0x${"a".repeat(64)}` });
        return {
          success: true,
          txHash: `0x${"a".repeat(64)}`,
          vault: {
            id: ids[2],
            onchainVaultId: 7,
            name: params.name,
            ruleTemplate: params.ruleTemplate,
          },
        };
      },
    };
    const api = async (path: string, body: any, method = "POST") => {
      requests.push({ path, body, method });
      if (path.endsWith("vault-creation"))
        return {
          data: {
            workspaceName: "Our family",
            availability,
            reason: "Deployment disabled; drafts available",
            candidates,
          },
        };
      if (method === "GET") return { drafts: [] };
      if (path.endsWith("/preflight")) {
        saved = {
          ...saved,
          preflight: {
            contractConfig: resolveVaultConfig(
              saved.config,
              new Map(candidates.map((member) => [member.id, member.address])),
              BigInt(Math.floor(Date.now() / 1000)),
            ),
            estimatedFeeWei: "1000000000000",
            checkedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            asOfBlock: "10",
            actor: candidates[0].address,
            hub: candidates[0].address,
          },
        };
      } else
        saved = {
          id: ids[2],
          config: body.config,
          revision: saved ? saved.revision + 1 : 0,
          step: body.step,
          signaturePending: false,
          txHash: null,
          vaultId: null,
          preflight: null,
        };
      return { draft: saved };
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
        if (name.includes("useAuth"))
          return {
            useAuth: () => ({
              user: { id: ids[0] },
              walletMatches: true,
              connectedAddress: candidates[0].address,
            }),
            authRequest: api,
          };
        if (name.includes("web3/client"))
          return { pendingTransactions: () => [] };
        if (name.includes("contracts/config"))
          return { SNOWTRACE_TESTNET_URL: "https://testnet.snowtrace.io" };
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
  const members = async (rosca = false) => {
    const section = (heading: string) =>
      nodes(
        tree,
        (node) =>
          node.type === "section" &&
          nodes(
            node,
            (child) => child.type === "h3" && text(child).includes(heading),
          ).length > 0,
      )[0];
    const check = async (heading: string, index: number) => {
      nodes(section(heading), (node) => node.type === "input")[
        index
      ].props.onChange();
      await settle();
    };
    await check("Guardian", 0);
    await check(rosca ? "Người góp" : "Người thụ hưởng", 1);
    if (rosca) await check("Người góp", 2);
  };
  const begin = async (label?: string) => {
    if (label) await click(label);
    const name = nodes(
      tree,
      (node) => node.type === "input" && node.props.maxLength === 80,
    )[0];
    name.props.onChange({ target: { value: "Family trip" } });
    await settle();
    const description = nodes(tree, (node) => node.type === "textarea")[0];
    description.props.onChange({ target: { value: "Private description" } });
    await settle();
    await click("Tiếp tục");
  };
  it("completes the four-step SHIELD journey, saves metadata and creates only after explicit review", async () => {
    expect(renderToStaticMarkup(tree)).to.include(
      "Một hũ tiền, một mục đích rõ ràng.",
    );
    await begin();
    await members();
    await click("Tiếp tục");
    await input("range", "2300");
    await click("Tiếp tục");
    expect(phases).to.have.length(0);
    await input("checkbox", true);
    await click("Kiểm tra cấu hình & phí");
    expect(saved.config.description).to.equal("Private description");
    expect(saved.config.bufferRatioBps).to.equal(2300);
    expect(renderToStaticMarkup(tree)).to.include("0.000001 AVAX");
    await click("Xác nhận & mở Core");
    expect(phases).to.have.length(1);
    expect(phases[0].ruleTemplate).to.equal("SHIELD");
    expect(phases[0].bufferRatioBps).to.equal(2300);
    expect(text(tree)).to.match(/Đã tạo\s+Family trip/);
    expect(button("Nạp tiền vào hũ")).to.exist;
  });
  it("keeps ROSCA order from member controls through review and signed configuration", async () => {
    await begin("Góp xoay vòng");
    await members(true);
    await click("↓");
    expect(saved.config.beneficiaryIds).to.deep.equal([]); // Reorder has not been saved yet.
    await click("Tiếp tục");
    await click("Tiếp tục");
    await input("checkbox", true);
    await click("Kiểm tra cấu hình & phí");
    expect(saved.config.beneficiaryIds).to.deep.equal([ids[2], ids[1]]);
    expect(text(tree)).to.include("chưa có cơ chế hủy");
    await click("Xác nhận & mở Core");
    expect(phases[0].beneficiaryWallets).to.deep.equal([
      candidates[2].address,
      candidates[1].address,
    ]);
    expect(button("Xem hũ để góp kỳ đầu")).to.exist;
    expect(button("Nạp tiền vào hũ")).not.to.exist;
  });
  it("shows the goal's local deadline as a precise reviewed instant", async () => {
    await begin("Mục tiêu chung");
    await members();
    await click("Tiếp tục");
    const future = new Date(Date.now() + 7 * 86400000);
    const local = new Date(
      future.getTime() - future.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    await input("datetime-local", local);
    await click("Tiếp tục");
    await input("checkbox", true);
    await click("Kiểm tra cấu hình & phí");
    expect(saved.config.targetDeadline).to.equal(new Date(local).toISOString());
    expect(text(tree)).to.include("Điều kiện được kiểm tra lại lúc thực chi");
  });
  it("saves the draft without starting a wallet write and allows closing", async () => {
    await begin();
    await click("Lưu nháp");
    expect(saved.step).to.equal(2);
    expect(phases).to.have.length(0);
    expect(
      requests.filter((request) => request.path.endsWith("/preflight")),
    ).to.have.length(0);
    nodes(
      tree,
      (node) => node.props?.["aria-label"] === "Đóng tạo hũ",
    )[0].props.onClick();
    await settle();
    expect(closed).to.equal(1);
  });
});
