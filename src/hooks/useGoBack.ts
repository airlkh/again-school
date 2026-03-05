import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * 안전한 뒤로가기 훅
 * - router.canGoBack() 체크 후 router.back() 실행
 * - canGoBack()이 false면 router.replace('/(tabs)/') 로 이동
 * - Android 물리적 뒤로가기 버튼도 동작
 */
export function useGoBack() {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/');
    }
  }, [router]);

  // Android 물리적 뒤로가기 버튼 처리
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true; // 이벤트 소비
    });

    return () => handler.remove();
  }, [goBack]);

  return goBack;
}
