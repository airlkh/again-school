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
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, SchoolEntry, ConnectionRequest } from '../types/auth';
import { sendPushNotification } from './notificationService';
import { saveNotification } from './notificationStoreService';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function checkOnboardingCompleted(uid: string): Promise<boolean> {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    const result = docSnap.exists() ? (docSnap.data()?.onboardingCompleted ?? false) : false;
    return result;
  } catch (e) {
    console.warn('[checkOnboarding] 실패:', e);
    return false;
  }
}

export async function saveUserProfile(
  uid: string,
  data: {
    displayName: string;
    photoURL: string | null;
    schools: SchoolEntry[];
    region: { sido: string; sigungu: string };
    birthYear?: number;
  },
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const now = Date.now();

  const searchKeywords = generateSearchKeywords(data.displayName, data.schools);
  const schoolNames = data.schools.map((s) => s.schoolName);

  const profile: Record<string, any> = {
    uid,
    displayName: data.displayName,
    photoURL: data.photoURL,
    schools: data.schools,
    schoolNames,
    region: data.region,
    onboardingCompleted: true,
    searchKeywords,
    createdAt: now,
    updatedAt: now,
  };

  if (data.birthYear) {
    profile.birthYear = data.birthYear;
  }

  await setDoc(docRef, profile, { merge: true });

  // Firebase Auth 프로필도 동기화
  const { auth } = await import('../config/firebase');
  if (auth.currentUser) {
    const { updateProfile } = await import('firebase/auth');
    await updateProfile(auth.currentUser, {
      displayName: data.displayName,
      ...(data.photoURL ? { photoURL: data.photoURL } : {}),
    });
  }
}

export async function countClassmates(schools: SchoolEntry[]): Promise<number> {
  if (schools.length === 0) return 0;
  try {
    const seenUids = new Set<string>();
    await Promise.all(
      schools.map(async (school) => {
        const q = query(
          collection(db, 'users'),
          where('schoolNames', 'array-contains', school.schoolName),
          where('onboardingCompleted', '==', true),
          limit(200)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((docSnap) => seenUids.add(docSnap.id));
      })
    );
    return seenUids.size;
  } catch {
    return 0;
  }
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
      if (!s?.schoolName) continue;
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

/** 기본 공개범위 저장 */
export async function saveDefaultVisibility(
  uid: string,
  type: 'post' | 'story',
  visibility: string,
  visibilitySchools?: { schoolId: string; schoolName: string; schoolType: string; graduationYear: string; level: string }[],
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const key = type === 'post' ? 'defaultPostVisibility' : 'defaultStoryVisibility';
  const schoolsKey = type === 'post' ? 'defaultPostVisibilitySchools' : 'defaultStoryVisibilitySchools';
  await updateDoc(docRef, {
    [key]: visibility,
    [schoolsKey]: visibilitySchools ?? [],
    updatedAt: Date.now(),
  });
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
  }, (error) => {
    console.warn('[firestoreService] subscribeUserProfile 오류:', error);
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
  }, (error) => {
    console.warn('[firestoreService] subscribeClassmates 오류:', error);
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
        s?.schoolName?.toLowerCase().includes(kw),
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

  // 연결 요청 알림 발송
  try {
    sendPushNotification(toUid, '동창 연결 요청', `${fromName}님이 동창 연결을 요청했습니다`, { profileUid: fromUid });
    saveNotification(toUid, { type: 'connection', fromUid, fromName, profileUid: fromUid });
  } catch (e) {
    console.warn('[firestoreService] 연결 요청 알림 실패:', e);
  }

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
  }, (error) => {
    console.warn('[firestoreService] subscribeMyConnections 오류:', error);
  });
}

// ── 학교 랭킹 ──────────────────────────────────────────────
export interface SchoolRankingItem {
  schoolName: string;
  schoolType: string;
  count: number;
  weeklyNew: number;
}

export async function getSchoolRanking(schoolTypeFilter?: string): Promise<SchoolRankingItem[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const schoolMap: Record<string, { schoolType: string; uids: Set<string>; weeklyUids: Set<string> }> = {};
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    snap.docs.forEach((d) => {
      const data = d.data();
      const schools: any[] = data.schools ?? [];
      schools.forEach((s) => {
        if (!s?.schoolName) return;
        if (schoolTypeFilter && schoolTypeFilter !== '전체' && s.schoolType !== schoolTypeFilter) return;
        if (!schoolMap[s.schoolName]) {
          schoolMap[s.schoolName] = { schoolType: s.schoolType ?? '', uids: new Set(), weeklyUids: new Set() };
        }
        schoolMap[s.schoolName].uids.add(d.id);
        if ((data.createdAt ?? 0) > oneWeekAgo) {
          schoolMap[s.schoolName].weeklyUids.add(d.id);
        }
      });
    });

    return Object.entries(schoolMap)
      .map(([schoolName, val]) => ({
        schoolName,
        schoolType: val.schoolType,
        count: val.uids.size,
        weeklyNew: val.weeklyUids.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  } catch (e) {
    console.warn('getSchoolRanking error:', e);
    return [];
  }
}

// ── 인증 선생님 목록 ──────────────────────────────────────────
export async function getVerifiedTeachers(keyword?: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('teacherVerified', '==', true)
    );
    const snap = await getDocs(q);
    let results = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    if (keyword?.trim()) {
      const lower = keyword.toLowerCase();
      results = results.filter((r: any) =>
        r.displayName?.toLowerCase().includes(lower) ||
        r.teacherSchoolName?.toLowerCase().includes(lower) ||
        r.teacherSubject?.toLowerCase().includes(lower) ||
        r.teacherHistory?.some((h: any) => h.schoolName?.toLowerCase().includes(lower))
      );
    }
    return results;
  } catch (e) {
    console.warn('getVerifiedTeachers error:', e);
    return [];
  }
}
