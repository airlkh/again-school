import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { PostVisibility, VisibilitySchool } from '../../src/services/postService';
import { saveDefaultVisibility } from '../../src/services/firestoreService';
import { UserProfile } from '../../src/types/auth';

const VISIBILITY_OPTIONS: { key: PostVisibility; label: string }[] = [
  { key: 'public', label: '🌍 전체 공개' },
  { key: 'school', label: '🏫 같은 학교' },
  { key: 'grade', label: '🎓 같은 학년' },
  { key: 'connections', label: '👥 동창만' },
  { key: 'private', label: '🔒 나만 보기' },
];

export default function VisibilitySettingsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const goBack = useGoBack();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [postVisibility, setPostVisibility] = useState<PostVisibility>('public');
  const [storyVisibility, setStoryVisibility] = useState<PostVisibility>('public');
  const [postSchools, setPostSchools] = useState<VisibilitySchool[]>([]);
  const [storySchools, setStorySchools] = useState<VisibilitySchool[]>([]);

  // 학교 선택 모드
  const [schoolPickerTarget, setSchoolPickerTarget] = useState<'post' | 'story' | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<PostVisibility>('school');
  const [pendingSchools, setPendingSchools] = useState<VisibilitySchool[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data as UserProfile);
          if (data.defaultPostVisibility) setPostVisibility(data.defaultPostVisibility);
          if (data.defaultStoryVisibility) setStoryVisibility(data.defaultStoryVisibility);
          if (data.defaultPostVisibilitySchools) setPostSchools(data.defaultPostVisibilitySchools);
          if (data.defaultStoryVisibilitySchools) setStorySchools(data.defaultStoryVisibilitySchools);
        }
      } catch (e) {
        console.warn('공개범위 설정 로드 실패:', e);
      }
    })();
  }, [user?.uid]);

  const handleSelect = async (type: 'post' | 'story', v: PostVisibility) => {
    if (!user?.uid) return;
    if (v === 'school' || v === 'grade') {
      setSchoolPickerTarget(type);
      setPendingVisibility(v);
      setPendingSchools(type === 'post' ? postSchools : storySchools);
      return;
    }
    if (type === 'post') {
      setPostVisibility(v);
      setPostSchools([]);
    } else {
      setStoryVisibility(v);
      setStorySchools([]);
    }
    try {
      await saveDefaultVisibility(user.uid, type, v, []);
    } catch {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const handleSchoolConfirm = async () => {
    if (!user?.uid || !schoolPickerTarget) return;
    if (pendingSchools.length === 0) {
      Alert.alert('학교를 1개 이상 선택해주세요');
      return;
    }
    if (schoolPickerTarget === 'post') {
      setPostVisibility(pendingVisibility);
      setPostSchools(pendingSchools);
    } else {
      setStoryVisibility(pendingVisibility);
      setStorySchools(pendingSchools);
    }
    try {
      await saveDefaultVisibility(user.uid, schoolPickerTarget, pendingVisibility, pendingSchools);
    } catch {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
    setSchoolPickerTarget(null);
  };

  const toggleSchool = (school: UserProfile['schools'][0]) => {
    const isSelected = pendingSchools.some(s => s.schoolName === school.schoolName);
    if (isSelected) {
      setPendingSchools(prev => prev.filter(s => s.schoolName !== school.schoolName));
    } else {
      setPendingSchools(prev => [
        ...prev,
        {
          schoolId: school.schoolName,
          schoolName: school.schoolName,
          schoolType: school.schoolType,
          graduationYear: String(school.graduationYear),
          level: pendingVisibility === 'grade' ? 'grade' : 'school',
        },
      ]);
    }
  };

  const getVisibilityLabel = (v: PostVisibility): string => {
    return VISIBILITY_OPTIONS.find(o => o.key === v)?.label ?? v;
  };

  // 학교 선택 화면
  if (schoolPickerTarget) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[s.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => setSchoolPickerTarget(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>학교 선택</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionDesc, { color: colors.inactive }]}>
            {pendingVisibility === 'school'
              ? '선택한 학교의 모든 졸업생에게 공개됩니다'
              : '선택한 학교의 같은 졸업년도 학생에게만 공개됩니다'}
          </Text>

          {(profile?.schools ?? []).map((school) => {
            const isSelected = pendingSchools.some(ps => ps.schoolName === school.schoolName);
            return (
              <TouchableOpacity
                key={school.schoolName}
                onPress={() => toggleSchool(school)}
                style={[s.optionRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, { color: colors.text }]}>
                    {school.schoolType} · {school.schoolName}
                  </Text>
                  <Text style={[s.optionDetail, { color: colors.inactive }]}>
                    {pendingVisibility === 'school'
                      ? '전체 졸업생 공개'
                      : `${school.graduationYear}년 졸업생만 공개`}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={handleSchoolConfirm}
            style={[s.confirmBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={s.confirmBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>공개 범위 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        {/* 게시물 기본 공개범위 */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>게시물 기본 공개범위</Text>
          <Text style={[s.sectionDesc, { color: colors.inactive }]}>
            새 게시물 작성 시 기본으로 적용됩니다
          </Text>
          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect('post', opt.key)}
              style={[s.optionRow, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                {postVisibility === opt.key && (opt.key === 'school' || opt.key === 'grade') && postSchools.length > 0 && (
                  <Text style={[s.optionDetail, { color: colors.inactive }]}>
                    {postSchools.map(s => s.schoolName).join(', ')}
                  </Text>
                )}
              </View>
              {postVisibility === opt.key && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 스토리 기본 공개범위 */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>스토리 기본 공개범위</Text>
          <Text style={[s.sectionDesc, { color: colors.inactive }]}>
            새 스토리 작성 시 기본으로 적용됩니다
          </Text>
          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect('story', opt.key)}
              style={[s.optionRow, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                {storyVisibility === opt.key && (opt.key === 'school' || opt.key === 'grade') && storySchools.length > 0 && (
                  <Text style={[s.optionDetail, { color: colors.inactive }]}>
                    {storySchools.map(s => s.schoolName).join(', ')}
                  </Text>
                )}
              </View>
              {storyVisibility === opt.key && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  optionLabel: { fontSize: 15 },
  optionDetail: { fontSize: 12, marginTop: 2 },
  confirmBtn: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
