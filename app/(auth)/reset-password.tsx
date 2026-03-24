import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { Colors } from '../../src/constants/colors';
import { useGoBack } from '../../src/hooks/useGoBack';

export default function ResetPasswordScreen() {
  const goBack = useGoBack();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 소셜 로그인 계정 확인
      const methods = await fetchSignInMethodsForEmail(auth, trimmed);
      if (methods.length > 0 && !methods.includes('password')) {
        const provider = methods[0] === 'google.com' ? 'Google'
          : methods[0] === 'apple.com' ? 'Apple'
          : methods[0] === 'custom' ? '소셜'
          : methods[0];
        Alert.alert(
          '소셜 로그인 계정',
          `이 이메일은 ${provider} 로그인으로 가입된 계정입니다.\n비밀번호 재설정이 필요 없습니다.`,
        );
        return;
      }

      await sendPasswordResetEmail(auth, trimmed);
      setSent(true);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert('오류', '등록되지 않은 이메일입니다.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('오류', '올바른 이메일 형식을 입력해주세요.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('오류', '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        // fetchSignInMethodsForEmail이 빈 배열을 반환할 수 있음 (신규 이메일)
        // sendPasswordResetEmail은 보안상 존재하지 않는 이메일에도 성공할 수 있음
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 재설정</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.sentWrap}>
          <Ionicons name="mail-outline" size={64} color={Colors.primary} />
          <Text style={styles.sentTitle}>이메일을 확인해주세요</Text>
          <Text style={styles.sentDesc}>
            {email.trim()}으로 비밀번호 재설정 링크를 보냈습니다.{'\n'}
            이메일에서 링크를 클릭하여 비밀번호를 변경해주세요.
          </Text>
          <Text style={styles.sentNote}>
            이메일이 보이지 않으면 스팸 폴더를 확인해주세요.
          </Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={goBack}>
            <Text style={styles.backToLoginText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>비밀번호 재설정</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.form}>
        <Text style={styles.desc}>
          가입 시 사용한 이메일을 입력하시면{'\n'}비밀번호 재설정 링크를 보내드립니다.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor={Colors.inactive}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.resetBtnText}>재설정 메일 보내기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  form: { padding: 24, gap: 16 },
  desc: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  resetBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  sentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  sentTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  sentDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  sentNote: { fontSize: 13, color: Colors.inactive, textAlign: 'center' },
  backToLoginBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backToLoginText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
