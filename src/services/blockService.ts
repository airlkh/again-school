import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/** 유저 차단 */
export async function blockUser(myUid: string, targetUid: string): Promise<void> {
  const userRef = doc(db, 'users', myUid);
  await updateDoc(userRef, {
    blockedUsers: arrayUnion(targetUid),
  });
}

/** 유저 차단 해제 */
export async function unblockUser(myUid: string, targetUid: string): Promise<void> {
  const userRef = doc(db, 'users', myUid);
  await updateDoc(userRef, {
    blockedUsers: arrayRemove(targetUid),
  });
}

/** 차단 여부 확인 */
export async function isUserBlocked(myUid: string, targetUid: string): Promise<boolean> {
  const userSnap = await getDoc(doc(db, 'users', myUid));
  if (!userSnap.exists()) return false;
  const blockedUsers: string[] = userSnap.data()?.blockedUsers ?? [];
  return blockedUsers.includes(targetUid);
}

/** 내 차단 목록 가져오기 */
export async function getBlockedUsers(myUid: string): Promise<string[]> {
  const userSnap = await getDoc(doc(db, 'users', myUid));
  if (!userSnap.exists()) return [];
  return userSnap.data()?.blockedUsers ?? [];
}
