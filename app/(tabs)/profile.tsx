import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
import { UserProfile, SchoolEntry, UserPrivacySettings, ConnectionRequest } from '../../src/types/auth';
import { useSchoolMemberCounts } from '../../src/hooks/useSchoolMemberCount';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../src/config/firebase';

const SCHOOL_TYPES: SchoolEntry['schoolType'][] = ['초등학교', '중학교', '고등학교', '대학교'];

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

  // 직장 편집
  const [workplace, setWorkplace] = useState('');
  const [showWorkplaceModal, setShowWorkplaceModal] = useState(false);
  const [savingWorkplace, setSavingWorkplace] = useState(false);

  // 개인정보 공개 설정
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>({
    showWorkplace: true,
    showSchools: true,
  });

  // 동창 현황 모달
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<'connected' | 'sent' | 'received'>('connected');

  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(user.uid, (p) => {
      setProfile(p);
      if (p) {
        setWorkplace(p.workplace ?? '');
        setPrivacySettings(p.privacySettings ?? { showWorkplace: true, showSchools: true });
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyConnections(user.uid, setConnections);
  }, [user]);

  const connectedCount = connections.filter((c) => c.status === 'accepted').length;
  const sentCount = connections.filter((c) => c.status === 'pending' && c.fromUid === user?.uid).length;
  const receivedCount = connections.filter((c) => c.status === 'pending' && c.toUid === user?.uid).length;

  const displayName = profile?.displayName || user?.displayName || '사용자';
  const job = profile?.job || '';
  const region = profile?.region ? `${profile.region.sido} ${profile.region.sigungu}`.trim() : '';
  const schools = profile?.schools || [];
  const schoolNames = schools.map((s) => s.schoolName);
  const schoolMemberCounts = useSchoolMemberCounts(schoolNames);

  // 프로필 이미지 변경 + 전체 동기화
  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && user) {
      setUploadingPhoto(true);
      try {
        const uploaded = await uploadImage(result.assets[0].uri);
        const newPhotoURL = uploaded.url;

        // 1. Firebase Auth 업데이트
        await updateProfile(user, { photoURL: newPhotoURL });

        // 2. Firestore users/{uid} 업데이트
        await updateUserProfile(user.uid, { photoURL: newPhotoURL });

        // 3. 내가 쓴 게시물 authorPhotoURL 일괄 업데이트
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), where('authorUid', '==', user.uid)),
        );
        if (!postsSnap.empty) {
          const postsBatch = writeBatch(db);
          postsSnap.docs.forEach((d) => postsBatch.update(d.ref, { authorPhotoURL: newPhotoURL }));
          await postsBatch.commit();
        }

        // 4. 내가 쓴 스토리 photoURL 일괄 업데이트
        const storiesSnap = await getDocs(
          query(collection(db, 'stories'), where('uid', '==', user.uid)),
        );
        if (!storiesSnap.empty) {
          const storiesBatch = writeBatch(db);
          storiesSnap.docs.forEach((d) => storiesBatch.update(d.ref, { photoURL: newPhotoURL }));
          await storiesBatch.commit();
        }

        // 5. 내가 만든 모임 hostPhotoURL 일괄 업데이트
        const meetupsSnap = await getDocs(
          query(collection(db, 'meetups'), where('hostUid', '==', user.uid)),
        );
        if (!meetupsSnap.empty) {
          const meetupsBatch = writeBatch(db);
          meetupsSnap.docs.forEach((d) => meetupsBatch.update(d.ref, { hostPhotoURL: newPhotoURL }));
          await meetupsBatch.commit();
        }

        // 6. 내 채팅방 participantPhotos 업데이트
        const chatsSnap = await getDocs(
          query(collection(db, 'chatRooms'), where('participants', 'array-contains', user.uid)),
        );
        if (!chatsSnap.empty) {
          const chatsBatch = writeBatch(db);
          chatsSnap.docs.forEach((d) => chatsBatch.update(d.ref, { [`participantPhotos.${user.uid}`]: newPhotoURL }));
          await chatsBatch.commit();
        }

        Alert.alert('완료', '프로필 사진이 변경되었습니다.');
      } catch {
        Alert.alert('오류', '사진 업로드에 실패했습니다.');
      } finally {
        setUploadingPhoto(false);
      }
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
  }

  function handleEditSchool(index: number) {
    const s = schools[index];
    setEditingSchoolIndex(index);
    setNewSchoolName(s.schoolName);
    setNewSchoolType(s.schoolType);
    setNewGradYear(String(s.graduationYear));
    setNewIsPublic(s.isPublic ?? true);
    setShowSchoolModal(true);
  }

  function handleDeleteSchool(index: number) {
    Alert.alert('학교 삭제', `"${schools[index].schoolName}"을 삭제하시겠습니까?`, [
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
  const filteredConnections = connections.filter((c) => {
    if (connectionsTab === 'connected') return c.status === 'accepted';
    if (connectionsTab === 'sent') return c.status === 'pending' && c.fromUid === user?.uid;
    return c.status === 'pending' && c.toUid === user?.uid;
  });

  const photoUrl = profile?.photoURL ?? null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      <KeyboardScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 프로필 섹션 */}
        <View style={[styles.profileSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
          <NameWithBadge
            name={displayName}
            uid={user?.uid}
            nameStyle={[styles.displayName, { color: colors.text }]}
            size="medium"
          />
          {job ? <Text style={[styles.job, { color: colors.textSecondary }]}>{job}</Text> : null}
          {workplace ? (
            <View style={styles.regionRow}>
              <Ionicons name="briefcase-outline" size={14} color={colors.inactive} />
              <Text style={[styles.regionText, { color: colors.inactive }]}>{workplace}</Text>
            </View>
          ) : null}
          {region ? (
            <View style={styles.regionRow}>
              <Ionicons name="location-outline" size={14} color={colors.inactive} />
              <Text style={[styles.regionText, { color: colors.inactive }]}>{region}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>프로필 편집</Text>
          </TouchableOpacity>
        </View>

        {/* 학교 이력 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>내 학교 이력</Text>
          {schools.length > 0 ? (
            schools.map((s, i) => (
              <View key={i} style={[styles.schoolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.schoolEmoji}>
                  {s.schoolType === '초등학교' ? '🏫' : s.schoolType === '중학교' ? '🏛️' : '🎓'}
                </Text>
                <View style={styles.schoolInfo}>
                  <View style={styles.schoolNameRow}>
                    <Text style={[styles.schoolName, { color: colors.text }]}>{s.schoolName}</Text>
                    <View style={[styles.memberBadge, { backgroundColor: isDark ? '#3f2020' : '#fee2e2' }]}>
                      <Text style={[styles.memberBadgeText, { color: colors.primary }]}>
                        동창 {schoolMemberCounts[s.schoolName] ?? 0}명
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.schoolDetail, { color: colors.textSecondary }]}>
                    {s.schoolType} · {s.graduationYear}년 졸업
                  </Text>
                  <Text style={[styles.schoolPublicLabel, { color: (s.isPublic ?? true) ? '#4CAF50' : '#e8313a' }]}>
                    {(s.isPublic ?? true) ? '🔓 같은 학교 동창에게만 공개' : '🔒 비공개'}
                  </Text>
                </View>
                <View style={styles.schoolActions}>
                  <TouchableOpacity
                    style={[styles.schoolActionBtn, { backgroundColor: isDark ? colors.surface2 : '#f0f0f0' }]}
                    onPress={() => handleEditSchool(i)}
                  >
                    <Text style={[styles.schoolActionText, { color: isDark ? colors.text : '#333' }]}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.schoolActionBtn, { backgroundColor: isDark ? '#3f2020' : '#fee2e2' }]}
                    onPress={() => handleDeleteSchool(i)}
                  >
                    <Text style={[styles.schoolActionText, { color: '#e8313a' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.inactive }]}>등록된 학교가 없습니다</Text>
          )}
          <TouchableOpacity
            style={[styles.addSchoolBtn, { borderTopColor: colors.border }]}
            onPress={() => { resetSchoolForm(); setShowSchoolModal(true); }}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addSchoolText, { color: colors.primary }]}>학교 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 직장 정보 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>직장 정보</Text>
          {workplace ? (
            <View style={[styles.schoolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.schoolEmoji}>💼</Text>
              <View style={styles.schoolInfo}>
                <Text style={[styles.schoolName, { color: colors.text }]}>{workplace}</Text>
                <Text style={[styles.schoolPublicLabel, { color: privacySettings.showWorkplace ? '#4CAF50' : '#e8313a' }]}>
                  {privacySettings.showWorkplace ? '🔓 동창에게 공개' : '🔒 비공개'}
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

        {/* 동창 현황 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>동창 현황</Text>
          <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.statItem} onPress={() => { setConnectionsTab('connected'); setShowConnectionsModal(true); }}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{connectedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>연결된 동창</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.statItem} onPress={() => { setConnectionsTab('sent'); setShowConnectionsModal(true); }}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{sentCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>보낸 요청</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.statItem} onPress={() => { setConnectionsTab('received'); setShowConnectionsModal(true); }}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{receivedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>받은 요청</Text>
              {receivedCount > 0 && (
                <View style={styles.receivedBadge}>
                  <Text style={styles.receivedBadgeText}>{receivedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 동창 초대하기 */}
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => router.push('/invite')}
          activeOpacity={0.85}
        >
          <Text style={styles.inviteBtnEmoji}>🏫</Text>
          <Text style={styles.inviteBtnText}>동창 초대하기</Text>
        </TouchableOpacity>

        {/* 저장된 게시물 */}
        <TouchableOpacity
          style={[styles.menuRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={() => router.push('/bookmarks')}
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark-outline" size={22} color={colors.text} />
          <Text style={[styles.menuRowLabel, { color: colors.text }]}>저장된 게시물</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </TouchableOpacity>

        {/* 프리미엄 배너 */}
        <TouchableOpacity style={styles.premiumBanner} activeOpacity={0.85}>
          <View style={styles.premiumContent}>
            <Ionicons name="star" size={24} color="#fff" />
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>프리미엄으로 업그레이드</Text>
              <Text style={styles.premiumSub}>더 많은 동창을 찾아보세요</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

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
          <SettingItem icon="eye-outline" label="공개 범위 설정"
            detail={privacySettings.showSchools && privacySettings.showWorkplace ? '전체 공개' : '일부 비공개'}
            onPress={() => Alert.alert('개인정보 공개 설정', '위의 "개인정보 공개 설정" 섹션에서 변경할 수 있습니다.')} />
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
      </KeyboardScrollView>

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
                placeholder="예: 한빛중학교"
                placeholderTextColor={colors.inactive}
                value={newSchoolName}
                onChangeText={setNewSchoolName}
              />

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
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scrollContent: { paddingBottom: 20 },
  profileSection: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 24, backgroundColor: '#fff', borderBottomWidth: 1,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50, marginBottom: 14, borderWidth: 3, borderColor: Colors.primary,
  },
  cameraIcon: {
    position: 'absolute', bottom: 14, right: 0, width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  displayName: { fontSize: 22, fontWeight: 'bold' },
  job: { fontSize: 14, marginTop: 4 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  regionText: { fontSize: 13 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
  },
  editBtnText: { fontSize: 14, fontWeight: '600' },
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
  statsRow: { flexDirection: 'row', borderRadius: 14, padding: 16 },
  statItem: { flex: 1, alignItems: 'center', position: 'relative' },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
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

  // 초대 버튼
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8313a',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  inviteBtnEmoji: { fontSize: 18 },
  inviteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // 메뉴 행 (저장된 게시물 등)
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  menuRowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
