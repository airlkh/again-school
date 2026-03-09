import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useAuth } from '../../src/contexts/AuthContext';
import { closeJobPost } from '../../src/services/jobService';
import { JobPost, UserProfile } from '../../src/types/auth';
import { getAvatarSource } from '../../src/utils/avatar';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<JobPost | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, 'jobs', id);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as JobPost);
      }
    }, (error) => {
      console.warn('[JobDetail] onSnapshot 오류:', error);
    });
    return unsub;
  }, [id]);

  // 작성자 프로필 조회
  useEffect(() => {
    if (!job?.authorUid) return;
    getDoc(doc(db, 'users', job.authorUid)).then((snap) => {
      if (snap.exists()) {
        setAuthorProfile(snap.data() as UserProfile);
      }
    });
  }, [job?.authorUid]);

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>글을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAuthor = user?.uid === job.authorUid;
  const isClosed = job.status === 'closed';
  const dateStr = new Date(job.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const realAuthorName = authorProfile?.displayName || job.authorName || '사용자';
  const realAuthorPhoto = authorProfile?.photoURL || job.authorPhotoURL;
  const realSchoolName = authorProfile?.schools?.[0]
    ? `${authorProfile.schools[0].schoolName} · ${authorProfile.schools[0].graduationYear}년 졸업`
    : job.schoolName || '';

  function handleClose() {
    Alert.alert('마감 확인', '이 글을 마감하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '마감',
        style: 'destructive',
        onPress: async () => {
          try {
            await closeJobPost(job!.id);
          } catch {
            Alert.alert('오류', '마감 처리에 실패했습니다.');
          }
        },
      },
    ]);
  }

  function handleContact() {
    const c = job!.contact;
    if (c.includes('@')) {
      Linking.openURL(`mailto:${c}`);
    } else if (/\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/.test(c)) {
      Linking.openURL(`tel:${c.replace(/[-\s]/g, '')}`);
    } else {
      Alert.alert('연락처', c);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{job.type} 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* 마감 배너 - 상단에 표시 */}
        {isClosed && (
          <View style={[styles.closedBanner, { backgroundColor: isDark ? '#3f3f46' : '#fef2f2' }]}>
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text style={[styles.closedBannerText, { color: colors.primary }]}>마감된 글입니다</Text>
          </View>
        )}

        <View style={styles.body}>
          {/* 유형 + 상태 배지 */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: job.type === '구인' ? '#3b82f6' : '#22c55e' }]}>
              <Ionicons name={job.type === '구인' ? 'business' : 'person'} size={12} color="#fff" />
              <Text style={styles.typeBadgeText}>{job.type}</Text>
            </View>
            {isClosed && (
              <View style={[styles.typeBadge, { backgroundColor: colors.inactive }]}>
                <Text style={styles.typeBadgeText}>마감</Text>
              </View>
            )}
          </View>

          {/* 제목 */}
          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>

          {/* 정보 카드 */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name={job.type === '구인' ? 'business-outline' : 'briefcase-outline'} size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {job.type === '구인' ? '회사' : '희망 직종'}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{job.company}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>지역</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{job.location}</Text>
              </View>
            </View>

            {job.salary && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>급여</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{job.salary}</Text>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>등록일</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{dateStr}</Text>
              </View>
            </View>
          </View>

          {/* 상세 설명 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>상세 내용</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {job.description || '내용 없음'}
          </Text>

          {/* 연락처 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>연락처</Text>
          <Text style={[styles.contactText, { color: colors.text }]}>{job.contact}</Text>

          {/* 작성자 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>작성자</Text>
          <TouchableOpacity
            style={[styles.authorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/profile/${job.authorUid}`)}
          >
            <Image
              source={getAvatarSource(realAuthorPhoto)}
              style={[styles.authorAvatar, { backgroundColor: colors.card }]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text }]}>{realAuthorName}</Text>
              {realSchoolName ? (
                <Text style={[styles.authorSchool, { color: colors.textSecondary }]}>{realSchoolName}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 하단 버튼 - SafeArea 적용 */}
      <View style={[
        styles.bottomBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}>
        {isClosed ? (
          <View style={styles.closedBottomBanner}>
            <Text style={{ fontSize: 18 }}>🚫</Text>
            <Text style={styles.closedBottomBannerText}>마감된 글입니다</Text>
          </View>
        ) : isAuthor ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 }]}
            onPress={handleClose}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>마감하기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleContact}
          >
            <Ionicons name="call-outline" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>연락하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

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
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  closedBannerText: { fontSize: 15, fontWeight: '700' },
  body: { padding: 20 },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },

  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24, marginBottom: 24, minHeight: 60 },
  contactText: { fontSize: 15, lineHeight: 22, marginBottom: 24 },

  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  authorAvatar: { width: 44, height: 44, borderRadius: 22 },
  authorName: { fontSize: 15, fontWeight: '700', marginLeft: 12 },
  authorSchool: { fontSize: 13, marginLeft: 12, marginTop: 2 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  actionBtn: {
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },

  closedBottomBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closedBottomBannerText: {
    color: '#e8313a',
    fontWeight: '700',
    fontSize: 16,
  },
});
