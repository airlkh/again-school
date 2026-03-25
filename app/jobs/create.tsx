import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardScrollView } from '../../src/components/KeyboardScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { createJobPost } from '../../src/services/jobService';
import { JobType } from '../../src/types/auth';

export default function JobCreateScreen() {
  const { user } = useAuth();
  const { displayName, photoURL } = useCurrentUser();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();

  const [jobType, setJobType] = useState<JobType>('구인');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'alumni' | 'private'>('alumni');

  function validate(): boolean {
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return false; }
    if (!company.trim()) {
      Alert.alert('알림', jobType === '구인' ? '회사명을 입력해주세요.' : '희망 직종을 입력해주세요.');
      return false;
    }
    if (!location.trim()) { Alert.alert('알림', '지역을 입력해주세요.'); return false; }
    if (!description.trim()) { Alert.alert('알림', '상세 내용을 입력해주세요.'); return false; }
    if (!contact.trim()) { Alert.alert('알림', '연락처를 입력해주세요.'); return false; }
    return true;
  }

  async function handleCreate() {
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      await createJobPost({
        type: jobType,
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        description: description.trim(),
        salary: salary.trim() || undefined,
        contact: contact.trim(),
        authorUid: user.uid,
        authorName: displayName || '사용자',
        authorAvatarImg: 1,
        authorPhotoURL: photoURL ?? null,
        visibility,
      } as any);
      Alert.alert('완료', '글이 등록되었습니다!', [
        { text: '확인', onPress: () => goBack() },
      ]);
    } catch {
      Alert.alert('오류', '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>구인구직 글쓰기</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
          {/* 유형 선택 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>유형 선택</Text>
          <View style={styles.typeRow}>
            {(['구인', '구직'] as JobType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  { borderColor: colors.border },
                  jobType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setJobType(t)}
              >
                <Ionicons
                  name={t === '구인' ? 'business-outline' : 'person-outline'}
                  size={16}
                  color={jobType === t ? '#fff' : colors.textSecondary}
                />
                <Text style={[
                  styles.typeText,
                  { color: colors.textSecondary },
                  jobType === t && { color: '#fff', fontWeight: '700' },
                ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 기본 정보 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>기본 정보</Text>

          <Text style={[styles.label, { color: colors.text }]}>제목 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder={jobType === '구인' ? '예: 프론트엔드 개발자 채용' : '예: 프론트엔드 개발자 구직'}
            placeholderTextColor={colors.inactive}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text }]}>
            {jobType === '구인' ? '회사명 *' : '희망 직종 *'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder={jobType === '구인' ? '예: (주)어게인스쿨' : '예: 프론트엔드 개발'}
            placeholderTextColor={colors.inactive}
            value={company}
            onChangeText={setCompany}
          />

          <Text style={[styles.label, { color: colors.text }]}>지역 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 서울 강남구"
            placeholderTextColor={colors.inactive}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[styles.label, { color: colors.text }]}>급여</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 연봉 5,000만원 / 시급 15,000원"
            placeholderTextColor={colors.inactive}
            value={salary}
            onChangeText={setSalary}
          />

          {/* 상세 내용 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>상세 내용</Text>

          <Text style={[styles.label, { color: colors.text }]}>설명 *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder={jobType === '구인'
              ? '담당 업무, 자격 요건, 우대 사항 등을 입력해주세요'
              : '경력, 기술 스택, 희망 근무 조건 등을 입력해주세요'}
            placeholderTextColor={colors.inactive}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text }]}>연락처 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: email@example.com / 010-1234-5678"
            placeholderTextColor={colors.inactive}
            value={contact}
            onChangeText={setContact}
          />

          {/* 공개 설정 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>공개 설정</Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {([
              { key: 'public' as const, label: '🌍 전체 공개', desc: '모든 사용자에게 표시' },
              { key: 'alumni' as const, label: '🏫 동창 공개', desc: '같은 학교 동창에게만 표시' },
              { key: 'private' as const, label: '🔒 비공개', desc: '본인만 표시' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setVisibility(opt.key)}
                style={[
                  styles.input,
                  {
                    backgroundColor: visibility === opt.key ? (isDark ? colors.surface : '#fef2f2') : colors.surface,
                    borderColor: visibility === opt.key ? colors.primary : colors.border,
                    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0,
                  },
                ]}
              >
                <Text style={{ fontSize: 14, flex: 1, color: colors.text }}>{opt.label}</Text>
                {visibility === opt.key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* 안내 */}
          <View style={[styles.notice, { backgroundColor: isDark ? colors.surface2 : '#fffbeb', borderColor: isDark ? colors.border : '#fde68a' }]}>
            <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
            <Text style={[styles.noticeText, { color: isDark ? colors.textSecondary : '#92400e' }]}>
              동창 네트워크를 통한 채용/구직 글입니다. 허위 정보 작성 시 제재될 수 있습니다.
            </Text>
          </View>
      </KeyboardScrollView>

      {/* 등록하기 버튼 - 하단 고정 */}
      <View style={[
        styles.bottomBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }, submitting && { backgroundColor: colors.inactive }]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.createBtnText}>등록하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },

  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeText: { fontSize: 15 },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  textArea: { minHeight: 130, paddingTop: 12 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  createBtn: {
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
