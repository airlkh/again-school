import React, { useState, useEffect } from 'react';
import { View, Text, StyleProp, TextStyle } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// 선생님 인증 뱃지
export const TEACHER_BADGE = {
  icon: '👩‍🏫',
  label: '인증 선생님',
  color: '#7C3AED',
};

// 동창 신뢰 뱃지 (인증 수 기반)
export const TRUST_BADGE_INFO = {
  none: { icon: '', label: '', color: '' },
  newbie: { icon: '🌱', label: '새싹 동창', color: '#4CAF50' },
  verified: { icon: '✅', label: '인증 동창', color: '#2196F3' },
  trusted: { icon: '⭐', label: '신뢰 동창', color: '#FF9800' },
  legend: { icon: '🏆', label: '레전드 동창', color: '#FF3124' },
};

export type TrustBadgeKey = keyof typeof TRUST_BADGE_INFO;

export const getTrustBadge = (count: number): TrustBadgeKey => {
  if (count >= 10) return 'legend';
  if (count >= 6) return 'trusted';
  if (count >= 3) return 'verified';
  if (count >= 1) return 'newbie';
  return 'none';
};

// uid로 Firestore에서 trustCount 자동 조회
function useTrustCount(uid?: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!uid) {
      console.log('[Badge] useTrustCount: uid 없음 — 구독 스킵');
      return;
    }
    console.log('[Badge] useTrustCount: 구독 시작 uid=', uid);
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data() as any;
          const tc: number =
            data.trustCount ?? (Array.isArray(data.verifiedSchools) ? data.verifiedSchools.length : 0);
          setCount(tc);
        }
      } catch (e) {
        console.warn('[Badge] onSnapshot 데이터 처리 오류:', e);
      }
    }, (error) => {
      console.warn('[Badge] onSnapshot 오류:', error);
    });
    return unsub;
  }, [uid]);
  return count;
}

function useTeacherVerified(uid?: string): boolean {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      try {
        if (snap.exists()) {
          setVerified(snap.data()?.teacherVerified === true);
        }
      } catch {}
    });
    return unsub;
  }, [uid]);
  return verified;
}

// 뱃지 컴포넌트 (이름 옆에 붙이는 작은 뱃지)
interface BadgeProps {
  isAdmin?: boolean;
  trustCount?: number;
  isTeacher?: boolean;
  size?: 'small' | 'medium';
}

export const UserBadge = ({
  isAdmin = false,
  trustCount = 0,
  isTeacher = false,
  size = 'small',
}: BadgeProps) => {
  const iconSize = size === 'small' ? 14 : 18;
  const labelSize = size === 'small' ? 10 : 12;

  // 선생님 인증 뱃지
  if (isTeacher) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED22', borderRadius: 20, paddingHorizontal: size === 'small' ? 5 : 8, paddingVertical: 2, gap: 3 }}>
        <Text style={{ fontSize: iconSize }}>👩‍🏫</Text>
        {size === 'medium' && (
          <Text style={{ fontSize: labelSize, color: '#7C3AED', fontWeight: '700' }}>인증 선생님</Text>
        )}
      </View>
    );
  }

  // 운영자 블루 뱃지 (최우선)
  if (isAdmin) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1d9bf022',
          borderRadius: 20,
          paddingHorizontal: size === 'small' ? 5 : 8,
          paddingVertical: 2,
          gap: 3,
        }}
      >
        <View
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            backgroundColor: '#1d9bf0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: iconSize * 0.65,
              fontWeight: '900',
            }}
          >
            ✓
          </Text>
        </View>
        {size === 'medium' && (
          <Text
            style={{
              fontSize: labelSize,
              color: '#1d9bf0',
              fontWeight: '700',
            }}
          >
            공식 인증
          </Text>
        )}
      </View>
    );
  }

  // 동창 신뢰 뱃지
  const badgeKey = getTrustBadge(trustCount);
  if (badgeKey === 'none') return null;

  const badge = TRUST_BADGE_INFO[badgeKey];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: badge.color + '22',
        borderRadius: 20,
        paddingHorizontal: size === 'small' ? 5 : 8,
        paddingVertical: 2,
        gap: 3,
      }}
    >
      <Text style={{ fontSize: iconSize }}>{badge.icon}</Text>
      {size === 'medium' && (
        <Text
          style={{
            fontSize: labelSize,
            color: badge.color,
            fontWeight: '700',
          }}
        >
          {badge.label}
        </Text>
      )}
    </View>
  );
};

// 이름 + 뱃지 묶음 컴포넌트
interface NameWithBadgeProps {
  name: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
  uid?: string;
  teacherVerified?: boolean;
  trustCount?: number;
  nameStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium';
  numberOfLines?: number;
}

export function NameWithBadge({
  name,
  isAdmin = false,
  isTeacher = false,
  uid,
  trustCount,
  teacherVerified,
  nameStyle,
  size = 'small',
  numberOfLines,
}: NameWithBadgeProps) {
  const fetchedCount = useTrustCount(trustCount === undefined ? uid : undefined);
  const effectiveCount = trustCount ?? fetchedCount;
  const fetchedTeacher = useTeacherVerified(teacherVerified === undefined ? uid : undefined);
  const effectiveTeacher = teacherVerified ?? fetchedTeacher;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
      }}
    >
      <Text style={nameStyle} numberOfLines={numberOfLines}>
        {name}
      </Text>
      <UserBadge isAdmin={isAdmin} isTeacher={effectiveTeacher} trustCount={effectiveCount} size={size} />
    </View>
  );
}
