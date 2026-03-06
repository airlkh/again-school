import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';

interface TrustVote {
  id: string;
  voterUid: string;
  voterName: string;
  voterPhoto: string | null;
  schoolName: string;
  graduationYear: number | null;
  message: string;
  votedAt: Timestamp | number | null;
}

function formatTimeAgo(ts: Timestamp | number | null): string {
  if (!ts) return '';
  const millis = ts instanceof Timestamp ? ts.toMillis() : ts;
  const diff = Date.now() - millis;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function VerificationsScreen() {
  const { uid, schoolName, graduationYear } = useLocalSearchParams<{
    uid: string;
    schoolName: string;
    graduationYear: string;
  }>();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const [voters, setVoters] = useState<TrustVote[]>([]);

  useEffect(() => {
    if (!uid) return;

    // schoolName 필터가 있으면 해당 학교 인증만, 없으면 전체
    const col = collection(db, 'users', uid, 'trustVotes');
    const q = schoolName
      ? query(col, where('schoolName', '==', schoolName), orderBy('votedAt', 'desc'))
      : query(col, orderBy('votedAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      setVoters(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrustVote)),
      );
    });
    return unsub;
  }, [uid, schoolName]);

  const title = schoolName
    ? `${schoolName} 동창 인증`
    : '동창 인증 목록';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* 학교 정보 배너 */}
      {schoolName && (
        <View style={[styles.schoolBanner, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderBottomColor: colors.border }]}>
          <Text style={{ fontSize: 20 }}>🏫</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.schoolBannerName, { color: colors.text }]}>{schoolName}</Text>
            {graduationYear && (
              <Text style={[styles.schoolBannerYear, { color: colors.textSecondary }]}>
                {graduationYear}년 졸업
              </Text>
            )}
          </View>
          <View style={[styles.countChip, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.countChipText, { color: colors.primary }]}>
              인증 {voters.length}명
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={voters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.voterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/profile/${item.voterUid}`)}
          >
            <Image
              source={getAvatarSource(item.voterPhoto)}
              style={[styles.voterAvatar, { backgroundColor: colors.card }]}
            />
            <View style={styles.voterBody}>
              <NameWithBadge
                name={item.voterName}
                uid={item.voterUid}
                nameStyle={[styles.voterName, { color: colors.text }]}
              />
              {item.message ? (
                <Text style={[styles.voterMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                  &ldquo;{item.message}&rdquo;
                </Text>
              ) : null}
              <Text style={[styles.voterTime, { color: colors.inactive }]}>
                {formatTimeAgo(item.votedAt)}
              </Text>
            </View>
            <Text style={styles.checkEmoji}>✅</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 인증한 동창이 없어요</Text>
            <Text style={[styles.emptyText, { color: colors.inactive }]}>
              같은 학교 동창이 프로필에서{'\n'}"동창 인증하기" 버튼을 누르면 여기에 표시됩니다
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

  schoolBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  schoolBannerName: { fontSize: 15, fontWeight: '700' },
  schoolBannerYear: { fontSize: 13, marginTop: 1 },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countChipText: { fontSize: 13, fontWeight: '700' },

  list: { padding: 12 },

  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  voterAvatar: { width: 44, height: 44, borderRadius: 22 },
  voterBody: { flex: 1 },
  voterName: { fontSize: 14, fontWeight: '700' },
  voterMessage: { fontSize: 13, marginTop: 3, fontStyle: 'italic' },
  voterTime: { fontSize: 11, marginTop: 2 },
  checkEmoji: { fontSize: 20 },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
