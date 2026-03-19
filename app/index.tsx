import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

const INTRO_DONE_KEY = '@again_school_intro_done';

export default function SplashScreenPage() {
  const router = useRouter();
  const { user, isLoading, onboardingCompleted } = useAuth();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      if (user) {
        if (onboardingCompleted) {
          router.replace('/(tabs)/');
        } else {
          router.replace('/(onboarding)/step1');
        }
      } else {
        const introDone = await AsyncStorage.getItem(INTRO_DONE_KEY);
        if (introDone === 'true') {
          router.replace('/(auth)/login');
        } else {
          router.replace('/onboarding/intro');
        }
      }
    })();
  }, [isLoading, user, onboardingCompleted]);

  return (
    <View style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF3124',
  },
});
