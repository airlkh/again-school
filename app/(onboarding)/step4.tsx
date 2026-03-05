import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { StepIndicator } from '../../src/components/StepIndicator';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOnboarding } from './_layout';
import {
  saveUserProfile,
  countClassmates,
} from '../../src/services/firestoreService';
// TODO: Firebase Storage 활성화 후 프로필 사진 업로드 추가
// import { uploadProfilePhoto } from '../../src/services/storageService';

export default function Step4Screen() {
  const { colors, isDark } = useTheme();
  const { user, setOnboardingCompleted } = useAuth();
  const { data } = useOnboarding();
  const [isSaving, setIsSaving] = useState(true);
  const [classmateCount, setClassmateCount] = useState(0);
  const [error, setError] = useState(false);

  const celebrationBg = isDark ? 'rgba(232,49,58,0.15)' : '#fef2f2';

  useEffect(() => {
    saveProfile();
  }, []);

  async function saveProfile() {
    if (!user) return;

    try {
      setIsSaving(true);

      // Firestore에 프로필 저장 (기본 아바타 사용)
      // TODO: Storage 활성화 후 photoURL에 업로드된 사진 URL 저장
      await saveUserProfile(user.uid, {
        displayName: data.displayName,
        photoURL: null,
        schools: data.schools,
        region: data.region,
      });

      // 동창 수 조회
      try {
        const count = await countClassmates(data.schools);
        setClassmateCount(count);
      } catch {
        setClassmateCount(0);
      }

      setIsSaving(false);
    } catch {
      setIsSaving(false);
      setError(true);
    }
  }

  function handleStart() {
    setOnboardingCompleted(true);
  }

  function handleRetry() {
    setError(false);
    saveProfile();
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            저장에 실패했습니다
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>준비 완료!</Text>
      </View>

      <StepIndicator totalSteps={4} currentStep={4} />

      <View style={styles.center}>
        {isSaving ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.savingText, { color: colors.textSecondary }]}>
              프로필을 저장하고 있어요...
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.celebrationCircle, { backgroundColor: celebrationBg }]}>
              <Ionicons name="people" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              환영합니다!
            </Text>
            <Text style={[styles.welcomeName, { color: colors.primary }]}>
              {data.displayName}님
            </Text>
            <View style={[styles.classmateBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.classmateNumber}>{classmateCount}</Text>
              <Text style={styles.classmateLabel}>
                동창이 기다리고 있어요!
              </Text>
            </View>
            <Text style={[styles.schoolSummary, { color: colors.textSecondary }]}>
              {data.schools.map((s) => s.schoolName).join(', ')}
            </Text>
            <Text style={[styles.regionSummary, { color: colors.inactive }]}>
              {data.region.sido} {data.region.sigungu}
            </Text>
          </>
        )}
      </View>

      {/* 하단 버튼 */}
      {!isSaving && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  savingText: {
    fontSize: 16,
    marginTop: 16,
  },
  celebrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 24,
  },
  classmateBox: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  classmateNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  classmateLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  schoolSummary: {
    fontSize: 15,
    textAlign: 'center',
  },
  regionSummary: {
    fontSize: 14,
    marginTop: 4,
  },
  footer: { padding: 24, paddingTop: 0 },
  startButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
