import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useGoBack } from '../../src/hooks/useGoBack';
import { DUMMY_STORIES, DummyStory } from '../../src/data/dummyClassmates';
import { subscribeUserStories, FirestoreStory, markStoryViewed } from '../../src/services/storyService';
import { useAuth } from '../../src/contexts/AuthContext';
import { getAvatarSource } from '../../src/utils/avatar';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROGRESS_DURATION = 5000;

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const goBack = useGoBack();

  // Firestore stories
  const [fsStories, setFsStories] = useState<FirestoreStory[]>([]);
  // Dummy story
  const [dummyStory, setDummyStory] = useState<DummyStory | null>(null);
  const [isFirestore, setIsFirestore] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;

    // Check if ID looks like Firestore UID (for user-based story viewing)
    // or a dummy story ID
    const dummy = DUMMY_STORIES.find((s) => s.id === id);
    if (dummy) {
      setDummyStory(dummy);
      setIsFirestore(false);
      return;
    }

    // Try as Firestore user UID
    const unsub = subscribeUserStories(id, (stories) => {
      if (stories.length > 0) {
        setFsStories(stories);
        setIsFirestore(true);
        // 스토리 조회 기록
        if (user) {
          stories.forEach((s) => {
            if (!s.viewers?.includes(user.uid)) {
              markStoryViewed(s.id, user.uid).catch(() => {});
            }
          });
        }
      }
    });
    return unsub;
  }, [id, user]);

  // Unified data
  const totalItems = isFirestore
    ? fsStories.length
    : (dummyStory?.images.length ?? 0);

  const currentImage = isFirestore
    ? fsStories[currentIndex]?.mediaUrl
    : dummyStory?.images[currentIndex];

  const isCurrentVideo = isFirestore && fsStories[currentIndex]?.mediaType === 'video';
  const storyVideoPlayer = useVideoPlayer(isCurrentVideo ? (currentImage ?? null) : null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (isCurrentVideo && storyVideoPlayer) {
      try { storyVideoPlayer.play(); } catch {}
    }
  }, [isCurrentVideo, storyVideoPlayer]);

  const currentCaption = isFirestore
    ? fsStories[currentIndex]?.caption
    : dummyStory?.captions[currentIndex];

  const storyName = isFirestore
    ? fsStories[0]?.name
    : dummyStory?.name;

  const storyAvatarImg = isFirestore
    ? fsStories[0]?.avatarImg
    : dummyStory?.avatarImg;

  const storyPhotoURL = isFirestore
    ? fsStories[0]?.photoURL
    : dummyStory?.photoURL;

  const storyTime = isFirestore
    ? timeAgo(fsStories[currentIndex]?.createdAt ?? 0)
    : dummyStory?.postedAt;

  const storyExpiry = isFirestore && fsStories[currentIndex]
    ? (() => {
        const remaining = fsStories[currentIndex].expiresAt - Date.now();
        if (remaining <= 0) return '만료됨';
        const hours = Math.floor(remaining / 3600000);
        if (hours > 0) return `${hours}시간 남음`;
        const mins = Math.floor(remaining / 60000);
        return `${mins}분 남음`;
      })()
    : null;

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return '어제';
  }

  // Progress animation
  useEffect(() => {
    if (totalItems === 0) return;

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: PROGRESS_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) handleNext();
    });

    return () => anim.stop();
  }, [currentIndex, totalItems]);

  function handleNext() {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      goBack();
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function handleTap(x: number) {
    if (x < SCREEN_WIDTH * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  }

  if (totalItems === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>스토리를 찾을 수 없습니다</Text>
      </View>
    );
  }

  // Build progress items array
  const progressItems = isFirestore
    ? fsStories.map((_, i) => i)
    : (dummyStory?.images.map((_, i) => i) ?? []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={styles.imageContainer}
        activeOpacity={1}
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
      >
        {isCurrentVideo && storyVideoPlayer ? (
          <VideoView
            player={storyVideoPlayer}
            style={styles.storyImage}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: currentImage }}
            style={styles.storyImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.topGradient} />

        {/* Progress bars (clickable) */}
        <View style={styles.progressContainer}>
          {progressItems.map((i) => (
            <TouchableOpacity
              key={i}
              style={styles.progressTrack}
              activeOpacity={0.7}
              onPress={() => setCurrentIndex(i)}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < currentIndex
                        ? '100%'
                        : i === currentIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Header */}
        <View style={styles.storyHeader}>
          <Image
            source={getAvatarSource(storyPhotoURL)}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerName}>{storyName}</Text>
          <Text style={styles.headerTime}>{storyTime}</Text>
          {storyExpiry && <Text style={styles.headerExpiry}>{storyExpiry}</Text>}
          <TouchableOpacity onPress={goBack} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {currentCaption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{currentCaption}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Reply bar */}
      <View style={styles.replyBar}>
        <TextInput
          style={styles.replyInput}
          placeholder={`${storyName}님에게 답장...`}
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={replyText}
          onChangeText={setReplyText}
        />
        <TouchableOpacity
          style={styles.replyBtn}
          disabled={!replyText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={replyText.trim() ? Colors.primary : 'rgba(255,255,255,0.3)'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 100 },

  imageContainer: { flex: 1, position: 'relative' },
  storyImage: { width: SCREEN_WIDTH, height: '100%', backgroundColor: '#111' },

  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 30,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  storyHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 68 : 44,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 10 },
  headerTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 8 },
  headerExpiry: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 8 },
  closeBtn: { marginLeft: 'auto', padding: 4 },

  captionContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  captionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    gap: 10,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  replyBtn: { padding: 8 },
});
