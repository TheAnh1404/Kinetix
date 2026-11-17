import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { groupTransferMemo } from "../shared/groupFinance";

describe("Group wallet sends only a current immutable instruction", () => {
  const sender = `0x${"1".repeat(40)}`,
    recipient = `0x${"2".repeat(40)}`,
    hash = `0x${"a".repeat(64)}`;
  let storage: Map<string, string>,
    send: any,
    result: any,
    account: string,
    chain: string,
    scope: string | null,
    nonce: number;
  let identity: any, fresh: any, sent: any[], estimate: any;
  let previousStorage: any;
  const intent = {
    id: "intent-a",
    fundId: "fund-a",
    userId: "user-a",
    requestId: null,
    kind: "CONTRIBUTION",
    senderAddress: sender,
    recipientAddress: recipient,
    amountWei: "1000000000000000001",
    nonce: 3,
    chainId: 43113,
    data: groupTransferMemo("intent-a"),
    status: "READY",
  };
  const storageKey = "kinetix-group-transfer:user-a:intent-a";
  beforeEach(() => {
    storage = new Map();
    sent = [];
    account = sender;
    chain = "0xa869";
    scope = "group-a";
    nonce = 3;
    identity = {
      user: { id: "user-a" },
      onboarding: "READY",
      linkedWallet: { address: sender },
    };
    fresh = { ...intent };
    estimate = async () => 25000n;
    result = async (args: any) => {
      sent.push(args);
      return hash;
    };
    previousStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) || null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    const code = ts.transpileModule(
      readFileSync("frontend/src/lib/web3/groupTransfers.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const module = { exports: {} as any };
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (name === "viem")
          return {
            ...require("viem"),
            createWalletClient: () => ({
              sendTransaction: (args: any) => result(args),
            }),
          };
        if (name.includes("useAuth"))
          return {
            authRequest: async (path: string) =>
              path.endsWith("/me") ? identity : { data: [fresh] },
          };
        if (name === "./client")
          return {
            walletWriteScope: () => scope,
            switchNetwork: async () => true,
            getCoreProvider: () => ({
              request: async ({ method }: any) =>
                method === "eth_chainId" ? chain : [account],
            }),
            publicClientFuji: {
              estimateGas: (args: any) => estimate(args),
              getTransactionCount: async () => nonce,
            },
          };
        if (name.includes("contracts/config"))
          return { avalancheFuji: { id: 43113 } };
        if (name.includes("shared/groupFinance"))
          return require("../shared/groupFinance");
        throw new Error(`Unexpected import ${name}`);
      },
      module,
      module.exports,
    );
    send = (input = intent) =>
      module.exports.sendGroupTransfer("user-a", "group-a", input);
  });
  afterEach(() => {
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else delete (globalThis as any).localStorage;
  });
  const fails = async () => {
    let error: unknown;
    try {
      await send();
    } catch (err) {
      error = err;
    }
    expect(error).to.be.instanceOf(Error);
    expect(sent).to.have.length(0);
  };
  it("sends exact native wei, nonce and memo and saves the returned hash", async () => {
    expect(await send()).to.equal(hash);
    expect(sent[0].value).to.equal(1000000000000000001n);
    expect(sent[0].nonce).to.equal(3);
    expect(sent[0].data).to.equal(intent.data);
    expect(sent[0].to).to.equal(recipient);
    expect(storage.get(storageKey)).to.equal(hash);
    expect(await send()).to.equal(hash);
    expect(sent.length).to.equal(1);
  });
  it("returns a broadcast hash even if storage fills after signing", async () => {
    (globalThis as any).localStorage.setItem = (key: string, value: string) => {
      if (value === hash) throw new Error("Storage full");
      storage.set(key, value);
    };
    expect(await send()).to.equal(hash);
    expect(sent.length).to.equal(1);
    expect(storage.get(storageKey)).to.equal("SIGNING");
  });
  it("does not open the wallet again for a server-recorded hash", async () => {
    expect(await send({ ...intent, txHash: hash } as any)).to.equal(hash);
    expect(sent.length).to.equal(0);
  });
  it("blocks a different connected account or chain", async () => {
    account = recipient;
    await fails();
    account = sender;
    chain = "0x1";
    await fails();
  });
  it("blocks switching group or disconnecting during gas estimation", async () => {
    estimate = async () => {
      scope = null;
      return 25000n;
    };
    await fails();
  });
  it("rechecks account identity after asynchronous preflight", async () => {
    estimate = async () => {
      identity = { ...identity, user: { id: "user-b" } };
      return 25000n;
    };
    await fails();
  });
  it("blocks a changed nonce and a tampered server instruction", async () => {
    nonce = 4;
    await fails();
    nonce = 3;
    fresh = { ...intent, nonce: 4 };
    await fails();
  });
  it("keeps uncertain signing blocked instead of submitting money twice", async () => {
    let attempts = 0;
    result = async () => {
      attempts++;
      throw new Error("Provider disconnected");
    };
    await fails();
    expect(storage.get(storageKey)).to.equal("SIGNING");
    await fails();
    expect(attempts).to.equal(1);
  });
  it("permits a retry after an explicit user rejection", async () => {
    result = async () => {
      throw Object.assign(new Error("Rejected"), { code: 4001 });
    };
    await fails();
    expect(storage.has(storageKey)).to.equal(false);
    result = async (args: any) => {
      sent.push(args);
      return hash;
    };
    expect(await send()).to.equal(hash);
    expect(sent.length).to.equal(1);
  });
});
