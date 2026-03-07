import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Video, ResizeMode } from 'expo-av';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { FirestorePost } from '../../src/services/postService';
import { CommentBottomSheet } from '../../src/components/CommentBottomSheet';
import { getAvatarSource } from '../../src/utils/avatar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 4) / 3;

interface BookmarkEntry {
  postId: string;
  savedAt: number | null;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export default function BookmarksPage() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const goBack = useGoBack();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<FirestorePost[]>([]);
  const [loading, setLoading] = useState(true);

  // 게시물 상세 모달
  const [selectedPost, setSelectedPost] = useState<FirestorePost | null>(null);
  const [imageHeightMap, setImageHeightMap] = useState<Record<string, number>>({});

  // 댓글 바텀시트
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  // 동영상 재생 모달
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
    const q = query(bookmarksRef, orderBy('savedAt', 'desc'));

    const unsub = onSnapshot(q, async (snap) => {
      const entries: BookmarkEntry[] = snap.docs.map((d) => {
        const data = d.data() as { savedAt: number | null };
        return { postId: d.id, savedAt: data.savedAt };
      });

      if (entries.length === 0) {
        setBookmarks([]);
        setLoading(false);
        return;
      }

      const postIds = entries.map((e) => e.postId);

      // Firestore 'in' queries max 30 items
      const chunks: string[][] = [];
      for (let i = 0; i < postIds.length; i += 10) {
        chunks.push(postIds.slice(i, i + 10));
      }

      const posts: FirestorePost[] = [];
      for (const chunk of chunks) {
        try {
          const postsQuery = query(
            collection(db, 'posts'),
            where('__name__', 'in', chunk),
          );
          const postSnap = await getDocs(postsQuery);
          postSnap.docs.forEach((d) => {
            posts.push({ id: d.id, ...d.data() } as FirestorePost);
          });
        } catch {}
      }

      // 북마크 순서 유지
      const sorted = postIds
        .map((id) => posts.find((p) => p.id === id))
        .filter((p): p is FirestorePost => !!p);

      setBookmarks(sorted);
      setLoading(false);
    });

    return unsub;
  }, [user?.uid]);

  const handleRemoveBookmark = async (postId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', postId));
      setSelectedPost(null);
      Alert.alert('완료', '북마크가 해제되었습니다');
    } catch (err) {
      console.error('북마크 해제 실패:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>저장된 게시물</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : bookmarks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>저장된 게시물이 없어요</Text>
          <Text style={[styles.emptySub, { color: colors.inactive }]}>
            피드에서 북마크 버튼을 눌러{'\n'}마음에 드는 게시물을 저장해보세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={0.85}
              onPress={() => setSelectedPost(item)}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cellImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.textCell, { backgroundColor: colors.primary }]}>
                  <Text style={styles.textCellContent} numberOfLines={4}>
                    {item.caption}
                  </Text>
                </View>
              )}

              {/* 동영상 아이콘 */}
              {item.mediaType === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="play" size={12} color="#fff" />
                </View>
              )}

              {/* 여러 장 아이콘 */}
              {item.mediaItems && item.mediaItems.length > 1 && (
                <View style={styles.multiBadge}>
                  <Ionicons name="copy-outline" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* ━━━━━ 게시물 상세 모달 ━━━━━ */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          {/* 모달 헤더 */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedPost(null)}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>게시물</Text>
            <TouchableOpacity
              onPress={() => {
                const postId = selectedPost?.id;
                setSelectedPost(null);
                router.push({
                  pathname: '/(tabs)',
                  params: { scrollToPostId: postId },
                });
              }}
            >
              <Text style={styles.feedLink}>피드에서 보기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* 작성자 */}
            <View style={styles.authorRow}>
              <Image
                source={getAvatarSource(selectedPost?.authorPhotoURL)}
                style={[styles.authorAvatar, { backgroundColor: colors.card }]}
              />
              <View>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {selectedPost?.authorName}
                </Text>
                <Text style={styles.postTime}>
                  {selectedPost?.createdAt ? formatTimeAgo(selectedPost.createdAt) : ''}
                </Text>
              </View>
            </View>

            {/* 미디어 */}
            {selectedPost?.imageUrl && (
              selectedPost.mediaType === 'video' ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPlayingVideo(selectedPost.videoUrl || selectedPost.imageUrl)}
                  style={styles.videoPlaceholder}
                >
                  {selectedPost.thumbnailUrl ? (
                    <Image source={{ uri: selectedPost.thumbnailUrl }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, position: 'absolute' }} resizeMode="cover" />
                  ) : null}
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="play" size={32} color="#fff" />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>탭하여 재생</Text>
                </TouchableOpacity>
              ) : (
                <Image
                  source={{ uri: selectedPost.imageUrl }}
                  style={{
                    width: SCREEN_WIDTH,
                    height: imageHeightMap[selectedPost.id] || SCREEN_WIDTH,
                  }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    const ratio = height / width;
                    setImageHeightMap((prev) => ({
                      ...prev,
                      [selectedPost.id]: Math.min(Math.max(SCREEN_WIDTH * ratio, 200), 600),
                    }));
                  }}
                />
              )
            )}

            {/* 액션 버튼 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  const postId = selectedPost?.id || '';
                  setSelectedPost(null);
                  setTimeout(() => {
                    setCommentPostId(postId);
                  }, 350);
                }}
              >
                <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedPost) handleRemoveBookmark(selectedPost.id);
                }}
                style={{ marginLeft: 'auto' }}
              >
                <Ionicons name="bookmark" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* 좋아요 수 */}
            {selectedPost && selectedPost.likes > 0 && (
              <Text style={[styles.likesText, { color: colors.text }]}>
                좋아요 {selectedPost.likes}개
              </Text>
            )}

            {/* 캡션 */}
            {selectedPost?.caption ? (
              <View style={styles.captionWrap}>
                <Text style={[styles.captionText, { color: colors.text }]}>
                  <Text style={{ fontWeight: '700' }}>{selectedPost.authorName}</Text>
                  {'  '}
                  {selectedPost.caption}
                </Text>
              </View>
            ) : null}

            {/* 댓글 수 */}
            {selectedPost && selectedPost.commentCount > 0 && (
              <TouchableOpacity
                style={styles.commentCountWrap}
                onPress={() => {
                  const postId = selectedPost.id;
                  setSelectedPost(null);
                  setTimeout(() => {
                    setCommentPostId(postId);
                  }, 350);
                }}
              >
                <Text style={[styles.commentCountText, { color: colors.inactive }]}>
                  댓글 {selectedPost.commentCount}개 모두 보기
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 동영상 전체화면 모달 */}
      <Modal visible={!!playingVideo} animationType="fade" onRequestClose={() => setPlayingVideo(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity onPress={() => setPlayingVideo(null)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {playingVideo && (
            <Video source={{ uri: playingVideo }} style={{ flex: 1 }} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />
          )}
        </View>
      </Modal>

      {/* 댓글 바텀시트 */}
      {commentPostId && (
        <CommentBottomSheet
          visible={!!commentPostId}
          postId={commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  grid: { padding: 1 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
  },
  cellImage: { width: '100%', height: '100%' },
  textCell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  textCellContent: { color: '#fff', fontSize: 11, textAlign: 'center' },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // 모달
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  feedLink: {
    fontSize: 13,
    color: '#e8313a',
    fontWeight: '600',
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorName: {
    fontWeight: '700',
    fontSize: 14,
  },
  postTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },

  videoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 16,
  },
  likesText: {
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
  },
  captionWrap: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentCountWrap: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  commentCountText: {
    fontSize: 13,
  },
});
