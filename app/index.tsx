import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

const INTRO_DONE_KEY = '@again_school_intro_done';
const { width } = Dimensions.get('window');

export default function SplashScreenPage() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { user, isLoading, onboardingCompleted } = useAuth();

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(async () => {
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
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading, user, onboardingCompleted]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Again School</Text>
        <Text style={styles.slogan}>다시 만나는 우리들의 학교</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8313a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 30,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
