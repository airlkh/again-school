import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { MEMORY_PHOTOS } from '../../src/data/dummyClassmates';
import { useGoBack } from '../../src/hooks/useGoBack';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - 8) / 3;

export default function AlbumScreen() {
  const goBack = useGoBack();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>추억 앨범</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 카운트 */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          전체 <Text style={[styles.countNumber, { color: colors.primary }]}>{MEMORY_PHOTOS.length}</Text>장
        </Text>
      </View>

      {/* 3열 그리드 */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {MEMORY_PHOTOS.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/album/viewer',
                params: {
                  uri: photo.uri,
                  year: String(photo.year),
                  desc: photo.desc,
                },
              })
            }
          >
            <Image source={{ uri: photo.uri }} style={[styles.photo, { backgroundColor: colors.card }]} />
            <View style={styles.overlay}>
              <Text style={styles.overlayYear}>{photo.year}</Text>
              <Text style={styles.overlayDesc} numberOfLines={1}>
                {photo.desc}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  countBar: { paddingHorizontal: 20, paddingVertical: 12 },
  countText: { fontSize: 14 },
  countNumber: { fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 4,
    paddingBottom: 20,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  overlayYear: { color: '#fff', fontSize: 12, fontWeight: '700' },
  overlayDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
});
