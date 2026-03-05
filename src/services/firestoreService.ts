import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  or,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, SchoolEntry, ConnectionRequest } from '../types/auth';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function checkOnboardingCompleted(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  return profile?.onboardingCompleted ?? false;
}

export async function saveUserProfile(
  uid: string,
  data: {
    displayName: string;
    photoURL: string | null;
    schools: SchoolEntry[];
    region: { sido: string; sigungu: string };
  },
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const now = Date.now();

  const searchKeywords = generateSearchKeywords(data.displayName, data.schools);

  const profile = {
    uid,
    displayName: data.displayName,
    photoURL: data.photoURL,
    schools: data.schools,
    region: data.region,
    onboardingCompleted: true,
    searchKeywords,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, profile, { merge: true });
}

export async function countClassmates(schools: SchoolEntry[]): Promise<number> {
  if (schools.length === 0) return 0;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('onboardingCompleted', '==', true));
  const snapshot = await getDocs(q);

  const seenUids = new Set<string>();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as UserProfile;
    const hasMatch = data.schools?.some((s) =>
      schools.some(
        (mine) =>
          s.schoolName === mine.schoolName &&
          s.graduationYear === mine.graduationYear,
      ),
    );
    if (hasMatch) {
      seenUids.add(docSnap.id);
    }
  });

  return seenUids.size;
}

/** 검색 키워드 생성 (이름, 학교명의 부분 문자열) */
function generateSearchKeywords(name?: string, schools?: SchoolEntry[]): string[] {
  const keywords = new Set<string>();
  if (name) {
    const lower = name.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      for (let j = i + 1; j <= lower.length; j++) {
        keywords.add(lower.slice(i, j));
      }
    }
  }
  if (schools) {
    for (const s of schools) {
      const lower = s.schoolName.toLowerCase();
      for (let i = 0; i < lower.length; i++) {
        for (let j = i + 1; j <= lower.length; j++) {
          keywords.add(lower.slice(i, j));
        }
      }
    }
  }
  return Array.from(keywords);
}

/** 사용자 프로필 부분 업데이트 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'schools' | 'region' | 'workplace' | 'privacySettings'>> & { job?: string },
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const updateData: Record<string, any> = { ...data, updatedAt: Date.now() };

  // 이름이나 학교 변경 시 searchKeywords + schoolNames 갱신
  if (data.displayName || data.schools) {
    const current = await getDoc(docRef);
    const existing = current.exists() ? current.data() as UserProfile : null;
    const schools = data.schools || existing?.schools || [];
    updateData.searchKeywords = generateSearchKeywords(
      data.displayName || existing?.displayName,
      schools,
    );
    if (data.schools) {
      updateData.schoolNames = schools.map((s) => s.schoolName);
    }
  }

  await updateDoc(docRef, updateData);
}

/** 사용자 프로필 실시간 구독 */
export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): Unsubscribe {
  const docRef = doc(db, 'users', uid);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  });
}

/** 같은 학교 동창 실시간 구독 (현재 유저 제외) */
export function subscribeClassmates(
  myUid: string,
  schools: SchoolEntry[],
  callback: (classmates: UserProfile[]) => void,
): Unsubscribe {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('onboardingCompleted', '==', true));

  return onSnapshot(q, (snapshot) => {
    const results: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.id === myUid) return;
      const data = docSnap.data() as UserProfile;
      const hasMatch = data.schools?.some((s) =>
        schools.some(
          (mine) =>
            s.schoolName === mine.schoolName &&
            s.graduationYear === mine.graduationYear,
        ),
      );
      if (hasMatch) {
        results.push(data);
      }
    });
    callback(results);
  });
}

/** 학교/졸업연도 기반 동창 검색 (전체 조회 후 클라이언트 필터) */
export async function searchClassmates(
  myUid: string,
  filters: {
    keyword?: string;
    schoolName?: string;
    graduationYear?: number;
    region?: string;
  },
): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('onboardingCompleted', '==', true));
  const snapshot = await getDocs(q);

  const results: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as UserProfile;

    // 키워드 필터 (이름 / 학교명 / 졸업연도)
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const nameMatch = data.displayName?.toLowerCase().includes(kw);
      const schoolMatch = data.schools?.some((s) =>
        s.schoolName.toLowerCase().includes(kw),
      );
      const yearMatch = data.schools?.some((s) =>
        String(s.graduationYear).includes(kw),
      );
      if (!nameMatch && !schoolMatch && !yearMatch) return;
    }

    // 학교명 필터
    if (filters.schoolName) {
      const match = data.schools?.some(
        (s) => s.schoolName === filters.schoolName,
      );
      if (!match) return;
    }

    // 졸업연도 필터
    if (filters.graduationYear) {
      const match = data.schools?.some(
        (s) => s.graduationYear === filters.graduationYear,
      );
      if (!match) return;
    }

    // 지역 필터
    if (filters.region) {
      const regionStr = `${data.region?.sido ?? ''} ${data.region?.sigungu ?? ''}`;
      if (!regionStr.includes(filters.region)) return;
    }

    results.push(data);
  });

  return results;
}

/** 연결 요청 보내기 */
export async function sendConnectionRequest(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
): Promise<string> {
  const colRef = collection(db, 'connections');
  const docRef = await addDoc(colRef, {
    fromUid,
    toUid,
    fromName,
    toName,
    status: 'pending',
    createdAt: Date.now(),
  });
  return docRef.id;
}

/** 연결 요청 수락 */
export async function acceptConnectionRequest(
  requestId: string,
): Promise<void> {
  const docRef = doc(db, 'connections', requestId);
  await updateDoc(docRef, { status: 'accepted' });
}

/** 내가 보낸/받은 연결 요청 실시간 구독 */
export function subscribeMyConnections(
  myUid: string,
  callback: (connections: ConnectionRequest[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'connections');
  const q = query(
    colRef,
    or(where('fromUid', '==', myUid), where('toUid', '==', myUid)),
  );

  return onSnapshot(q, (snapshot) => {
    const results: ConnectionRequest[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() } as ConnectionRequest);
    });
    callback(results);
  });
}
