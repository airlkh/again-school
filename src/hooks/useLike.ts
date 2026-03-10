import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, collection, getDocs } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendPushNotification } from '../services/notificationService';

/**
 * 더미 ID인지 판별 (Firestore에 없는 로컬 데이터)
 */
function isDummyId(postId: string): boolean {
  return !postId || postId.startsWith('post-') || postId.startsWith('dummy');
}

/**
 * useLike - 좋아요 훅
 * - 더미 게시물: Firestore 구독 안 함, 좋아요 시 Alert
 * - Firestore 게시물: onSnapshot 실시간 구독, likedBy 배열 기반
 */
export function useLike(postId: string) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDummyId(postId)) return;

    const docRef = doc(db, 'posts', postId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const likedBy: string[] = data.likedBy ?? [];
        setCount(likedBy.length);
        setLiked(user ? likedBy.includes(user.uid) : false);
      }
    }, () => {
      // 구독 에러 무시
    });

    return unsub;
  }, [postId, user?.uid]);

  const toggleLike = useCallback(async () => {
    if (loading || !user) return;

    // 더미 게시물은 좋아요 불가
    if (isDummyId(postId)) {
      Alert.alert('알림', '테스트 게시물에는 좋아요를 누를 수 없습니다.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'posts', postId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        Alert.alert('알림', '게시물이 존재하지 않습니다.');
        return;
      }

      if (liked) {
        await updateDoc(docRef, { likedBy: arrayRemove(user.uid) });
      } else {
        await updateDoc(docRef, { likedBy: arrayUnion(user.uid) });
        // 좋아요 푸시 알림 (본인 게시물 제외)
        const postData = snap.data();
        const authorUid = postData?.authorUid;
        if (authorUid && authorUid !== user.uid) {
          const senderName = user.displayName || '사용자';
          sendPushNotification(
            authorUid,
            `${senderName}님이 좋아요를 눌렀어요`,
            '회원님의 게시물을 좋아합니다',
            { type: 'like', postId },
          ).catch(() => {});
        }
      }
    } catch {
      // onSnapshot이 상태를 복원함
    } finally {
      setLoading(false);
    }
  }, [postId, user, liked, loading]);

  return { liked, count, toggleLike, loading };
}

/**
 * fixMissingLikes - likedBy 배열이 없는 기존 게시물 마이그레이션
 */
export async function fixMissingLikes(): Promise<number> {
  const postsRef = collection(db, 'posts');
  const snapshot = await getDocs(postsRef);
  const batch = writeBatch(db);
  let fixedCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!Array.isArray(data.likedBy)) {
      batch.update(docSnap.ref, { likedBy: [] });
      fixedCount++;
    }
  });

  if (fixedCount > 0) {
    await batch.commit();
  }
  return fixedCount;
}
