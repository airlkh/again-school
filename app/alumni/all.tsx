import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { DUMMY_CLASSMATES, DummyClassmate } from '../../src/data/dummyClassmates';
import { useGoBack } from '../../src/hooks/useGoBack';
import { getAvatarSource } from '../../src/utils/avatar';

export default function AllAlumniScreen() {
  const goBack = useGoBack();
  const { colors, isDark } = useTheme();

  function renderItem({ item }: { item: DummyClassmate }) {
    const primarySchool = item.schools[0];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/profile/${item.id}`)}
        activeOpacity={0.7}
      >
        <Image
          source={getAvatarSource(item.photoURL)}
          style={[styles.avatar, { backgroundColor: colors.card }]}
        />
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.schoolInfo, { color: colors.textSecondary }]} numberOfLines={1}>
            {primarySchool.schoolName} · {primarySchool.graduationYear}년 졸업
            {item.classNumber > 0 ? ` · ${item.classNumber}반` : ''}
          </Text>
          <View style={styles.tagRow}>
            {item.schools.map((s, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{s.schoolType}</Text>
              </View>
            ))}
            <View style={[styles.tagRegion, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.tagRegionText, { color: colors.textSecondary }]}>{item.region}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>추천 동창</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 카운트 */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          전체 <Text style={[styles.countNumber, { color: colors.primary }]}>{DUMMY_CLASSMATES.length}</Text>명
        </Text>
      </View>

      {/* 리스트 */}
      <FlatList
        data={DUMMY_CLASSMATES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      />
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

  list: { paddingHorizontal: 16, paddingBottom: 20 },
  separator: { height: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  name: { fontSize: 16, fontWeight: '700' },
  schoolInfo: { fontSize: 13, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  tagRegion: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagRegionText: { fontSize: 11 },
});
