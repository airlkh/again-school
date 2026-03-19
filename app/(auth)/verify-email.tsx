import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification } from 'firebase/auth';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/contexts/AuthContext';

const RESEND_COOLDOWN = 30;

export default function VerifyEmailScreen() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleCheckVerification() {
    if (!user) return;
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        Alert.alert('인증 완료', '이메일 인증이 완료되었습니다!');
        router.replace('/(onboarding)/step1');
      } else {
        Alert.alert('미인증', '아직 이메일 인증이 완료되지 않았습니다.\n메일함을 확인해주세요.');
      }
    } catch {
      Alert.alert('오류', '인증 확인에 실패했습니다.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (!user || resendTimer > 0) return;
    try {
      await sendEmailVerification(user);
      setResendTimer(RESEND_COOLDOWN);
      Alert.alert('발송 완료', '인증 메일을 다시 발송했습니다.');
    } catch {
      Alert.alert('오류', '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>이메일 인증</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>인증 메일을 발송했습니다</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.desc}>
          위 이메일로 인증 링크를 발송했습니다.{'\n'}
          메일함을 확인하고 링크를 클릭한 후{'\n'}
          아래 버튼을 눌러주세요.
        </Text>

        <TouchableOpacity
          style={styles.checkButton}
          onPress={handleCheckVerification}
          disabled={checking}
          activeOpacity={0.8}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkButtonText}>인증 완료 확인</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendButton, resendTimer > 0 && styles.resendDisabled]}
          onPress={handleResend}
          disabled={resendTimer > 0}
          activeOpacity={0.8}
        >
          <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
            {resendTimer > 0 ? `재발송 (${resendTimer}초)` : '인증 메일 재발송'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backLink}>
          <Text style={styles.backLinkText}>로그인 화면으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  email: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginBottom: 16 },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  checkButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  checkButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resendButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 24,
  },
  resendDisabled: { borderColor: Colors.inactive },
  resendText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  resendTextDisabled: { color: Colors.inactive },
  backLink: { padding: 8 },
  backLinkText: { fontSize: 14, color: Colors.textSecondary },
});
