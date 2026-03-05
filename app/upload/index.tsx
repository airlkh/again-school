import React, { useState, useRef, useEffect } from 'react';
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
  PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { createStory } from '../../src/services/storyService';
import { createPost } from '../../src/services/postService';
import { CLOUDINARY_CONFIG } from '../../src/config/cloudinary';

const { width: SW, height: SH } = Dimensions.get('window');

type UploadTarget = 'post' | 'story' | 'both';
type Step = 'gallery' | 'edit' | 'share';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
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
  const [textX, setTextX] = useState(0.5);
  const [textY, setTextY] = useState(0.5);
  const [showTextInput, setShowTextInput] = useState(false);
  const [bgStyle, setBgStyle] = useState<'none' | 'semi' | 'solid'>('none');

  // 공유 설정
  const [caption, setCaption] = useState('');
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>(
    (params.target as UploadTarget) || 'post',
  );

  // 업로드
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // ViewShot ref (텍스트 합성용)
  const viewShotRef = useRef<any>(null);

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
    }));

    setMediaList(items);
    if (items.length > 0) {
      setSelectedMedia([items[0]]);
    }
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

  // 텍스트 드래그
  const textPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => overlayText.trim().length > 0,
    onMoveShouldSetPanResponder: () => overlayText.trim().length > 0,
    onPanResponderMove: (e) => {
      const newX = Math.min(0.95, Math.max(0.05, e.nativeEvent.locationX / SW));
      const newY = Math.min(
        0.95,
        Math.max(0.05, e.nativeEvent.locationY / imageHeight),
      );
      setTextX(newX);
      setTextY(newY);
    },
  });

  // 텍스트 배경 스타일
  const getTextBg = () => {
    if (bgStyle === 'solid') return 'rgba(0,0,0,0.75)';
    if (bgStyle === 'semi') return 'rgba(0,0,0,0.4)';
    return 'transparent';
  };

  // ViewShot으로 이미지+텍스트 합성
  const captureFrame = async (): Promise<string> => {
    if (!overlayText.trim()) {
      return selectedMedia[0]?.uri || '';
    }
    try {
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

  // 업로드 함수
  const uploadMedia = async (
    uri: string,
    type: 'image' | 'video',
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    const isVideo = type === 'video';
    const endpoint = isVideo
      ? CLOUDINARY_CONFIG.videoUploadUrl
      : CLOUDINARY_CONFIG.imageUploadUrl;

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: isVideo ? 'video/mp4' : 'image/jpeg',
      name: `${type}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('resource_type', type);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 99));
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
          try {
            const res = JSON.parse(xhr.responseText);
            onProgress?.(100);
            resolve(res.secure_url);
          } catch {
            reject(new Error('응답 파싱 실패'));
          }
        } else if (xhr.status > 0) {
          reject(new Error(`업로드 실패: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('네트워크 오류'));
      xhr.ontimeout = () => reject(new Error('시간 초과'));
      xhr.open('POST', endpoint);
      xhr.timeout = 600000;
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

    try {
      const results: { url: string; type: 'image' | 'video' }[] = [];

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const isVideo = media.type === 'video';

        // 첫 번째 이미지만 텍스트 합성
        const uriToUpload =
          i === 0 && !isVideo ? await captureFrame() : media.uri;

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
        await createPost({
          authorUid: uid,
          authorName: displayName || '사용자',
          authorAvatarImg: avatarImg,
          authorPhotoURL: photoURL,
          imageUrl: results[0]?.url || '',
          mediaType: results[0]?.type || 'image',
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
                color: selectedMedia.length > 0 ? '#e8313a' : '#666',
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
          {selectedMedia[0] &&
            (selectedMedia[0].type === 'video' ? (
              <View
                style={{
                  width: SW,
                  height: SW,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 48 }}>▶</Text>
                <Text style={{ color: '#aaa', fontSize: 13, marginTop: 8 }}>
                  동영상 선택됨
                </Text>
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
            ))}

          {/* 선택 수 뱃지 */}
          {selectedMedia.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: '#e8313a',
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
        </View>

        {/* 갤러리 그리드 */}
        <FlatList
          data={mediaList}
          numColumns={3}
          keyExtractor={(_, i) => i.toString()}
          style={{ flex: 1 }}
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
                  <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
                    <Text style={{ fontSize: 16 }}>▶</Text>
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
          <TouchableOpacity onPress={() => setStep('gallery')}>
            <Text style={{ color: '#fff', fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            편집
          </Text>
          <TouchableOpacity
            onPress={() => setStep('share')}
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

        {/* ViewShot: 이미지+텍스트 합성 영역 */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.95 }}
          style={{
            width: SW,
            height: imageHeight,
            backgroundColor: '#000',
          }}
        >
          {!isVideo ? (
            <Image
              source={{ uri: currentMedia?.uri }}
              style={{ width: SW, height: imageHeight }}
              resizeMode="contain"
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source;
                const ratio = height / width;
                setImageHeight(
                  Math.min(Math.max(SW * ratio, 300), SH * 0.6),
                );
              }}
            />
          ) : (
            <View
              style={{
                width: SW,
                height: 300,
                backgroundColor: '#111',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 48 }}>▶</Text>
              <Text style={{ color: '#aaa', fontSize: 13, marginTop: 8 }}>
                동영상
              </Text>
            </View>
          )}

          {/* 텍스트 오버레이 — ViewShot 안에 있어야 합성됨 */}
          {overlayText.trim().length > 0 && (
            <View
              style={{
                position: 'absolute',
                left: textX * SW - 60,
                top: textY * imageHeight - textSize / 2,
                maxWidth: SW * 0.85,
                zIndex: 10,
              }}
              {...textPanResponder.panHandlers}
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
            </View>
          )}
        </ViewShot>

        {/* 편집 도구 */}
        <ScrollView style={{ flex: 1 }}>
          {/* Aa 텍스트 입력 */}
          <TouchableOpacity
            onPress={() => setShowTextInput(!showTextInput)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: '#333',
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

          {showTextInput && (
            <View style={{ padding: 14, gap: 12, backgroundColor: '#111' }}>
              {/* 텍스트 입력 */}
              <TextInput
                value={overlayText}
                onChangeText={setOverlayText}
                placeholder="이미지 위 텍스트 입력..."
                placeholderTextColor="#555"
                style={{
                  backgroundColor: '#222',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  color: '#fff',
                  borderWidth: 1,
                  borderColor: '#444',
                }}
                maxLength={50}
                returnKeyType="done"
              />

              {/* 색상 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    '#ffffff',
                    '#000000',
                    '#e8313a',
                    '#FFD700',
                    '#00C851',
                    '#2196F3',
                    '#FF69B4',
                    '#FF8C00',
                  ].map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setTextColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: c,
                        borderWidth: textColor === c ? 3 : 1,
                        borderColor:
                          textColor === c ? '#e8313a' : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* 배경 스타일 */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(
                  [
                    { key: 'none', label: '없음' },
                    { key: 'semi', label: '반투명' },
                    { key: 'solid', label: '채우기' },
                  ] as const
                ).map((b) => (
                  <TouchableOpacity
                    key={b.key}
                    onPress={() => setBgStyle(b.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: bgStyle === b.key ? '#e8313a' : '#333',
                    }}
                  >
                    <Text
                      style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 크기 슬라이더 */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ color: '#aaa', fontSize: 12 }}>A</Text>
                <View
                  style={{ flex: 1, height: 36, justifyContent: 'center' }}
                >
                  <View
                    style={{
                      height: 4,
                      backgroundColor: '#444',
                      borderRadius: 2,
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${((textSize - 14) / 36) * 100}%`,
                        backgroundColor: '#e8313a',
                        borderRadius: 2,
                      }}
                    />
                  </View>
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
                        const pct = e.nativeEvent.locationX / (SW - 80);
                        setTextSize(
                          Math.round(Math.min(50, Math.max(14, 14 + pct * 36))),
                        );
                      },
                      onPanResponderMove: (e) => {
                        const pct = e.nativeEvent.locationX / (SW - 80);
                        setTextSize(
                          Math.round(Math.min(50, Math.max(14, 14 + pct * 36))),
                        );
                      },
                    }).panHandlers}
                  />
                </View>
                <Text
                  style={{ color: '#aaa', fontSize: 18, fontWeight: '700' }}
                >
                  A
                </Text>
                <Text
                  style={{
                    color: '#e8313a',
                    fontSize: 13,
                    fontWeight: '700',
                    width: 36,
                  }}
                >
                  {textSize}px
                </Text>
              </View>

              {overlayText.trim().length > 0 && (
                <Text
                  style={{
                    color: '#888',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  위 이미지에서 텍스트를 드래그해서 위치 변경 가능
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3단계: 공유 설정
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => setStep('edit')}>
          <Text style={{ color: colors.text, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          공유 설정
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 16 }}>
          {/* 썸네일 */}
          <View style={{ alignItems: 'center' }}>
            <Image
              source={{ uri: selectedMedia[0]?.uri }}
              style={{ width: 120, height: 120, borderRadius: 12 }}
              resizeMode="cover"
            />
            {selectedMedia.length > 1 && (
              <Text style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                +{selectedMedia.length - 1}개
              </Text>
            )}
          </View>

          {/* 캡션 */}
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="문구를 입력하고 해시태그 추가..."
            placeholderTextColor="#999"
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 14,
              fontSize: 14,
              color: colors.text,
              minHeight: 80,
              borderWidth: 1,
              borderColor: colors.border,
              textAlignVertical: 'top',
            }}
            multiline
            maxLength={500}
          />

          {/* 업로드 대상 */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 10,
              }}
            >
              업로드 대상
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  { key: 'post', label: '게시물' },
                  { key: 'story', label: '스토리' },
                  { key: 'both', label: '동시업로드' },
                ] as const
              ).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setUploadTarget(t.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor:
                      uploadTarget === t.key ? '#e8313a' : colors.card,
                    borderWidth: 1,
                    borderColor:
                      uploadTarget === t.key ? '#e8313a' : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: uploadTarget === t.key ? '#fff' : colors.text,
                      fontSize: 12,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 공유 버튼 */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
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
                업로드 중... {progress}%
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
