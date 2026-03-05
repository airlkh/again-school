import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useBookmark(postId: string) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid || !postId) return;
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', postId);
    const unsub = onSnapshot(bookmarkRef, (snap) => {
      setBookmarked(snap.exists());
    });
    return unsub;
  }, [user?.uid, postId]);

  async function toggleBookmark() {
    if (!user?.uid || loading) return;
    setLoading(true);
    try {
      const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', postId);
      if (bookmarked) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          postId,
          savedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('북마크 오류:', err);
    } finally {
      setLoading(false);
    }
  }

  return { bookmarked, toggleBookmark, loading };
}
