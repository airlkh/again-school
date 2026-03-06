import { useEffect, useRef } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { MusicProvider } from '../src/contexts/MusicContext';
import { MuteProvider } from '../src/contexts/MuteContext';
import { UserProvider } from '../src/contexts/UserContext';
import { migrateDummyMeetups } from '../src/services/meetupService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { user, isLoading, onboardingCompleted } = useAuth();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const splashHidden = useRef(false);

  // 스플래시 숨기기 — isLoading이 끝나면 반드시 호출
  useEffect(() => {
    if (!isLoading && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // 안전장치: 5초 후에도 스플래시가 안 숨겨졌으면 강제 숨김
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashHidden.current) {
        splashHidden.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // 더미 모임 데이터를 Firestore에 마이그레이션
  useEffect(() => {
    if (user) {
      migrateDummyMeetups().catch(() => {});
    }
  }, [user]);

  // 온라인/오프라인 상태 업데이트
  useEffect(() => {
    if (!user?.uid) return;

    const updateStatus = async (online: boolean) => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: online,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        console.warn('상태 업데이트 실패:', e);
      }
    };

    // 앱 시작 시 온라인
    updateStatus(true);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        updateStatus(true);
      } else if (state === 'background' || state === 'inactive') {
        updateStatus(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      updateStatus(false);
      sub.remove();
    };
  }, [user?.uid]);

  console.log('[RootLayout] 렌더링 상태:', {
    user: user ? user.uid : null,
    isLoading,
    onboardingCompleted,
    segments: segments.join('/'),
  });

  // 스플래시(index) 또는 인트로 슬라이드에서는 리다이렉트 스킵
  const inSplash = (segments as string[]).length === 0 || segments[0] === 'index';
  const inIntro = segments[0] === 'onboarding'; // 그룹이 아닌 일반 onboarding

  if (isLoading) {
    // 스플래시 화면에 있을 때는 로딩 스피너 대신 Stack 렌더링
    if (inSplash || inIntro) {
      console.log('[RootLayout] → 로딩 중이지만 스플래시/인트로이므로 Stack 렌더링');
    } else {
      console.log('[RootLayout] → 로딩 스피너 표시');
      return (
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
  }

  if (!inSplash && !inIntro && !isLoading) {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // 1. 미인증 → 로그인
    if (!user && !inAuthGroup) {
      console.log('[RootLayout] → Redirect: /(auth)/login (미인증)');
      return <Redirect href="/(auth)/login" />;
    }

    // 2. 인증됨 + auth 화면 → 온보딩 또는 탭으로 이동
    if (user && inAuthGroup) {
      if (onboardingCompleted) {
        console.log('[RootLayout] → Redirect: /(tabs) (인증+온보딩완료+auth화면)');
        return <Redirect href="/(tabs)" />;
      }
      console.log('[RootLayout] → Redirect: /(onboarding)/step1 (인증+온보딩미완료+auth화면)');
      return <Redirect href="/(onboarding)/step1" />;
    }

    // 3. 인증됨 + 온보딩 미완료 + 탭 화면 → 온보딩으로
    if (user && !onboardingCompleted && !inOnboardingGroup && !inAuthGroup) {
      console.log('[RootLayout] → Redirect: /(onboarding)/step1 (인증+온보딩미완료+탭화면)');
      return <Redirect href="/(onboarding)/step1" />;
    }

    // 4. 인증됨 + 온보딩 완료 + 온보딩 화면 → 탭으로
    if (user && onboardingCompleted && inOnboardingGroup) {
      console.log('[RootLayout] → Redirect: /(tabs) (인증+온보딩완료+온보딩화면)');
      return <Redirect href="/(tabs)" />;
    }
  }

  console.log('[RootLayout] → Stack 렌더링 (리다이렉트 없음)');

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';
  const statusStyle = inAuthGroup || inOnboardingGroup || inSplash
    ? 'light'
    : (isDark ? 'light' : 'dark');

  return (
    <>
      <StatusBar style={statusStyle} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/intro" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="alumni/all" />
        <Stack.Screen name="album/index" />
        <Stack.Screen
          name="album/viewer"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chat/index" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="meetup/[id]" />
        <Stack.Screen name="meetup/create" />
        <Stack.Screen name="jobs/create" />
        <Stack.Screen name="jobs/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="post/create" />
        <Stack.Screen name="post/edit" />
        <Stack.Screen
          name="post/player"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="story/create" />
        <Stack.Screen
          name="story/[id]"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="invite/index" />
        <Stack.Screen name="bookmarks/index" />
        <Stack.Screen name="trust-voters/[id]" />
        <Stack.Screen name="profile/verifications" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <MuteProvider>
            <MusicProvider>
              <RootLayoutNav />
            </MusicProvider>
          </MuteProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
