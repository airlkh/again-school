import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Share,
  Modal,
  ActionSheetIOS,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useAuth } from '../../src/contexts/AuthContext';
import { submitReport } from '../../src/services/reportService';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { useMusic } from '../../src/contexts/MusicContext';
import { useMute } from '../../src/contexts/MuteContext';
import { findPostById, DummyComment, DummyPost } from '../../src/data/dummyClassmates';
import {
  subscribePost,
  subscribeComments,
  addComment,
  deletePost,
  FirestorePost,
  FirestoreComment,
} from '../../src/services/postService';
import { useLike } from '../../src/hooks/useLike';
import { getAvatarSource } from '../../src/utils/avatar';

const SCREEN_WIDTH = Dimensions.get('window').width;

function isVideoMedia(url?: string | null, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\.(mp4|mov|avi|webm)(\?|$)/.test(lower) || lower.includes('/video/');
}

function VideoMediaItem({ uri, style, isMuted, onToggleMute }: { uri: string; style: any; isMuted: boolean; onToggleMute: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  useEffect(() => {
    try { player.play(); } catch {}
  }, [player]);

  useEffect(() => {
    try { player.muted = isMuted; } catch {}
  }, [isMuted, player]);

  return (
    <View>
      <VideoView
        player={player}
        style={style}
        contentFit="cover"
        nativeControls={false}
      />
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={onToggleMute}
        activeOpacity={0.8}
      >
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const { user } = useAuth();
  const { displayName: myName, avatarImg: myAvatarImg, photoURL: myPhotoURL } = useCurrentUser();
  const { isMuted: musicMuted, toggleMute: toggleMusicMute } = useMusic();
  const { isMuted: videoMuted, toggleMute: toggleVideoMute } = useMute();

  const [fsPost, setFsPost] = useState<FirestorePost | null>(null);
  const [fsComments, setFsComments] = useState<FirestoreComment[]>([]);
  const [isFirestore, setIsFirestore] = useState(false);
  const [dummyPost, setDummyPost] = useState<DummyPost | null>(null);
  const [dummyComments, setDummyComments] = useState<DummyComment[]>([]);

  // 통합 좋아요 훅 (더미/Firestore 모두 처리)
  const { liked, count: likeCount, toggleLike: doToggleLike } = useLike(id ?? '');
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const musicRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!id) return;

    const unsubPost = subscribePost(id, (post) => {
      if (post) {
        setFsPost(post);
        setIsFirestore(true);
      } else {
        const found = findPostById(id);
        if (found) {
          setDummyPost(found);
          setDummyComments(found.comments);
        }
      }
    });

    const unsubComments = subscribeComments(id, (comments) => {
      setFsComments(comments);
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [id]);

  // Music auto-play (respects global mute)
  useEffect(() => {
    if (!fsPost?.music) return;
    try {
      const player = createAudioPlayer({ uri: fsPost.music!.url });
      player.volume = fsPost.music!.volume;
      player.loop = true;
      if (!musicMuted) {
        player.play();
        setMusicPlaying(true);
      }
      musicRef.current = player;
    } catch {}
    return () => {
      if (musicRef.current) {
        musicRef.current.remove();
        musicRef.current = null;
      }
    };
  }, [fsPost?.music?.url]);

  // Sync mute state
  useEffect(() => {
    if (!musicRef.current) return;
    if (musicMuted) {
      musicRef.current.pause();
      setMusicPlaying(false);
    } else {
      musicRef.current.play();
      setMusicPlaying(true);
    }
  }, [musicMuted]);

  function toggleMusic() {
    if (!musicRef.current) return;
    if (musicPlaying) {
      musicRef.current.pause();
      setMusicPlaying(false);
    } else {
      musicRef.current.play();
      setMusicPlaying(true);
    }
  }

  const post = isFirestore ? fsPost : dummyPost;
  const likes = likeCount;

  const authorUid = post?.authorUid ?? '';
  const isMyPost = user?.uid === authorUid;

  // 이미지 리스트 구성: mediaItems 우선, 없으면 단일 imageUrl 사용
  const mediaList: { type: string; url: string }[] = (() => {
    if (!post) return [];
    if (isFirestore && (fsPost as FirestorePost).mediaItems && (fsPost as FirestorePost).mediaItems!.length > 0) {
      return (fsPost as FirestorePost).mediaItems!.map((url) => ({ type: 'image', url }));
    }
    if (post.imageUrl) {
      const mType = isFirestore ? (fsPost as FirestorePost).mediaType || 'image' : 'image';
      return [{ type: mType, url: post.imageUrl }];
    }
    return [];
  })();

  const handleImageScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setImageIndex(idx);
  }, []);

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>게시물을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleSendComment() {
    const text = inputText.trim();
    if (!text) return;

    if (isFirestore && fsPost && user) {
      await addComment(fsPost.id, {
        uid: user.uid,
        name: myName,
        avatarImg: myAvatarImg,
        photoURL: myPhotoURL,
        text,
      });
    } else {
      const newComment: DummyComment = {
        id: `c-new-${Date.now()}`,
        uid: 'me',
        name: '나',
        avatarImg: 1,
        text,
        time: '방금 전',
      };
      setDummyComments((prev) => [...prev, newComment]);
    }
    setInputText('');
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `againschool://post/${post!.id}`,
        title: post!.caption,
      });
    } catch {}
  }

  function handleBookmark() {
    Alert.alert('북마크', '북마크에 저장되었습니다.');
  }

  function handleMenuPress() {
    if (Platform.OS === 'ios') {
      const options = isMyPost
        ? ['수정하기', '삭제하기', '취소']
        : ['북마크 저장', '공유하기', '숨기기', '신고하기', '취소'];
      const cancelButtonIndex = options.length - 1;
      const destructiveButtonIndex = isMyPost ? 1 : 3;

      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (buttonIndex) => {
          if (isMyPost) {
            if (buttonIndex === 0) router.push({ pathname: '/post/edit', params: { id: post!.id } });
            else if (buttonIndex === 1) confirmDelete();
          } else {
            if (buttonIndex === 0) handleBookmark();
            else if (buttonIndex === 1) handleShare();
            else if (buttonIndex === 2) Alert.alert('숨기기', '이 게시물을 숨겼습니다.');
            else if (buttonIndex === 3) {
              if (user) {
                submitReport({ targetType: 'post', targetId: id!, targetUserId: authorUid, reason: 'other', reporterId: user.uid }).then(() => Alert.alert('신고', '신고가 접수되었습니다.')).catch(() => Alert.alert('오류', '신고 접수에 실패했습니다.'));
              }
            }
          }
        },
      );
    } else {
      setShowMenu(true);
    }
  }

  function confirmDelete() {
    Alert.alert('삭제', '정말 이 게시물을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isFirestore && fsPost) {
              await deletePost(fsPost.id);
            }
            Alert.alert('완료', '게시물이 삭제되었습니다.');
            goBack();
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }

  type CommentItem = { id: string; uid: string; name: string; avatarImg: number; photoURL?: string | null; text: string; timeStr: string };
  const commentsList: CommentItem[] = isFirestore
    ? fsComments.map((c) => ({ ...c, timeStr: timeAgo(c.createdAt) }))
    : dummyComments.map((c) => ({ ...c, timeStr: c.time }));

  function renderHeader() {
    const authorName = post!.authorName;
    const authorAvatarImg = post!.authorAvatarImg;
    const authorPhotoURL = isFirestore ? (fsPost as FirestorePost).authorPhotoURL : (dummyPost as DummyPost | null)?.authorPhotoURL;
    const imageUrl = post!.imageUrl;
    const caption = post!.caption;
    const yearTag = isFirestore ? (fsPost as FirestorePost).yearTag : (dummyPost as DummyPost).yearTag;
    const memoryTag = isFirestore ? (fsPost as FirestorePost).memoryTag : (dummyPost as DummyPost).memoryTag;
    const postMeta = isFirestore
      ? timeAgo((fsPost as FirestorePost).createdAt)
      : `${(dummyPost as DummyPost).schoolName} · ${(dummyPost as DummyPost).postedAt}`;

    return (
      <>
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postHeaderLeft}
            onPress={() => router.push(`/profile/${authorUid}`)}
          >
            <Image
              source={getAvatarSource(authorPhotoURL)}
              style={[styles.postAvatar, { backgroundColor: colors.card }]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
              <Text style={[styles.postMeta, { color: colors.textSecondary }]}>{postMeta}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.inactive} />
          </TouchableOpacity>
        </View>

        {/* 이미지 스와이프 */}
        {mediaList.length > 0 && (
          <View>
            <FlatList
              data={mediaList}
              horizontal
              pagingEnabled
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              scrollEventThrottle={16}
              onScroll={handleImageScroll}
              renderItem={({ item: mediaItem, index: imgIdx }) => (
                <View style={{ width: SCREEN_WIDTH, position: 'relative' }}>
                  {isVideoMedia(mediaItem.url, mediaItem.type) ? (
                    <VideoMediaItem
                      uri={mediaItem.url}
                      style={[styles.postImage, { backgroundColor: colors.card }]}
                      isMuted={videoMuted}
                      onToggleMute={toggleVideoMute}
                    />
                  ) : (
                    <Image source={{ uri: mediaItem.url }} style={[styles.postImage, { backgroundColor: colors.card }]} />
                  )}
                  {imgIdx === 0 && isFirestore && (fsPost as FirestorePost).textOverlays?.map((overlay, oi) => (
                    <View key={oi} style={[styles.overlayPos, { left: `${overlay.x}%`, top: `${overlay.y}%` }]}>
                      <Text style={{ fontSize: overlay.fontSize, color: overlay.color, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                        {overlay.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            />
            {mediaList.length > 1 && (
              <View style={styles.dotIndicator}>
                {mediaList.map((_, i) => (
                  <View key={i} style={[styles.dotItem, { backgroundColor: i === imageIndex ? '#FF3124' : '#ccc' }]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Music toggle */}
        {isFirestore && (fsPost as FirestorePost).music && (
          <View style={[styles.musicBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={toggleMusic} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name={musicPlaying ? 'volume-high' : 'volume-mute'} size={18} color={colors.primary} />
              <Text style={[styles.musicBarText, { color: colors.text }]}>{(fsPost as FirestorePost).music!.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMusicMute}>
              <Ionicons name={musicMuted ? 'volume-mute' : 'volume-high'} size={16} color={colors.inactive} />
            </TouchableOpacity>
          </View>
        )}

        {yearTag && (
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{yearTag}년</Text>
            </View>
            {memoryTag && (
              <View style={[styles.tag, { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{memoryTag}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity onPress={doToggleLike} style={styles.actionBtn}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={26}
                color={liked ? colors.primary : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleBookmark}>
            <Ionicons name="bookmark-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.likesText, { color: colors.text }]}>좋아요 {likes}개</Text>

        <Text style={[styles.caption, { color: colors.text }]}>
          <Text style={styles.captionName}>{authorName} </Text>
          {caption}
        </Text>

        <View style={[styles.commentsDivider, { borderTopColor: colors.border }]}>
          <Text style={[styles.commentsTitle, { color: colors.text }]}>댓글 {commentsList.length}개</Text>
        </View>
      </>
    );
  }

  function renderComment({ item }: { item: CommentItem }) {
    return (
      <View style={styles.commentItem}>
        <TouchableOpacity onPress={() => item.uid !== 'me' && item.uid !== user?.uid && router.push(`/profile/${item.uid}`)}>
          <Image
            source={getAvatarSource(item.photoURL)}
            style={[styles.commentAvatar, { backgroundColor: colors.card }]}
          />
        </TouchableOpacity>
        <View style={styles.commentBody}>
          <Text style={[styles.commentText, { color: colors.text }]}>
            <Text style={styles.commentName}>{item.name} </Text>
            {item.text}
          </Text>
          <Text style={[styles.commentTime, { color: colors.inactive }]}>{item.timeStr}</Text>
        </View>
      </View>
    );
  }

  // Android bottom sheet menu
  const menuItems = isMyPost
    ? [
        { icon: 'create-outline' as const, label: '수정하기', onPress: () => router.push({ pathname: '/post/edit', params: { id: post!.id } }) },
        { icon: 'trash-outline' as const, label: '삭제하기', onPress: confirmDelete, destructive: true },
      ]
    : [
        { icon: 'bookmark-outline' as const, label: '북마크 저장', onPress: handleBookmark },
        { icon: 'share-outline' as const, label: '공유하기', onPress: handleShare },
        { icon: 'eye-off-outline' as const, label: '숨기기', onPress: () => Alert.alert('숨기기', '이 게시물을 숨겼습니다.') },
        { icon: 'flag-outline' as const, label: '신고하기', onPress: () => { if (user) { submitReport({ targetType: 'post', targetId: id!, targetUserId: authorUid, reason: 'other', reporterId: user.uid }).then(() => Alert.alert('신고', '신고가 접수되었습니다.')).catch(() => Alert.alert('오류', '신고 접수에 실패했습니다.')); } }, destructive: true },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물</Text>
        <TouchableOpacity onPress={handleMenuPress} style={styles.backBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
      >
        <FlatList
          data={commentsList}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Image
            source={getAvatarSource(myPhotoURL)}
            style={styles.inputAvatar}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="댓글 달기..."
            placeholderTextColor={colors.inactive}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!inputText.trim()}
          >
            <Text
              style={[
                styles.sendText,
                { color: colors.primary },
                !inputText.trim() && { color: colors.inactive },
              ]}
            >
              게시
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Android 바텀시트 메뉴 */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.bottomSheetItem}
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(item.onPress, 200);
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.destructive ? '#ef4444' : colors.text}
                />
                <Text
                  style={[
                    styles.bottomSheetText,
                    { color: item.destructive ? '#ef4444' : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.bottomSheetCancel, { borderTopColor: colors.border }]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={[styles.bottomSheetCancelText, { color: colors.textSecondary }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  listContent: { paddingBottom: 10 },

  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  postHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: 4 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontSize: 15, fontWeight: '700', marginLeft: 12 },
  postMeta: { fontSize: 12, marginLeft: 12, marginTop: 2 },
  postImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 },
  muteBtn: {
    position: 'absolute' as const,
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },

  tagRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingTop: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '600' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  actionsLeft: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 2 },
  likesText: { fontSize: 15, fontWeight: '700', paddingHorizontal: 14, marginTop: 8 },
  caption: { fontSize: 14, lineHeight: 21, paddingHorizontal: 14, marginTop: 6 },
  captionName: { fontWeight: '700' },

  commentsDivider: { borderTopWidth: 1, marginTop: 16, paddingHorizontal: 14, paddingTop: 14 },
  commentsTitle: { fontSize: 15, fontWeight: '700' },

  commentItem: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentBody: { flex: 1, marginLeft: 10 },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentName: { fontWeight: '700' },
  commentTime: { fontSize: 11, marginTop: 3 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  inputAvatar: { width: 32, height: 32, borderRadius: 16 },
  input: { flex: 1, fontSize: 14, maxHeight: 80, paddingVertical: 8 },
  sendText: { fontSize: 14, fontWeight: '700' },

  // Bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  bottomSheetText: { fontSize: 16, fontWeight: '500' },
  bottomSheetCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
  },
  bottomSheetCancelText: { fontSize: 16, fontWeight: '600' },

  // Multi-image dots
  dotIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dotItem: { width: 6, height: 6, borderRadius: 3 },

  // Overlay
  overlayPos: { position: 'absolute' },

  // Music bar
  musicBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  musicBarText: { fontSize: 13, fontWeight: '500' },
});
