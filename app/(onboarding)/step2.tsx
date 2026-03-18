import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { StepIndicator } from '../../src/components/StepIndicator';
import { SchoolInput } from '../../src/components/SchoolInput';
import { SchoolEntry } from '../../src/types/auth';
import { useOnboarding } from './_layout';

export default function Step2Screen() {
  const { colors } = useTheme();
  const { data, updateData } = useOnboarding();
  const [schools, setSchools] = useState<SchoolEntry[]>(data.schools);

  function handleNext() {
    if (schools.length === 0) {
      Alert.alert('입력 오류', '학교를 최소 1개 이상 추가해주세요.');
      return;
    }
    updateData({ schools });
    router.push('/(onboarding)/step3');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>학교 정보</Text>
          <Text style={styles.headerSubtitle}>
            다녔던 학교를 추가해주세요
          </Text>
        </View>

        <StepIndicator totalSteps={4} currentStep={2} />

        {/* 학교 입력 */}
        <View style={styles.content}>
          <SchoolInput schools={schools} onSchoolsChange={setSchools} birthYear={data.birthYear} />
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: colors.primary },
            schools.length === 0 && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={schools.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  content: { padding: 24 },
  footer: { padding: 24, paddingTop: 0 },
  nextButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
