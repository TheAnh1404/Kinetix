import { expect } from "chai";
import {
  dashboardRoute,
  entryRoute,
  needsStart,
  startRedirect,
  startSteps,
  safeAppReturn,
} from "../shared/startFlow";

describe("Separate first-use entry and security routing", () => {
  it("rejects external and traversing return paths", () => {
    expect(safeAppReturn("/dashboard/finance?workspace=group-a")).to.equal(
      "/dashboard/finance?workspace=group-a",
    );
    for (const value of [
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/dashboard/../../outside",
      "/login",
      "javascript:alert(1)",
    ])
      expect(safeAppReturn(value)).to.equal(null);
  });
  const workspace = "00000000-0000-4000-8000-000000000001";
  it("keeps password and wallet activation mandatory before any start screen", () => {
    for (const state of ["SET_PASSWORD", "CHANGE_PASSWORD", "LINK_WALLET"]) {
      expect(entryRoute(state, workspace, "CHILD", "COMPLETED")).to.equal(
        "/activate",
      );
      expect(startRedirect("/start", { onboarding: state })).to.equal(
        "/activate",
      );
      expect(startRedirect("/activate", { onboarding: state })).to.equal(null);
    }
  });
  it("routes new READY accounts to start and lets the start screen render without a loop", () => {
    const redirectUrl = entryRoute("READY", workspace, "ADMIN");
    expect(redirectUrl).to.equal(`/start?workspace=${workspace}`);
    const identity = { onboarding: "READY", startRequired: true, redirectUrl };
    expect(startRedirect("/dashboard/guardian", identity)).to.equal(
      redirectUrl,
    );
    expect(startRedirect("/login", identity)).to.equal(redirectUrl);
    expect(startRedirect("/start", identity)).to.equal(null);
  });
  it("does not force completed, deferred or legacy accounts to repeat onboarding", () => {
    for (const status of ["COMPLETED", "DEFERRED", "LEGACY"]) {
      expect(needsStart(status)).to.equal(false);
      expect(entryRoute("READY", workspace, "ELDERLY", status)).to.equal(
        `/dashboard/elderly?workspace=${workspace}`,
      );
      expect(
        startRedirect("/dashboard/elderly", {
          onboarding: "READY",
          startRequired: false,
        }),
      ).to.equal(null);
      expect(
        startRedirect("/start", { onboarding: "READY", startRequired: false }),
      ).to.equal(null);
    }
  });
  it("uses a short journey for dependents and correct role-specific dashboard destinations", () => {
    expect(startSteps("CHILD")).to.deep.equal([
      "WELCOME",
      "READINESS",
      "FINISH",
    ]);
    expect(startSteps("ELDERLY")).not.to.include("FAMILY");
    expect(startSteps("GUARDIAN")).to.include("FAMILY");
    expect(dashboardRoute("CHILD", workspace)).to.equal(
      `/dashboard/kids?workspace=${workspace}`,
    );
    expect(dashboardRoute("GUARDIAN", workspace)).to.equal(
      `/dashboard/member?workspace=${workspace}`,
    );
  });
  it("supports disabling only the presentation gate without bypassing activation", () => {
    expect(
      entryRoute("READY", workspace, "ADMIN", undefined, false),
    ).to.include("/dashboard/admin");
    expect(
      entryRoute("LINK_WALLET", workspace, "ADMIN", undefined, false),
    ).to.equal("/activate");
    expect(entryRoute("READY", undefined, "ADMIN")).to.equal("/dashboard");
  });
});
