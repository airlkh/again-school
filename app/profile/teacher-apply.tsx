import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { TeacherHistory } from '../../src/types/auth';

const CURRENT_YEAR = new Date().getFullYear();

function HistoryItem({
  item,
  index,
  onUpdate,
  onRemove,
  colors,
}: {
  item: TeacherHistory;
  index: number;
  onUpdate: (index: number, field: keyof TeacherHistory, value: any) => void;
  onRemove: (index: number) => void;
  colors: any;
}) {
  return (
    <View style={[itemStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={itemStyles.cardHeader}>
        <Text style={[itemStyles.cardTitle, { color: colors.text }]}>재직 이력 {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Ionicons name="close-circle" size={20} color={colors.inactive} />
        </TouchableOpacity>
      </View>
      <Text style={[itemStyles.label, { color: colors.textSecondary }]}>학교명 *</Text>
      <TextInput
        style={[itemStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        placeholder="예: 한빛중학교"
        placeholderTextColor={colors.inactive}
        value={item.schoolName}
        onChangeText={(v) => onUpdate(index, 'schoolName', v)}
      />
      <Text style={[itemStyles.label, { color: colors.textSecondary }]}>담당 과목 *</Text>
      <TextInput
        style={[itemStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        placeholder="예: 수학"
        placeholderTextColor={colors.inactive}
        value={item.subject}
        onChangeText={(v) => onUpdate(index, 'subject', v)}
      />
      <View style={itemStyles.yearRow}>
        <View style={{ flex: 1 }}>
          <Text style={[itemStyles.label, { color: colors.textSecondary }]}>시작연도 *</Text>
          <TextInput
            style={[itemStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 2010"
            placeholderTextColor={colors.inactive}
            keyboardType="number-pad"
            maxLength={4}
            value={item.startYear ? String(item.startYear) : ''}
            onChangeText={(v) => onUpdate(index, 'startYear', Number(v))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[itemStyles.label, { color: colors.textSecondary }]}>종료연도</Text>
          <TextInput
            style={[itemStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, opacity: item.isCurrent ? 0.4 : 1 }]}
            placeholder={item.isCurrent ? '재직 중' : '예: 2015'}
            placeholderTextColor={colors.inactive}
            keyboardType="number-pad"
            maxLength={4}
            editable={!item.isCurrent}
            value={item.isCurrent ? '' : (item.endYear ? String(item.endYear) : '')}
            onChangeText={(v) => onUpdate(index, 'endYear', Number(v))}
          />
        </View>
      </View>
      <TouchableOpacity
        style={itemStyles.currentRow}
        onPress={() => onUpdate(index, 'isCurrent', !item.isCurrent)}
      >
        <View style={[itemStyles.checkbox, { borderColor: item.isCurrent ? '#7C3AED' : colors.border, backgroundColor: item.isCurrent ? '#7C3AED' : 'transparent' }]}>
          {item.isCurrent && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[itemStyles.currentLabel, { color: colors.text }]}>현재 재직 중</Text>
      </TouchableOpacity>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 6, marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  yearRow: { flexDirection: 'row', gap: 8 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  currentLabel: { fontSize: 14 },
});

export default function TeacherApplyScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const goBack = useGoBack();
  const [history, setHistory] = useState<TeacherHistory[]>([
    { schoolName: '', subject: '', startYear: CURRENT_YEAR, endYear: null, isCurrent: true },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setAlreadyApplied(!!data.isTeacher);
          setIsVerified(!!data.teacherVerified);
          setIsRejected(!!data.teacherRejected);
          setRejectedReason(data.teacherRejectedReason || '');
          if (data.teacherHistory?.length) setHistory(data.teacherHistory);
          if (data.teacherMessage) setMessage(data.teacherMessage);
        }
      } catch {}
    })();
  }, [user]);

  function updateItem(index: number, field: keyof TeacherHistory, value: any) {
    setHistory((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'isCurrent' && value === true) {
        next[index].endYear = null;
      }
      return next;
    });
  }

  function removeItem(index: number) {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setHistory((prev) => [
      ...prev,
      { schoolName: '', subject: '', startYear: CURRENT_YEAR, endYear: null, isCurrent: false },
    ]);
  }

  async function handleApply() {
    if (!user) return;
    const invalid = history.find((h) => !h.schoolName.trim() || !h.subject.trim() || !h.startYear);
    if (invalid) {
      Alert.alert('입력 오류', '모든 재직 이력의 학교명, 과목, 시작연도를 입력해주세요.');
      return;
    }
    if (history.length === 0) {
      Alert.alert('입력 오류', '재직 이력을 1개 이상 추가해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const currentHistory = history.find((h) => h.isCurrent);
      await updateDoc(doc(db, 'users', user.uid), {
        isTeacher: true,
        teacherVerified: false,
        teacherRejected: false,
        teacherRejectedReason: '',
        teacherHistory: history,
        teacherSchoolName: currentHistory?.schoolName ?? history[0].schoolName,
        teacherSubject: currentHistory?.subject ?? history[0].subject,
        teacherMessage: message.trim(),
        teacherAppliedAt: serverTimestamp(),
      });
      setAlreadyApplied(true);
      setIsEditing(false);
      Alert.alert('신청 완료', '선생님 인증 신청이 완료됐어요.\n관리자 검토 후 뱃지가 부여됩니다.');
    } catch (e) {
      Alert.alert('오류', '신청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>선생님 인증 신청</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoBanner, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED44' }]}>
          <Text style={styles.infoEmoji}>👩‍🏫</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: '#7C3AED' }]}>선생님 인증 뱃지</Text>
            <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
              모교 및 재직 이력을 등록하면 관리자 검토 후 뱃지가 부여됩니다.
            </Text>
          </View>
        </View>

        {isRejected && !isEditing ? (
          <View style={[styles.pendingBox, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
            <Ionicons name="close-circle-outline" size={40} color="#e94560" />
            <Text style={[styles.pendingTitle, { color: '#e94560' }]}>인증 거절</Text>
            <Text style={[styles.pendingDesc, { color: colors.textSecondary }]}>
              선생님 인증 신청이 거절되었어요.
            </Text>
            {rejectedReason ? (
              <View style={[styles.appliedInfo, { borderColor: colors.border }]}>
                <Text style={[styles.appliedInfoLabel, { color: colors.textSecondary }]}>거절 사유</Text>
                <Text style={[styles.appliedInfoValue, { color: '#e94560' }]}>{rejectedReason}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: '#e94560', marginTop: 8 }]}
              onPress={() => {
                setIsRejected(false);
                setIsEditing(true);
              }}
            >
              <Ionicons name="refresh-outline" size={16} color="#e94560" />
              <Text style={{ fontSize: 14, color: '#e94560', fontWeight: '600' }}>다시 신청하기</Text>
            </TouchableOpacity>
          </View>
        ) : isVerified && !isEditing ? (
          <View style={[styles.verifiedBox, { backgroundColor: '#7C3AED18' }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>👩‍🏫</Text>
            <Text style={[styles.verifiedTitle, { color: '#7C3AED' }]}>인증 완료!</Text>
            <Text style={[styles.verifiedDesc, { color: colors.textSecondary }]}>
              선생님 인증 뱃지가 활성화되었어요.
            </Text>
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: '#7C3AED' }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={16} color="#7C3AED" />
              <Text style={{ fontSize: 14, color: '#7C3AED', fontWeight: '600' }}>재직 이력 수정</Text>
            </TouchableOpacity>
          </View>
        ) : alreadyApplied && !isEditing ? (
          <View style={[styles.pendingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={40} color={colors.inactive} />
            <Text style={[styles.pendingTitle, { color: colors.text }]}>검토 중</Text>
            <Text style={[styles.pendingDesc, { color: colors.textSecondary }]}>
              신청이 접수되었어요. 관리자 검토 후 뱃지가 부여됩니다.
            </Text>
            <View style={[styles.appliedInfo, { borderColor: colors.border }]}>
              {history.map((h, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={[styles.appliedInfoLabel, { color: colors.textSecondary }]}>
                    {h.isCurrent ? '현재 재직' : `재직 이력 ${i + 1}`}
                  </Text>
                  <Text style={[styles.appliedInfoValue, { color: colors.text }]}>
                    {h.schoolName} · {h.subject} · {h.startYear}~{h.isCurrent ? '현재' : h.endYear}
                  </Text>
                </View>
              ))}
            </View>
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border, marginTop: 8 }]}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600' }}>재직 이력 수정</Text>
              </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>재직 이력</Text>
            {history.map((item, index) => (
              <HistoryItem
                key={index}
                item={item}
                index={index}
                onUpdate={updateItem}
                onRemove={removeItem}
                colors={colors}
              />
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: '#7C3AED' }]}
              onPress={addItem}
            >
              <Ionicons name="add-circle-outline" size={18} color="#7C3AED" />
              <Text style={[styles.addBtnText, { color: '#7C3AED' }]}>재직 이력 추가</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text }]}>추가 메시지 (선택)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="관리자에게 전달할 메시지를 입력해주세요"
              placeholderTextColor={colors.inactive}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>신청하기</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  infoEmoji: { fontSize: 32 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  textArea: { height: 120, paddingTop: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', borderWidth: 1, borderRadius: 12, height: 44, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { backgroundColor: '#7C3AED', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  verifiedBox: { alignItems: 'center', padding: 32, borderRadius: 16, gap: 8 },
  verifiedTitle: { fontSize: 20, fontWeight: '700' },
  verifiedDesc: { fontSize: 14, textAlign: 'center' },
  pendingBox: { alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1, gap: 8 },
  pendingTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  pendingDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  appliedInfo: { width: '100%', borderTopWidth: 1, marginTop: 16, paddingTop: 16, gap: 4 },
  appliedInfoLabel: { fontSize: 12 },
  appliedInfoValue: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', borderWidth: 1, borderRadius: 12, height: 44, paddingHorizontal: 16, marginTop: 8 },
});
