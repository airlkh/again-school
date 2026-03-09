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
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { getAvatarSource } from '../../src/utils/avatar';

interface TrustVote {
  id: string;
  voterUid: string;
  voterName: string;
  voterPhoto: string | null;
  schoolName: string;
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

export default function TrustVotersPage() {
  const { id: targetUid } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const [voters, setVoters] = useState<TrustVote[]>([]);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(
      collection(db, 'users', targetUid, 'trustVotes'),
      orderBy('votedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setVoters(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrustVote)),
      );
    }, (error) => {
      console.warn('[TrustVoters] onSnapshot 오류:', error);
    });
    return unsub;
  }, [targetUid]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>동창 인증 목록</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={voters}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={[styles.countHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.countText, { color: colors.text }]}>
              동창 인증 {voters.length}명
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.voterRow, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/profile/${item.voterUid}`)}
          >
            <Image
              source={getAvatarSource(item.voterPhoto)}
              style={[styles.voterAvatar, { backgroundColor: colors.card }]}
            />
            <View style={styles.voterBody}>
              <View style={styles.voterNameRow}>
                <Text style={[styles.voterName, { color: colors.text }]}>{item.voterName}</Text>
                <View style={[styles.schoolChip, { backgroundColor: isDark ? '#1a2533' : '#e3f2fd' }]}>
                  <Text style={styles.schoolChipText}>{item.schoolName}</Text>
                </View>
              </View>
              {item.message ? (
                <Text style={[styles.voterMessage, { color: colors.textSecondary }]}>
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
            <Text style={[styles.emptyText, { color: colors.inactive }]}>
              아직 인증한 동창이 없어요{'\n'}같은 학교 동창에게 인증을 요청해보세요!
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

  countHeader: {
    padding: 16,
    borderBottomWidth: 0.5,
  },
  countText: { fontSize: 16, fontWeight: '700' },

  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  voterAvatar: { width: 44, height: 44, borderRadius: 22 },
  voterBody: { flex: 1 },
  voterNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voterName: { fontSize: 14, fontWeight: '700' },
  schoolChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  schoolChipText: { fontSize: 11, color: '#2196F3', fontWeight: '600' },
  voterMessage: { fontSize: 13, marginTop: 3 },
  voterTime: { fontSize: 11, marginTop: 2 },
  checkEmoji: { fontSize: 20 },

  emptyWrap: { alignItems: 'center', padding: 40, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
