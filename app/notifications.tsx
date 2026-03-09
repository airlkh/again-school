import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoBack } from '../src/hooks/useGoBack';
import { useAuth } from '../src/contexts/AuthContext';
import {
  DUMMY_NOTIFICATIONS,
  NotificationItem,
} from '../src/data/dummyClassmates';
import { getAvatarSource } from '../src/utils/avatar';

interface FirestoreNotification {
  id: string;
  type: 'join' | 'connect_accepted' | 'connect_request' | 'meetup' | 'like' | 'comment';
  title: string;
  body: string;
  avatarImg: number;
  targetUid: string;
  recipientUid: string;
  read: boolean;
  createdAt: number;
}

export default function NotificationsScreen() {
  const goBack = useGoBack();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [fsNotifications, setFsNotifications] = useState<FirestoreNotification[]>([]);
  const [dummyNotifications, setDummyNotifications] = useState(DUMMY_NOTIFICATIONS);

  // Firestore 알림 실시간 구독
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'notifications');
    const q = query(
      colRef,
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const results: FirestoreNotification[] = [];
      snapshot.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() } as FirestoreNotification);
      });
      setFsNotifications(results);
    }, (error) => {
      console.warn('[Notifications] onSnapshot 오류:', error);
    });
    return unsub;
  }, [user]);

  // Unified notification list
  type UnifiedNotification = {
    id: string;
    type: string;
    title: string;
    body: string;
    avatarImg: number;
    targetUid: string;
    read: boolean;
    time: string;
    isFirestore: boolean;
  };

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '어제';
    return `${days}일 전`;
  }

  const allNotifications: UnifiedNotification[] = [
    ...fsNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      avatarImg: n.avatarImg,
      targetUid: n.targetUid,
      read: n.read,
      time: timeAgo(n.createdAt),
      isFirestore: true,
    })),
    ...dummyNotifications.map((n) => ({
      ...n,
      isFirestore: false,
    })),
  ];

  function getIcon(type: string) {
    switch (type) {
      case 'join': return 'person-add';
      case 'connect_accepted': return 'checkmark-circle';
      case 'connect_request': return 'link';
      case 'meetup': return 'calendar';
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      default: return 'notifications';
    }
  }

  function getIconColor(type: string) {
    switch (type) {
      case 'join': return '#3b82f6';
      case 'connect_accepted': return '#22c55e';
      case 'connect_request': return colors.primary;
      case 'meetup': return '#f59e0b';
      case 'like': return colors.primary;
      case 'comment': return '#8b5cf6';
      default: return colors.inactive;
    }
  }

  async function handlePress(item: UnifiedNotification) {
    if (item.isFirestore) {
      const docRef = doc(db, 'notifications', item.id);
      await updateDoc(docRef, { read: true }).catch(() => {});
    } else {
      setDummyNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      );
    }
    router.push(`/profile/${item.targetUid}`);
  }

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  function renderItem({ item }: { item: UnifiedNotification }) {
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <Image
            source={getAvatarSource(null)}
            style={[styles.avatar, { backgroundColor: colors.card }]}
          />
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: getIconColor(item.type), borderColor: colors.background },
            ]}
          >
            <Ionicons name={getIcon(item.type) as any} size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.title, { color: colors.textSecondary }, !item.read && { fontWeight: '700', color: colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.body, { color: colors.text }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.time, { color: colors.inactive }]}>{item.time}</Text>
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.backBtn}>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={allNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>알림이 없습니다</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  list: { paddingBottom: 20 },
  separator: { height: 1, marginLeft: 76 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cardBody: { flex: 1 },
  title: { fontSize: 14, marginBottom: 2 },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyText: { fontSize: 16, marginTop: 12 },
});
