import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../src/config/firebase';

type NotificationType = 'like' | 'comment' | 'chat' | 'connection';

interface NotificationItem {
  id: string;
  type: NotificationType;
  fromUid: string;
  fromName: string;
  fromPhotoURL?: string | null;
  postId?: string;
  chatRoomId?: string;
  commentText?: string;
  thumbnailUrl?: string;
  read: boolean;
  createdAt: { toDate: () => Date } | { seconds: number; nanoseconds: number } | Date | string | number | null;
}

function toDate(createdAt: NotificationItem['createdAt']): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'number') return new Date(createdAt);
  if (typeof createdAt === 'string') return new Date(createdAt);
  if (createdAt instanceof Date) return createdAt;
  if (typeof (createdAt as any).toDate === 'function') return (createdAt as any).toDate();
  if (typeof (createdAt as any).seconds === 'number') return new Date((createdAt as any).seconds * 1000);
  return null;
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function getActionText(item: NotificationItem): string {
  switch (item.type) {
    case 'like': return '회원님의 게시글을 좋아합니다.';
    case 'comment': return '댓글을 남겼어요.';
    case 'chat': return '메시지를 보냈습니다.';
    case 'connection': return '동창 연결을 요청했습니다.';
    default: return '알림이 있습니다.';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, 'notifications', uid, 'items');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: NotificationItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NotificationItem, 'id'>),
      }));
      setNotifications(items);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const markRead = useCallback(
    async (item: NotificationItem) => {
      if (!uid) return;
      if (!item.read) {
        await updateDoc(doc(db, 'notifications', uid, 'items', item.id), { read: true });
      }
      if ((item.type === 'like' || item.type === 'comment') && item.postId) {
        router.push(`/post/${item.postId}` as any);
      } else if (item.type === 'chat' && item.chatRoomId) {
        router.push(`/chat/${item.chatRoomId}` as any);
      } else if (item.type === 'connection') {
        router.push(`/profile/${item.fromUid}` as any);
      }
    },
    [uid, router],
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const colRef = collection(db, 'notifications', uid, 'items');
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (!d.data().read) batch.update(d.ref, { read: true });
    });
    await batch.commit();
  }, [uid]);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.item, item.read ? styles.itemRead : styles.itemUnread]}
      onPress={() => markRead(item)}
      activeOpacity={0.75}
    >
      {/* 프로필 사진 */}
      <View style={styles.avatarWrap}>
        {item.fromPhotoURL ? (
          <Image source={{ uri: item.fromPhotoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {item.fromName ? item.fromName.charAt(0) : '?'}
            </Text>
          </View>
        )}
        <View style={styles.typeIconBadge}>
          <Text style={styles.typeIconText}>
            {item.type === 'like' ? '❤️' : item.type === 'comment' ? '💬' : item.type === 'chat' ? '✉️' : '👥'}
          </Text>
        </View>
      </View>

      {/* 내용 */}
      <View style={styles.content}>
        <Text style={styles.mainText} numberOfLines={item.type === 'comment' ? 1 : 2}>
          <Text style={styles.nameText}>{item.fromName || '알 수 없음'}</Text>
          {'님이 ' + getActionText(item)}
        </Text>
        {item.type === 'comment' && item.commentText ? (
          <Text style={styles.commentPreview} numberOfLines={1}>"{item.commentText}"</Text>
        ) : null}
        <Text style={styles.time}>{formatTime(toDate(item.createdAt))}</Text>
      </View>

      {/* 썸네일 */}
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : null}

      {/* 미읽음 점 */}
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>모두 읽음</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#FF6B6B" />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>알림이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  markAll: { fontSize: 14, color: '#FF6B6B', fontWeight: '600' },
  loader: { flex: 1 },
  list: { paddingVertical: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginVertical: 3,
    borderRadius: 14,
    gap: 10,
  },
  itemUnread: { backgroundColor: '#FFFFFF' },
  itemRead: { backgroundColor: '#F2F2F2' },
  avatarWrap: { position: 'relative', width: 48, height: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#DDDDDD',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 20, fontWeight: '700', color: '#888' },
  typeIconBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  typeIconText: { fontSize: 13 },
  content: { flex: 1 },
  mainText: { fontSize: 13, color: '#333333', lineHeight: 18 },
  nameText: { fontWeight: '700', color: '#1A1A1A' },
  commentPreview: {
    fontSize: 12, color: '#888888',
    marginTop: 2, fontStyle: 'italic',
  },
  time: { fontSize: 11, color: '#AAAAAA', marginTop: 3 },
  thumbnail: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: '#EEEEEE',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#AAAAAA' },
});
