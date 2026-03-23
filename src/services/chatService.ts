import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  Unsubscribe,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatRoom, ChatMessage } from '../types/auth';
import { sendPushNotification } from './notificationService';
import { saveNotification } from './notificationStoreService';

/** 채팅방 ID 생성 (두 UID를 정렬하여 고유 ID 생성) */
export function getChatRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** 채팅방 생성 또는 기존 방 반환 */
export async function getOrCreateChatRoom(
  myUid: string,
  myName: string,
  myAvatar: number,
  otherUid: string,
  otherName: string,
  otherAvatar: number,
  myPhotoURL?: string | null,
  otherPhotoURL?: string | null,
): Promise<string> {
  const roomId = getChatRoomId(myUid, otherUid);
  const roomRef = doc(db, 'chatRooms', roomId);

  // 이미 존재하는지 확인하지 않고 merge로 안전하게 생성
  await setDoc(
    roomRef,
    {
      participants: [myUid, otherUid].sort(),
      participantNames: { [myUid]: myName, [otherUid]: otherName },
      participantAvatars: { [myUid]: myAvatar, [otherUid]: otherAvatar },
      participantPhotos: { [myUid]: myPhotoURL ?? null, [otherUid]: otherPhotoURL ?? null },
      createdAt: Date.now(),
    },
    { merge: true },
  );

  return roomId;
}

/** 메시지 전송 */
export async function sendMessage(
  roomId: string,
  senderUid: string,
  text: string,
  imageUrl?: string,
  mediaType?: 'image' | 'video',
): Promise<void> {
  const now = Date.now();

  // 메시지 추가
  const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
  await addDoc(messagesRef, {
    senderUid,
    text,
    imageUrl: imageUrl ?? null,
    mediaType: mediaType ?? null,
    createdAt: now,
    read: false,
    readBy: [senderUid],
  });

  // 채팅방 lastMessage 업데이트
  const roomRef = doc(db, 'chatRooms', roomId);
  const roomSnap = await getDocs(
    query(collection(db, 'chatRooms'), where('__name__', '==', roomId)),
  );

  // 상대방 unread 카운트 증가
  let unreadCount: { [uid: string]: number } = {};
  roomSnap.forEach((d) => {
    const data = d.data() as ChatRoom;
    unreadCount = { ...data.unreadCount };
    data.participants.forEach((uid) => {
      if (uid !== senderUid) {
        unreadCount[uid] = (unreadCount[uid] ?? 0) + 1;
      }
    });
  });

  const lastMessage = imageUrl
    ? mediaType === 'video' ? '동영상을 보냈습니다' : '사진을 보냈습니다'
    : text;

  await updateDoc(roomRef, {
    lastMessage,
    lastMessageAt: now,
    lastSenderUid: senderUid,
    unreadCount,
  });

  // 채팅 알림 발송
  try {
    const senderSnap = await getDoc(doc(db, 'users', senderUid));
    const senderName = senderSnap.data()?.displayName || '알 수 없음';

    roomSnap.forEach((d) => {
      const data = d.data() as ChatRoom;
      data.participants.forEach((uid) => {
        if (uid !== senderUid) {
          sendPushNotification(uid, senderName, lastMessage, {
            chatRoomId: roomId,
            otherUid: senderUid,
            otherName: senderName,
          });
          saveNotification(uid, { type: 'chat', fromUid: senderUid, fromName: senderName, chatRoomId: roomId });
        }
      });
    });
  } catch (e) {
    console.warn('[chatService] 채팅 알림 실패:', e);
  }
}

/** 메시지 실시간 구독 */
export function subscribeMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
    });
    callback(messages);
  }, (error) => {
    console.warn('[chatService] subscribeMessages 오류:', error);
  });
}

/** 내 채팅방 목록 실시간 구독 */
export function subscribeChatRooms(
  myUid: string,
  callback: (rooms: ChatRoom[]) => void,
): Unsubscribe {
  const roomsRef = collection(db, 'chatRooms');
  const q = query(
    roomsRef,
    where('participants', 'array-contains', myUid),
  );

  return onSnapshot(q, (snapshot) => {
    const rooms: ChatRoom[] = [];
    snapshot.forEach((docSnap) => {
      rooms.push({ id: docSnap.id, ...docSnap.data() } as ChatRoom);
    });
    // 최신 메시지 순 정렬
    rooms.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
    callback(rooms);
  }, (error) => {
    console.warn('[chatService] subscribeChatRooms 오류:', error);
  });
}

/** 읽음 처리 (해당 방의 내 unread를 0으로) */
export async function markAsRead(
  roomId: string,
  myUid: string,
): Promise<void> {
  try {
    // 1. unreadCount 즉시 0으로 업데이트
    const roomRef = doc(db, 'chatRooms', roomId);
    await updateDoc(roomRef, {
      [`unreadCount.${myUid}`]: 0,
    });

    // 2. 안 읽은 메시지를 read: true로 업데이트 (senderUid != myUid)
    const messagesRef = collection(db, 'chatRooms', roomId, 'messages');
    const snapshot = await getDocs(query(messagesRef, where('read', '==', false)));

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // 내가 보낸 메시지는 스킵
      if (data.senderUid === myUid) return;
      batch.update(docSnap.ref, { read: true, readBy: arrayUnion(myUid) });
    });
    await batch.commit();
  } catch (e) {
    console.warn('[chatService] markAsRead 실패:', e);
  }
}

/** 전체 안 읽은 메시지 수 계산 */
export function getTotalUnread(rooms: ChatRoom[], myUid: string): number {
  return rooms.reduce((sum, room) => sum + (room.unreadCount?.[myUid] ?? 0), 0);
}
