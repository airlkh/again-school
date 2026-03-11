import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { signOut } from '../services/authService';
import { checkOnboardingCompleted } from '../services/firestoreService';
import { registerPushToken, setupNotificationHandlers } from '../services/notificationService';
import { AuthContextType } from '../types/auth';

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
        try {
          console.log('[AuthContext] checkOnboardingCompleted 호출 시작:', firebaseUser.uid);
          const completed = await checkOnboardingCompleted(firebaseUser.uid);
          console.log('[AuthContext] checkOnboardingCompleted 결과:', completed);
          setOnboardingCompleted(completed);
          // 푸시 알림 등록
          if (completed) {
            registerPushToken(firebaseUser.uid).catch(() => {});
            notificationCleanup = setupNotificationHandlers();
          }
        } catch (error: any) {
          console.warn('[AuthContext] checkOnboardingCompleted 에러:', error?.code, error?.message);
          setOnboardingCompleted(false);
        }
      } else {
        setOnboardingCompleted(null);
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
