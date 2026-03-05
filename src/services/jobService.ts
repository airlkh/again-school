import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { JobPost, JobType } from '../types/auth';

/** 구인구직 글 작성 */
export async function createJobPost(
  data: Omit<JobPost, 'id' | 'createdAt' | 'status'>,
): Promise<string> {
  const colRef = collection(db, 'jobs');
  const docRef = await addDoc(colRef, {
    ...data,
    status: 'active',
    createdAt: Date.now(),
  });
  return docRef.id;
}

/** 구인구직 글 마감 처리 */
export async function closeJobPost(jobId: string): Promise<void> {
  const docRef = doc(db, 'jobs', jobId);
  await updateDoc(docRef, { status: 'closed' });
}

/** 구인구직 목록 실시간 구독 */
export function subscribeJobs(
  callback: (jobs: JobPost[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'jobs');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const results: JobPost[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as JobPost);
    });
    callback(results);
  });
}
