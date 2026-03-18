import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { usePolicy } from '../../src/hooks/usePolicies';

const FALLBACK = `Again School 개인정보처리방침

1. 수집하는 개인정보
서비스는 회원가입 및 서비스 이용을 위해 아래와 같은 개인정보를 수집합니다.
- 필수항목: 이메일, 이름, 학교정보
- 선택항목: 프로필 사진, 직장정보, 지역정보

2. 개인정보의 이용 목적
- 서비스 제공 및 회원 관리
- 동창 찾기 및 연결 서비스
- 서비스 개선 및 통계 분석

자세한 내용은 관리자가 등록 중입니다.`;

export default function PrivacyScreen() {
  const goBack = useGoBack();
  const { colors } = useTheme();
  const { policy, loading } = usePolicy('privacy');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>개인정보처리방침</Text>
        <View style={styles.backBtn} />
      </View>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {policy?.version && (
            <Text style={[styles.version, { color: colors.inactive }]}>버전 {policy.version}</Text>
          )}
          <Text style={[styles.body, { color: colors.text }]}>
            {policy?.content || FALLBACK}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  version: { fontSize: 12, marginBottom: 12 },
  body: { fontSize: 14, lineHeight: 24 },
});
