import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { signOut } from '../services/authService';
import { checkOnboardingCompleted } from '../services/firestoreService';
import { registerPushToken, setupNotificationHandlers } from '../services/notificationService';
import { AuthContextType } from '../types/auth';

const ONBOARDING_CACHE_KEY = '@again_school_onboarding_completed';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  onboardingCompleted: null,
  signOut: async () => {},
  setOnboardingCompleted: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    console.log('[AuthContext] onAuthStateChanged 리스너 등록');
    let notificationCleanup: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] onAuthStateChanged 호출됨:', firebaseUser ? `uid=${firebaseUser.uid}` : 'null (로그아웃)');
      setUser(firebaseUser);
      if (firebaseUser) {
        // 1. AsyncStorage 캐시에서 빠르게 로드
        try {
          const cached = await AsyncStorage.getItem(ONBOARDING_CACHE_KEY);
          if (cached === 'true') {
            console.log('[AuthContext] 캐시에서 onboardingCompleted=true 로드');
            setOnboardingCompleted(true);
          }
        } catch {}

        // 2. Firestore에서 실제 값 확인 (동기화)
        try {
          console.log('[AuthContext] checkOnboardingCompleted 호출 시작:', firebaseUser.uid);
          const completed = await checkOnboardingCompleted(firebaseUser.uid);
          console.log('[AuthContext] checkOnboardingCompleted 결과:', completed);
          setOnboardingCompleted(completed);
          // 캐시 동기화
          await AsyncStorage.setItem(ONBOARDING_CACHE_KEY, completed ? 'true' : 'false');
          // 푸시 알림 등록
          if (completed) {
            registerPushToken(firebaseUser.uid).catch(() => {});
            notificationCleanup = setupNotificationHandlers();
          }
        } catch (error: any) {
          console.warn('[AuthContext] checkOnboardingCompleted 에러:', error?.code, error?.message);
          // 캐시가 없을 때만 false로 설정
          if (onboardingCompleted === null) {
            setOnboardingCompleted(false);
          }
        }
      } else {
        setOnboardingCompleted(null);
        await AsyncStorage.removeItem(ONBOARDING_CACHE_KEY).catch(() => {});
      }
      console.log('[AuthContext] setIsLoading(false) 호출');
      setIsLoading(false);
    });
    return () => {
      unsubscribe();
      notificationCleanup?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        onboardingCompleted,
        signOut,
        setOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
