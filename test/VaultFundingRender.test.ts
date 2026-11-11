import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Exercise the shipped handlers at the wallet/API boundary without sending funds.
describe("Vault funding component journeys", () => {
  const React = require("../frontend/node_modules/react");
  let slots: any[],
    cursor: number,
    tree: any,
    Component: any,
    family: any,
    auth: any;
  let props: any, deployment: any, calls: any[], review: any, controller: any;
  let originalDocument: any;
  const hash = `0x${"a".repeat(64)}`;
  const hub = `0x${"1".repeat(40)}`;
  const vault = (id: number, overrides = {}) => ({
    id: `vault-${id}`,
    workspaceId: "family-1",
    onchainVaultId: id,
    onchainChainId: 43113,
    onchainHub: hub,
    onchainCreationTx: hash,
    onchainCreationLogIndex: 0,
    ruleTemplate: "MILESTONE",
    isActive: true,
    name: `Hũ của con ${id}`,
    ...overrides,
  });
  const nodes = (node: any, predicate: (item: any) => boolean): any[] =>
    Array.isArray(node)
      ? node.flatMap((item) => nodes(item, predicate))
      : !node || typeof node !== "object"
        ? []
        : [
            ...(predicate(node) ? [node] : []),
            ...nodes(node.props?.children, predicate),
          ];
  const text = (node: any): string =>
    node == null || typeof node === "boolean"
      ? ""
      : Array.isArray(node)
        ? node.map(text).join(" ")
        : typeof node === "object"
          ? text(node.props?.children)
          : String(node);
  const find = (type: string) => nodes(tree, (node) => node.type === type)[0];
  const render = () => {
    cursor = 0;
    tree = Component(props);
    return tree;
  };
  const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    render();
  };
  const changeAmount = (value: string) => {
    find("input").props.onChange({ target: { value } });
    render();
  };
  const submit = async () => {
    find("form").props.onSubmit({ preventDefault() {} });
    await settle();
  };
  function load(file: string, name: string, expose = false) {
    slots = [];
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
      useId: () => "funding-test",
      useEffect() {},
    };
    const code = ts.transpileModule(
      readFileSync(`frontend/src/components/vaults/${file}.tsx`, "utf8") +
        (expose ? `\nexport { ${name} };` : ""),
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
      (path: string) => {
        if (path === "react") return hooks;
        if (path === "react/jsx-runtime")
          return require("../frontend/node_modules/react/jsx-runtime");
        if (path === "lucide-react")
          return require("../frontend/node_modules/lucide-react");
        if (path === "next/link")
          return (p: any) => React.createElement("a", p, p.children);
        if (path.endsWith(".css"))
          return new Proxy(
            {},
            { get: (_, key) => (key === "__esModule" ? false : String(key)) },
          );
        if (path.includes("FamilyContext")) return { useFamily: () => family };
        if (path.includes("useAuth")) return { useAuth: () => auth };
        if (path.includes("contracts/config"))
          return {
            DEPLOYMENT: deployment,
            hubChain: { id: 43113, name: "Avalanche Fuji" },
            SNOWTRACE_TESTNET_URL: "https://testnet.snowtrace.io",
          };
        if (path.includes("shared/vaultMapping"))
          return require("../shared/vaultMapping");
        if (path.includes("shared/treasury"))
          return require("../shared/treasury");
        if (path === "./DepositVaultModal")
          return { DepositVaultModal: () => null };
        return require(path);
      },
      module,
      module.exports,
    );
    Component = module.exports[name];
    render();
  }
  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    (globalThis as any).document = { getElementById: () => ({ focus() {} }) };
    cursor = 0;
    calls = [];
    review = null;
    deployment = { enabled: true };
    auth = {
      user: { id: "child" },
      linkedWallet: { address: `0x${"2".repeat(40)}` },
    };
    family = {
      currentWorkspace: { id: "family-1", l1HubAddress: hub },
      isDataLoading: false,
      dataErrors: [],
      dynamicVaults: [
        vault(1),
        vault(2),
        vault(3, { workspaceId: "another-family" }),
        vault(4, { ruleTemplate: "ROSCA" }),
      ],
      depositToVault: async (...args: any[]) => {
        calls.push(args);
        return { success: true, txHash: hash };
      },
    };
    controller = {
      workspaceId: "family-1",
      busy: false,
      post: async (...args: any[]) => {
        calls.push(["post", ...args]);
        return { id: "deposit-1" };
      },
      sign: async (payment: any) => {
        calls.push(["sign", payment]);
      },
    };
    props = {
      isOpen: true,
      defaultVaultId: 1,
      onClose() {},
      jar: {
        id: "savings-child",
        name: "Heo đất của An",
        policy: { kind: "SAVINGS" },
      },
      controller,
      prepare: (value: any) => {
        review = value;
      },
    };
  });
  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  it("reviews a Core deposit before creating the exact jar's payment", async () => {
    load("CoreVaultFunding", "CoreVaultFunding");
    changeAmount("0.05");
    await submit();
    expect(calls).to.have.length(0);
    expect(review.title).to.include("Heo đất của An");
    expect(review.amountWei).to.equal("50000000000000000");
    await review.confirm();
    expect(calls[0]).to.deep.equal([
      "post",
      "/api/workspaces/family-1/treasury/transfers",
      { jarId: "savings-child", kind: "DEPOSIT", amount: "0.05" },
    ]);
    expect(calls[1]).to.deep.equal(["sign", { id: "deposit-1" }]);
  });
  it("retries the same Core intent after a wallet rejection", async () => {
    let attempts = 0;
    controller.sign = async () => {
      if (++attempts === 1) throw new Error("Wallet dismissed");
    };
    load("CoreVaultFunding", "CoreVaultFunding");
    await submit();
    try {
      await review.confirm();
    } catch {
      /* Retry in the same review. */
    }
    await review.confirm();
    expect(calls.filter((call) => call[0] === "post")).to.have.length(1);
    expect(attempts).to.equal(2);
  });
  it("rejects invalid amounts without opening a review or touching the wallet", async () => {
    load("CoreVaultFunding", "CoreVaultFunding");
    for (const amount of ["0", "-1", "1e3", "0.0000000000000000001", "abc"]) {
      changeAmount(amount);
      await submit();
      expect(review).to.equal(null);
      expect(find("input").props["aria-invalid"]).to.equal(true);
    }
    expect(calls).to.have.length(0);
  });
  it("blocks Core deposits until a wallet is linked", async () => {
    auth.linkedWallet = null;
    load("CoreVaultFunding", "CoreVaultFunding");
    await submit();
    expect(review).to.equal(null);
    expect(find("input").props.disabled).to.equal(true);
  });
  it("limits the contract picker to allowed, current-family, non-ROSCA vaults", () => {
    props.vaultIds = [1, 3, 4];
    load("DepositVaultModal", "DepositDialog", true);
    expect(
      nodes(tree, (node) => node.type === "option").map(
        (node) => node.props.value,
      ),
    ).to.deep.equal([1]);
  });
  it("keeps contract deposits locked while deployment is unverified", async () => {
    deployment.enabled = false;
    load("DepositVaultModal", "DepositDialog", true);
    await submit();
    expect(calls).to.have.length(0);
    expect(text(tree)).to.include("chưa sẵn sàng nhận tiền");
    expect(
      nodes(tree, (node) => node.props?.type === "submit")[0].props.disabled,
    ).to.equal(true);
  });
  it("never substitutes another jar when the selected recipient disappears", async () => {
    load("DepositVaultModal", "DepositDialog", true);
    family.dynamicVaults = family.dynamicVaults.filter(
      (item: any) => item.onchainVaultId !== 1,
    );
    render();
    await submit();
    expect(calls).to.have.length(0);
    expect(find("select").props.value).to.equal("");
  });
  it("blocks a vault with missing chain evidence or inactive status", async () => {
    family.dynamicVaults[0].onchainCreationTx = null;
    load("DepositVaultModal", "DepositDialog", true);
    await submit();
    expect(calls).to.have.length(0);
    family.dynamicVaults[0] = vault(1, { isActive: false });
    render();
    await submit();
    expect(calls).to.have.length(0);
    expect(text(tree)).to.include("tạm ngừng");
  });
  it("prevents repeated submissions and captures the confirmed amount and jar", async () => {
    let finish: (result: any) => void = () => {};
    family.depositToVault = (...args: any[]) => {
      calls.push(args);
      return new Promise((resolve) => {
        finish = resolve;
      });
    };
    load("DepositVaultModal", "DepositDialog", true);
    changeAmount("0.1");
    await submit();
    await submit();
    expect(calls).to.deep.equal([[1, "0.1"]]);
    expect(find("input").props.disabled).to.equal(true);
    let closed = false;
    props.onClose = () => {
      closed = true;
    };
    render();
    find("dialog").props.onCancel({ preventDefault() {} });
    expect(closed).to.equal(false);
    finish({ success: true, txHash: hash });
    await settle();
    expect(text(tree)).to.include("Đã nạp tiền vào hũ");
    expect(text(tree)).to.include("0.1").and.include("Hũ của con 1");
  });
  it("shows wallet errors without claiming the deposit succeeded", async () => {
    family.depositToVault = async () => ({
      success: false,
      error: "Bạn đã từ chối trong Core",
    });
    load("DepositVaultModal", "DepositDialog", true);
    await submit();
    expect(text(tree)).to.include("Bạn đã từ chối trong Core");
    expect(text(tree)).not.to.include("Đã nạp tiền vào hũ");
    expect(find("input").props.disabled).to.equal(false);
  });
  it("pins the contract recipient while the background jar list reorders", () => {
    props.kind = "MILESTONE";
    load("ContractVaultFunding", "FundingPanel", true);
    find("button").props.onClick();
    render();
    family.dynamicVaults.reverse();
    render();
    const modal = nodes(tree, (node) => node.props?.isOpen === true)[0];
    expect(modal.props.defaultVaultId).to.equal(1);
    expect(find("select").props.value).to.equal("vault-1");
  });
  it("shows a visible explanation when contract deposits are unavailable", () => {
    props.kind = "MILESTONE";
    deployment.enabled = false;
    load("ContractVaultFunding", "FundingPanel", true);
    expect(find("button").props.disabled).to.equal(true);
    expect(text(tree)).to.include("chưa sẵn sàng nhận tiền");
  });
});
