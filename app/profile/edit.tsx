import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardScrollView } from '../../src/components/KeyboardScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import {
  getUserProfile,
  updateUserProfile,
} from '../../src/services/firestoreService';
import { REGIONS } from '../../src/data/regions';

export default function ProfileEditScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();

  const [displayName, setDisplayName] = useState('');
  const [job, setJob] = useState('');
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 지역 선택 모달
  const [showSidoModal, setShowSidoModal] = useState(false);
  const [showSigunguModal, setShowSigunguModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setDisplayName(profile.displayName || '');
          setJob(profile.job || '');
          setSido(profile.region?.sido || '');
          setSigungu(profile.region?.sigungu || '');
        } else {
          setDisplayName(user.displayName || '');
        }
      } catch {}
      setLoaded(true);
    })();
  }, [user]);

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        job: job.trim(),
        workplace: job.trim(),
        region: { sido, sigungu },
      });
      Alert.alert('완료', '프로필이 저장되었습니다.', [
        { text: '확인', onPress: goBack },
      ]);
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const sidoList = Object.keys(REGIONS);
  const sigunguList = sido ? REGIONS[sido] || [] : [];

  if (!loaded) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 편집</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardScrollView
        contentContainerStyle={styles.scrollContent}
      >
          {/* 이름 */}
          <Text style={[styles.label, { color: colors.text }]}>이름 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={colors.inactive}
            value={displayName}
            onChangeText={setDisplayName}
          />

          {/* 현재 직장 */}
          <Text style={[styles.label, { color: colors.text }]}>현재 직장 / 직업</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 삼성전자 개발팀"
            placeholderTextColor={colors.inactive}
            value={job}
            onChangeText={setJob}
          />

          {/* 거주 지역 */}
          <Text style={[styles.label, { color: colors.text }]}>거주 지역</Text>
          <View style={styles.regionRow}>
            <TouchableOpacity
              style={[styles.regionBtn, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowSidoModal(true)}
            >
              <Text style={sido ? [styles.regionBtnText, { color: colors.text }] : [styles.regionBtnPlaceholder, { color: colors.inactive }]}>
                {sido || '시/도 선택'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.inactive} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.regionBtn, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                if (!sido) {
                  Alert.alert('알림', '시/도를 먼저 선택해주세요.');
                  return;
                }
                setShowSigunguModal(true);
              }}
            >
              <Text style={sigungu ? [styles.regionBtnText, { color: colors.text }] : [styles.regionBtnPlaceholder, { color: colors.inactive }]}>
                {sigungu || '시/군/구 선택'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.inactive} />
            </TouchableOpacity>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { backgroundColor: colors.inactive }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? '저장 중...' : '저장하기'}
            </Text>
          </TouchableOpacity>
      </KeyboardScrollView>

      {/* 시/도 선택 모달 */}
      <Modal visible={showSidoModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>시/도 선택</Text>
              <TouchableOpacity onPress={() => setShowSidoModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sidoList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.card },
                    sido === item && { backgroundColor: isDark ? colors.surface2 : '#fef2f2' },
                  ]}
                  onPress={() => {
                    setSido(item);
                    setSigungu('');
                    setShowSidoModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: colors.text },
                      sido === item && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {item}
                  </Text>
                  {sido === item && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* 시/군/구 선택 모달 */}
      <Modal visible={showSigunguModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{sido} - 시/군/구 선택</Text>
              <TouchableOpacity onPress={() => setShowSigunguModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sigunguList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.card },
                    sigungu === item && { backgroundColor: isDark ? colors.surface2 : '#fef2f2' },
                  ]}
                  onPress={() => {
                    setSigungu(item);
                    setShowSigunguModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: colors.text },
                      sigungu === item && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {item}
                  </Text>
                  {sigungu === item && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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

  scrollContent: { padding: 20 },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  regionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  regionBtnText: { fontSize: 15 },
  regionBtnPlaceholder: { fontSize: 15 },

  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: { fontSize: 15 },
});
