import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActionSheetIOS,
  Modal,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import {
  getOrCreateChatRoom,
  sendMessage,
  subscribeMessages,
  markAsRead,
} from '../../src/services/chatService';
import { getUserProfile } from '../../src/services/firestoreService';
import { uploadToCloudinary } from '../../src/services/uploadService';
import { uploadVideoToCloudinary } from '../../src/utils/uploadVideo';
import { CropEditor } from '../../src/components/CropEditor';
import { ChatMessage } from '../../src/types/auth';
import { getDummyMessages } from '../../src/data/dummyClassmates';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_BUBBLE_IMAGE_WIDTH = SCREEN_WIDTH * 0.55;

interface DisplayMessage {
  id: string;
  senderUid: string;
  text: string;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  time: string;
  date: string;
  isMe: boolean;
  readBy?: string[];
}

interface PreviewMedia {
  url: string;
  type: 'image' | 'video';
}

export default function ChatRoomScreen() {
  const { id: otherUid, name, avatar, online } = useLocalSearchParams<{
    id: string;
    name: string;
    avatar: string;
    online: string;
  }>();

  const { user } = useAuth();
  const { colors } = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [cropVisible, setCropVisible] = useState(false);
  const [cropTargetUri, setCropTargetUri] = useState('');
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const flatListRef = useRef<FlatList>(null);
  const videoRef = useRef<Video>(null);
  const [isOnline, setIsOnline] = useState(online === '1');
  const avatarImg = Number(avatar) || 1;

  // 상대방 온라인 상태 실시간 구독
  useEffect(() => {
    if (!otherUid) {
      console.log('[Chat] otherUid 없음 — 온라인 상태 구독 스킵');
      return;
    }
    console.log('[Chat] 상대방 온라인 상태 구독 시작:', otherUid);
    return onSnapshot(doc(db, 'users', otherUid), (snap) => {
      if (snap.exists()) {
        const online = snap.data()?.isOnline === true;
        setIsOnline(online);
      }
    }, (error) => {
      console.warn('[Chat] 온라인 상태 구독 오류:', error);
    });
  }, [otherUid]);

  // 채팅방 초기화
  useEffect(() => {
    if (!user || !otherUid) return;
    (async () => {
      try {
        const myProfile = await getUserProfile(user.uid);
        const rid = await getOrCreateChatRoom(
          user.uid,
          myProfile?.displayName ?? '나',
          1,
          otherUid,
          name ?? '동창',
          avatarImg,
        );
        setRoomId(rid);
        markAsRead(rid, user.uid).catch(() => {});
      } catch {
        // Firestore 에러 시 더미 모드
      }
    })();
  }, [user, otherUid]);

  // Firestore 메시지 구독
  useEffect(() => {
    if (!roomId) return;
    return subscribeMessages(roomId, setFirestoreMessages);
  }, [roomId]);

  // 메시지 합치기 (inverted용으로 역순)
  useEffect(() => {
    const myUid = user?.uid ?? 'me';

    const fsDisplay: DisplayMessage[] = firestoreMessages.map((m) => ({
      id: m.id,
      senderUid: m.senderUid,
      text: m.text,
      imageUrl: m.imageUrl,
      mediaType: m.mediaType,
      time: formatMsgTime(m.createdAt),
      date: formatMsgDate(m.createdAt),
      isMe: m.senderUid === myUid,
      readBy: m.readBy,
    }));

    if (fsDisplay.length > 0) {
      setMessages([...fsDisplay].reverse());
      return;
    }

    const dummy = getDummyMessages(otherUid ?? 'd1');
    const dummyDisplay: DisplayMessage[] = dummy.map((m) => ({
      id: m.id,
      senderUid: m.senderUid,
      text: m.text,
      imageUrl: m.imageUrl,
      time: m.time,
      date: m.date,
      isMe: m.senderUid === 'me',
    }));
    setMessages([...dummyDisplay].reverse());
  }, [firestoreMessages, user, otherUid]);

  // 이미지 원본 비율 계산
  const getImageHeight = useCallback((url: string) => {
    if (imageHeights[url]) return imageHeights[url];
    Image.getSize(
      url,
      (w, h) => {
        const ratio = h / w;
        const height = Math.round(MAX_BUBBLE_IMAGE_WIDTH * ratio);
        setImageHeights((prev) => ({ ...prev, [url]: Math.min(height, 300) }));
      },
      () => {},
    );
    return 150; // 기본값
  }, [imageHeights]);

  // 메시지 전송
  async function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    if (roomId && user) {
      try {
        await sendMessage(roomId, user.uid, text);
        return;
      } catch {}
    }

    const now = Date.now();
    setMessages((prev) => [
      {
        id: `local-${now}`,
        senderUid: 'me',
        text,
        time: formatMsgTime(now),
        date: '오늘',
        isMe: true,
      },
      ...prev,
    ]);
  }

  // 파일 첨부 액션시트
  function handleAttach() {
    const options = ['사진 촬영', '사진', '동영상', '사진+동영상', '취소'];
    const cancelButtonIndex = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) pickCamera();
          else if (buttonIndex === 1) pickMedia('image');
          else if (buttonIndex === 2) pickMedia('video');
          else if (buttonIndex === 3) pickMedia('all');
        },
      );
    } else {
      Alert.alert('파일 첨부', '무엇을 전송하시겠습니까?', [
        { text: '사진 촬영', onPress: pickCamera },
        { text: '사진', onPress: () => pickMedia('image') },
        { text: '동영상', onPress: () => pickMedia('video') },
        { text: '사진+동영상', onPress: () => pickMedia('all') },
        { text: '취소', style: 'cancel' },
      ]);
    }
  }

  async function pickCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      // 카메라 촬영 = 항상 이미지 → 자르기 화면
      setCropTargetUri(result.assets[0].uri);
      setCropVisible(true);
    }
  }

  async function pickMedia(type: 'image' | 'video' | 'all') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const mediaTypes =
      type === 'image'
        ? ImagePicker.MediaTypeOptions.Images
        : type === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: false,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const isVideo = Boolean(
      asset.type === 'video' ||
      (asset.uri && (
        asset.uri.includes('.mp4') ||
        asset.uri.includes('.mov') ||
        asset.uri.includes('.avi') ||
        asset.uri.includes('.mkv')
      )) ||
      (asset.mimeType && asset.mimeType.startsWith('video/'))
    );

    console.log('채팅 미디어 선택:', {
      uri: asset.uri?.substring(0, 60),
      type: asset.type,
      mimeType: asset.mimeType,
      isVideo,
    });

    if (isVideo) {
      await uploadAndSendMedia(asset.uri, 'video');
    } else {
      setCropTargetUri(asset.uri);
      setCropVisible(true);
    }
  }

  // 자르기 완료 후 전송
  async function handleCropDone(croppedUri: string) {
    setCropVisible(false);
    setCropTargetUri('');
    await uploadAndSendMedia(croppedUri, 'image');
  }

  // 실제 업로드 + 메시지 전송
  async function uploadAndSendMedia(uri: string, type: 'image' | 'video') {
    if (!uri || uri.trim() === '') {
      Alert.alert('오류', '파일을 찾을 수 없습니다.');
      return;
    }

    setSending(true);
    setUploadProgress(0);
    setUploadStatus('');

    try {
      const finalUri = uri;

      setUploadStatus('업로드 중...');
      console.log('채팅 미디어 업로드 시작:', { uri: finalUri.substring(0, 60), type });

      let url: string;
      if (type === 'video') {
        url = await uploadVideoToCloudinary(finalUri, (pct) => setUploadProgress(pct));
      } else {
        url = await uploadToCloudinary(finalUri, 'image', (pct) => setUploadProgress(pct));
      }

      console.log('채팅 업로드 성공:', url?.substring(0, 60));

      if (roomId && user) {
        await sendMessage(roomId, user.uid, '', url, type);
      } else {
        const now = Date.now();
        setMessages((prev) => [
          {
            id: `local-media-${now}`,
            senderUid: 'me',
            text: '',
            imageUrl: url,
            mediaType: type,
            time: formatMsgTime(now),
            date: '오늘',
            isMe: true,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      console.error('채팅 미디어 업로드 실패:', err);
      const msg = type === 'video'
        ? '동영상 전송에 실패했습니다.\n동영상이 너무 크면 짧게 줄여주세요.'
        : '이미지 전송에 실패했습니다.';
      Alert.alert('전송 실패', err?.message || msg);
    } finally {
      setSending(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  }

  // 영상 모달 닫기 (크래시 방지)
  async function handleClosePreview() {
    try {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.unloadAsync();
      }
    } catch (e) {
      console.warn('영상 정리 오류:', e);
    }
    setPreviewMedia(null);
  }

  // 날짜 구분선 필요 여부
  function needsDateDivider(index: number): boolean {
    if (index === messages.length - 1) return true;
    return messages[index].date !== messages[index + 1].date;
  }

  // 미디어 버블 렌더
  function renderMediaBubble(item: DisplayMessage) {
    const isVideo = item.mediaType === 'video';
    const url = item.imageUrl!;
    const imgH = getImageHeight(url);

    if (isVideo) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPreviewMedia({ url, type: 'video' })}
        >
          <View style={[styles.mediaBubble, { width: MAX_BUBBLE_IMAGE_WIDTH, height: 180 }]}>
            <Video
              source={{ uri: url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isMuted
              onError={(e) => console.warn('채팅 영상 썸네일 오류:', e)}
            />
            <View style={styles.videoPlayOverlay}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPreviewMedia({ url, type: 'image' })}
      >
        <Image
          source={{ uri: url }}
          style={[styles.mediaBubble, { width: MAX_BUBBLE_IMAGE_WIDTH, height: imgH }]}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  const renderMessage = useCallback(
    ({ item, index }: { item: DisplayMessage; index: number }) => {
      const showDate = needsDateDivider(index);
      const hasMedia = !!item.imageUrl;

      return (
        <>
          {item.isMe ? (
            <View style={[styles.bubbleRow, styles.bubbleRowRight]}>
              <View style={styles.bubbleMetaLeft}>
                {item.readBy?.includes(otherUid ?? '') ? null : (
                  <Text style={[styles.readLabel, { color: colors.inactive }]}>읽지않음</Text>
                )}
                <Text style={[styles.bubbleTime, { color: colors.inactive }]}>{item.time}</Text>
              </View>
              {hasMedia ? (
                <View style={[styles.mediaBubbleWrap, styles.bubbleMine]}>
                  {renderMediaBubble(item)}
                </View>
              ) : (
                <View style={[styles.bubble, styles.bubbleMine, { backgroundColor: '#FEE500' }]}>
                  <Text style={[styles.bubbleText, { color: '#1A1A1A' }]}>{item.text}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
              <Image
                source={getAvatarSource(null)}
                style={styles.bubbleAvatar}
              />
              <View style={{ maxWidth: '72%' }}>
                <Text style={[styles.bubbleSender, { color: colors.textSecondary }]}>{name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                  {hasMedia ? (
                    <View style={[styles.mediaBubbleWrap, styles.bubbleOtherMedia]}>
                      {renderMediaBubble(item)}
                    </View>
                  ) : (
                    <View
                      style={[styles.bubble, styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                    </View>
                  )}
                  <Text style={[styles.bubbleTime, { color: colors.inactive }]}>{item.time}</Text>
                </View>
              </View>
            </View>
          )}

          {showDate && (
            <View style={styles.dateDivider}>
              <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dateText, { color: colors.inactive }]}>{item.date}</Text>
              <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            </View>
          )}
        </>
      );
    },
    [messages, name, avatarImg, colors, imageHeights],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface2 }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => router.push(`/profile/${otherUid}`)}
          activeOpacity={0.7}
        >
          <Image
            source={getAvatarSource(null)}
            style={styles.headerAvatar}
          />
          <View>
            <NameWithBadge name={name as string} uid={otherUid as string} nameStyle={styles.headerName} />
            <Text style={[styles.headerStatus, isOnline && { color: '#a5f3a6' }]}>
              {isOnline ? '온라인' : '오프라인'}
            </Text>
          </View>
          {isOnline && <View style={styles.headerOnline} />}
        </TouchableOpacity>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 46 : 0}
      >
      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messageList, { paddingBottom: 8 }]}
        showsVerticalScrollIndicator={false}
        inverted
        keyboardShouldPersistTaps="handled"
      />

      {/* 전송 중 표시 */}
      {sending && (
        <View style={[styles.sendingBar, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.sendingText, { color: colors.textSecondary }]}>전송 중...</Text>
        </View>
      )}

      {/* 입력창 */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="메시지를 입력하세요"
          placeholderTextColor={colors.inactive}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? colors.primary : colors.card },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? '#fff' : colors.inactive}
          />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* 자르기 모달 */}
      {cropVisible && cropTargetUri !== '' && (
        <Modal visible animationType="slide" statusBarTranslucent>
          <CropEditor
            imageUri={cropTargetUri}
            onCropDone={handleCropDone}
            onCancel={() => { setCropVisible(false); setCropTargetUri(''); }}
          />
        </Modal>
      )}

      {/* 업로드 진행 오버레이 */}
      {sending && uploadProgress > 0 && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadBox}>
            <ActivityIndicator size="large" color="#e8313a" />
            <Text style={styles.uploadBoxTitle}>{uploadStatus || '전송 중...'}</Text>
            <View style={styles.uploadBarBg}>
              <View style={[styles.uploadBarFill, { width: `${uploadProgress}%` as `${number}%` }]} />
            </View>
            <Text style={styles.uploadBoxPct}>{uploadProgress}%</Text>
          </View>
        </View>
      )}

      {/* 미디어 전체화면 모달 */}
      <Modal visible={!!previewMedia} transparent animationType="fade" onRequestClose={handleClosePreview}>
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={handleClosePreview}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewMedia?.type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri: previewMedia.url }}
              style={styles.fullscreenImage}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              isLooping={false}
              onError={(e) => console.warn('채팅 전체화면 영상 오류:', e)}
            />
          ) : previewMedia ? (
            <Image
              source={{ uri: previewMedia.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatMsgTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const hour = h % 12 || 12;
  return `${period} ${hour}:${m}`;
}

function formatMsgDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return '오늘';
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginLeft: 4,
  },

  messageList: { padding: 16, paddingBottom: 8 },

  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: { flex: 1, height: 1 },
  dateText: {
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '500',
  },

  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 2,
  },
  bubbleSender: {
    fontSize: 12,
    marginBottom: 3,
    fontWeight: '500',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  bubbleMine: {
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11 },
  bubbleMetaLeft: { justifyContent: 'flex-end', alignItems: 'flex-end', marginRight: 6 },
  readLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1 },

  // 미디어 버블
  mediaBubbleWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bubbleOtherMedia: {
    borderTopLeftRadius: 4,
  },
  mediaBubble: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  sendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  sendingText: { fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: 180,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  uploadBarBg: {
    width: '100%',
    height: 5,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadBarFill: {
    height: '100%',
    backgroundColor: '#e8313a',
    borderRadius: 3,
  },
  uploadBoxPct: {
    fontSize: 12,
    color: '#999',
  },

  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.75,
  },
});
