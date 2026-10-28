'use client';

import React, { ReactNode } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { FamilyProvider } from '@/context/FamilyContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <FamilyProvider>
          {children}
        </FamilyProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
};
