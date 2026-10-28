'use client';

import React, { ReactNode } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { FamilyProvider } from '@/context/FamilyContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <FamilyProvider>
        {children}
      </FamilyProvider>
    </LanguageProvider>
  );
};
