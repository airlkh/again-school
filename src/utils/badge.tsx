import React, { useState, useEffect } from 'react';
import { View, Text, StyleProp, TextStyle } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// 동창 신뢰 뱃지 (인증 수 기반)
export const TRUST_BADGE_INFO = {
  none: { icon: '', label: '', color: '' },
  newbie: { icon: '🌱', label: '새싹 동창', color: '#4CAF50' },
  verified: { icon: '✅', label: '인증 동창', color: '#2196F3' },
  trusted: { icon: '⭐', label: '신뢰 동창', color: '#FF9800' },
  legend: { icon: '🏆', label: '레전드 동창', color: '#e8313a' },
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
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        setCount((snap.data() as any).trustCount || 0);
      }
    });
    return unsub;
  }, [uid]);
  return count;
}

// 뱃지 컴포넌트 (이름 옆에 붙이는 작은 뱃지)
interface BadgeProps {
  isAdmin?: boolean;
  trustCount?: number;
  size?: 'small' | 'medium';
}

export const UserBadge = ({
  isAdmin = false,
  trustCount = 0,
  size = 'small',
}: BadgeProps) => {
  const iconSize = size === 'small' ? 14 : 18;
  const labelSize = size === 'small' ? 10 : 12;

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
  uid?: string;
  trustCount?: number;
  nameStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium';
  numberOfLines?: number;
}

export function NameWithBadge({
  name,
  isAdmin = false,
  uid,
  trustCount,
  nameStyle,
  size = 'small',
  numberOfLines,
}: NameWithBadgeProps) {
  const fetchedCount = useTrustCount(trustCount === undefined ? uid : undefined);
  const effectiveCount = trustCount ?? fetchedCount;

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
      <UserBadge isAdmin={isAdmin} trustCount={effectiveCount} size={size} />
    </View>
  );
}
