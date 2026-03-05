import React, { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import { SchoolEntry } from '../../src/types/auth';
import { useTheme } from '../../src/contexts/ThemeContext';

interface OnboardingData {
  displayName: string;
  schools: SchoolEntry[];
  region: { sido: string; sigungu: string };
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  data: {
    displayName: '',
    schools: [],
    region: { sido: '', sigungu: '' },
  },
  updateData: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const [data, setData] = useState<OnboardingData>({
    displayName: '',
    schools: [],
    region: { sido: '', sigungu: '' },
  });

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  return (
    <OnboardingContext.Provider value={{ data, updateData }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </OnboardingContext.Provider>
  );
}
