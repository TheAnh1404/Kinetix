"use client";

import React from "react";
import { LandingNavbar } from "./LandingNavbar";
import { LandingHero } from "./LandingHero";
import { LandingMetrics } from "./LandingMetrics";
import { LandingArchitecture } from "./LandingArchitecture";
import { LandingVaultRules } from "./LandingVaultRules";
import { LandingPersonas } from "./LandingPersonas";
import { LandingSecurity } from "./LandingSecurity";
import { LandingFAQ } from "./LandingFAQ";
import { LandingFooter } from "./LandingFooter";

export const LandingPageNew: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 selection:bg-[#E84142] selection:text-white flex flex-col font-sans relative overflow-x-hidden">
      {/* Dedicated Independent Landing Navbar */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main className="flex-1 w-full">
        <LandingHero />
        <LandingMetrics />
        <LandingArchitecture />
        <LandingVaultRules />
        <LandingPersonas />
        <LandingSecurity />
        <LandingFAQ />
      </main>

      {/* Footer & Final Call to Action */}
      <LandingFooter />
    </div>
  );
};
