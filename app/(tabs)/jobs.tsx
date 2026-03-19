import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { subscribeJobs } from '../../src/services/jobService';
import { JobPost, JobType } from '../../src/types/auth';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';

type FilterType = '전체' | '구인' | '구직';

export default function JobsScreen() {
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<FilterType>('전체');
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = subscribeJobs((list) => setJobs(list));
    return unsub;
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filtered = filter === '전체'
    ? jobs
    : jobs.filter((j) => j.type === filter);

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  function renderJob({ item }: { item: JobPost }) {
    const isClosed = item.status === 'closed';

    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.jobTypeBadge,
            { backgroundColor: item.type === '구인' ? '#3b82f6' : '#22c55e' },
            isClosed && { backgroundColor: colors.inactive },
          ]}>
            <Text style={styles.jobTypeBadgeText}>
              {isClosed ? '마감' : item.type}
            </Text>
          </View>
          <Text style={[styles.jobTime, { color: colors.inactive }]}>{timeAgo(item.createdAt)}</Text>
        </View>

        <Text style={[styles.jobTitle, { color: colors.text }, isClosed && { color: colors.inactive }]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.jobMeta}>
          <View style={styles.jobMetaRow}>
            <Ionicons name={item.type === '구인' ? 'business-outline' : 'briefcase-outline'} size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>{item.company}</Text>
          </View>
          <View style={styles.jobMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>{item.location}</Text>
          </View>
          {item.salary && (
            <View style={styles.jobMetaRow}>
              <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>{item.salary}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() => router.push(`/profile/${item.authorUid}`)}
          >
            <Image
              source={getAvatarSource(item.authorPhotoURL)}
              style={[styles.authorAvatar, { backgroundColor: colors.card }]}
            />
            <NameWithBadge name={item.authorName} uid={item.authorUid} nameStyle={[styles.authorName, { color: colors.text }]} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.filterRow}>
        {(['전체', '구인', '구직'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary },
              filter === f && styles.filterTextActive,
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 구인구직이 없습니다</Text>
          <Text style={[styles.emptySubtext, { color: colors.inactive }]}>
            동창 네트워크에서 기회를 찾아보세요
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/jobs/create')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>글 작성하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderJob}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={['#FF3124']}
            />
          }
        />
      )}

      {/* FAB */}
      {filtered.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/jobs/create')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 14 },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 80 },

  jobCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  jobTypeBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  jobTime: { fontSize: 12 },
  jobTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, lineHeight: 24 },

  jobMeta: { gap: 6, marginBottom: 12 },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobMetaText: { fontSize: 13 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 28, height: 28, borderRadius: 14 },
  authorName: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, marginBottom: 24 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
