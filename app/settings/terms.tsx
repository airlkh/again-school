import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { usePolicy } from '../../src/hooks/usePolicies';

const FALLBACK = `Again School 이용약관

제1조 (목적)
본 약관은 Again School(이하 "서비스")이 제공하는 서비스의 이용과 관련하여 서비스와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
"서비스"란 Again School이 제공하는 모든 서비스를 의미합니다.
"이용자"란 본 약관에 따라 서비스가 제공하는 서비스를 이용하는 자를 말합니다.

자세한 내용은 관리자가 등록 중입니다.`;

export default function TermsScreen() {
  const goBack = useGoBack();
  const { colors } = useTheme();
  const { policy, loading } = usePolicy('terms');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>이용약관</Text>
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
