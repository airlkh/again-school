import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import RNModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  FirestoreComment,
  addComment,
  subscribeComments,
} from '../services/postService';
import { getAvatarSource } from '../utils/avatar';
import { NameWithBadge } from '../utils/badge';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  postId: string;
  onClose: () => void;
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

const EMOJI_LIST = [
  '❤️', '🥰', '😂', '👏', '🥺', '😍', '🙌', '🔥',
  '✨', '💕', '💯', '🎉', '😎', '🤩', '😆', '😅',
  '🥳', '😜', '🤗', '💪', '👍', '🙏', '💖', '😢',
  '😤', '🤔', '😏', '🫶', '💝', '🌟', '😘', '🤣',
];

export function CommentBottomSheet({ visible, postId, onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { displayName, photoURL, avatarImg } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // 댓글 실시간 구독
  useEffect(() => {
    if (!visible || !postId) return;
    const unsub = subscribeComments(postId, setComments);
    return unsub;
  }, [visible, postId]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!visible) {
      setInputText('');
      setShowEmoji(false);
    }
  }, [visible]);

  function toggleCommentLike(commentId: string) {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  async function handleSubmitComment() {
    const text = inputText.trim();
    if (!text || !user) return;

    setSubmitting(true);
    try {
      await addComment(postId, {
        uid: user.uid,
        name: displayName || '사용자',
        avatarImg: avatarImg ?? 1,
        photoURL: photoURL ?? null,
        text,
      });
      setInputText('');
    } catch {
      Alert.alert('오류', '댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    Keyboard.dismiss();
    setShowEmoji(false);
    setInputText('');
    onClose();
  }

  function handleEmojiToggle() {
    if (showEmoji) {
      setShowEmoji(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setShowEmoji(true);
    }
  }

  function handleEmojiSelect(emoji: string) {
    setInputText((prev) => prev + emoji);
  }

  const inputBarPadBottom = showEmoji ? 0 : Math.max(insets.bottom, 8);

  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection="down"
      avoidKeyboard={false}
      style={styles.modal}
      statusBarTranslucent
      propagateSwipe
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavContainer}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              maxHeight: SCREEN_HEIGHT * 0.75,
            },
          ]}
        >
          {/* 핸들 바 */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* 헤더 */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>댓글</Text>
          </View>

          {/* 댓글 목록 */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            style={styles.commentList}
            contentContainerStyle={styles.commentListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isLiked = likedComments.has(item.id);
              return (
                <View style={styles.commentRow}>
                  <Image
                    source={getAvatarSource(item.photoURL)}
                    style={[styles.commentAvatar, { backgroundColor: colors.card }]}
                  />
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <NameWithBadge
                        name={item.name}
                        uid={item.uid}
                        nameStyle={[styles.commentAuthor, { color: colors.text }]}
                      />
                      <Text style={[styles.commentTime, { color: colors.inactive }]}>
                        {formatTimeAgo(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                    <TouchableOpacity style={styles.replyTouchable}>
                      <Text style={[styles.replyBtn, { color: colors.inactive }]}>
                        답글 달기
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleCommentLike(item.id)}
                    style={styles.commentLikeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={14}
                      color={isLiked ? colors.primary : colors.inactive}
                    />
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.inactive }]}>
                  첫 댓글을 남겨보세요 💬
                </Text>
              </View>
            }
          />

          {/* 입력창 + 이모지 버튼 */}
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: inputBarPadBottom,
              },
            ]}
          >
            <Image
              source={getAvatarSource(photoURL)}
              style={[styles.myAvatar, { backgroundColor: colors.card }]}
            />

            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={colors.inactive}
                value={inputText}
                onChangeText={setInputText}
                multiline
                blurOnSubmit={false}
                onFocus={() => setShowEmoji(false)}
              />
              <TouchableOpacity
                onPress={handleEmojiToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.emojiToggle, { opacity: showEmoji ? 1 : 0.5 }]}>
                  {showEmoji ? '⌨️' : '😊'}
                </Text>
              </TouchableOpacity>
            </View>

            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={submitting}
                style={styles.sendBtn}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendBtnText}>↑</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 34 }} />
            )}
          </View>

          {/* 이모지 그리드 */}
          {showEmoji && (
            <View
              style={[
                styles.emojiGrid,
                {
                  backgroundColor: colors.surface,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={styles.emojiGridInner}>
                {EMOJI_LIST.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleEmojiSelect(emoji)}
                    style={[styles.emojiItem, { backgroundColor: colors.card }]}
                  >
                    <Text style={styles.emojiItemText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  kavContainer: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  commentList: {
    flexShrink: 1,
  },
  commentListContent: {
    paddingVertical: 8,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  commentAuthor: {
    fontWeight: '700',
    fontSize: 13,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  replyTouchable: {
    marginTop: 4,
  },
  replyBtn: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikeBtn: {
    paddingTop: 14,
    alignItems: 'center',
    width: 28,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 0.5,
  },
  myAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    minHeight: 38,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: 0,
  },
  emojiToggle: {
    fontSize: 20,
    marginLeft: 6,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e8313a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  emojiGrid: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  emojiGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiItem: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emojiItemText: {
    fontSize: 24,
  },
});
