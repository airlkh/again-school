import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreStory {
  id: string;
  uid: string;
  name: string;
  avatarImg: number;
  photoURL?: string | null;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  viewers: string[];
  createdAt: number;
  expiresAt: number; // 24시간 후 자동 만료
}

/** 스토리 업로드 */
export async function createStory(
  data: Omit<FirestoreStory, 'id' | 'createdAt' | 'expiresAt' | 'viewers'>,
): Promise<string> {
  const colRef = collection(db, 'stories');
  const now = Date.now();
  const docRef = await addDoc(colRef, {
    ...data,
    viewers: [],
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24h
  });
  return docRef.id;
}

/** 스토리 조회 기록 */
export async function markStoryViewed(storyId: string, uid: string): Promise<void> {
  const docRef = doc(db, 'stories', storyId);
  await updateDoc(docRef, { viewers: arrayUnion(uid) });
}

/** 스토리 삭제 */
export async function deleteStory(storyId: string): Promise<void> {
  const docRef = doc(db, 'stories', storyId);
  await deleteDoc(docRef);
}

/** 활성 스토리 실시간 구독 (24시간 이내) */
export function subscribeStories(
  callback: (stories: FirestoreStory[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'stories');
  const q = query(
    colRef,
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const results: FirestoreStory[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as FirestoreStory);
    });
    // 최신순 정렬
    results.sort((a, b) => b.createdAt - a.createdAt);
    callback(results);
  });
}

/** 특정 사용자의 스토리 구독 */
export function subscribeUserStories(
  uid: string,
  callback: (stories: FirestoreStory[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'stories');
  const q = query(
    colRef,
    where('uid', '==', uid),
    where('expiresAt', '>', Date.now()),
  );

  return onSnapshot(q, (snapshot) => {
    const results: FirestoreStory[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as FirestoreStory);
    });
    results.sort((a, b) => a.createdAt - b.createdAt);
    callback(results);
  });
}
