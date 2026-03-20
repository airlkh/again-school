import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
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
        // 정지 회원 차단
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../config/firebase');
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userSnap.exists() && userSnap.data()?.disabled === true) {
            const { getAuth, signOut: fbSignOut } = await import('firebase/auth');
            await fbSignOut(getAuth());
            Alert.alert(
              '계정 정지',
              '관리자에 의해 계정이 정지되었습니다.\n문의: support@againschool.com',
              [{ text: '확인' }]
            );
            return;
          }
        } catch {}

        // 1. AsyncStorage 캐시에서 빠르게 로드
        let cachedCompleted = false;
        try {
          const cached = await AsyncStorage.getItem(ONBOARDING_CACHE_KEY);
          if (cached === 'true') {
            cachedCompleted = true;
            setOnboardingCompleted(true);
            // 캐시가 true면 바로 푸시 등록 + 서버 조회 스킵
            registerPushToken(firebaseUser.uid).catch(() => {});
            notificationCleanup = setupNotificationHandlers();
          }
        } catch {}

        // 2. 캐시가 false/없으면 Firestore에서 확인
        if (!cachedCompleted) {
          try {
            const completed = await checkOnboardingCompleted(firebaseUser.uid);
            setOnboardingCompleted(completed);
            await AsyncStorage.setItem(ONBOARDING_CACHE_KEY, completed ? 'true' : 'false');
            if (completed) {
              registerPushToken(firebaseUser.uid).catch(() => {});
              notificationCleanup = setupNotificationHandlers();
            }
          } catch (error: any) {
            console.warn('[AuthContext] checkOnboardingCompleted 에러:', error?.code, error?.message);
            if (onboardingCompleted === null) {
              setOnboardingCompleted(false);
            }
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
