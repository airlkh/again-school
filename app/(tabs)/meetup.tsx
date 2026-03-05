import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useTheme } from '../../src/contexts/ThemeContext';
import { subscribeMeetups } from '../../src/services/meetupService';
import { Meetup, MeetupStatus } from '../../src/types/auth';
import { DUMMY_MEETUPS } from '../../src/data/dummyClassmates';
import { getAvatarSource } from '../../src/utils/avatar';

type TabKey = 'recruiting' | 'confirmed' | 'past';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'recruiting', label: '모집중' },
  { key: 'confirmed', label: '확정' },
  { key: 'past', label: '지난모임' },
];

export default function MeetupScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('recruiting');
  const [firestoreMeetups, setFirestoreMeetups] = useState<Meetup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    return subscribeMeetups(setFirestoreMeetups);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const fsIds = new Set(firestoreMeetups.map((m) => m.id));
  const allMeetups = [
    ...firestoreMeetups,
    ...DUMMY_MEETUPS.filter((d) => !fsIds.has(d.id)),
  ];
  const filtered = allMeetups.filter((m) => m.status === activeTab);

  function badgeStyle(status: MeetupStatus) {
    if (status === 'recruiting') return { bg: colors.primary, label: '모집중' };
    if (status === 'confirmed') return { bg: '#22c55e', label: '확정' };
    return { bg: colors.inactive, label: '종료' };
  }

  function renderItem({ item }: { item: Meetup }) {
    const b = badgeStyle(item.status);
    const [, m, d] = item.date.split('-');
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, shadowColor: isDark ? '#000' : '#000' }]}
        onPress={() => router.push(`/meetup/${item.id}`)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.imageUrl }} style={[styles.cardImage, { backgroundColor: colors.card }]} />
        <View style={[styles.badge, { backgroundColor: b.bg }]}>
          <Text style={styles.badgeText}>{b.label}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.school, { color: colors.primary }]}>{item.schoolName}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textSecondary }]}>{Number(m)}월 {Number(d)}일 {item.time}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.avatars}>
              {item.attendees.slice(0, 4).map((a, i) => (
                <Image
                  key={a.uid}
                  source={getAvatarSource(a.photoURL)}
                  style={[styles.ava, { marginLeft: i > 0 ? -8 : 0, borderColor: colors.surface, backgroundColor: colors.card }]}
                />
              ))}
              <Text style={[styles.count, { color: colors.textSecondary }]}>{item.attendees.length}/{item.maxAttendees}명</Text>
            </View>
            <Text style={[styles.fee, { color: colors.primary }]}>
              {item.fee > 0 ? `${item.fee.toLocaleString()}원` : '무료'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>동창 모임</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/meetup/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const cnt = allMeetups.filter((m) => m.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, { color: colors.inactive }, active && { color: colors.primary }]}>
                {tab.label}
              </Text>
              {cnt > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.card }, active && { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.inactive }, active && { color: colors.primary }]}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={['#e8313a']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'recruiting' ? '모집 중인 모임이 없습니다' : activeTab === 'confirmed' ? '확정된 모임이 없습니다' : '지난 모임이 없습니다'}
            </Text>
            {activeTab === 'recruiting' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/meetup/create')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>모임 만들기</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  createBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: Colors.inactive },
  tabTextActive: { color: Colors.primary },
  tabBadge: { backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#fef2f2' },
  tabBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.inactive },
  tabBadgeTextActive: { color: Colors.primary },
  list: { padding: 16, gap: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: '100%', height: 140, backgroundColor: Colors.card },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 16 },
  school: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rowText: { fontSize: 13, color: Colors.textSecondary },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  ava: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff', backgroundColor: Colors.card },
  count: { fontSize: 13, color: Colors.textSecondary, marginLeft: 8, fontWeight: '500' },
  fee: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, gap: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
