import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
  Share,
  ActionSheetIOS,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  DUMMY_STORIES,
  DUMMY_POSTS,
  DUMMY_CLASSMATES,
  DUMMY_MEETUPS,
  DummyStory,
  DummyPost,
} from '../../src/data/dummyClassmates';
import { Meetup } from '../../src/types/auth';
import { subscribePosts, FirestorePost } from '../../src/services/postService';
import { useLike } from '../../src/hooks/useLike';
import { useBookmark } from '../../src/hooks/useBookmark';
import { subscribeStories, FirestoreStory } from '../../src/services/storyService';
import { subscribeMeetups } from '../../src/services/meetupService';
import { useMusic } from '../../src/contexts/MusicContext';
import { useMute } from '../../src/contexts/MuteContext';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';
import { CommentBottomSheet } from '../../src/components/CommentBottomSheet';
import { Video, ResizeMode } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── 피드 아이템 통합 타입 ─────────────────────────────────────────
type FeedItem =
  | { type: 'story_bar'; id: 'stories' }
  | { type: 'photo_post'; id: string; data: DummyPost | FirestorePost; isFirestore: boolean }
  | { type: 'classmate_recommend'; id: string }
  | { type: 'meetup_event'; id: string; data: Meetup };

// ─── 스토리 바 ─────────────────────────────────────────────────────
function StoryBar({ fsStories }: { fsStories: FirestoreStory[] }) {
  const [dummyStories, setDummyStories] = useState(DUMMY_STORIES);
  const { colors } = useTheme();
  const { user } = useAuth();

  // Group Firestore stories by user
  const groupedFsStories = fsStories.reduce((acc, s) => {
    if (!acc[s.uid]) {
      acc[s.uid] = { uid: s.uid, name: s.name, avatarImg: s.avatarImg, photoURL: s.photoURL ?? null, stories: [] };
    }
    acc[s.uid].stories.push(s);
    return acc;
  }, {} as Record<string, { uid: string; name: string; avatarImg: number; photoURL: string | null; stories: FirestoreStory[] }>);

  const fsStoryUsers = Object.values(groupedFsStories);

  return (
    <View style={[styles.storyContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyScroll}
      >
        {/* 내 스토리 */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={() => router.push('/upload')}
        >
          <View style={styles.myStoryRing}>
            <View style={[styles.myStoryAvatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="person" size={26} color={colors.inactive} />
            </View>
            <View style={[styles.addBadge, { borderColor: colors.surface }]}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>내 스토리</Text>
        </TouchableOpacity>

        {/* Firestore 스토리 */}
        {fsStoryUsers.map((u) => {
          const allViewed = user ? u.stories.every((s) => s.viewers?.includes(user.uid)) : false;
          return (
            <TouchableOpacity
              key={u.uid}
              style={styles.storyItem}
              onPress={() => router.push({ pathname: '/story/[id]', params: { id: u.uid } })}
            >
              <View style={[styles.storyRing, allViewed ? { borderColor: colors.border } : styles.storyRingNew]}>
                <Image
                  source={getAvatarSource(u.photoURL)}
                  style={[styles.storyAvatar, { backgroundColor: colors.card }]}
                />
              </View>
              <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
            </TouchableOpacity>
          );
        })}

        {/* 더미 스토리 */}
        {dummyStories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => {
              setDummyStories((prev) =>
                prev.map((s) => (s.id === story.id ? { ...s, seen: true } : s)),
              );
              router.push({ pathname: '/story/[id]', params: { id: story.id } });
            }}
          >
            <View style={[styles.storyRing, story.seen ? { borderColor: colors.border } : styles.storyRingNew]}>
              <Image
                source={getAvatarSource(story.photoURL)}
                style={[styles.storyAvatar, { backgroundColor: colors.card }]}
              />
            </View>
            <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>{story.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── 동영상 감지 ────────────────────────────────────────────────────
function isVideoMedia(url?: string | null, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\.(mp4|mov|avi|webm)(\?|$)/.test(lower) || lower.includes('/video/');
}

// ─── 게시물 카드 ───────────────────────────────────────────────────
function PostCard({ post, isFirestore, onHide, isVisible = true }: { post: DummyPost | FirestorePost; isFirestore: boolean; onHide?: (id: string) => void; isVisible?: boolean }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isMuted: musicMuted, toggleMute: toggleMusicMute } = useMusic();
  const { isMuted: videoMuted, toggleMute: toggleVideoMute } = useMute();

  const fsPost = isFirestore ? (post as FirestorePost) : null;
  const dPost = !isFirestore ? (post as DummyPost) : null;

  const [imgIndex, setImgIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [imgHeight, setImgHeight] = useState(SCREEN_WIDTH);
  const [multiImgHeights, setMultiImgHeights] = useState<Record<number, number>>({});

  // 통합 좋아요 훅 (더미/Firestore 모두 처리)
  const { liked, count: likesCount, toggleLike } = useLike(post.id);
  const { bookmarked, toggleBookmark } = useBookmark(post.id);
  const authorName = post.authorName;
  const authorUid = post.authorUid;
  const authorAvatarImg = post.authorAvatarImg;
  const imageUrl = post.imageUrl;
  const caption = post.caption;
  const yearTag = isFirestore ? fsPost?.yearTag : dPost?.yearTag;
  const memoryTag = isFirestore ? fsPost?.memoryTag : dPost?.memoryTag;
  const mediaType = isFirestore ? fsPost?.mediaType : dPost?.mediaType;
  const videoUrl = isFirestore ? fsPost?.videoUrl : dPost?.videoUrl;
  const thumbnailUrl = isFirestore ? fsPost?.thumbnailUrl : dPost?.thumbnailUrl;
  const authorPhotoURL = isFirestore ? fsPost?.authorPhotoURL : dPost?.authorPhotoURL;
  const commentCount = isFirestore ? (fsPost?.commentCount ?? 0) : (dPost?.commentCount ?? 0);
  const schoolName = isFirestore ? (fsPost?.schoolName ?? '') : (dPost?.schoolName ?? '');

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }

  const postMeta = isFirestore
    ? timeAgo(fsPost!.createdAt)
    : `${schoolName} · ${dPost?.postedAt}`;

  return (
    <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => router.push(`/profile/${authorUid}`)}
        >
          <Image
            source={getAvatarSource(authorPhotoURL)}
            style={[styles.postAvatar, { backgroundColor: colors.card }]}
          />
          <View style={styles.postAuthorInfo}>
            <NameWithBadge name={authorName} uid={authorUid} nameStyle={[styles.postAuthorName, { color: colors.text }]} />
            <Text style={[styles.postMeta, { color: colors.textSecondary }]}>{postMeta}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => {
            if (Platform.OS === 'ios') {
              const opts = [bookmarked ? '북마크 해제' : '북마크 저장', '공유하기', '숨기기', '신고하기', '취소'];
              ActionSheetIOS.showActionSheetWithOptions(
                { options: opts, cancelButtonIndex: 4, destructiveButtonIndex: 3 },
                (i) => {
                  if (i === 0) toggleBookmark();
                  else if (i === 1) Share.share({ message: `againschool://post/${post.id}` }).catch(() => {});
                  else if (i === 2) { onHide?.(post.id); }
                  else if (i === 3) Alert.alert('신고', '신고가 접수되었습니다.');
                },
              );
            } else {
              setShowMenu(true);
            }
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.inactive} />
        </TouchableOpacity>
      </View>

      {/* Multi-image swipe or single image */}
      {isFirestore && fsPost?.mediaItems && fsPost.mediaItems.length > 1 ? (
        <View>
          <FlatList
            data={fsPost.mediaItems}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setImgIndex(idx);
            }}
            renderItem={({ item: uri, index: idx }) => (
              <View style={{ width: SCREEN_WIDTH }}>
                <Image
                  source={{ uri }}
                  style={{ width: SCREEN_WIDTH, height: multiImgHeights[idx] || SCREEN_WIDTH, backgroundColor: colors.card }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width: w, height: h } = e.nativeEvent.source;
                    const ratio = h / w;
                    const calculated = Math.min(Math.max(SCREEN_WIDTH * ratio, 300), 600);
                    setMultiImgHeights((prev) => ({ ...prev, [idx]: calculated }));
                  }}
                />
              </View>
            )}
          />
          <View style={styles.feedDotRow}>
            {fsPost.mediaItems.map((_, i) => (
              <View key={i} style={[styles.feedDot, { backgroundColor: i === imgIndex ? colors.primary : colors.border }]} />
            ))}
          </View>
          {yearTag && (
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>{yearTag}년</Text>
              {memoryTag && <Text style={styles.memoryBadgeText}> · {memoryTag}</Text>}
            </View>
          )}
        </View>
      ) : isVideoMedia(videoUrl || imageUrl, mediaType) && (videoUrl || imageUrl) ? (
        <View>
          <Video
            source={{ uri: (videoUrl || imageUrl)! }}
            style={[styles.postImage, { backgroundColor: colors.card }]}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isVisible}
            isLooping
            isMuted={videoMuted}
          />
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={toggleVideoMute}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>{videoMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
          <View style={styles.videoBadge}>
            <Ionicons name="play" size={10} color="#fff" />
            <Text style={styles.videoBadgeText}>동영상</Text>
          </View>
          {yearTag && (
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>{yearTag}년</Text>
              {memoryTag && <Text style={styles.memoryBadgeText}> · {memoryTag}</Text>}
            </View>
          )}
        </View>
      ) : (
        <View>
          <Image
            source={{ uri: imageUrl }}
            style={{ width: SCREEN_WIDTH, height: imgHeight, backgroundColor: colors.card }}
            resizeMode="contain"
            onLoad={(e) => {
              const { width: w, height: h } = e.nativeEvent.source;
              const ratio = h / w;
              setImgHeight(Math.min(Math.max(SCREEN_WIDTH * ratio, 300), 600));
            }}
          />
          {yearTag && (
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>{yearTag}년</Text>
              {memoryTag && <Text style={styles.memoryBadgeText}> · {memoryTag}</Text>}
            </View>
          )}
        </View>
      )}

      {/* 음악 표시 */}
      {isFirestore && fsPost?.music && (
        <TouchableOpacity
          style={[styles.musicIndicator, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleMusicMute}
          activeOpacity={0.7}
        >
          <Ionicons name={musicMuted ? 'volume-mute' : 'volume-high'} size={14} color={colors.primary} />
          <Text style={[styles.musicIndicatorText, { color: colors.text }]} numberOfLines={1}>{fsPost.music.name}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? colors.primary : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCommentSheetVisible(true)}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={async () => {
            try {
              await Share.share({ message: `againschool://post/${post.id}`, title: caption });
            } catch {}
          }}>
            <Ionicons name="paper-plane-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={toggleBookmark}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.postLikes, { color: colors.text }]}>좋아요 {likesCount}개</Text>

      <View>
        <Text style={[styles.postCaption, { color: colors.text }]} numberOfLines={2}>
          <Text style={styles.postCaptionName}>{authorName} </Text>
          {caption}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setCommentSheetVisible(true)}
      >
        <Text style={[styles.viewComments, { color: colors.textSecondary }]}>
          {commentCount > 0 ? `댓글 ${commentCount}개 모두 보기` : '댓글 달기...'}
        </Text>
      </TouchableOpacity>

      {/* Android 바텀시트 메뉴 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
            {[
              { icon: bookmarked ? 'bookmark' as const : 'bookmark-outline' as const, label: bookmarked ? '북마크 해제' : '북마크 저장', onPress: () => toggleBookmark() },
              { icon: 'share-outline' as const, label: '공유하기', onPress: () => Share.share({ message: `againschool://post/${post.id}` }).catch(() => {}) },
              { icon: 'eye-off-outline' as const, label: '숨기기', onPress: () => onHide?.(post.id) },
              { icon: 'flag-outline' as const, label: '신고하기', onPress: () => Alert.alert('신고', '신고가 접수되었습니다.'), destructive: true },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.menuItem}
                onPress={() => { setShowMenu(false); setTimeout(item.onPress, 200); }}
              >
                <Ionicons name={item.icon} size={22} color={item.destructive ? '#ef4444' : colors.text} />
                <Text style={[styles.menuItemText, { color: item.destructive ? '#ef4444' : colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.menuCancel, { borderTopColor: colors.border }]} onPress={() => setShowMenu(false)}>
              <Text style={[styles.menuCancelText, { color: colors.textSecondary }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 댓글 바텀시트 */}
      {isFirestore && (
        <CommentBottomSheet
          visible={commentSheetVisible}
          postId={post.id}
          onClose={() => setCommentSheetVisible(false)}
        />
      )}
    </View>
  );
}

// ─── 추천 동창 카드 ────────────────────────────────────────────────
function ClassmateRecommendCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.recommendCard, { backgroundColor: colors.surface }]}>
      <View style={styles.recommendHeader}>
        <Text style={[styles.recommendTitle, { color: colors.text }]}>추천 동창</Text>
        <TouchableOpacity onPress={() => router.push('/alumni/all')}>
          <Text style={[styles.recommendSeeAll, { color: colors.primary }]}>전체보기</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendScroll}
      >
        {DUMMY_CLASSMATES.slice(0, 6).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.recommendItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/profile/${item.id}`)}
          >
            <Image
              source={getAvatarSource(item.photoURL)}
              style={[styles.recommendAvatar, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.recommendName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.recommendInfo, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.schools[0]?.schoolName}
            </Text>
            <Text style={[styles.recommendYear, { color: colors.inactive }]} numberOfLines={1}>
              {item.graduationYear}년 졸업
            </Text>
            <TouchableOpacity
              style={styles.recommendBtn}
              onPress={() => router.push(`/profile/${item.id}`)}
            >
              <Text style={styles.recommendBtnText}>프로필 보기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── 모임 이벤트 카드 ──────────────────────────────────────────────
function MeetupEventCard({ meetup }: { meetup: Meetup }) {
  const [, m, d] = meetup.date.split('-');
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/meetup/${meetup.id}`)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: meetup.imageUrl }} style={[styles.eventImage, { backgroundColor: colors.card }]} />
      <View style={styles.eventBadge}>
        <Ionicons name="calendar" size={12} color="#fff" />
        <Text style={styles.eventBadgeText}>모임</Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={[styles.eventSchool, { color: colors.primary }]}>{meetup.schoolName}</Text>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{meetup.title}</Text>
        <View style={styles.eventRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{Number(m)}월 {Number(d)}일 {meetup.time}</Text>
        </View>
        <View style={styles.eventRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{meetup.location}</Text>
        </View>
        <View style={[styles.eventFooter, { borderTopColor: colors.border }]}>
          <View style={styles.eventAttendees}>
            {meetup.attendees.slice(0, 3).map((a, i) => (
              <Image
                key={a.uid}
                source={getAvatarSource(a.photoURL)}
                style={[styles.eventAva, { marginLeft: i > 0 ? -8 : 0, borderColor: colors.surface, backgroundColor: colors.card }]}
              />
            ))}
            <Text style={[styles.eventCount, { color: colors.textSecondary }]}>
              {(meetup.participants ?? meetup.attendees).length}/{meetup.maxAttendees}명
            </Text>
          </View>
          <View style={styles.eventJoinBtn}>
            <Text style={styles.eventJoinText}>참석하기</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── 메인 화면 ─────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors } = useTheme();
  const [fsPosts, setFsPosts] = useState<FirestorePost[]>([]);
  const [fsStories, setFsStories] = useState<FirestoreStory[]>([]);
  const [fsMeetups, setFsMeetups] = useState<Meetup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ key: string }> }) => {
    setVisiblePostIds(new Set(viewableItems.map((item) => item.key)));
  }).current;

  useEffect(() => {
    AsyncStorage.getItem('@hidden_posts').then((val) => {
      if (val) setHiddenPostIds(new Set(JSON.parse(val)));
    });
  }, []);

  const hidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      AsyncStorage.setItem('@hidden_posts', JSON.stringify([...next]));
      return next;
    });
  }, []);

  useEffect(() => {
    const unsubPosts = subscribePosts((posts) => setFsPosts(posts));
    const unsubStories = subscribeStories((stories) => setFsStories(stories));
    const unsubMeetups = subscribeMeetups((meetups) => setFsMeetups(meetups));
    return () => {
      unsubPosts();
      unsubStories();
      unsubMeetups();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // onSnapshot auto-refreshes, just show spinner briefly
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Build feed with Firestore + dummy data
  const feedItems: FeedItem[] = (() => {
    const items: FeedItem[] = [{ type: 'story_bar', id: 'stories' }];

    // Merge Firestore posts first, then dummy posts
    const allPosts: { data: DummyPost | FirestorePost; isFirestore: boolean }[] = [
      ...fsPosts.map((p) => ({ data: p, isFirestore: true })),
      ...DUMMY_POSTS.map((p) => ({ data: p, isFirestore: false })),
    ];

    // Merge Firestore meetups with dummy meetups
    const allMeetups = [
      ...fsMeetups.filter((m) => m.status === 'recruiting'),
      ...DUMMY_MEETUPS.filter((m) => m.status === 'recruiting'),
    ];

    let postIdx = 0;
    let meetupIdx = 0;
    let count = 0;

    while (postIdx < allPosts.length || meetupIdx < allMeetups.length) {
      for (let i = 0; i < 2 && postIdx < allPosts.length; i++) {
        const p = allPosts[postIdx];
        items.push({ type: 'photo_post', id: p.data.id, data: p.data, isFirestore: p.isFirestore });
        postIdx++;
      }

      if (count % 2 === 0) {
        items.push({ type: 'classmate_recommend', id: `recommend-${count}` });
      }

      if (count % 2 === 1 && meetupIdx < allMeetups.length) {
        items.push({ type: 'meetup_event', id: allMeetups[meetupIdx].id, data: allMeetups[meetupIdx] });
        meetupIdx++;
      }

      count++;
    }

    return items;
  })();

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'story_bar':
        return <StoryBar fsStories={fsStories} />;
      case 'photo_post':
        if (hiddenPostIds.has(item.data.id)) return null;
        return <PostCard post={item.data} isFirestore={item.isFirestore} onHide={hidePost} isVisible={visiblePostIds.has(item.id)} />;
      case 'classmate_recommend':
        return <ClassmateRecommendCard />;
      case 'meetup_event':
        return <MeetupEventCard meetup={item.data} />;
      default:
        return null;
    }
  }, [fsStories, hiddenPostIds, hidePost, visiblePostIds]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Again School</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/upload')}
          >
            <Ionicons name="add-circle-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/invite')}
          >
            <Ionicons name="person-add-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/chat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={['#e8313a']}
          />
        }
      />
    </SafeAreaView>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', gap: 2 },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  feedContainer: { paddingBottom: 20 },

  storyContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storyScroll: { paddingHorizontal: 12, gap: 14 },
  storyItem: { alignItems: 'center', width: 68 },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  storyRingNew: { borderColor: Colors.primary },
  storyAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.card },
  storyName: { fontSize: 11, color: Colors.text, marginTop: 4, fontWeight: '500' },

  myStoryRing: { width: 68, height: 68, position: 'relative' },
  myStoryAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  postCard: { backgroundColor: '#fff', marginBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card },
  postAuthorInfo: { flex: 1, marginLeft: 10 },
  postAuthorName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  postMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  postImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25, backgroundColor: Colors.card },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  videoBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  yearBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  yearBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  memoryBadgeText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  postActionsLeft: { flexDirection: 'row', gap: 14 },
  actionBtn: { padding: 2 },
  postLikes: { fontSize: 14, fontWeight: '700', color: Colors.text, paddingHorizontal: 14, marginTop: 6 },
  postCaption: { fontSize: 14, color: Colors.text, lineHeight: 20, paddingHorizontal: 14, marginTop: 4 },
  postCaptionName: { fontWeight: '700' },
  viewComments: { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 },

  recommendCard: { backgroundColor: '#fff', paddingVertical: 16, marginBottom: 8 },
  recommendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  recommendTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  recommendSeeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  recommendScroll: { paddingHorizontal: 12, gap: 10 },
  recommendItem: {
    width: 130,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recommendAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0e0e0', marginBottom: 8 },
  recommendName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  recommendInfo: { fontSize: 11, color: Colors.textSecondary, marginBottom: 1 },
  recommendYear: { fontSize: 11, color: Colors.inactive, marginBottom: 10 },
  recommendBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14 },
  recommendBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  eventCard: { backgroundColor: '#fff', marginBottom: 8, borderRadius: 0, overflow: 'hidden' },
  eventImage: { width: '100%', height: 160, backgroundColor: Colors.card },
  eventBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  eventBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  eventBody: { padding: 14 },
  eventSchool: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginBottom: 4 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventMeta: { fontSize: 13, color: Colors.textSecondary },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  eventAttendees: { flexDirection: 'row', alignItems: 'center' },
  eventAva: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: Colors.card,
  },
  eventCount: { fontSize: 13, color: Colors.textSecondary, marginLeft: 8, fontWeight: '500' },
  eventJoinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  eventJoinText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  feedDotRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  feedDot: { width: 6, height: 6, borderRadius: 3 },
  musicIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
  },
  musicIndicatorText: { fontSize: 12, fontWeight: '500', maxWidth: 150 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 34 },
  menuHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  menuItemText: { fontSize: 16, fontWeight: '500' },
  menuCancel: { alignItems: 'center', paddingVertical: 16, marginTop: 8, borderTopWidth: 1 },
  menuCancelText: { fontSize: 16, fontWeight: '600' },
});
