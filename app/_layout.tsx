import { useEffect, useRef, useState } from 'react';
import { Stack, useSegments, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { MusicProvider } from '../src/contexts/MusicContext';
import { MuteProvider } from '../src/contexts/MuteContext';
import { UserProvider } from '../src/contexts/UserContext';
import { migrateDummyMeetups } from '../src/services/meetupService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { user, isLoading, onboardingCompleted } = useAuth();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const rtr = useRouter();
  const pathname = usePathname();
  const splashHidden = useRef(false);
  const [handledPushNotification, setHandledPushNotification] = useState(false);

  // 스플래시 숨기기 — SplashOverlay가 처리하므로 여기서는 안전장치만
  useEffect(() => {
    if (!isLoading && !splashHidden.current) {
      splashHidden.current = true;
    }
  }, [isLoading]);

  // 더미 모임 데이터를 Firestore에 마이그레이션
  useEffect(() => {
    if (user) {
      try {
        migrateDummyMeetups().catch((e) => console.warn('[RootLayout] migrateDummyMeetups 오류:', e));
      } catch (e) {
        console.warn('[RootLayout] migrateDummyMeetups 동기 오류:', e);
      }
    }
  }, [user]);

  // 온라인/오프라인 상태 업데이트
  useEffect(() => {
    if (!user?.uid) return;

    const updateStatus = async (online: boolean) => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: online,
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[RootLayout] 상태 업데이트 실패:', e);
      }
    };

    // 앱 시작 시 온라인
    updateStatus(true);

    const handleAppState = (state: AppStateStatus) => {
      try {
        if (state === 'active') {
          updateStatus(true);
        } else if (state === 'background' || state === 'inactive') {
          updateStatus(false);
        }
      } catch (e) {
        console.warn('[RootLayout] AppState 처리 오류:', e);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      updateStatus(false);
      sub?.remove();
    };
  }, [user?.uid]);

  // ─── 리다이렉트 로직 (useEffect로 한 번만 실행) ───
  useEffect(() => {
    if (isLoading) return; // 로딩 중이면 실행 안 함
    if (onboardingCompleted === null && user) return; // Firestore 응답 대기 중

    const segs = (segments || []) as string[];
    const inSplash = segs.length === 0 || segs[0] === 'index';
    const inIntro = segs[0] === 'onboarding';
    if (inSplash || inIntro) return; // 스플래시/인트로에서는 스킵

    const inAuthGroup = segs[0] === '(auth)';
    const inOnboardingGroup = segs[0] === '(onboarding)';
    const isEmailProvider = user?.providerData?.[0]?.providerId === 'password';
    const needsEmailVerify = !!(isEmailProvider && user && !user.emailVerified);
    const onVerifyScreen = pathname.includes('verify-email');

    // 1. 로그인 안 됨 → 로그인 화면
    if (!user && !inAuthGroup) {
      rtr.replace('/(auth)/login');
      return;
    }

    // 2. 이메일 미인증 → verify-email (이미 있으면 스킵)
    if (needsEmailVerify) {
      if (!onVerifyScreen) {
        rtr.replace('/(auth)/verify-email');
      }
      return;
    }

    // 3. 인증됨 + auth 화면에 있으면 → 온보딩 또는 탭
    if (user && inAuthGroup) {
      if (onboardingCompleted === true) {
        rtr.replace('/(tabs)');
      } else if (onboardingCompleted === false) {
        rtr.replace('/(onboarding)/step1');
      }
      return;
    }

    // 4. 인증됨 + 온보딩 미완료 + 탭 화면 → 온보딩
    if (user && onboardingCompleted === false && !inOnboardingGroup && !inAuthGroup) {
      rtr.replace('/(onboarding)/step1');
      return;
    }

    // 5. 인증됨 + 온보딩 완료 + 온보딩 화면 → 탭
    if (user && onboardingCompleted === true && inOnboardingGroup) {
      rtr.replace('/(tabs)');
      return;
    }
  }, [user, isLoading, onboardingCompleted, segments, pathname]);

  // ─── 앱 종료 상태에서 푸시 탭으로 실행된 경우 처리 ───
  useEffect(() => {
    if (isLoading || !user || handledPushNotification) return;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      setHandledPushNotification(true);
      if (!response) return;
      const data = response.notification.request.content.data;
      setTimeout(() => {
        if (data?.type === 'teacherVerified') {
          rtr.push('/profile/teacher-apply' as any);
        } else if (data?.postId) {
          rtr.push({ pathname: '/post/[id]', params: { id: data.postId as string } });
        } else if (data?.chatRoomId && data?.otherUid) {
          rtr.push({
            pathname: '/chat/[id]',
            params: { id: data.otherUid as string, name: (data.otherName as string) || '' },
          });
        }
      }, 500);
    });
  }, [isLoading, user, handledPushNotification]);

  // ─── 로딩 중 표시 ───
  const segs = (segments || []) as string[];
  const inSplash = segs.length === 0 || segs[0] === 'index';
  const inIntro = segs[0] === 'onboarding';

  if (isLoading && !inSplash && !inIntro) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const inAuthGroup = segs[0] === '(auth)';
  const inOnboardingGroup = segs[0] === '(onboarding)';
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

function SplashOverlay() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // AnimatedSplash가 대체하므로 expo 기본 스플래시 즉시 숨김
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!show) return null;
  const AnimatedSplash = require('../src/components/AnimatedSplash').AnimatedSplash;
  return <AnimatedSplash onFinish={() => setShow(false)} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <MuteProvider>
            <MusicProvider>
              <RootLayoutNav />
              <SplashOverlay />
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
