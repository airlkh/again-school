import { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../config/firebase';
import { useCurrentUser } from './useCurrentUser';
import {
  getTrustBadge,
  TRUST_BADGE_INFO,
  type TrustBadgeKey,
} from '../utils/badge';

// 하위호환 re-export (badge.tsx가 단일 소스)
export { getTrustBadge, TRUST_BADGE_INFO };
export type TrustBadgeLevel = TrustBadgeKey;

// ─── useTrust 훅 ──────────────────────────────────────────────

export function useTrust(targetUid: string) {
  const { uid: myUid, displayName: myName, photoURL: myPhoto } = useCurrentUser();
  const [trustCount, setTrustCount] = useState(0);
  const [isTrustedByMe, setIsTrustedByMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUid) return;

    const unsub = onSnapshot(doc(db, 'users', targetUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTrustCount(data.trustCount || 0);
        setIsTrustedByMe((data.trustedBy || []).includes(myUid));
      }
    });
    return unsub;
  }, [targetUid, myUid]);

  async function toggleTrust(message?: string) {
    if (!myUid || loading) return;

    // 자기 자신 인증 불가
    if (myUid === targetUid) {
      Alert.alert('알림', '자신을 인증할 수 없습니다.');
      return;
    }

    // 같은 학교 확인
    const [mySnap, targetSnap] = await Promise.all([
      getDoc(doc(db, 'users', myUid)),
      getDoc(doc(db, 'users', targetUid)),
    ]);

    const getSchoolNames = (userData: any): string[] => {
      const names: string[] = [];

      // 1. schoolNames 배열 직접 사용
      if (userData?.schoolNames?.length > 0) {
        userData.schoolNames.forEach((n: string) => {
          if (n) names.push(n.trim());
        });
      }

      // 2. schools 배열에서 추출
      if (userData?.schools?.length > 0) {
        userData.schools.forEach((s: any) => {
          const name = (s.schoolName || s.name || s.school || '') as string;
          if (name) names.push(name.trim());
        });
      }

      // 중복 제거
      return [...new Set(names)];
    };

    const mySchoolNames = getSchoolNames(mySnap.data());
    const targetSchoolNames = getSchoolNames(targetSnap.data());

    console.log('내 학교:', mySchoolNames);
    console.log('상대 학교:', targetSchoolNames);

    const isSameSchool = mySchoolNames.some((a) =>
      targetSchoolNames.some((b) => a.trim().toLowerCase() === b.trim().toLowerCase()),
    );
    if (!isSameSchool) {
      Alert.alert('인증 불가', '같은 학교 동창끼리만 인증할 수 있습니다.');
      return;
    }

    setLoading(true);
    try {
      const targetRef = doc(db, 'users', targetUid);
      const voteRef = doc(db, 'users', targetUid, 'trustVotes', myUid);

      if (isTrustedByMe) {
        // 인증 취소
        await deleteDoc(voteRef);
        await updateDoc(targetRef, {
          trustCount: increment(-1),
          trustedBy: arrayRemove(myUid),
        });
        // 뱃지 재계산
        const newCount = Math.max(0, trustCount - 1);
        await updateDoc(targetRef, { trustBadge: getTrustBadge(newCount) });
      } else {
        // 공통 학교 이름 찾기
        const mySchoolEntries = mySnap.data()?.schools || [];
        const commonSchool = mySchoolEntries.find((s: { schoolName: string }) =>
          targetSchoolNames.some((t) => t.trim().toLowerCase() === s.schoolName.trim().toLowerCase()),
        );

        await setDoc(voteRef, {
          voterUid: myUid,
          voterName: myName || '동창',
          voterPhoto: myPhoto || null,
          schoolName: commonSchool?.schoolName || '동창',
          graduationYear: commonSchool?.graduationYear || null,
          message: message || '',
          votedAt: serverTimestamp(),
        });
        await updateDoc(targetRef, {
          trustCount: increment(1),
          trustedBy: arrayUnion(myUid),
        });

        // 뱃지 업데이트
        const newCount = trustCount + 1;
        await updateDoc(targetRef, { trustBadge: getTrustBadge(newCount) });

        // 알림 전송
        await addDoc(collection(db, 'notifications'), {
          toUid: targetUid,
          fromUid: myUid,
          fromName: myName,
          fromPhoto: myPhoto,
          type: 'trust',
          message: `${myName}님이 동창 인증을 해주었어요!`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('인증 오류:', err);
      Alert.alert('오류', '인증 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return { trustCount, isTrustedByMe, toggleTrust, loading };
}
