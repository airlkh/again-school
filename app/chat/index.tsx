import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { subscribeChatRooms, deleteChatRoom, getChatRoomId } from '../../src/services/chatService';
import { ChatRoom } from '../../src/types/auth';
import {
  DUMMY_CHAT_ROOMS,
  DummyChatRoom,
} from '../../src/data/dummyClassmates';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';

// 통합 표시 타입
interface DisplayRoom {
  id: string;
  otherUid: string;
  otherName: string;
  otherAvatarImg: number;
  otherPhotoURL?: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
}

export default function ChatListScreen() {
  const goBack = useGoBack();
  const { user } = useAuth();
  const { profile: myProfile } = useCurrentUser();
  const { colors, isDark } = useTheme();
  const [firestoreRooms, setFirestoreRooms] = useState<ChatRoom[]>([]);
  const [livePhotos, setLivePhotos] = useState<Record<string, string | null>>({});
  const photoSubsRef = useRef<Record<string, () => void>>({});

  // Firestore 채팅방 구독
  useEffect(() => {
    if (!user) return;
    return subscribeChatRooms(user.uid, setFirestoreRooms);
  }, [user]);

  // 상대방 프로필 사진 실시간 구독
  useEffect(() => {
    const otherUids = firestoreRooms
      .map((r) => r.participants.find((p) => p !== user?.uid))
      .filter(Boolean) as string[];

    // 새로운 uid만 구독 추가
    otherUids.forEach((uid) => {
      if (photoSubsRef.current[uid]) return;
      photoSubsRef.current[uid] = onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setLivePhotos((prev) => ({ ...prev, [uid]: snap.data()?.photoURL || null }));
        }
      });
    });

    // 더 이상 없는 uid 구독 해제
    Object.keys(photoSubsRef.current).forEach((uid) => {
      if (!otherUids.includes(uid)) {
        photoSubsRef.current[uid]();
        delete photoSubsRef.current[uid];
      }
    });

    return () => {
      Object.values(photoSubsRef.current).forEach((unsub) => unsub());
      photoSubsRef.current = {};
    };
  }, [firestoreRooms, user?.uid]);

  // Firestore + 더미 합치기
  const firestoreDisplay: DisplayRoom[] = firestoreRooms.map((room) => {
    const otherUid = room.participants.find((p) => p !== user?.uid) ?? '';
    return {
      id: room.id,
      otherUid,
      otherName: room.participantNames?.[otherUid] ?? '알 수 없음',
      otherAvatarImg: room.participantAvatars?.[otherUid] ?? 1,
      otherPhotoURL: livePhotos[otherUid] ?? (room as any).participantPhotos?.[otherUid] ?? null,
      lastMessage: room.lastMessage ?? '',
      lastTime: formatTime(room.lastMessageAt),
      unread: room.unreadCount?.[user?.uid ?? ''] ?? 0,
      online: false,
    };
  });

  const firestoreIds = new Set(firestoreDisplay.map((r) => r.otherUid));
  const dummyDisplay: DisplayRoom[] = DUMMY_CHAT_ROOMS
    .filter((d) => !firestoreIds.has(d.otherUid))
    .map((d) => ({
      id: d.id,
      otherUid: d.otherUid,
      otherName: d.otherName,
      otherAvatarImg: d.otherAvatarImg,
      otherPhotoURL: (d as any).otherPhotoURL ?? null,
      lastMessage: d.lastMessage,
      lastTime: d.lastTime,
      unread: d.unread,
      online: d.online,
    }));

  const blockedUsers: string[] = (myProfile as any)?.blockedUsers ?? [];
  const allRooms = [...firestoreDisplay, ...dummyDisplay].filter((r) => !blockedUsers.includes(r.otherUid));
  const totalUnread = allRooms.reduce((s, r) => s + r.unread, 0);

  function handleDeleteRoom(item: DisplayRoom) {
    Alert.alert('채팅방을 삭제하시겠습니까?', '삭제 후에도 상대방의 채팅은 유지됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user) return;
            const roomId = getChatRoomId(user.uid, item.otherUid);
            await deleteChatRoom(roomId, user.uid);
          } catch (e) {
            Alert.alert('오류', '채팅방 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  function renderItem({ item }: { item: DisplayRoom }) {
    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: {
              id: item.otherUid,
              name: item.otherName,
              avatar: String(item.otherAvatarImg),
              online: item.online ? '1' : '0',
            },
          })
        }
        onLongPress={() => handleDeleteRoom(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <Image
            source={getAvatarSource(item.otherPhotoURL)}
            style={[styles.avatar, { backgroundColor: colors.card }]}
          />
          {item.online && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
        </View>

        <View style={styles.roomBody}>
          <View style={styles.roomTopRow}>
            <NameWithBadge
              name={item.otherName}
              uid={item.otherUid}
              trustCount={0}
              nameStyle={[styles.roomName, { color: colors.text }]}
              numberOfLines={1}
            />
            <Text style={[styles.roomTime, { color: colors.inactive }]}>{item.lastTime}</Text>
          </View>
          <View style={styles.roomBottomRow}>
            <Text
              style={[
                styles.roomMessage,
                { color: colors.textSecondary },
                item.unread > 0 && { color: colors.text, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || '대화를 시작해보세요'}
            </Text>
            {item.unread > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>채팅</Text>
        <View style={styles.backBtn}>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>{totalUnread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 리스트 */}
      <FlatList
        data={allRooms}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>채팅 내역이 없습니다</Text>
            <Text style={[styles.emptySubtext, { color: colors.inactive }]}>동창과 연결하면 채팅을 시작할 수 있어요</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60_000) return '방금 전';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`;
  if (diff < 172800_000) return '어제';
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  headerBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  // 리스트
  list: { paddingBottom: 20 },
  separator: { height: 1, marginLeft: 82 },

  // 카드
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
  },
  roomBody: { flex: 1 },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  roomTime: { fontSize: 12 },
  roomBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomMessage: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // 빈 상태
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 14, marginTop: 6 },
});
