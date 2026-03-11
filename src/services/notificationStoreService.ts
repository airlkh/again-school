import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface NotificationItem {
  type: 'like' | 'comment' | 'chat' | 'connection';
  fromUid: string;
  fromName: string;
  postId?: string;
  chatRoomId?: string;
  profileUid?: string;
  read: boolean;
  createdAt: number;
}

/** Firestore notifications/{toUid}/items 에 알림 저장 */
export async function saveNotification(
  toUid: string,
  data: {
    type: 'like' | 'comment' | 'chat' | 'connection';
    fromUid: string;
    fromName: string;
    postId?: string;
    chatRoomId?: string;
    profileUid?: string;
  },
): Promise<void> {
  try {
    const colRef = collection(db, 'notifications', toUid, 'items');
    await addDoc(colRef, {
      ...data,
      read: false,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('[notificationStore] 알림 저장 실패:', e);
  }
}
