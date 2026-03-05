import React, { useState, useEffect } from 'react';
import { View, Text, StyleProp, TextStyle } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
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

// ─── Firestore 뱃지 데이터 캐시 ───────────────────────────────────
const badgeCache = new Map<string, { trustCount: number; isAdmin: boolean; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export function useUserBadge(uid?: string) {
  const [data, setData] = useState({ trustCount: 0, isAdmin: false });

  useEffect(() => {
    if (!uid) return;

    // 캐시 확인
    const cached = badgeCache.get(uid);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData({ trustCount: cached.trustCount, isAdmin: cached.isAdmin });
      return;
    }

    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const result = {
          trustCount: d.trustCount || 0,
          isAdmin: d.isVerifiedByAdmin || d.verified || false,
        };
        badgeCache.set(uid, { ...result, ts: Date.now() });
        setData(result);
      }
    }).catch(() => {});
  }, [uid]);

  return data;
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
  uid?: string;
  isAdmin?: boolean;
  trustCount?: number;
  nameStyle?: StyleProp<TextStyle>;
  size?: 'small' | 'medium';
  numberOfLines?: number;
}

export const NameWithBadge = ({
  name,
  uid,
  isAdmin,
  trustCount,
  nameStyle,
  size = 'small',
  numberOfLines,
}: NameWithBadgeProps) => {
  const badgeData = useUserBadge(uid);

  // uid로 자동 조회된 데이터를 사용하되, 명시적으로 전달된 props 우선
  const finalAdmin = isAdmin ?? badgeData.isAdmin;
  const finalTrust = trustCount ?? badgeData.trustCount;

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
      <UserBadge isAdmin={finalAdmin} trustCount={finalTrust} size={size} />
    </View>
  );
};
