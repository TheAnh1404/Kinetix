import { expect } from "chai";
import { DEMO_PERSONAS } from "../shared/demoPersonas";
import {
  initialJudgeDemo,
  judgeDemoReducer,
  JudgeDemoAction,
} from "../shared/judgeDemo";

describe("Judge walkthrough local context without wallet or session impersonation", () => {
  it("keeps the seed identities distinct and changes persona while preserving demo progress", () => {
    expect(
      new Set(
        Object.values(DEMO_PERSONAS).map((item) => item.wallet.toLowerCase()),
      ).size,
    ).to.equal(5);
    let state = initialJudgeDemo();
    const act = (action: JudgeDemoAction) => {
      state = judgeDemoReducer(state, action);
    };
    act({ type: "switch", persona: "elderly" });
    act({ type: "fast", amount: 20n });
    expect(state.buffer).to.equal(100n);
    act({ type: "request", amount: 60n });
    act({ type: "switch", persona: "admin" });
    act({ type: "approve", guardian: "admin" });
    expect(state.buffer).to.equal(100n);
    act({ type: "approve", guardian: "admin" });
    expect(state.pending!.approvals).to.have.length(1);
    act({ type: "approve", guardian: "guardian1" });
    expect(state.buffer).to.equal(40n);
    expect(state.pending!.paid).to.equal(true);
    act({ type: "approve", guardian: "guardian2" });
    expect(state.buffer).to.equal(40n);
    act({ type: "switch", persona: "child" });
    act({ type: "claim" });
    act({ type: "switch", persona: "admin" });
    act({ type: "reward", guardian: "admin" });
    expect(state.reward).to.equal(0n);
    act({ type: "reward", guardian: "guardian1" });
    act({ type: "switch", persona: "child" });
    expect(state.reward).to.equal(5n);
    expect(state.chore).to.equal("REWARDED");
  });
  it("checks amount, daily limit, liquidity, distinct approvals and role restrictions", () => {
    let state = initialJudgeDemo();
    state = judgeDemoReducer(state, { type: "fast", amount: 1n });
    expect(state.buffer).to.equal(120n);
    state = judgeDemoReducer(state, { type: "switch", persona: "elderly" });
    for (const amount of [0n, -1n, 51n])
      state = judgeDemoReducer(state, { type: "fast", amount });
    expect(state.buffer).to.equal(120n);
    for (let i = 0; i < 3; i++)
      state = judgeDemoReducer(state, { type: "fast", amount: 50n });
    expect(state.withdrawnToday).to.equal(100n);
    expect(state.buffer).to.equal(20n);
    state = judgeDemoReducer(state, {
      type: "create",
      name: "forged",
      bufferRatioBps: 1000,
    });
    expect(state.jars).to.have.length(2);
  });
  it("creates a zero-balance demo jar with selected ratio and resets all progress", () => {
    let state = initialJudgeDemo();
    state = judgeDemoReducer(state, {
      type: "create",
      name: "Quỹ du lịch",
      bufferRatioBps: 2000,
    });
    expect(state.jars[2]).to.include({
      name: "Quỹ du lịch",
      bufferRatioBps: 2000,
    });
    state = judgeDemoReducer(state, {
      type: "create",
      name: "Invalid",
      bufferRatioBps: 10001,
    });
    expect(state.jars).to.have.length(3);
    expect(judgeDemoReducer(state, { type: "reset" })).to.deep.equal(
      initialJudgeDemo(),
    );
  });
});
