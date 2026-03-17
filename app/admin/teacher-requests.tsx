import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { getAvatarSource } from '../../src/utils/avatar';
import { router } from 'expo-router';

// 관리자 UID 목록 — 실제 관리자 UID로 교체하세요
const ADMIN_UIDS = ['UB6PuD56uHaImgqqC3q1AFFk8kj1'];

interface TeacherRequest {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  avatarImg?: number;
  teacherSchoolName: string;
  teacherSubject: string;
  teacherMessage?: string;
  teacherVerified: boolean;
  teacherAppliedAt: number;
}

export default function TeacherRequestsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const goBack = useGoBack();
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('isTeacher', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const items: TeacherRequest[] = snap.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().displayName ?? '이름 없음',
        photoURL: d.data().photoURL ?? null,
        avatarImg: d.data().avatarImg,
        teacherSchoolName: d.data().teacherSchoolName ?? '',
        teacherSubject: d.data().teacherSubject ?? '',
        teacherMessage: d.data().teacherMessage ?? '',
        teacherVerified: d.data().teacherVerified === true,
        teacherAppliedAt: d.data().teacherAppliedAt?.toMillis?.() ?? 0,
      }));
      items.sort((a, b) => (a.teacherVerified ? 1 : -1) - (b.teacherVerified ? 1 : -1));
      setRequests(items);
      setLoading(false);
    });
    return unsub;
  }, [isAdmin]);

  async function handleApprove(uid: string, approve: boolean) {
    setProcessingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        teacherVerified: approve,
        isTeacher: approve ? true : false,
      });
      Alert.alert(approve ? '승인 완료' : '거절 완료', approve ? '선생님 인증이 승인됐어요.' : '선생님 인증이 거절됐어요.');
    } catch {
      Alert.alert('오류', '처리에 실패했습니다.');
    } finally {
      setProcessingUid(null);
    }
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.inactive} />
          <Text style={[styles.noAccessText, { color: colors.textSecondary }]}>관리자 전용 화면입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>선생님 인증 신청 관리</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>신청 내역이 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => router.push(`/profile/${item.uid}` as any)}
              >
                <Image
                  source={getAvatarSource(item.photoURL)}
                  style={[styles.avatar, { backgroundColor: colors.background }]}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.displayName}</Text>
                    {item.teacherVerified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>✓ 승인됨</Text>
                      </View>
                    )}
                    {!item.teacherVerified && (
                      <View style={[styles.pendingBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.pendingBadgeText, { color: colors.textSecondary }]}>검토 중</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.school, { color: colors.textSecondary }]}>
                    🏫 {item.teacherSchoolName}
                  </Text>
                  <Text style={[styles.subject, { color: colors.textSecondary }]}>
                    📚 {item.teacherSubject}
                  </Text>
                  {item.teacherMessage ? (
                    <Text style={[styles.message, { color: colors.inactive }]} numberOfLines={2}>
                      💬 {item.teacherMessage}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {!item.teacherVerified && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.border }]}
                    onPress={() => handleApprove(item.uid, false)}
                    disabled={processingUid === item.uid}
                  >
                    {processingUid === item.uid ? (
                      <ActivityIndicator size="small" color={colors.inactive} />
                    ) : (
                      <Text style={[styles.rejectBtnText, { color: colors.textSecondary }]}>거절</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item.uid, true)}
                    disabled={processingUid === item.uid}
                  >
                    {processingUid === item.uid ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveBtnText}>승인</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {item.teacherVerified && (
                <TouchableOpacity
                  style={[styles.revokeBtn, { borderColor: colors.border }]}
                  onPress={() => Alert.alert('인증 취소', '선생님 인증을 취소하시겠습니까?', [
                    { text: '아니오', style: 'cancel' },
                    { text: '취소하기', style: 'destructive', onPress: () => handleApprove(item.uid, false) },
                  ])}
                >
                  <Text style={[styles.revokeBtnText, { color: colors.textSecondary }]}>인증 취소</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noAccessText: { fontSize: 16, marginTop: 12 },
  emptyText: { fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700' },
  verifiedBadge: { backgroundColor: '#7C3AED22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  verifiedBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '700' },
  pendingBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pendingBadgeText: { fontSize: 11 },
  school: { fontSize: 13, marginBottom: 2 },
  subject: { fontSize: 13, marginBottom: 2 },
  message: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontWeight: '600' },
  approveBtn: { flex: 2, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  revokeBtn: { height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  revokeBtnText: { fontSize: 13 },
});
