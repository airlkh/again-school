import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { useTrust, getTrustBadge, TRUST_BADGE_INFO } from '../../src/hooks/useTrust';
import {
  getUserProfile,
  sendConnectionRequest,
  subscribeMyConnections,
  subscribeUserProfile,
} from '../../src/services/firestoreService';
import { UserProfile, SchoolEntry, UserPrivacySettings, ConnectionRequest } from '../../src/types/auth';
import {
  DummyClassmate,
  findClassmateById,
  DUMMY_CLASSMATES,
} from '../../src/data/dummyClassmates';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';

function getVisibleSchools(targetSchools: SchoolEntry[], mySchools: SchoolEntry[]): SchoolEntry[] {
  const mySchoolNames = mySchools.map((s) => s.schoolName.toLowerCase().trim());
  return targetSchools.filter((school) => {
    if (school.isPublic === false) return false;
    return mySchoolNames.includes(school.schoolName.toLowerCase().trim());
  });
}

function checkPrivacy(
  targetPrivacy: UserPrivacySettings | undefined,
  targetSchools: SchoolEntry[],
  mySchools: SchoolEntry[],
) {
  const privacy = targetPrivacy ?? { showWorkplace: true, showSchools: true };
  const myNames = mySchools.map((s) => s.schoolName.toLowerCase().trim());
  const targetNames = targetSchools.map((s) => s.schoolName.toLowerCase().trim());
  const isSameSchool = myNames.some((n) => targetNames.includes(n));
  return {
    canSeeSchools: privacy.showSchools && isSameSchool,
    canSeeWorkplace: privacy.showWorkplace && isSameSchool,
  };
}

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile: myProfile } = useCurrentUser();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const [profile, setProfile] = useState<DummyClassmate | null>(null);
  const [firestoreProfile, setFirestoreProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [trustMessage, setTrustMessage] = useState('');
  const { trustCount, isTrustedByMe, toggleTrust, loading: trustLoading } = useTrust(id ?? '');

  // 프로필 실시간 구독 (Firestore 먼저, 없으면 더미)
  useEffect(() => {
    if (!id) return;

    const unsub = subscribeUserProfile(id, (fp) => {
      if (fp) {
        setFirestoreProfile(fp);
        setIsLoading(false);
      } else {
        // Firestore에 없으면 더미 데이터 fallback
        const dummy = findClassmateById(id);
        if (dummy) setProfile(dummy);
        setIsLoading(false);
      }
    });

    return unsub;
  }, [id]);

  // 연결 상태 구독
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyConnections(user.uid, setConnections);
    return unsub;
  }, [user]);

  // 공통 동창 수 계산 (더미 기준)
  const commonCount = profile
    ? DUMMY_CLASSMATES.filter(
        (c) =>
          c.id !== profile.id &&
          c.schools.some((s) =>
            profile.schools.some(
              (ps) =>
                ps.schoolName === s.schoolName &&
                ps.graduationYear === s.graduationYear,
            ),
          ),
      ).length
    : 0;

  // 연결 상태
  const connection = connections.find(
    (c) =>
      (c.fromUid === user?.uid && c.toUid === id) ||
      (c.toUid === user?.uid && c.fromUid === id),
  );

  async function handleConnect() {
    if (!user || !id) return;
    setIsSending(true);
    try {
      const myProfile = await getUserProfile(user.uid);
      const myName = myProfile?.displayName ?? '사용자';
      const targetName =
        firestoreProfile?.displayName ?? profile?.name ?? '동창';
      await sendConnectionRequest(user.uid, myName, id, targetName);
      Alert.alert('연결 요청 완료', `${targetName}님에게 연결 요청을 보냈습니다.`);
    } catch {
      Alert.alert('오류', '연결 요청에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // 통합 데이터
  const displayName = firestoreProfile?.displayName ?? profile?.name ?? '알 수 없음';
  const avatarImg = profile?.avatarImg ?? 1;
  const allSchools = firestoreProfile?.schools ?? profile?.schools ?? [];
  const mySchools = myProfile?.schools ?? [];
  const isMe = user?.uid === id;
  const { canSeeSchools, canSeeWorkplace } = isMe
    ? { canSeeSchools: true, canSeeWorkplace: true }
    : checkPrivacy(firestoreProfile?.privacySettings, allSchools, mySchools);
  const schools = isMe
    ? allSchools
    : canSeeSchools
      ? getVisibleSchools(allSchools, mySchools)
      : [];
  const region = firestoreProfile
    ? `${firestoreProfile.region?.sido ?? ''} ${firestoreProfile.region?.sigungu ?? ''}`.trim()
    : profile?.region ?? '';
  const verified = profile?.verified ?? !!firestoreProfile;
  const job = profile?.job ?? '';
  const workplace = firestoreProfile?.workplace ?? '';
  const classNumber = profile?.classNumber ?? 0;
  const trustBadge = TRUST_BADGE_INFO[getTrustBadge(trustCount)];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 영역 */}
        <View style={styles.profileSection}>
          <Image
            source={getAvatarSource(firestoreProfile?.photoURL ?? profile?.photoURL)}
            style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.primary }]}
          />
          <View style={styles.nameRow}>
            <NameWithBadge
              name={displayName}
              isAdmin={verified}
              trustCount={trustCount}
              nameStyle={[styles.displayName, { color: colors.text }]}
              size="medium"
            />
          </View>

          {/* 공식 인증 강조 */}
          {verified && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#e8f4fd',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginTop: 8,
                alignSelf: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#1d9bf0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#1d9bf0', fontWeight: '700' }}>
                Again School 공식 인증 계정
              </Text>
            </View>
          )}

          {/* 인증 수 */}
          <TouchableOpacity
            style={styles.trustCountRow}
            onPress={() => router.push({ pathname: '/trust-voters/[id]', params: { id: id! } })}
            activeOpacity={0.7}
          >
            <Text style={styles.trustCountEmoji}>👥</Text>
            <Text style={[styles.trustCountText, { color: colors.inactive }]}>
              동창 인증 {trustCount}명
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.inactive} />
          </TouchableOpacity>

          {job ? <Text style={[styles.job, { color: colors.textSecondary }]}>{job}</Text> : null}
          {canSeeWorkplace && workplace ? (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={14} color={colors.inactive} />
              <Text style={[styles.infoRowText, { color: colors.inactive }]}>{workplace}</Text>
            </View>
          ) : !isMe && workplace && !canSeeWorkplace ? (
            <View style={styles.infoRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.inactive} />
              <Text style={[styles.infoRowText, { color: colors.inactive }]}>직장 비공개</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.inactive} />
            <Text style={[styles.infoRowText, { color: colors.inactive }]}>{region || '지역 미설정'}</Text>
          </View>
        </View>

        {/* 학교 정보 카드 */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoCardTitle, { color: colors.text }]}>학교 정보</Text>
          {!isMe && !canSeeSchools ? (
            <View style={styles.lockedRow}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.inactive} />
              <Text style={{ color: colors.inactive, fontSize: 13, marginLeft: 8 }}>비공개 설정된 학교 정보입니다</Text>
            </View>
          ) : schools.length > 0 ? (
            schools.map((s, i) => (
              <View key={i} style={styles.schoolRow}>
                <View style={[styles.schoolIcon, { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}>
                  <Ionicons name="school-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.schoolInfo}>
                  <Text style={[styles.schoolName, { color: colors.text }]}>{s.schoolName}</Text>
                  <Text style={[styles.schoolDetail, { color: colors.textSecondary }]}>
                    {s.schoolType} · {s.graduationYear}년 졸업
                    {classNumber > 0 && i === 0 ? ` · ${classNumber}반` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.inactive, fontSize: 13 }}>공개된 학교 정보가 없습니다</Text>
          )}
        </View>

        {/* 공통 동창 */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{commonCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>공통 동창</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{schools.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>등록 학교</Text>
            </View>
          </View>
        </View>

        {/* 동창 인증 버튼 */}
        {!isMe && firestoreProfile && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => {
                if (isTrustedByMe) {
                  Alert.alert('인증 취소', '이 동창의 인증을 취소하시겠습니까?', [
                    { text: '아니요', style: 'cancel' },
                    { text: '취소하기', style: 'destructive', onPress: () => toggleTrust() },
                  ]);
                } else {
                  setTrustMessage('');
                  setShowTrustModal(true);
                }
              }}
              disabled={trustLoading}
              style={[
                styles.trustButton,
                isTrustedByMe
                  ? [styles.trustButtonDone, { borderColor: '#4CAF50' }]
                  : { backgroundColor: '#e8313a' },
                trustLoading && { opacity: 0.6 },
              ]}
              activeOpacity={0.8}
            >
              {trustLoading ? (
                <ActivityIndicator size="small" color={isTrustedByMe ? '#4CAF50' : '#fff'} />
              ) : (
                <>
                  <Text style={styles.trustButtonEmoji}>{isTrustedByMe ? '✅' : '👍'}</Text>
                  <Text style={[
                    styles.trustButtonText,
                    { color: isTrustedByMe ? '#4CAF50' : '#fff' },
                  ]}>
                    {isTrustedByMe ? '인증 완료 (취소하기)' : '동창 인증하기'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionSection}>
          {connection?.status === 'accepted' ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: id!,
                    name: displayName,
                    avatar: String(avatarImg),
                    online: '0',
                  },
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>메시지 보내기</Text>
            </TouchableOpacity>
          ) : connection?.status === 'pending' ? (
            <View style={[styles.disabledButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={20} color={colors.inactive} />
              <Text style={[styles.disabledButtonText, { color: colors.inactive }]}>
                {connection.fromUid === user?.uid ? '연결 요청됨' : '수락 대기 중'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleConnect}
              disabled={isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>연결 요청</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {connection?.status !== 'accepted' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: id!,
                    name: displayName,
                    avatar: String(avatarImg),
                    online: '0',
                  },
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>메시지 보내기</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 인증 메시지 모달 */}
      <Modal visible={showTrustModal} transparent animationType="fade" onRequestClose={() => setShowTrustModal(false)}>
        <TouchableOpacity
          style={styles.trustModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTrustModal(false)}
        >
          <View style={[styles.trustModalContent, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.trustModalTitle, { color: colors.text }]}>동창 인증</Text>
            <Text style={[styles.trustModalSub, { color: colors.textSecondary }]}>
              한 줄 인증 메시지를 남겨주세요 (선택)
            </Text>
            <TextInput
              style={[styles.trustModalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="예: 같은 반이었어요!"
              placeholderTextColor={colors.inactive}
              value={trustMessage}
              onChangeText={setTrustMessage}
              maxLength={50}
            />
            <View style={styles.trustModalButtons}>
              <TouchableOpacity
                style={[styles.trustModalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowTrustModal(false)}
              >
                <Text style={[styles.trustModalCancelText, { color: colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trustModalConfirmBtn}
                onPress={() => {
                  setShowTrustModal(false);
                  toggleTrust(trustMessage);
                }}
              >
                <Text style={styles.trustModalConfirmText}>인증하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scrollContent: { paddingBottom: 40 },

  // 프로필
  profileSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  displayName: { fontSize: 24, fontWeight: 'bold' },
  badge: { marginLeft: 6 },
  job: { fontSize: 15, marginTop: 4 },
  regionText: { fontSize: 14, marginTop: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  infoRowText: { fontSize: 14 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },

  // 정보 카드
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  schoolRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  schoolIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  schoolInfo: { flex: 1 },
  schoolName: { fontSize: 15, fontWeight: '600' },
  schoolDetail: { fontSize: 13, marginTop: 2 },

  // 통계
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 13, marginTop: 4 },
  statDivider: { width: 1, height: 40 },

  // 버튼
  actionSection: { paddingHorizontal: 20, gap: 12, marginTop: 8 },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
  disabledButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  disabledButtonText: { fontSize: 16, fontWeight: '600' },

  // 신뢰 뱃지
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginTop: 8,
  },
  trustBadgeIcon: { fontSize: 14 },
  trustBadgeLabel: { fontSize: 12, fontWeight: '700' },

  trustCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  trustCountEmoji: { fontSize: 14 },
  trustCountText: { fontSize: 13 },

  // 인증 버튼
  trustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trustButtonDone: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
  },
  trustButtonEmoji: { fontSize: 18 },
  trustButtonText: { fontSize: 15, fontWeight: '700' },

  // 인증 메시지 모달
  trustModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustModalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  trustModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  trustModalSub: { fontSize: 14, marginBottom: 16 },
  trustModalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  trustModalButtons: { flexDirection: 'row', gap: 10 },
  trustModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  trustModalCancelText: { fontSize: 15, fontWeight: '600' },
  trustModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e8313a',
    alignItems: 'center',
  },
  trustModalConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
