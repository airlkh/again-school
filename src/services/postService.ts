import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  increment,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface PostMusic {
  name: string;
  url: string;
  volume: number;
}

export type PostVisibility = 'public' | 'school' | 'grade' | 'connections' | 'private';

export interface VisibilitySchool {
  schoolId: string;
  schoolName: string;
  schoolType: string;
  graduationYear: string;
  level: 'school' | 'grade';
}

export interface FirestorePost {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatarImg: number;
  authorPhotoURL?: string | null;
  imageUrl: string;
  mediaType: 'image' | 'video';
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaItems?: string[];
  textOverlays?: TextOverlay[];
  music?: PostMusic;
  caption: string;
  yearTag?: number;
  memoryTag?: string;
  schoolName?: string;
  visibility?: PostVisibility;
  visibilitySchools?: VisibilitySchool[];
  likes: number;
  likedBy: string[];
  commentCount: number;
  createdAt: number;
}

export interface FirestoreComment {
  id: string;
  uid: string;
  name: string;
  avatarImg: number;
  photoURL?: string | null;
  text: string;
  createdAt: number;
}

/** 게시물 생성 */
export async function createPost(
  data: Omit<FirestorePost, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'commentCount'>,
): Promise<string> {
  const colRef = collection(db, 'posts');
  // undefined 필드를 제거 (Firestore는 undefined 값을 지원하지 않음)
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );
  const docRef = await addDoc(colRef, {
    ...cleanData,
    visibility: data.visibility ?? 'public',
    visibilitySchools: data.visibilitySchools ?? [],
    likes: 0,
    likedBy: [],
    commentCount: 0,
    createdAt: Date.now(),
  });
  return docRef.id;
}

/** 게시물 수정 */
export async function updatePost(
  postId: string,
  data: Partial<Pick<FirestorePost, 'caption' | 'yearTag' | 'memoryTag' | 'textOverlays' | 'music'>>,
): Promise<void> {
  const docRef = doc(db, 'posts', postId);
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );
  await updateDoc(docRef, cleanData);
}

/** 게시물 삭제 */
export async function deletePost(postId: string): Promise<void> {
  const docRef = doc(db, 'posts', postId);
  await deleteDoc(docRef);
}

/** 게시물 목록 실시간 구독 */
export function subscribePosts(
  callback: (posts: FirestorePost[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'posts');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const results: FirestorePost[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as FirestorePost);
    });
    callback(results);
  }, (error) => {
    console.warn('[postService] subscribePosts 오류:', error);
  });
}

/** 좋아요 토글 */
export async function togglePostLike(
  postId: string,
  uid: string,
  isLiked: boolean,
): Promise<void> {
  const docRef = doc(db, 'posts', postId);
  if (isLiked) {
    await updateDoc(docRef, {
      likes: increment(-1),
      likedBy: arrayRemove(uid),
    });
  } else {
    await updateDoc(docRef, {
      likes: increment(1),
      likedBy: arrayUnion(uid),
    });
  }
}

/** 댓글 추가 */
export async function addComment(
  postId: string,
  comment: Omit<FirestoreComment, 'id' | 'createdAt'>,
): Promise<string> {
  const commentsRef = collection(db, 'posts', postId, 'comments');
  const docRef = await addDoc(commentsRef, {
    ...comment,
    createdAt: Date.now(),
  });

  // 게시물의 commentCount 증가
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, { commentCount: increment(1) });

  return docRef.id;
}

/** 댓글 실시간 구독 */
export function subscribeComments(
  postId: string,
  callback: (comments: FirestoreComment[]) => void,
): Unsubscribe {
  const commentsRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const results: FirestoreComment[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as FirestoreComment);
    });
    callback(results);
  }, (error) => {
    console.warn('[postService] subscribeComments 오류:', error);
  });
}

/** 게시물 단건 실시간 구독 */
export function subscribePost(
  postId: string,
  callback: (post: FirestorePost | null) => void,
): Unsubscribe {
  const docRef = doc(db, 'posts', postId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as FirestorePost);
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn('[postService] subscribePost 오류:', error);
  });
}

export function subscribeUserPosts(
  uid: string,
  callback: (posts: FirestorePost[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'posts');
  const q = query(colRef, where('authorUid', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const results: FirestorePost[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as FirestorePost);
    });
    callback(results);
  }, (error) => {
    console.warn('[postService] subscribeUserPosts 오류:', error);
  });
}
