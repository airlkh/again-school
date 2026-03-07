import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  getUserProfile,
  searchClassmates,
  sendConnectionRequest,
  subscribeMyConnections,
} from '../../src/services/firestoreService';
import { UserProfile, SchoolEntry, ConnectionRequest } from '../../src/types/auth';
import { getAvatarSource } from '../../src/utils/avatar';

import { UserPrivacySettings } from '../../src/types/auth';
import { getTrustBadge, TRUST_BADGE_INFO, TrustBadgeLevel } from '../../src/hooks/useTrust';
import { NameWithBadge } from '../../src/utils/badge';

// ─── 더미 데이터 ───────────────────────────────────────────────
interface SearchResult {
  uid: string;
  displayName: string;
  avatarImg: number;
  photoURL?: string | null;
  schools: SchoolEntry[];
  region: string;
  verified: boolean;
  workplace?: string;
  privacySettings?: UserPrivacySettings;
  trustBadge?: TrustBadgeLevel;
  trustCount?: number;
}

const DUMMY_RESULTS: SearchResult[] = [
  {
    uid: 'd1', displayName: '김민준', avatarImg: 3,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    region: '서울 강남구', verified: true,
  },
  {
    uid: 'd2', displayName: '이서연', avatarImg: 5,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    region: '서울 서초구', verified: true,
  },
  {
    uid: 'd3', displayName: '박지호', avatarImg: 11,
    schools: [
      { schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2013 },
      { schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2016 },
    ],
    region: '경기 성남시', verified: false,
  },
  {
    uid: 'd4', displayName: '최수아', avatarImg: 9,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    region: '서울 송파구', verified: true,
  },
  {
    uid: 'd5', displayName: '정하은', avatarImg: 16,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    region: '인천 남동구', verified: true,
  },
  {
    uid: 'd6', displayName: '강도윤', avatarImg: 12,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2014 }],
    region: '서울 마포구', verified: false,
  },
  {
    uid: 'd7', displayName: '윤예진', avatarImg: 20,
    schools: [{ schoolType: '대학교', schoolName: '서울대학교', graduationYear: 2019 }],
    region: '서울 관악구', verified: true,
  },
  {
    uid: 'd8', displayName: '임준서', avatarImg: 33,
    schools: [{ schoolType: '대학교', schoolName: '서울대학교', graduationYear: 2019 }],
    region: '경기 수원시', verified: true,
  },
  {
    uid: 'd9', displayName: '한소율', avatarImg: 25,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    region: '서울 강동구', verified: false,
  },
  {
    uid: 'd10', displayName: '오시우', avatarImg: 51,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    region: '부산 해운대구', verified: true,
  },
];

const ALL_SCHOOL_NAMES = [...new Set(DUMMY_RESULTS.flatMap((r) => r.schools.map((s) => s.schoolName)))];
const ALL_YEARS = [...new Set(DUMMY_RESULTS.flatMap((r) => r.schools.map((s) => s.graduationYear)))].sort();
const ALL_REGIONS = [...new Set(DUMMY_RESULTS.map((r) => r.region.split(' ')[0]))];

// ─── 필터 타입 ─────────────────────────────────────────────────
type FilterType = 'school' | 'year' | 'region';

interface ActiveFilter {
  type: FilterType;
  value: string;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────
export default function SearchScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [expandedFilter, setExpandedFilter] = useState<FilterType | null>(null);
  const [mySchools, setMySchools] = useState<SchoolEntry[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 내 프로필 로드
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.schools) setMySchools(profile.schools);
      } catch {}
    })();
  }, [user]);

  // 연결 요청 실시간 구독
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyConnections(user.uid, setConnections);
    return unsub;
  }, [user]);

  // 검색 실행
  const doSearch = useCallback(
    async (kw: string, filters: ActiveFilter[]) => {
      setIsSearching(true);
      setHasSearched(true);

      const schoolFilter = filters.find((f) => f.type === 'school')?.value;
      const yearFilter = filters.find((f) => f.type === 'year')?.value;
      const regionFilter = filters.find((f) => f.type === 'region')?.value;

      // Firestore 검색
      let firestoreResults: SearchResult[] = [];
      if (user) {
        try {
          const profiles = await searchClassmates(user.uid, {
            keyword: kw || undefined,
            schoolName: schoolFilter,
            graduationYear: yearFilter ? Number(yearFilter) : undefined,
            region: regionFilter,
          });
          firestoreResults = profiles.map((p) => ({
            uid: p.uid,
            displayName: p.displayName,
            avatarImg: p.avatarImg ?? 1,
            photoURL: p.photoURL,
            schools: p.schools || [],
            region: `${p.region?.sido ?? ''} ${p.region?.sigungu ?? ''}`.trim(),
            verified: true,
            workplace: p.workplace,
            privacySettings: p.privacySettings,
            trustBadge: (p as any).trustBadge || 'none',
            trustCount: (p as any).trustCount || 0,
          }));
        } catch {}
      }

      // 더미 데이터 필터
      let dummyFiltered = DUMMY_RESULTS;
      if (kw.trim()) {
        const lower = kw.toLowerCase();
        dummyFiltered = dummyFiltered.filter(
          (r) =>
            r.displayName.toLowerCase().includes(lower) ||
            r.schools.some((s) => s.schoolName.toLowerCase().includes(lower)) ||
            r.schools.some((s) => String(s.graduationYear).includes(lower)),
        );
      }
      if (schoolFilter) {
        dummyFiltered = dummyFiltered.filter((r) =>
          r.schools.some((s) => s.schoolName === schoolFilter),
        );
      }
      if (yearFilter) {
        dummyFiltered = dummyFiltered.filter((r) =>
          r.schools.some((s) => s.graduationYear === Number(yearFilter)),
        );
      }
      if (regionFilter) {
        dummyFiltered = dummyFiltered.filter((r) =>
          r.region.includes(regionFilter),
        );
      }

      // Firestore 결과 우선, 중복 제거 후 더미 추가
      const seen = new Set(firestoreResults.map((r) => r.uid));
      const merged = [
        ...firestoreResults,
        ...dummyFiltered.filter((r) => !seen.has(r.uid)),
      ];

      setResults(merged);
      setIsSearching(false);
    },
    [user],
  );

  // 키워드 변경 시 디바운스 검색
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!keyword.trim() && activeFilters.length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      doSearch(keyword, activeFilters);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [keyword, activeFilters, doSearch]);

  // 필터 토글
  function toggleFilter(type: FilterType, value: string) {
    setActiveFilters((prev) => {
      const exists = prev.find((f) => f.type === type && f.value === value);
      if (exists) return prev.filter((f) => !(f.type === type && f.value === value));
      // 같은 타입이면 교체, 다른 타입이면 추가
      return [...prev.filter((f) => f.type !== type), { type, value }];
    });
    setExpandedFilter(null);
  }

  function removeFilter(type: FilterType) {
    setActiveFilters((prev) => prev.filter((f) => f.type !== type));
  }

  // 연결 상태 확인
  function getConnectionStatus(targetUid: string): ConnectionRequest | undefined {
    return connections.find(
      (c) =>
        (c.fromUid === user?.uid && c.toUid === targetUid) ||
        (c.toUid === user?.uid && c.fromUid === targetUid),
    );
  }

  // 연결 요청 보내기
  async function handleConnect(target: SearchResult) {
    if (!user) return;
    const existing = getConnectionStatus(target.uid);
    if (existing) return;

    setSendingTo(target.uid);
    try {
      const profile = await getUserProfile(user.uid);
      const myName = profile?.displayName ?? '사용자';
      await sendConnectionRequest(user.uid, myName, target.uid, target.displayName);
      Alert.alert('연결 요청 완료', `${target.displayName}님에게 연결 요청을 보냈습니다.`);
    } catch {
      Alert.alert('오류', '연결 요청에 실패했습니다.');
    } finally {
      setSendingTo(null);
    }
  }

  // 연결 요청 버튼 렌더
  function renderConnectionButton(item: SearchResult) {
    const conn = getConnectionStatus(item.uid);
    const isSending = sendingTo === item.uid;

    if (isSending) {
      return (
        <View style={[styles.actionButton, styles.actionButtonDisabled, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.inactive} />
        </View>
      );
    }

    if (conn?.status === 'accepted') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/chat/[id]',
              params: {
                id: item.uid,
                name: item.displayName,
                avatar: String(item.avatarImg),
                online: '0',
              },
            })
          }
        >
          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
          <Text style={[styles.messageButtonText, { color: colors.primary }]}>메시지</Text>
        </TouchableOpacity>
      );
    }

    if (conn?.status === 'pending') {
      const isSent = conn.fromUid === user?.uid;
      return (
        <View style={[styles.actionButton, styles.actionButtonDisabled, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.pendingText, { color: colors.inactive }]}>{isSent ? '요청됨' : '수락 대기'}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.actionButton, styles.connectButton]}
        onPress={() => handleConnect(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add-outline" size={14} color="#fff" />
        <Text style={styles.connectButtonText}>연결</Text>
      </TouchableOpacity>
    );
  }

  // 결과 카드 렌더
  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      const isMe = item.uid === user?.uid;
      const myNames = mySchools.map((s) => s.schoolName.toLowerCase().trim());
      const targetNames = (item.schools || []).map((s) => s.schoolName.toLowerCase().trim());
      const isSameSchool = myNames.some((n) => targetNames.includes(n));
      const privShowSchools = item.privacySettings?.showSchools ?? true;
      const canSeeSchools = isMe || (privShowSchools && isSameSchool);
      const visibleSchools = canSeeSchools
        ? (isMe
            ? (item.schools || [])
            : (item.schools || []).filter((s) => {
                if (s.isPublic === false) return false;
                return myNames.includes(s.schoolName.toLowerCase().trim());
              }))
        : [];
      const primarySchool = visibleSchools[0];
      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardTouchArea}
            onPress={() => router.push(`/profile/${item.uid}`)}
            activeOpacity={0.7}
          >
            <Image
              source={getAvatarSource(item.photoURL)}
              style={[styles.avatar, { backgroundColor: colors.card }]}
            />
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <NameWithBadge
                  name={item.displayName}
                  isAdmin={item.verified}
                  trustCount={item.trustCount ?? 0}
                  nameStyle={[styles.name, { color: colors.text }]}
                  numberOfLines={1}
                />
                {isMe && (
                  <View style={[styles.meBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.meBadgeText}>(나)</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.schoolInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                {primarySchool
                  ? `${primarySchool.schoolName} · ${primarySchool.graduationYear}년 졸업`
                  : '학교 비공개'}
                {(item.trustCount ?? 0) > 0 ? ` · 인증 ${item.trustCount}명` : ''}
              </Text>

              <View style={styles.tagRow}>
                {visibleSchools.map((s, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{s.schoolType}</Text>
                  </View>
                ))}
                <View style={[styles.tagRegion, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagRegionText, { color: colors.textSecondary }]}>{item.region}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            {!isMe && renderConnectionButton(item)}
          </View>
        </View>
      );
    },
    [connections, sendingTo, user, colors, isDark, mySchools],
  );

  // 필터 옵션 드롭다운
  function renderFilterDropdown() {
    if (!expandedFilter) return null;

    let options: string[] = [];
    if (expandedFilter === 'school') {
      const myNames = mySchools.map((s) => s.schoolName);
      options = [...new Set([...myNames, ...ALL_SCHOOL_NAMES])];
    } else if (expandedFilter === 'year') {
      const myYears = mySchools.map((s) => String(s.graduationYear));
      options = [...new Set([...myYears, ...ALL_YEARS.map(String)])];
    } else {
      options = ALL_REGIONS;
    }

    const selected = activeFilters.find((f) => f.type === expandedFilter)?.value;

    return (
      <View style={[styles.dropdown, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownScroll}>
          {options.map((opt) => {
            const isActive = selected === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => toggleFilter(expandedFilter, opt)}
              >
                <Text style={[
                  styles.dropdownText,
                  { color: colors.text },
                  isActive && { color: '#fff', fontWeight: '600' },
                ]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 검색바 */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.inactive} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="이름, 학교, 졸업연도로 검색"
          placeholderTextColor={colors.inactive}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          autoCorrect={false}
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Ionicons name="close-circle" size={20} color={colors.inactive} />
          </TouchableOpacity>
        )}
      </View>

      {/* 필터 칩 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* 학교 필터 */}
          <FilterChip
            label="학교"
            icon="school-outline"
            value={activeFilters.find((f) => f.type === 'school')?.value}
            isExpanded={expandedFilter === 'school'}
            onPress={() => setExpandedFilter(expandedFilter === 'school' ? null : 'school')}
            onClear={() => removeFilter('school')}
          />
          {/* 졸업연도 필터 */}
          <FilterChip
            label="졸업연도"
            icon="calendar-outline"
            value={activeFilters.find((f) => f.type === 'year')?.value ? `${activeFilters.find((f) => f.type === 'year')!.value}년` : undefined}
            isExpanded={expandedFilter === 'year'}
            onPress={() => setExpandedFilter(expandedFilter === 'year' ? null : 'year')}
            onClear={() => removeFilter('year')}
          />
          {/* 지역 필터 */}
          <FilterChip
            label="지역"
            icon="location-outline"
            value={activeFilters.find((f) => f.type === 'region')?.value}
            isExpanded={expandedFilter === 'region'}
            onPress={() => setExpandedFilter(expandedFilter === 'region' ? null : 'region')}
            onClear={() => removeFilter('region')}
          />
        </ScrollView>
      </View>

      {/* 필터 드롭다운 */}
      {renderFilterDropdown()}

      {/* 결과 카운트 */}
      {hasSearched && !isSearching && (
        <View style={styles.resultCount}>
          <Text style={[styles.resultCountText, { color: colors.textSecondary }]}>
            검색 결과 <Text style={[styles.resultCountNumber, { color: colors.primary }]}>{results.length}</Text>명
          </Text>
        </View>
      )}

      {/* 검색 결과 / 빈 상태 */}
      {isSearching ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.searchingText, { color: colors.textSecondary }]}>검색 중...</Text>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="search-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>검색 결과가 없습니다</Text>
          <Text style={[styles.emptySubtext, { color: colors.inactive }]}>다른 검색어나 필터를 시도해보세요</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.centerWrap}>
          <Ionicons name="people-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>동창을 검색해보세요</Text>
          <Text style={[styles.emptySubtext, { color: colors.inactive }]}>
            학교명, 이름, 졸업연도로 검색할 수 있습니다
          </Text>
          <TouchableOpacity
            style={styles.inviteChip}
            onPress={() => router.push('/invite')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.inviteChipText}>동창 초대하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        />
      )}
    </View>
  );
}

// ─── 필터 칩 컴포넌트 ───────────────────────────────────────────
function FilterChip({
  label,
  icon,
  value,
  isExpanded,
  onPress,
  onClear,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  isExpanded: boolean;
  onPress: () => void;
  onClear: () => void;
}) {
  const hasValue = !!value;
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { backgroundColor: colors.card, borderColor: colors.border },
        hasValue && { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary },
        isExpanded && !hasValue && { borderColor: colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={15}
        color={hasValue ? colors.primary : colors.textSecondary}
      />
      <Text style={[
        styles.filterChipText,
        { color: colors.textSecondary },
        hasValue && { color: colors.primary, fontWeight: '600' },
      ]}>
        {value ?? label}
      </Text>
      {hasValue ? (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onClear();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // 검색바
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.text,
  },

  // 필터
  filterContainer: {
    paddingBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: '#fef2f2',
    borderColor: Colors.primary,
  },
  filterChipExpanded: {
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // 드롭다운
  dropdown: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  dropdownScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dropdownText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  dropdownTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // 결과 카운트
  resultCount: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  resultCountNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },

  // 결과 리스트
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },

  // 카드
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cardTouchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.card,
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  trustIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  meBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  meBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  schoolInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  tagRegion: {
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagRegionText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // 액션 버튼
  cardActions: {
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  connectButton: {
    backgroundColor: Colors.primary,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  messageButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  messageButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonDisabled: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.inactive,
    fontWeight: '600',
  },

  // 빈 상태 / 로딩
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.inactive,
    marginTop: 8,
  },
  searchingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 12,
  },

  inviteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  inviteChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
