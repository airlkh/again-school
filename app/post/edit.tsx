import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useAuth } from '../../src/contexts/AuthContext';
import { subscribePost, updatePost, FirestorePost } from '../../src/services/postService';

const MEMORY_TAGS = ['소풍', '체육대회', '졸업식', '수학여행', '축제', '동아리', '수련회', 'MT', '졸업여행', '동문 모임'];

export default function PostEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();

  const [post, setPost] = useState<FirestorePost | null>(null);
  const [caption, setCaption] = useState('');
  const [yearTag, setYearTag] = useState<number | null>(null);
  const [memoryTag, setMemoryTag] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribePost(id, (p) => {
      if (p && !loaded) {
        setPost(p);
        setCaption(p.caption);
        setYearTag(p.yearTag ?? null);
        setMemoryTag(p.memoryTag ?? null);
        setLoaded(true);
      }
    });
    return unsub;
  }, [id]);

  async function handleSave() {
    if (!post || !user) return;
    if (!caption.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updatePost(post.id, {
        caption: caption.trim(),
        yearTag: yearTag ?? undefined,
        memoryTag: memoryTag ?? undefined,
      });
      Alert.alert('완료', '게시물이 수정되었습니다.', [
        { text: '확인', onPress: goBack },
      ]);
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const yearOptions = Array.from({ length: 30 }, (_, i) => 2000 + i);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시물 수정</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, saving && { opacity: 0.5 }]}>
            {saving ? '저장 중...' : '완료'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={[styles.previewImage, { backgroundColor: colors.card }]} />
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>내용</Text>
        <TextInput
          style={[styles.captionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="추억에 대해 이야기해주세요..."
          placeholderTextColor={colors.inactive}
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={[styles.charCount, { color: colors.inactive }]}>{caption.length}/500</Text>

        <Text style={[styles.label, { color: colors.text }]}>연도 태그</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
          {yearOptions.map((y) => (
            <TouchableOpacity
              key={y}
              style={[
                styles.tagChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                yearTag === y && { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary },
              ]}
              onPress={() => setYearTag(yearTag === y ? null : y)}
            >
              <Text style={[styles.tagChipText, { color: colors.textSecondary }, yearTag === y && { color: colors.primary, fontWeight: '700' }]}>
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.text }]}>추억 태그</Text>
        <View style={styles.memoryTags}>
          {MEMORY_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                memoryTag === tag && { backgroundColor: isDark ? colors.surface2 : '#fef2f2', borderColor: colors.primary },
              ]}
              onPress={() => setMemoryTag(memoryTag === tag ? null : tag)}
            >
              <Text style={[styles.tagChipText, { color: colors.textSecondary }, memoryTag === tag && { color: colors.primary, fontWeight: '700' }]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  saveBtn: { paddingHorizontal: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  body: { flex: 1, padding: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  captionInput: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100,
  },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 4 },
  tagScroll: { gap: 8 },
  memoryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  tagChipText: { fontSize: 13, fontWeight: '500' },
});
