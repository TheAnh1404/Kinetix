"use client";
import React, { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { FamilyProvider } from "@/context/FamilyContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function SessionFamily({ children }: { children: ReactNode }) {
  const { user, onboarding } = useAuth();
  return (
    <FamilyProvider key={`${user?.id || "guest"}:${onboarding || "loading"}`}>
      {children}
    </FamilyProvider>
  );
}
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <AuthProvider>
          <SessionFamily>{children}</SessionFamily>
        </AuthProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}
