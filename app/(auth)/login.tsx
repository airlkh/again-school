import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardScrollView } from '../../src/components/KeyboardScrollView';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Colors } from '../../src/constants/colors';
import { SocialLoginButton } from '../../src/components/SocialLoginButton';
import { OAuthWebView } from '../../src/components/OAuthWebView';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  signInWithKakaoCode,
  signInWithNaverCode,
} from '../../src/services/authService';

WebBrowser.maybeCompleteAuthSession();

// TODO: 각 소셜 로그인 플랫폼의 실제 클라이언트 ID를 입력하세요.
const KAKAO_CLIENT_ID = 'YOUR_KAKAO_REST_API_KEY';
const KAKAO_REDIRECT_URI =
  'https://again-school-bfea8.firebaseapp.com/auth/kakao/callback';
const NAVER_CLIENT_ID = 'YOUR_NAVER_CLIENT_ID';
const NAVER_REDIRECT_URI =
  'https://again-school-bfea8.firebaseapp.com/auth/naver/callback';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // 카카오/네이버 WebView 상태
  const [oauthWebView, setOauthWebView] = useState<{
    visible: boolean;
    provider: 'kakao' | 'naver';
    url: string;
    redirectUri: string;
    state: string;
  } | null>(null);

  // Google Auth Session
  const [, response, promptAsync] = Google.useAuthRequest({
    // TODO: Firebase Console > Authentication > Google 로그인 설정 후 Client ID 입력
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleSignIn(idToken);
      }
    }
  }, [response]);

  // ---- 이메일 로그인 ----

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error: any) {
      const message =
        error.code === 'auth/invalid-credential'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.code === 'auth/user-not-found'
            ? '등록되지 않은 이메일입니다.'
            : '로그인에 실패했습니다. 다시 시도해주세요.';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Google 로그인 ----

  async function handleGoogleSignIn(idToken: string) {
    setSocialLoading('google');
    try {
      await signInWithGoogle(idToken);
    } catch {
      Alert.alert('로그인 실패', 'Google 로그인에 실패했습니다.');
    } finally {
      setSocialLoading(null);
    }
  }

  // ---- Apple 로그인 ----

  async function handleAppleSignIn() {
    setSocialLoading('apple');
    try {
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (credential.identityToken) {
        await signInWithApple(credential.identityToken, nonce);
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('로그인 실패', 'Apple 로그인에 실패했습니다.');
      }
    } finally {
      setSocialLoading(null);
    }
  }

  // ---- 카카오 로그인 ----

  function handleKakaoLogin() {
    const state = Math.random().toString(36).substring(7);
    const url =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
      `&response_type=code` +
      `&state=${state}`;
    setOauthWebView({
      visible: true,
      provider: 'kakao',
      url,
      redirectUri: KAKAO_REDIRECT_URI,
      state,
    });
  }

  // ---- 네이버 로그인 ----

  function handleNaverLogin() {
    const state = Math.random().toString(36).substring(7);
    const url =
      `https://nid.naver.com/oauth2.0/authorize` +
      `?client_id=${NAVER_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}` +
      `&response_type=code` +
      `&state=${state}`;
    setOauthWebView({
      visible: true,
      provider: 'naver',
      url,
      redirectUri: NAVER_REDIRECT_URI,
      state,
    });
  }

  // ---- OAuth 코드 수신 처리 ----

  async function handleOAuthCode(code: string) {
    const provider = oauthWebView?.provider;
    const state = oauthWebView?.state ?? '';
    setOauthWebView(null);
    if (!provider) return;

    setSocialLoading(provider);
    try {
      if (provider === 'kakao') {
        await signInWithKakaoCode(code);
      } else {
        await signInWithNaverCode(code, state);
      }
    } catch {
      const name = provider === 'kakao' ? '카카오' : '네이버';
      Alert.alert('로그인 실패', `${name} 로그인에 실패했습니다.`);
    } finally {
      setSocialLoading(null);
    }
  }

  // ---- 렌더링 ----

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
          {/* 빨간 헤더 영역 */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>AS</Text>
            </View>
            <Text style={styles.logo}>Again School</Text>
            <Text style={styles.subtitle}>다시 만나는 학교 친구들</Text>
          </View>

          {/* 폼 영역 */}
          <View style={styles.form}>
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
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={Colors.inactive}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleEmailLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>로그인</Text>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 소셜 로그인 2x2 그리드 */}
            <View style={styles.socialGrid}>
              <View style={styles.socialRow}>
                <SocialLoginButton
                  provider="kakao"
                  onPress={handleKakaoLogin}
                  isLoading={socialLoading === 'kakao'}
                />
                <SocialLoginButton
                  provider="naver"
                  onPress={handleNaverLogin}
                  isLoading={socialLoading === 'naver'}
                />
              </View>
              <View style={styles.socialRow}>
                <SocialLoginButton
                  provider="google"
                  onPress={() => promptAsync()}
                  isLoading={socialLoading === 'google'}
                />
                {Platform.OS === 'ios' ? (
                  <SocialLoginButton
                    provider="apple"
                    onPress={handleAppleSignIn}
                    isLoading={socialLoading === 'apple'}
                  />
                ) : (
                  <SocialLoginButton
                    provider="apple"
                    onPress={handleAppleSignIn}
                    isLoading={socialLoading === 'apple'}
                  />
                )}
              </View>
            </View>

            {/* 회원가입 링크 */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>계정이 없으신가요? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signupLink}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
      </KeyboardScrollView>

      {/* 카카오/네이버 OAuth WebView 모달 */}
      {oauthWebView && (
        <OAuthWebView
          visible={oauthWebView.visible}
          authUrl={oauthWebView.url}
          redirectUri={oauthWebView.redirectUri}
          onCodeReceived={handleOAuthCode}
          onClose={() => setOauthWebView(null)}
          title={
            oauthWebView.provider === 'kakao' ? '카카오 로그인' : '네이버 로그인'
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // 헤더
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },

  // 폼
  form: {
    padding: 24,
    gap: 14,
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
  loginButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },

  // 구분선
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.inactive,
    fontSize: 14,
  },

  // 소셜 로그인
  socialGrid: {
    gap: 10,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // 회원가입
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
