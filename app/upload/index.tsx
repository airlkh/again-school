import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { createStory } from '../../src/services/storyService';
import { createPost } from '../../src/services/postService';
import { CLOUDINARY_CONFIG } from '../../src/config/cloudinary';

const { width: SW, height: SH } = Dimensions.get('window');

// 동영상 여부 감지 (확장자 + type 필드)
function isVideoMedia(uri?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type UploadTarget = 'post' | 'story' | 'both';
type Step = 'gallery' | 'edit' | 'share';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
}

export default function UploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { uid, displayName, avatarImg, photoURL } = useCurrentUser();
  const params = useLocalSearchParams();

  // 단계
  const [step, setStep] = useState<Step>('gallery');

  // 미디어
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [imageHeight, setImageHeight] = useState(SW);

  // 편집
  const [overlayText, setOverlayText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [showTextInput, setShowTextInput] = useState(false);
  const [bgStyle, setBgStyle] = useState<'none' | 'semi' | 'solid'>('none');

  // 텍스트 드래그 (PanGestureHandler + Animated)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPan = useRef({ x: 0, y: 0 });

  const onTextGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: true },
  ) as any;

  const onTextHandlerStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      lastPan.current.x += e.nativeEvent.translationX;
      lastPan.current.y += e.nativeEvent.translationY;
      pan.x.setOffset(lastPan.current.x);
      pan.y.setOffset(lastPan.current.y);
      pan.setValue({ x: 0, y: 0 });
    }
  };

  // 합성 이미지 URI (edit → share 전환 시 캡처)
  const [compositeUri, setCompositeUri] = useState<string | null>(null);

  // 공유 설정
  const [caption, setCaption] = useState('');
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>(
    (params.target as UploadTarget) || 'post',
  );

  // 업로드
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // ViewShot ref (텍스트 합성용)
  const viewShotRef = useRef<any>(null);

  // 키보드 높이 추적
  const [keyboardH, setKeyboardH] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardH(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardH(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // 갤러리 로드
  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return;

    const assets = await MediaLibrary.getAssetsAsync({
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      first: 100,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    const items: MediaItem[] = assets.assets.map((a) => ({
      uri: a.uri,
      type: a.mediaType === MediaLibrary.MediaType.video ? 'video' : 'image',
      width: a.width,
      height: a.height,
      duration: a.duration,
    }));

    setMediaList(items);
  };

  // 미디어 선택/해제
  const toggleSelect = (item: MediaItem) => {
    const exists = selectedMedia.find((m) => m.uri === item.uri);
    if (exists) {
      setSelectedMedia((prev) => prev.filter((m) => m.uri !== item.uri));
    } else {
      if (selectedMedia.length >= 10) {
        Alert.alert('최대 10개까지 선택 가능해요');
        return;
      }
      setSelectedMedia((prev) => [...prev, item]);
    }
  };

  // 텍스트 배경 스타일
  const getTextBg = () => {
    if (bgStyle === 'solid') return 'rgba(0,0,0,0.75)';
    if (bgStyle === 'semi') return 'rgba(0,0,0,0.4)';
    return 'transparent';
  };

  // ViewShot으로 이미지+텍스트 합성 (edit 단계에서 호출)
  const captureComposite = async (): Promise<string> => {
    if (!overlayText.trim()) {
      return selectedMedia[0]?.uri || '';
    }
    try {
      // Animated offset을 flatten해서 네이티브에 반영
      pan.x.flattenOffset();
      pan.y.flattenOffset();
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        console.log('캡처 성공:', uri);
        return uri;
      }
      return selectedMedia[0]?.uri || '';
    } catch (err) {
      console.warn('캡처 실패, 원본 사용:', err);
      return selectedMedia[0]?.uri || '';
    }
  };

  // edit → share 전환: 이미지면 캡처 후 이동, 동영상이면 바로 이동
  const goToShare = async () => {
    try {
      if (isVideoMedia(selectedMedia[0]?.uri, selectedMedia[0]?.type)) {
        setCompositeUri(null);
        setStep('share');
        return;
      }
      const uri = await captureComposite();
      setCompositeUri(uri);
      setStep('share');
    } catch (e: any) {
      console.warn('goToShare 오류:', e);
      Alert.alert('오류', e?.message || '다시 시도해주세요');
    }
  };

  // 업로드 함수
  const uploadMedia = async (
    uri: string,
    type: 'image' | 'video',
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    const isVideo = isVideoMedia(uri, type);

    return new Promise((resolve, reject) => {
      const formData = new FormData();

      formData.append('file', {
        uri: uri,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
        name: isVideo
          ? `video_${Date.now()}.mp4`
          : `image_${Date.now()}.jpg`,
      } as any);

      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      if (isVideo) {
        formData.append('resource_type', 'video');
      }

      const xhr = new XMLHttpRequest();
      xhr.timeout = 600000;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.secure_url);
        } else {
          console.error('Cloudinary 오류:', xhr.status, xhr.responseText);
          reject(new Error(`업로드 실패: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('네트워크 오류'));
      xhr.ontimeout = () => reject(new Error('시간 초과'));

      const url = isVideo
        ? CLOUDINARY_CONFIG.videoUploadUrl
        : CLOUDINARY_CONFIG.imageUploadUrl;

      xhr.open('POST', url);
      xhr.send(formData);
    });
  };

  // 최종 업로드
  const handleShare = async () => {
    if (selectedMedia.length === 0) {
      Alert.alert('알림', '미디어를 선택해주세요');
      return;
    }
    if (!uid) {
      Alert.alert('오류', '로그인이 필요합니다');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadStatus('');

    try {
      const results: { url: string; type: 'image' | 'video' }[] = [];

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const isVideo = media.type === 'video';

        // 첫 번째 이미지: 합성 URI 사용 (텍스트 오버레이 포함)
        let uriToUpload =
          i === 0 && !isVideo && compositeUri ? compositeUri : media.uri;

        setUploadStatus('업로드 중...');
        const url = await uploadMedia(
          uriToUpload,
          isVideo ? 'video' : 'image',
          (pct) => {
            const total =
              (i / selectedMedia.length) * 100 + pct / selectedMedia.length;
            setProgress(Math.round(total));
          },
        );

        results.push({ url, type: isVideo ? 'video' : 'image' });
      }

      // 게시물 저장
      if (uploadTarget === 'post' || uploadTarget === 'both') {
        const firstResult = results[0];
        const firstIsVideo = firstResult?.type === 'video';

        // Cloudinary 동영상 썸네일: 확장자를 .jpg로 변경
        const videoThumbnail = firstIsVideo && firstResult?.url
          ? firstResult.url.replace(/\.(mp4|mov|avi|webm)($|\?)/, '.jpg$2')
          : undefined;

        await createPost({
          authorUid: uid,
          authorName: displayName || '사용자',
          authorAvatarImg: avatarImg,
          authorPhotoURL: photoURL,
          imageUrl: firstIsVideo ? (videoThumbnail || firstResult?.url || '') : (firstResult?.url || ''),
          mediaType: firstResult?.type || 'image',
          videoUrl: firstIsVideo ? firstResult?.url : undefined,
          thumbnailUrl: videoThumbnail,
          mediaItems: results.map((r) => r.url),
          caption: caption || '',
        });
      }

      // 스토리 저장
      if (uploadTarget === 'story' || uploadTarget === 'both') {
        for (const item of results) {
          await createStory({
            uid,
            name: displayName || '사용자',
            avatarImg,
            photoURL,
            mediaUrl: item.url,
            mediaType: item.type,
            caption: caption || '',
          });
        }
      }

      Alert.alert('완료', '업로드 완료!');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('업로드 오류:', err);
      Alert.alert('업로드 실패', err?.message || '다시 시도해주세요');
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadStatus('');
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1단계: 갤러리 선택
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (step === 'gallery') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* 헤더 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            새 게시물
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (selectedMedia.length === 0) {
                Alert.alert('알림', '미디어를 선택해주세요');
                return;
              }
              setStep('edit');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={{
                color: selectedMedia.length > 0 ? '#0095f6' : '#666',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              다음
            </Text>
          </TouchableOpacity>
        </View>

        {/* 미리보기 */}
        <View style={{ width: SW, height: SW, backgroundColor: '#111' }}>
          {selectedMedia.length === 0 ? (
            <View style={{ width: SW, height: SW, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={48} color="#555" />
              <Text style={{ color: '#555', fontSize: 15, marginTop: 12 }}>사진을 선택하세요</Text>
            </View>
          ) : selectedMedia[0].type === 'video' ? (
            <View style={{ width: SW, height: SW, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 60 }}>🎬</Text>
              <Text style={{ color: '#fff', marginTop: 8, fontSize: 14 }}>동영상 선택됨</Text>
            </View>
          ) : (
            <Image
              source={{ uri: selectedMedia[0].uri }}
              style={{ width: SW, height: SW }}
              resizeMode="contain"
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source;
                setImageHeight(Math.min((height / width) * SW, SW));
              }}
            />
          )}

          {/* 선택 수 뱃지 */}
          {selectedMedia.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: '#0095f6',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                {selectedMedia.length}개 선택
              </Text>
            </View>
          )}

          {/* 다중선택 토글 */}
          <TouchableOpacity
            onPress={() => {
              if (selectedMedia.length > 1) {
                setSelectedMedia([selectedMedia[selectedMedia.length - 1]]);
              }
            }}
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: selectedMedia.length > 1 ? '#0095f6' : 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="copy-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 갤러리 그리드 */}
        <FlatList
          data={mediaList}
          numColumns={3}
          keyExtractor={(_, i) => i.toString()}
          style={{ flex: 1 }}
          removeClippedSubviews={false}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={18}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            const selIdx = selectedMedia.findIndex((m) => m.uri === item.uri);
            const isSelected = selIdx >= 0;
            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item)}
                style={{
                  width: (SW - 3) / 3,
                  height: (SW - 3) / 3,
                  margin: 0.5,
                }}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {item.type === 'video' && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: '#fff' }}>▶</Text>
                    {item.duration != null && item.duration > 0 && (
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                        {formatDuration(item.duration)}
                      </Text>
                    )}
                  </View>
                )}
                {isSelected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#e8313a',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}
                    >
                      {selIdx + 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2단계: 편집
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (step === 'edit') {
    const currentMedia = selectedMedia[0];
    const isVideo = currentMedia?.type === 'video';
    const VSLIDER_H = 200;
    const sizeNorm = (textSize - 16) / 48; // 0~1

    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        {/* ── 헤더 (텍스트 입력 모드가 아닐 때) ── */}
        {!showTextInput && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: insets.top + 8,
              paddingHorizontal: 16,
              paddingBottom: 12,
            }}
          >
            <TouchableOpacity onPress={() => setStep('gallery')}>
              <Text style={{ color: '#fff', fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              편집
            </Text>
            <TouchableOpacity
              onPress={goToShare}
              style={{
                backgroundColor: '#e8313a',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                다음
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 미디어 영역 ── */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {isVideo ? (
            /* 동영상: Video 컴포넌트 크래시 방지 — 편집 없이 안내만 표시 */
            <View style={{
              flex: 1,
              backgroundColor: '#000',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>
                🎬 동영상이 선택되었습니다
              </Text>
              <Text style={{ color: '#999', fontSize: 13, marginTop: 8 }}>
                다음을 눌러 업로드하세요
              </Text>
            </View>
          ) : (
            /* 이미지: ViewShot으로 텍스트 합성 */
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.95 }}
              style={{ width: SW, height: imageHeight, backgroundColor: '#000' }}
            >
              <Image
                source={{ uri: currentMedia?.uri }}
                style={{ width: SW, height: imageHeight }}
                resizeMode="contain"
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  const ratio = height / width;
                  setImageHeight(Math.min(Math.max(SW * ratio, 300), SH * 0.6));
                }}
              />

              {/* 텍스트 오버레이 — PanGestureHandler 드래그 (입력 모드 아닐 때만) */}
              {overlayText.trim().length > 0 && !showTextInput && (
                <PanGestureHandler
                  onGestureEvent={onTextGestureEvent}
                  onHandlerStateChange={onTextHandlerStateChange}
                >
                  <Animated.View
                    style={{
                      position: 'absolute',
                      alignSelf: 'center',
                      left: SW / 2 - 60,
                      top: imageHeight / 2 - textSize / 2,
                      maxWidth: SW * 0.85,
                      zIndex: 10,
                      transform: pan.getTranslateTransform(),
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: getTextBg(),
                        borderRadius: 6,
                        paddingHorizontal: bgStyle !== 'none' ? 10 : 0,
                        paddingVertical: bgStyle !== 'none' ? 4 : 0,
                      }}
                    >
                      <Text
                        style={{
                          color: textColor,
                          fontSize: textSize,
                          fontWeight: '700',
                          textAlign: 'center',
                          textShadowColor: 'rgba(0,0,0,0.6)',
                          textShadowOffset: { width: 1, height: 1 },
                          textShadowRadius: 3,
                        }}
                      >
                        {overlayText}
                      </Text>
                    </View>
                  </Animated.View>
                </PanGestureHandler>
              )}
            </ViewShot>
          )}
        </View>

        {/* ── 편집 도구 (텍스트 모드 아닐 때, 이미지만) ── */}
        {!showTextInput && !isVideo && (
          <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <TouchableOpacity
              onPress={() => setShowTextInput(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 14,
                borderTopWidth: 0.5,
                borderTopColor: '#333',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 20 }}>Aa</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                텍스트 추가
              </Text>
              {overlayText.trim().length > 0 && (
                <View
                  style={{
                    backgroundColor: '#e8313a',
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11 }}>입력됨</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━ 텍스트 입력 모드 오버레이 ━━━ */}
        {showTextInput && (
          <>
            {/* 검정 반투명 배경 (전체 화면) */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                zIndex: 99,
              }}
            />

            {/* 컨텐츠 (키보드 위 영역) */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: keyboardH,
                zIndex: 100,
              }}
            >
              {/* 상단: 완료 버튼 */}
              <View
                style={{
                  paddingTop: insets.top + 12,
                  paddingRight: 16,
                  alignItems: 'flex-end',
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowTextInput(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    완료
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 중앙: 좌측 슬라이더 + 텍스트 입력 */}
              <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* 좌측 세로 슬라이더 */}
                <View
                  style={{
                    width: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ height: VSLIDER_H, width: 36, alignItems: 'center' }}>
                    {/* 트랙 */}
                    <View
                      style={{
                        position: 'absolute',
                        width: 3,
                        height: '100%',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: 2,
                        left: 16.5,
                      }}
                    />
                    {/* 핸들 */}
                    <View
                      style={{
                        position: 'absolute',
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        top: (1 - sizeNorm) * (VSLIDER_H - 24),
                        left: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        elevation: 4,
                      }}
                    />
                    {/* PanResponder 영역 */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                      {...PanResponder.create({
                        onStartShouldSetPanResponder: () => true,
                        onMoveShouldSetPanResponder: () => true,
                        onPanResponderGrant: (e) => {
                          const pct = 1 - Math.min(1, Math.max(0, e.nativeEvent.locationY / VSLIDER_H));
                          setTextSize(Math.round(16 + pct * 48));
                        },
                        onPanResponderMove: (e) => {
                          const pct = 1 - Math.min(1, Math.max(0, e.nativeEvent.locationY / VSLIDER_H));
                          setTextSize(Math.round(16 + pct * 48));
                        },
                      }).panHandlers}
                    />
                  </View>
                </View>

                {/* 중앙 텍스트 입력 */}
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingRight: 16,
                  }}
                >
                  <TextInput
                    value={overlayText}
                    onChangeText={setOverlayText}
                    placeholder="텍스트 입력"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={{
                      color: textColor,
                      fontSize: textSize,
                      textAlign: 'center',
                      fontWeight: '700',
                      textShadowColor: 'rgba(0,0,0,0.6)',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 3,
                      maxWidth: SW - 100,
                      minWidth: 100,
                      padding: 0,
                    }}
                    multiline
                    autoFocus
                    maxLength={100}
                  />
                </View>
              </View>

              {/* 하단 툴바 (키보드 바로 위) */}
              <View
                style={{
                  backgroundColor: '#1a1a1a',
                  paddingTop: 10,
                  paddingBottom: keyboardH > 0 ? 4 : Math.max(insets.bottom, 8),
                }}
              >
                {/* 색상 선택 */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ paddingHorizontal: 16, marginBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    {['#ffffff', '#000000', '#e8313a', '#FFD700', '#00C851', '#2196F3', '#FF69B4', '#FF8C00'].map(
                      (c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setTextColor(c)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: c,
                            borderWidth: textColor === c ? 3 : 1,
                            borderColor: textColor === c ? '#fff' : 'rgba(255,255,255,0.2)',
                          }}
                        />
                      ),
                    )}
                  </View>
                </ScrollView>

                {/* 아이콘 바 */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                  }}
                >
                  <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                    <Ionicons name="keypad-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setBgStyle(
                        bgStyle === 'none' ? 'semi' : bgStyle === 'semi' ? 'solid' : 'none',
                      )
                    }
                  >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Aa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('준비 중', '팔레트 기능 준비 중')}>
                    <Ionicons name="color-palette-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('준비 중', '정렬 기능 준비 중')}>
                    <Text style={{ color: '#fff', fontSize: 16 }}>//A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('준비 중', '글꼴 기능 준비 중')}>
                    <Ionicons name="text-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('준비 중', '정렬 기능 준비 중')}>
                    <Ionicons name="menu-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </GestureHandlerRootView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3단계: 공유 설정 (인스타그램 스타일)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const shareThumbUri = compositeUri || selectedMedia[0]?.uri;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => setStep('edit')}>
          <Text style={{ color: colors.text, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 }}>
          새 게시물
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* 썸네일 + 문구 입력 (인스타그램 스타일) */}
        <View
          style={{
            flexDirection: 'row',
            padding: 16,
            gap: 12,
          }}
        >
          <Image
            source={{ uri: shareThumbUri }}
            style={{ width: 80, height: 80, borderRadius: 8 }}
            resizeMode="cover"
          />
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="문구를 입력하세요..."
            placeholderTextColor="#999"
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.text,
              textAlignVertical: 'top',
              padding: 0,
            }}
            multiline
            maxLength={500}
          />
        </View>

        {/* 구분선 */}
        <View style={{ height: 0.5, backgroundColor: colors.border }} />

        {/* 메뉴 항목들 */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
          onPress={() => Alert.alert('준비 중', '사람 태그 기능 준비 중')}
        >
          <Ionicons name="person-outline" size={22} color={colors.text} />
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.text }}>
            사람 태그
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
          onPress={() => Alert.alert('준비 중', '위치 추가 기능 준비 중')}
        >
          <Ionicons name="location-outline" size={22} color={colors.text} />
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.text }}>
            위치 추가
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </TouchableOpacity>

        {/* 구분선 */}
        <View style={{ height: 8, backgroundColor: colors.border + '33' }} />

        {/* 업로드 대상 (라디오 스타일) */}
        {(
          [
            { key: 'post' as UploadTarget, label: '게시물로 공유', icon: 'grid-outline' as const },
            { key: 'story' as UploadTarget, label: '스토리로 공유', icon: 'add-circle-outline' as const },
            { key: 'both' as UploadTarget, label: '동시업로드', icon: 'copy-outline' as const },
          ]
        ).map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setUploadTarget(t.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Ionicons name={t.icon} size={22} color={colors.text} />
            <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.text }}>
              {t.label}
            </Text>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: uploadTarget === t.key ? '#e8313a' : colors.inactive,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {uploadTarget === t.key && (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: '#e8313a',
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 공유하기 버튼 */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <TouchableOpacity
          onPress={handleShare}
          disabled={uploading}
          style={{
            backgroundColor: uploading ? '#aaa' : '#e8313a',
            borderRadius: 12,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uploading ? (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13 }}>
                {uploadStatus || '업로드 중...'} {progress}%
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              공유하기
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
