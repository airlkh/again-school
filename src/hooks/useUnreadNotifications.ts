import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useUnreadNotifications(uid: string | undefined): number {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, 'notifications', uid, 'items');
    const q = query(colRef, where('read', '==', false));

    return onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.warn('[useUnreadNotifications] 오류:', error);
    });
  }, [uid]);

  return unreadCount;
}
