import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/constants/colors';
import { KeyboardScrollView } from '../../src/components/KeyboardScrollView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  subscribeUserProfile,
  subscribeMyConnections,
  updateUserProfile,
  acceptConnectionRequest,
} from '../../src/services/firestoreService';
import { uploadImage } from '../../src/services/mediaService';
import { FirestorePost } from '../../src/services/postService';
import { UserProfile, SchoolEntry, UserPrivacySettings, ConnectionRequest } from '../../src/types/auth';
import { useSchoolMemberCounts } from '../../src/hooks/useSchoolMemberCount';
import { getAvatarSource } from '../../src/utils/avatar';
import { CropEditor } from '../../src/components/CropEditor';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, onSnapshot, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../src/config/firebase';
import { getTrustBadge, TRUST_BADGE_INFO } from '../../src/hooks/useTrust';
import { NameWithBadge } from '../../src/utils/badge';
import { searchSchools, NeisSchool } from '../../src/services/neisService';

const SCHOOL_TYPES: SchoolEntry['schoolType'][] = ['초등학교', '중학교', '고등학교', '대학교'];
const ADMIN_UIDS = ['UB6PuD56uHaImgqqC3q1AFFk8kj1'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SIZE = Math.floor(SCREEN_WIDTH / 3);

const getVideoThumbnail = (post: any): string | null => {
  console.log('[thumb] post.id:', post.id);
  console.log('[thumb] thumbnailUrl:', post.thumbnailUrl);
  console.log('[thumb] imageUrl:', post.imageUrl);
  console.log('[thumb] videoUrl:', post.videoUrl);
  console.log('[thumb] mediaItems:', JSON.stringify(post.mediaItems?.slice(0, 1)));

  // 1순위: 저장된 썸네일
  if (post.thumbnailUrl) return post.thumbnailUrl as string;

  // 2순위: mediaItems 배열에서 첫번째 썸네일 or 이미지
  if (post.mediaItems && post.mediaItems.length > 0) {
    const first = post.mediaItems[0];
    if (typeof first === 'string') {
      if (!first.endsWith('.mp4') && !first.endsWith('.mov') && !first.endsWith('.avi')) {
        return first;
      }
    } else if (typeof first === 'object') {
      if (first.thumbnailUrl) return first.thumbnailUrl as string;
      if (first.url && !first.url.endsWith('.mp4') && !first.url.endsWith('.mov')) {
        return first.url as string;
      }
    }
  }

  // 3순위: imageUrl이 이미지면 그대로 사용
  if (post.imageUrl &&
      !post.imageUrl.endsWith('.mp4') &&
      !post.imageUrl.endsWith('.mov')) {
    return post.imageUrl as string;
  }

  // 4순위: Cloudinary 동영상 URL → 썸네일 변환
  const vUrl: string | undefined = post.videoUrl || post.imageUrl;
  if (vUrl && vUrl.includes('res.cloudinary.com')) {
    if (vUrl.includes('/video/upload/')) {
      const base = vUrl.replace(/\/video\/upload\/[^\/]*\//, '/video/upload/');
      return base
        .replace('/video/upload/', '/video/upload/f_jpg,q_70,w_600/')
        .replace(/\.(mp4|mov|avi|webm)(\?.*)?$/i, '.jpg');
    }
  }

  return null;
};

// ─── 게시물 그리드 (React.memo로 분리 — 부모 리렌더링 차단) ───
const PostGrid = React.memo(function PostGrid({
  posts,
  loadingPosts,
  isDark,
  colors,
  hasMore,
  loadingMore,
  onLoadMore,
  headerComponent,
  footerComponent,
}: {
  posts: FirestorePost[];
  loadingPosts: boolean;
  isDark: boolean;
  colors: any;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  headerComponent: React.ReactElement;
  footerComponent: React.ReactElement;
}) {
  const renderPostItem = useCallback(({ item: post }: { item: FirestorePost }) => {
    const thumbUri = getVideoThumbnail(post);
    return (
      <TouchableOpacity style={styles.postGridItem} onPress={() => router.push(`/post/${post.id}`)}>
        <Image key={thumbUri ?? post.id} source={thumbUri ? { uri: thumbUri } : undefined} style={styles.postGridImage} resizeMode="cover" fadeDuration={0} />
        {post.mediaItems && post.mediaItems.length > 1 && (
          <View style={styles.multiImageIcon}>
            <Ionicons name="copy-outline" size={14} color="#fff" />
          </View>
        )}
        {(post.mediaType === 'video' || post.videoUrl) && (
          <View style={styles.videoIcon}>
            <Ionicons name="play-circle" size={20} color="#fff" />
          </View>
        )}
        {((post as any).viewCount ?? 0) > 0 && (
          <View style={{ position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="eye-outline" size={11} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>
              {(post as any).viewCount >= 1000 ? `${((post as any).viewCount / 1000).toFixed(1)}k` : (post as any).viewCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [colors, isDark]);

  return (
    <FlatList
      data={posts}
      numColumns={3}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      renderItem={renderPostItem}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        loadingPosts ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={[styles.skeletonItem, { backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8' }]} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyGrid}>
            <Ionicons name="camera-outline" size={44} color={colors.inactive} />
            <Text style={[styles.emptyGridText, { color: colors.inactive }]}>아직 게시물이 없습니다</Text>
          </View>
        )
      }
      ListFooterComponent={
        <>
          {hasMore ? (
            <TouchableOpacity
              onPress={onLoadMore}
              style={{
                alignItems: 'center',
                paddingVertical: 16,
                marginBottom: 8,
              }}
            >
              {loadingMore ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  더보기
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
          {footerComponent}
        </>
      }
      removeClippedSubviews={true}
      maxToRenderPerBatch={6}
      windowSize={5}
      initialNumToRender={12}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    />
  );
});

function keyExtractor(item: FirestorePost) {
  return item.id;
}

function getItemLayout(_: any, index: number) {
  return {
    length: GRID_SIZE,
    offset: GRID_SIZE * Math.floor(index / 3),
    index,
  };
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark, mode, setMode } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // 학교 추가/수정 모달
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolType, setNewSchoolType] = useState<SchoolEntry['schoolType']>('중학교');
  const [newGradYear, setNewGradYear] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [addingSchool, setAddingSchool] = useState(false);
  const [editingSchoolIndex, setEditingSchoolIndex] = useState<number | null>(null);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [schoolSearchResults, setSchoolSearchResults] = useState<NeisSchool[]>([]);
  const [isSchoolSearching, setIsSchoolSearching] = useState(false);
  const [showSchoolResults, setShowSchoolResults] = useState(false);
  const schoolSearchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 직장 편집
  const [workplace, setWorkplace] = useState('');
  const [showWorkplaceModal, setShowWorkplaceModal] = useState(false);
  const [savingWorkplace, setSavingWorkplace] = useState(false);

  // 개인정보 공개 설정
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>({
    showWorkplace: true,
    showSchools: true,
  });

  // 사용자 게시물 (페이징)
  const [userPosts, setUserPosts] = useState<FirestorePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const lastPostDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const POST_PAGE = 12;

  // 동창 인증 수
  const [trustCount, setTrustCount] = useState(0);
  const [schoolTrustCounts, setSchoolTrustCounts] = useState<Record<string, number>>({});

  // 프로필 이미지 크롭
  const [cropVisible, setCropVisible] = useState(false);
  const [cropTargetUri, setCropTargetUri] = useState('');
  const [cropAssetSize, setCropAssetSize] = useState<{ width: number; height: number } | null>(null);

  // 동창 현황 모달
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<'connected' | 'sent' | 'received'>('connected');

  // 게시물 페이징 로드
  const loadPosts = useCallback(async (reset = false) => {
    if (!user?.uid || loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    loadingRef.current = true;
    // 최초 로드 시에만 스켈레톤 표시 (reset 시 기존 게시물 유지하여 떨림 방지)
    if (userPosts.length === 0 && !lastPostDoc.current) setLoadingPosts(true);
    try {
      console.log('[loadPosts] 시작 reset:', reset, 'uid:', user?.uid);
      const postsCol = collection(db, 'posts');
      let q;
      if (reset) {
        lastPostDoc.current = null;
        q = query(postsCol, where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(POST_PAGE));
      } else if (!lastPostDoc.current) {
        q = query(postsCol, where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(POST_PAGE));
      } else {
        q = query(postsCol, where('authorUid', '==', user.uid), orderBy('createdAt', 'desc'), startAfter(lastPostDoc.current), limit(POST_PAGE));
      }
      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePost));
      console.log('[loadPosts] 불러온 게시물 수:', newPosts.length);
      console.log('[loadPosts] 게시물 ids:', newPosts.map(p => p.id));
      if (snap.docs.length > 0) {
        lastPostDoc.current = snap.docs[snap.docs.length - 1];
      }
      hasMoreRef.current = snap.docs.length >= POST_PAGE;
      if (reset) {
        setUserPosts(newPosts);
      } else {
        setUserPosts((prev) => [...prev, ...newPosts]);
      }
    } catch (err: any) {
      console.warn('게시물 로드 오류:', err?.code, err?.message, err);
    } finally {
      loadingRef.current = false;
      setLoadingPosts(false);
    }
  }, [user?.uid]);

  // 프로필 구독
  useEffect(() => {
    if (!user?.uid) return;
    try {
      return subscribeUserProfile(user.uid, (p) => {
        try {
          setProfile(p);
          if (p) {
            setWorkplace(p.workplace ?? '');
            setPrivacySettings(p.privacySettings ?? { showWorkplace: true, showSchools: true });
          }
        } catch (e) {
          console.warn('[Profile] 프로필 콜백 오류:', e);
        }
      });
    } catch (e) {
      console.warn('[Profile] subscribeUserProfile 오류:', e);
    }
  }, [user?.uid]);

  // 동창 연결 구독
  useEffect(() => {
    if (!user?.uid) return;
    try {
      return subscribeMyConnections(user.uid, (conns) => {
        try { setConnections(conns || []); } catch (e) { console.warn('[Profile] connections 처리 오류:', e); }
      });
    } catch (e) {
      console.warn('[Profile] subscribeMyConnections 오류:', e);
    }
  }, [user?.uid]);

  // 게시물 최초 로드
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      lastPostDoc.current = null;
      hasMoreRef.current = true;
      loadPosts(true);
    }, [user?.uid, loadPosts])
  );

  // trustCount + trustVotes 1회 조회
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setTrustCount(data.trustCount || 0);
        }
      } catch (e) {
        console.warn('trustCount 로드 실패:', e);
      }

      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'trustVotes'));
        const counts: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const school = (d.data().schoolName as string) || '';
          if (school) counts[school] = (counts[school] || 0) + 1;
        });
        setSchoolTrustCounts(counts);
      } catch (e) {
        console.warn('trustVotes 로드 실패:', e);
      }
    })();
  }, [user?.uid]);

  // 파생값 useMemo
  const connectedCount = useMemo(() => (connections || []).filter((c) => c?.status === 'accepted').length, [connections]);
  const sentCount = useMemo(() => (connections || []).filter((c) => c?.status === 'pending' && c?.fromUid === user?.uid).length, [connections, user?.uid]);
  const receivedCount = useMemo(() => (connections || []).filter((c) => c?.status === 'pending' && c?.toUid === user?.uid).length, [connections, user?.uid]);

  const displayName = profile?.displayName || user?.displayName || '사용자';
  const job = profile?.job || '';
  const region = profile?.region ? `${profile?.region?.sido || ''} ${profile?.region?.sigungu || ''}`.trim() : '';
  const schools = profile?.schools || [];
  const schoolNames = useMemo(() => (schools || []).map((s) => s?.schoolName || '').filter(Boolean), [schools]);
  const schoolMemberCounts = useSchoolMemberCounts(schoolNames);

  // 프로필 이미지 변경
  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCropAssetSize({ width: asset.width, height: asset.height });
      setCropTargetUri(asset.uri);
      setCropVisible(true);
    }
  }

  // 크롭 완료 후 업로드 + 전체 동기화
  async function handleCropDone(croppedUri: string) {
    setCropVisible(false);
    setCropTargetUri('');
    if (!user) return;

    setUploadingPhoto(true);
    try {
      const uploaded = await uploadImage(croppedUri);
      const newPhotoURL = uploaded.url;

      await updateProfile(user, { photoURL: newPhotoURL });
      await updateUserProfile(user.uid, { photoURL: newPhotoURL });

      // 관련 컬렉션 동기화 (실패해도 프로필 사진 변경은 유지)
      try {
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), where('authorUid', '==', user.uid)),
        );
        if (!postsSnap.empty) {
          const postsBatch = writeBatch(db);
          postsSnap.docs.forEach((d) => postsBatch.update(d.ref, { authorPhotoURL: newPhotoURL }));
          await postsBatch.commit();
        }

        const storiesSnap = await getDocs(
          query(collection(db, 'stories'), where('uid', '==', user.uid)),
        );
        if (!storiesSnap.empty) {
          const storiesBatch = writeBatch(db);
          storiesSnap.docs.forEach((d) => storiesBatch.update(d.ref, { photoURL: newPhotoURL }));
          await storiesBatch.commit();
        }

        const meetupsSnap = await getDocs(
          query(collection(db, 'meetups'), where('hostUid', '==', user.uid)),
        );
        if (!meetupsSnap.empty) {
          const meetupsBatch = writeBatch(db);
          meetupsSnap.docs.forEach((d) => meetupsBatch.update(d.ref, { hostPhotoURL: newPhotoURL }));
          await meetupsBatch.commit();
        }

        const chatsSnap = await getDocs(
          query(collection(db, 'chatRooms'), where('participants', 'array-contains', user.uid)),
        );
        if (!chatsSnap.empty) {
          const chatsBatch = writeBatch(db);
          chatsSnap.docs.forEach((d) => chatsBatch.update(d.ref, { [`participantPhotos.${user.uid}`]: newPhotoURL }));
          await chatsBatch.commit();
        }
      } catch (syncErr) {
        console.warn('프로필 사진 동기화 일부 실패 (무시):', syncErr);
      }

      Alert.alert('완료', '프로필 사진이 변경되었습니다.');
    } catch {
      Alert.alert('오류', '사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // 학교 추가/수정 저장
  async function handleSaveSchool() {
    if (!newSchoolName.trim()) {
      Alert.alert('알림', '학교명을 입력해주세요.');
      return;
    }
    if (!newGradYear.trim() || isNaN(Number(newGradYear)) || Number(newGradYear) > new Date().getFullYear()) {
      Alert.alert('알림', '올바른 졸업연도를 입력해주세요.');
      return;
    }
    if (!user) return;

    setAddingSchool(true);
    try {
      const entry: SchoolEntry = {
        schoolType: newSchoolType,
        schoolName: newSchoolName.trim(),
        graduationYear: Number(newGradYear),
        isPublic: newIsPublic,
      };

      let updatedSchools: SchoolEntry[];
      if (editingSchoolIndex !== null) {
        updatedSchools = [...schools];
        updatedSchools[editingSchoolIndex] = entry;
      } else {
        updatedSchools = [...schools, entry];
      }

      await updateUserProfile(user.uid, { schools: updatedSchools });
      setShowSchoolModal(false);
      resetSchoolForm();
      Alert.alert('완료', editingSchoolIndex !== null ? '학교 정보가 수정되었습니다.' : '학교가 추가되었습니다.');
    } catch {
      Alert.alert('오류', editingSchoolIndex !== null ? '학교 수정에 실패했습니다.' : '학교 추가에 실패했습니다.');
    } finally {
      setAddingSchool(false);
    }
  }

  function resetSchoolForm() {
    setNewSchoolName('');
    setNewGradYear('');
    setNewSchoolType('중학교');
    setNewIsPublic(true);
    setEditingSchoolIndex(null);
    setSchoolSearchQuery('');
    setSchoolSearchResults([]);
    setShowSchoolResults(false);
  }

  function handleEditSchool(index: number) {
    const s = schools?.[index];
    if (!s) return;
    setEditingSchoolIndex(index);
    setNewSchoolName(s.schoolName || '');
    setNewSchoolType(s.schoolType || '중학교');
    setNewGradYear(String(s.graduationYear || ''));
    setNewIsPublic(s.isPublic ?? true);
    setShowSchoolModal(true);
  }

  function handleDeleteSchool(index: number) {
    const schoolName = schools?.[index]?.schoolName || '학교';
    Alert.alert('학교 삭제', `"${schoolName}"을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            const updatedSchools = schools.filter((_, i) => i !== index);
            await updateUserProfile(user.uid, { schools: updatedSchools });
            Alert.alert('완료', '학교가 삭제되었습니다.');
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  // 직장 저장
  async function handleSaveWorkplace() {
    if (!user) return;
    setSavingWorkplace(true);
    try {
      await updateUserProfile(user.uid, { workplace: workplace.trim() });
      setShowWorkplaceModal(false);
      Alert.alert('완료', '직장 정보가 저장되었습니다.');
    } catch {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setSavingWorkplace(false);
    }
  }

  // 개인정보 설정 저장
  async function handleSavePrivacy(updated: UserPrivacySettings) {
    if (!user) return;
    setPrivacySettings(updated);
    try {
      await updateUserProfile(user.uid, { privacySettings: updated });
    } catch {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  }

  // 연결 요청 수락
  async function handleAccept(conn: ConnectionRequest) {
    try {
      await acceptConnectionRequest(conn.id);
      Alert.alert('완료', `${conn.fromName}님과 연결되었습니다.`);
    } catch {
      Alert.alert('오류', '수락에 실패했습니다.');
    }
  }

  // 연결 요청 거절
  async function handleReject(conn: ConnectionRequest) {
    try {
      const docRef = doc(db, 'connections', conn.id);
      await deleteDoc(docRef);
    } catch {
      Alert.alert('오류', '거절에 실패했습니다.');
    }
  }

  // 보낸 요청 취소
  async function handleCancelRequest(conn: ConnectionRequest) {
    try {
      const docRef = doc(db, 'connections', conn.id);
      await deleteDoc(docRef);
    } catch {
      Alert.alert('오류', '취소에 실패했습니다.');
    }
  }

  function handleLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch { Alert.alert('오류', '로그아웃에 실패했습니다.'); }
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert('계정 삭제', '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.\n정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => Alert.alert('안내', '계정 삭제 기능은 준비 중입니다.') },
    ]);
  }

  // 동창 현황 목록 필터
  const filteredConnections = useMemo(() => (connections || []).filter((c) => {
    if (!c) return false;
    if (connectionsTab === 'connected') return c.status === 'accepted';
    if (connectionsTab === 'sent') return c.status === 'pending' && c.fromUid === user?.uid;
    return c.status === 'pending' && c.toUid === user?.uid;
  }), [connections, connectionsTab, user?.uid]);

  const photoUrl = profile?.photoURL ?? null;

  const handleLoadMore = useCallback(() => loadPosts(false), [loadPosts]);

  // ─── ListHeaderComponent (useMemo로 안정화) ───
  const listHeader = useMemo(() => (
    <>
      {/* 프로필 상단 - Instagram 스타일 */}
      <View style={styles.profileTopRow}>
        <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto}>
          <Image source={getAvatarSource(photoUrl)} style={[styles.avatar, { backgroundColor: colors.card }]} />
          <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{userPosts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>게시물</Text>
          </View>
          <TouchableOpacity style={styles.statItem} onPress={() => { setConnectionsTab('connected'); setShowConnectionsModal(true); }}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{connectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>동창</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => { setConnectionsTab('received'); setShowConnectionsModal(true); }}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{sentCount + receivedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>연결</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 프로필 정보 */}
      <View style={styles.profileInfo}>
        <NameWithBadge
            name={displayName}
            uid={user?.uid}
            nameStyle={[styles.displayName, { color: colors.text }]}
            size="medium"
          />
        {trustCount > 0 && (
          <View style={{ alignItems: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: TRUST_BADGE_INFO[getTrustBadge(trustCount)].color }}>
              {TRUST_BADGE_INFO[getTrustBadge(trustCount)].icon} {TRUST_BADGE_INFO[getTrustBadge(trustCount)].label}
            </Text>
          </View>
        )}
        {job ? <Text style={[styles.job, { color: colors.textSecondary }]}>{job}</Text> : null}
        {region ? (
          <View style={styles.regionRow}>
            <Ionicons name="location-outline" size={14} color={colors.inactive} />
            <Text style={[styles.regionText, { color: colors.inactive }]}>{region}</Text>
          </View>
        ) : null}
      </View>

      {/* 프로필 편집 버튼 */}
      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.border }]}
        onPress={() => router.push('/profile/edit')}
      >
        <Text style={[styles.editBtnText, { color: colors.text }]}>프로필 편집</Text>
      </TouchableOpacity>

      {/* 동창 인증 현황 */}
      {schools.length > 0 && (
        <View style={[styles.trustSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.trustSectionHeader}>
            <Text style={[styles.trustSectionTitle, { color: colors.text }]}>동창 인증 현황</Text>
            {trustCount > 0 && (
              <View style={[styles.trustBadgePill, { backgroundColor: TRUST_BADGE_INFO[getTrustBadge(trustCount)].color + '22' }]}>
                <Text style={{ fontSize: 12 }}>{TRUST_BADGE_INFO[getTrustBadge(trustCount)].icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TRUST_BADGE_INFO[getTrustBadge(trustCount)].color }}>
                  {TRUST_BADGE_INFO[getTrustBadge(trustCount)].label}
                </Text>
              </View>
            )}
          </View>
          {(schools || []).map((s, i) => {
            if (!s) return null;
            return (
            <TouchableOpacity
              key={i}
              style={[styles.trustSchoolCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({
                pathname: '/profile/verifications' as any,
                params: { uid: user?.uid, schoolName: s.schoolName || '', graduationYear: String(s.graduationYear || '') },
              })}
              activeOpacity={0.7}
            >
              <View style={styles.trustSchoolInfo}>
                <Text style={{ fontSize: 16 }}>
                  {s.schoolType === '초등학교' ? '🏫' : s.schoolType === '중학교' ? '🏛️' : s.schoolType === '고등학교' ? '🎓' : '🏛️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trustSchoolName, { color: colors.text }]}>{s.schoolName || ''}</Text>
                  <Text style={[styles.trustSchoolYear, { color: colors.textSecondary }]}>{s.graduationYear || ''}년 졸업</Text>
                </View>
              </View>
              <View style={styles.trustSchoolRight}>
                <Text style={[styles.trustSchoolCount, { color: colors.inactive }]}>
                  👥 인증 {schoolTrustCounts[s.schoolName || ''] || 0}명
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.inactive} />
              </View>
            </TouchableOpacity>
            );
          })}
          <View style={styles.trustTotalRow}>
            <Text style={[styles.trustTotalText, { color: colors.inactive }]}>
              총 동창 인증 {trustCount}명
            </Text>
          </View>
        </View>
      )}

      {/* 학교 칩 */}
      {schools.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(schools || []).map((s, i) => (
            <TouchableOpacity key={i} onPress={() => handleEditSchool(i)} style={[styles.schoolChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12 }}>{s?.schoolType === '초등학교' ? '🏫' : s?.schoolType === '중학교' ? '🏛️' : '🎓'}</Text>
              <Text style={[styles.schoolChipText, { color: colors.text }]} numberOfLines={1}>{s?.schoolName || ''}</Text>
              <Text style={[styles.schoolChipYear, { color: colors.textSecondary }]}>{s?.graduationYear || ''}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => { resetSchoolForm(); setShowSchoolModal(true); }} style={[styles.schoolChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={[styles.schoolChipText, { color: colors.primary }]}>추가</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 그리드 탭 바 */}
      <View style={[styles.gridTabBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.gridTab, { borderBottomColor: colors.text, borderBottomWidth: 1 }]}>
          <Ionicons name="grid-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridTab} onPress={() => router.push('/bookmarks')}>
          <Ionicons name="bookmark-outline" size={22} color={colors.inactive} />
        </TouchableOpacity>
      </View>
    </>
  ), [photoUrl, uploadingPhoto, userPosts.length, connectedCount, sentCount, receivedCount, displayName, job, region, schools, trustCount, schoolTrustCounts, colors, isDark, user?.uid]);

  // ─── ListFooterComponent (useMemo로 안정화) ───
  const listFooter = useMemo(() => (
    <>
      {loadingPosts && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* 직장 정보 */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>직장 정보</Text>
        {workplace ? (
          <View style={[styles.schoolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.schoolEmoji}>💼</Text>
            <View style={styles.schoolInfo}>
              <Text style={[styles.schoolName, { color: colors.text }]}>{workplace}</Text>
              <Text style={[styles.schoolPublicLabel, { color: (privacySettings?.showWorkplace ?? true) ? '#4CAF50' : '#e8313a' }]}>
                {(privacySettings?.showWorkplace ?? true) ? '🔓 동창에게 공개' : '🔒 비공개'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.schoolActionBtn, { backgroundColor: isDark ? colors.surface2 : '#f0f0f0' }]}
              onPress={() => setShowWorkplaceModal(true)}
            >
              <Text style={[styles.schoolActionText, { color: isDark ? colors.text : '#333' }]}>수정</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.inactive }]}>등록된 직장이 없습니다</Text>
        )}
        <TouchableOpacity
          style={[styles.addSchoolBtn, { borderTopColor: colors.border }]}
          onPress={() => setShowWorkplaceModal(true)}
        >
          <Ionicons name={workplace ? 'create-outline' : 'add-circle-outline'} size={18} color={colors.primary} />
          <Text style={[styles.addSchoolText, { color: colors.primary }]}>{workplace ? '직장 수정' : '직장 추가'}</Text>
        </TouchableOpacity>
      </View>

      {/* 개인정보 공개 설정 */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>개인정보 공개 설정</Text>
        <Text style={[styles.privacyDesc, { color: colors.inactive }]}>
          비공개 설정 시 동창이라도 해당 정보가 보이지 않습니다
        </Text>

        <View style={[styles.privacyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyLabel, { color: colors.text }]}>🏫 학교 정보</Text>
            <Text style={[styles.privacySub, { color: colors.inactive }]}>
              {privacySettings.showSchools ? '같은 학교 동창에게만 공개' : '완전 비공개'}
            </Text>
          </View>
          <Switch
            value={privacySettings.showSchools}
            onValueChange={(val) => handleSavePrivacy({ ...privacySettings, showSchools: val })}
            trackColor={{ false: isDark ? '#555' : '#ddd', true: '#e8313a' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.privacyRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyLabel, { color: colors.text }]}>💼 직장 정보</Text>
            <Text style={[styles.privacySub, { color: colors.inactive }]}>
              {privacySettings.showWorkplace ? '동창에게 공개' : '완전 비공개'}
            </Text>
          </View>
          <Switch
            value={privacySettings.showWorkplace}
            onValueChange={(val) => handleSavePrivacy({ ...privacySettings, showWorkplace: val })}
            trackColor={{ false: isDark ? '#555' : '#ddd', true: '#e8313a' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.privacyHint, { backgroundColor: isDark ? '#2e2010' : '#fff7ed' }]}>
          <Text style={[styles.privacyHintText, { color: '#f97316' }]}>
            ℹ️  학력 및 직장 정보는 개인정보입니다.{'\n'}    비공개 설정 시 동창이라도 볼 수 없습니다.
          </Text>
        </View>
      </View>

      {/* 설정 */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>설정</Text>
        <SettingItem icon="contrast-outline" label="화면 모드"
          detail={mode === 'light' ? '라이트' : mode === 'dark' ? '다크' : '시스템 자동'}
          onPress={() => Alert.alert('화면 모드', '화면 모드를 선택하세요', [
            { text: '라이트 모드', onPress: () => setMode('light') },
            { text: '다크 모드', onPress: () => setMode('dark') },
            { text: '시스템 설정 따르기', onPress: () => setMode('system') },
            { text: '취소', style: 'cancel' },
          ])} />
        <SettingItem icon="notifications-outline" label="알림 설정"
          onPress={() => router.push('/settings/notifications' as any)} />
        <SettingItem icon="school-outline" label="선생님 인증 신청"
          onPress={() => router.push('/profile/teacher-apply' as any)} />
        {user && ADMIN_UIDS.includes(user.uid) && (
          <SettingItem icon="shield-checkmark-outline" label="선생님 인증 관리 (관리자)"
            onPress={() => router.push('/admin/teacher-requests' as any)} />
        )}
        <SettingItem icon="eye-outline" label="공개 범위 설정"
          detail={privacySettings?.showSchools && privacySettings?.showWorkplace ? '전체 공개' : '일부 비공개'}
          onPress={() => router.push('/settings/visibility' as any)} />
        <SettingItem icon="document-text-outline" label="이용약관"
          onPress={() => Alert.alert('이용약관', 'Again School 이용약관입니다.')} />
        <SettingItem icon="shield-checkmark-outline" label="개인정보처리방침"
          onPress={() => Alert.alert('개인정보처리방침', 'Again School 개인정보처리방침입니다.')} />
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.card }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.primary} />
          <Text style={[styles.settingLabel, { color: colors.primary }]}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.card }]} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={22} color={colors.inactive} />
          <Text style={[styles.settingLabel, { color: colors.inactive }]}>계정 삭제</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: colors.inactive }]}>Again School v1.0.0</Text>
    </>
  ), [loadingPosts, workplace, privacySettings, colors, isDark, mode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <NameWithBadge
            name={displayName}
            uid={user?.uid}
            nameStyle={[styles.headerTitle, { color: colors.text }]}
            size="small"
          />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/upload')}>
            <Ionicons name="add-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings/notifications')}>
            <Ionicons name="menu-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <PostGrid
        posts={userPosts}
        loadingPosts={loadingPosts}
        isDark={isDark}
        colors={colors}
        hasMore={hasMoreRef.current}
        loadingMore={loadingPosts}
        onLoadMore={handleLoadMore}
        headerComponent={listHeader}
        footerComponent={listFooter}
      />

      {/* 학교 추가/수정 모달 */}
      <Modal visible={showSchoolModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingSchoolIndex !== null ? '학교 수정' : '학교 추가'}
              </Text>
              <TouchableOpacity onPress={() => { setShowSchoolModal(false); resetSchoolForm(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <KeyboardScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>학교 유형</Text>
              <View style={styles.schoolTypeRow}>
                {SCHOOL_TYPES.map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.schoolTypeChip, { backgroundColor: colors.card, borderColor: colors.border },
                      newSchoolType === t && { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}
                    onPress={() => setNewSchoolType(t)}
                  >
                    <Text style={[styles.schoolTypeText, { color: colors.textSecondary },
                      newSchoolType === t && { color: colors.primary, fontWeight: '700' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.text }]}>학교명</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="학교 이름 검색 (2글자 이상)"
                placeholderTextColor={colors.inactive}
                value={schoolSearchQuery}
                onChangeText={(text) => {
                  setSchoolSearchQuery(text);
                  setNewSchoolName(text);
                  if (schoolSearchTimerRef.current) clearTimeout(schoolSearchTimerRef.current);
                  if (newSchoolType === '대학교' || text.trim().length < 2) {
                    setSchoolSearchResults([]);
                    setShowSchoolResults(false);
                    return;
                  }
                  setIsSchoolSearching(true);
                  schoolSearchTimerRef.current = setTimeout(async () => {
                    const results = await searchSchools(text);
                    setSchoolSearchResults(results);
                    setShowSchoolResults(results.length > 0);
                    setIsSchoolSearching(false);
                  }, 500);
                }}
              />
              {isSchoolSearching && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
              )}
              {showSchoolResults && (
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginTop: 4, overflow: 'hidden', backgroundColor: colors.card }}>
                  {schoolSearchResults.map((school, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
                      onPress={() => {
                        setNewSchoolName(school.schoolName);
                        setSchoolSearchQuery(school.schoolName);
                        setNewSchoolType(school.schoolType as any);
                        setShowSchoolResults(false);
                        setSchoolSearchResults([]);
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{school.schoolName}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{school.schoolType} · {school.region}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.modalLabel, { color: colors.text }]}>졸업연도</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="예: 2012"
                placeholderTextColor={colors.inactive}
                value={newGradYear}
                onChangeText={setNewGradYear}
                keyboardType="number-pad"
                maxLength={4}
              />

              <View style={[styles.publicToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.publicToggleTitle, { color: colors.text }]}>같은 학교 동창에게만 공개</Text>
                  <Text style={[styles.publicToggleSub, { color: colors.inactive }]}>
                    {'같은 학교를 입력한 사람에게만\n이 학교 이름이 보입니다'}
                  </Text>
                </View>
                <Switch
                  value={newIsPublic}
                  onValueChange={setNewIsPublic}
                  trackColor={{ false: isDark ? '#555' : '#ddd', true: '#e8313a' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={[styles.publicHint, { backgroundColor: newIsPublic ? (isDark ? '#1a2e1a' : '#f0fdf4') : (isDark ? '#2e2010' : '#fff7ed') }]}>
                <Text style={[styles.publicHintText, { color: newIsPublic ? '#4CAF50' : '#f97316' }]}>
                  {newIsPublic
                    ? `🔓 ${newSchoolName.trim() || '이 학교'}를 입력한 사람만 이 학교 이름을 볼 수 있어요`
                    : '🔒 아무도 이 학교 이름을 볼 수 없어요'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }, addingSchool && { opacity: 0.5 }]}
                onPress={handleSaveSchool}
                disabled={addingSchool}
              >
                <Text style={styles.modalSaveBtnText}>
                  {addingSchool ? '저장 중...' : editingSchoolIndex !== null ? '수정하기' : '추가하기'}
                </Text>
              </TouchableOpacity>
            </KeyboardScrollView>
          </View>
        </View>
      </Modal>

      {/* 직장 수정 모달 */}
      <Modal visible={showWorkplaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>직장 정보</Text>
              <TouchableOpacity onPress={() => setShowWorkplaceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>회사명</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="회사명을 입력하세요"
                placeholderTextColor={colors.inactive}
                value={workplace}
                onChangeText={setWorkplace}
              />

              <View style={[styles.privacyRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.privacyLabel, { color: colors.text }]}>직장 공개</Text>
                  <Text style={[styles.privacySub, { color: colors.inactive }]}>동창에게 직장 정보 공개</Text>
                </View>
                <Switch
                  value={privacySettings.showWorkplace}
                  onValueChange={(val) => {
                    const updated = { ...privacySettings, showWorkplace: val };
                    setPrivacySettings(updated);
                  }}
                  trackColor={{ false: isDark ? '#555' : '#ddd', true: '#e8313a' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }, savingWorkplace && { opacity: 0.5 }]}
                onPress={async () => {
                  if (!user) return;
                  setSavingWorkplace(true);
                  try {
                    await updateUserProfile(user.uid, { workplace: workplace.trim(), privacySettings });
                    setShowWorkplaceModal(false);
                    Alert.alert('완료', '직장 정보가 저장되었습니다.');
                  } catch {
                    Alert.alert('오류', '저장에 실패했습니다.');
                  } finally {
                    setSavingWorkplace(false);
                  }
                }}
                disabled={savingWorkplace}
              >
                <Text style={styles.modalSaveBtnText}>{savingWorkplace ? '저장 중...' : '저장하기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 동창 현황 모달 */}
      <Modal visible={showConnectionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '70%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>동창 현황</Text>
              <TouchableOpacity onPress={() => setShowConnectionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* 탭 */}
            <View style={[styles.connTabs, { borderBottomColor: colors.border }]}>
              {(['connected', 'sent', 'received'] as const).map((tab) => {
                const labels = { connected: '연결됨', sent: '보낸 요청', received: '받은 요청' };
                const counts = { connected: connectedCount, sent: sentCount, received: receivedCount };
                return (
                  <TouchableOpacity key={tab}
                    style={[styles.connTab, connectionsTab === tab && { borderBottomColor: colors.primary }]}
                    onPress={() => setConnectionsTab(tab)}
                  >
                    <Text style={[styles.connTabText, { color: colors.inactive },
                      connectionsTab === tab && { color: colors.primary }]}>
                      {labels[tab]} ({counts[tab]})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FlatList
              data={filteredConnections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={[{ color: colors.inactive, fontSize: 15 }]}>목록이 비어 있습니다</Text>
                </View>
              }
              renderItem={({ item }) => {
                const otherName = item.fromUid === user?.uid ? item.toName : item.fromName;
                const otherUid = item.fromUid === user?.uid ? item.toUid : item.fromUid;
                return (
                  <View style={[styles.connCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={styles.connInfo} onPress={() => { setShowConnectionsModal(false); router.push(`/profile/${otherUid}`); }}>
                      <Image source={getAvatarSource(null)}
                        style={[styles.connAvatar, { backgroundColor: colors.border }]} />
                      <Text style={[styles.connName, { color: colors.text }]}>{otherName}</Text>
                    </TouchableOpacity>
                    <View style={styles.connActions}>
                      {connectionsTab === 'received' && (
                        <>
                          <TouchableOpacity style={[styles.connAcceptBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleAccept(item)}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>수락</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.connRejectBtn, { borderColor: colors.border }]}
                            onPress={() => handleReject(item)}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>거절</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {connectionsTab === 'sent' && (
                        <TouchableOpacity style={[styles.connRejectBtn, { borderColor: colors.border }]}
                          onPress={() => handleCancelRequest(item)}>
                          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>취소</Text>
                        </TouchableOpacity>
                      )}
                      {connectionsTab === 'connected' && (
                        <TouchableOpacity style={[styles.connAcceptBtn, { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}
                          onPress={() => { setShowConnectionsModal(false); router.push({ pathname: '/chat/[id]', params: { id: otherUid, name: otherName, avatar: String((otherUid.charCodeAt(0) % 70) || 1) } }); }}>
                          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>메시지</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* 프로필 이미지 크롭 모달 */}
      {cropVisible && cropTargetUri !== '' && (
        <Modal visible animationType="slide" statusBarTranslucent>
          <CropEditor
            imageUri={cropTargetUri}
            originalSize={cropAssetSize ?? undefined}
            onCropDone={handleCropDone}
            onCancel={() => { setCropVisible(false); setCropTargetUri(''); }}
            squareOnly
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

function SettingItem({ icon, label, detail, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; detail?: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={colors.text} />
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {detail && <Text style={[styles.settingDetail, { color: colors.inactive }]}>{detail}</Text>}
      <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: { paddingBottom: 20 },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  avatar: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: Colors.primary,
  },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  profileInfo: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 2,
  },
  displayName: { fontSize: 16, fontWeight: 'bold' },
  job: { fontSize: 14, marginTop: 2 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  regionText: { fontSize: 13 },
  editBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 학교 칩
  schoolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  schoolChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  schoolChipYear: {
    fontSize: 11,
  },
  // 그리드 탭 바
  gridTabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginTop: 16,
  },
  gridTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  // 게시물 그리드
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postGridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  postGridImage: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: '#f0f0f0',
  },
  multiImageIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  videoIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  emptyGrid: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyGridText: {
    fontSize: 15,
  },
  // 기존 섹션 스타일
  section: { backgroundColor: '#fff', marginTop: 10, paddingHorizontal: 20, paddingVertical: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  schoolCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, marginBottom: 10, borderWidth: 1,
  },
  schoolEmoji: { fontSize: 24, marginRight: 12 },
  schoolInfo: { flex: 1 },
  schoolName: { fontSize: 15, fontWeight: '700' },
  schoolDetail: { fontSize: 13, marginTop: 2 },
  schoolPublicLabel: { fontSize: 11, marginTop: 3 },
  schoolActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  schoolActionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  schoolActionText: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 14, marginBottom: 12 },
  addSchoolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, marginTop: 4,
  },
  addSchoolText: { fontSize: 14, fontWeight: '600' },
  statDivider: { width: 1, height: 40, alignSelf: 'center' },
  receivedBadge: {
    position: 'absolute', top: -6, right: 8, backgroundColor: Colors.primary,
    borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  receivedBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.primary, borderRadius: 16, padding: 18,
  },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  premiumText: { flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  settingLabel: { flex: 1, fontSize: 15, marginLeft: 14 },
  settingDetail: { fontSize: 13, marginRight: 6 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24 },

  // 모달 공통
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 30 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalSaveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 학교 타입 선택
  schoolTypeRow: { flexDirection: 'row', gap: 8 },
  schoolTypeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  schoolTypeText: { fontSize: 13, fontWeight: '500' },

  // 공개 범위 토글
  publicToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1,
  },
  publicToggleTitle: { fontSize: 14, fontWeight: '700' },
  publicToggleSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  publicHint: { borderRadius: 8, padding: 10, marginTop: 8 },
  publicHintText: { fontSize: 12, lineHeight: 18 },

  // 학교 이름 + 동창 수 배지
  schoolNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  memberBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  memberBadgeText: { fontSize: 12, fontWeight: '700' },

  // 개인정보 설정
  privacyDesc: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  privacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderWidth: 1,
  },
  privacyLabel: { fontSize: 14, fontWeight: '600' },
  privacySub: { fontSize: 12, marginTop: 2 },
  privacyHint: { borderRadius: 8, padding: 10, marginTop: 12 },
  privacyHintText: { fontSize: 12, lineHeight: 18 },

  // 동창 현황 모달
  connTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  connTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  connTabText: { fontSize: 13, fontWeight: '600' },
  connCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  connInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  connAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  connName: { fontSize: 15, fontWeight: '600' },
  connActions: { flexDirection: 'row', gap: 6 },
  connAcceptBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  connRejectBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },

  // 동창 인증 현황
  trustSection: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  trustSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trustSectionTitle: { fontSize: 15, fontWeight: '700' },
  trustBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trustSchoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  trustSchoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  trustSchoolName: { fontSize: 14, fontWeight: '600' },
  trustSchoolYear: { fontSize: 12, marginTop: 1 },
  trustSchoolRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustSchoolCount: { fontSize: 12 },
  trustTotalRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  trustTotalText: { fontSize: 12 },
});
