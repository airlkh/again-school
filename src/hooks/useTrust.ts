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

// ─── 뱃지 등급 ────────────────────────────────────────────────

export type TrustBadgeLevel = 'none' | 'newbie' | 'verified' | 'trusted' | 'legend';

export function getTrustBadge(count: number): TrustBadgeLevel {
  if (count >= 10) return 'legend';
  if (count >= 6) return 'trusted';
  if (count >= 3) return 'verified';
  if (count >= 1) return 'newbie';
  return 'none';
}

export const TRUST_BADGE_INFO: Record<TrustBadgeLevel, { icon: string; label: string; color: string }> = {
  none: { icon: '', label: '', color: '' },
  newbie: { icon: '🌱', label: '새싹 동창', color: '#4CAF50' },
  verified: { icon: '✅', label: '인증 동창', color: '#2196F3' },
  trusted: { icon: '⭐', label: '신뢰 동창', color: '#FF9800' },
  legend: { icon: '🏆', label: '레전드 동창', color: '#e8313a' },
};

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

    const mySchools: string[] = (mySnap.data()?.schoolNames || []).map((s: string) => s.toLowerCase().trim());
    const targetSchools: string[] = (targetSnap.data()?.schoolNames || []).map((s: string) => s.toLowerCase().trim());

    const isSameSchool = mySchools.some((s) => targetSchools.includes(s));
    if (!isSameSchool) {
      Alert.alert('인증 불가', '같은 학교 동창만 인증할 수 있습니다.');
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
          targetSchools.includes(s.schoolName.toLowerCase().trim()),
        );

        await setDoc(voteRef, {
          voterUid: myUid,
          voterName: myName || '동창',
          voterPhoto: myPhoto || null,
          schoolName: commonSchool?.schoolName || '동창',
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
