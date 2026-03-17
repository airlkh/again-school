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

export default function TeacherApplyScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const goBack = useGoBack();
  const [schoolName, setSchoolName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setAlreadyApplied(!!data.isTeacher);
          setIsVerified(!!data.teacherVerified);
          if (data.teacherSchoolName) setSchoolName(data.teacherSchoolName);
          if (data.teacherSubject) setSubject(data.teacherSubject);
        }
      } catch {}
    })();
  }, [user]);

  async function handleApply() {
    if (!user) return;
    if (!schoolName.trim()) {
      Alert.alert('입력 오류', '재직 중인 학교명을 입력해주세요.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('입력 오류', '담당 과목을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isTeacher: true,
        teacherVerified: false,
        teacherSchoolName: schoolName.trim(),
        teacherSubject: subject.trim(),
        teacherMessage: message.trim(),
        teacherAppliedAt: serverTimestamp(),
      });
      setAlreadyApplied(true);
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
        {/* 안내 배너 */}
        <View style={[styles.infoBanner, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED44' }]}>
          <Text style={styles.infoEmoji}>👩‍🏫</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: '#7C3AED' }]}>선생님 인증 뱃지</Text>
            <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
              현직 선생님임을 인증하면 프로필과 피드에 뱃지가 표시됩니다.
              관리자 검토 후 승인됩니다.
            </Text>
          </View>
        </View>

        {isVerified ? (
          <View style={[styles.verifiedBox, { backgroundColor: '#7C3AED18' }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>👩‍🏫</Text>
            <Text style={[styles.verifiedTitle, { color: '#7C3AED' }]}>인증 완료!</Text>
            <Text style={[styles.verifiedDesc, { color: colors.textSecondary }]}>
              선생님 인증 뱃지가 활성화되었어요.
            </Text>
          </View>
        ) : alreadyApplied ? (
          <View style={[styles.pendingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={40} color={colors.inactive} />
            <Text style={[styles.pendingTitle, { color: colors.text }]}>검토 중</Text>
            <Text style={[styles.pendingDesc, { color: colors.textSecondary }]}>
              신청이 접수되었어요. 관리자 검토 후 뱃지가 부여됩니다.
            </Text>
            <View style={[styles.appliedInfo, { borderColor: colors.border }]}>
              <Text style={[styles.appliedInfoLabel, { color: colors.textSecondary }]}>재직 학교</Text>
              <Text style={[styles.appliedInfoValue, { color: colors.text }]}>{schoolName}</Text>
              <Text style={[styles.appliedInfoLabel, { color: colors.textSecondary }]}>담당 과목</Text>
              <Text style={[styles.appliedInfoValue, { color: colors.text }]}>{subject}</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.text }]}>재직 중인 학교명 *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="예: 한빛중학교"
                placeholderTextColor={colors.inactive}
                value={schoolName}
                onChangeText={setSchoolName}
              />

              <Text style={[styles.label, { color: colors.text }]}>담당 과목 *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="예: 수학, 영어, 국어"
                placeholderTextColor={colors.inactive}
                value={subject}
                onChangeText={setSubject}
              />

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
            </View>

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
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  textArea: { height: 120, paddingTop: 14 },
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
});
