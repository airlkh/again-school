import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { unblockUser } from '../../src/services/blockService';
import { getUserProfile } from '../../src/services/firestoreService';
import { getAvatarSource } from '../../src/utils/avatar';

interface BlockedUserInfo {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export default function BlockedUsersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useCurrentUser();
  const goBack = useGoBack();
  const [blockedList, setBlockedList] = useState<BlockedUserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const blockedUids: string[] = (profile as any)?.blockedUsers ?? [];

  useEffect(() => {
    if (!blockedUids.length) {
      setBlockedList([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const results: BlockedUserInfo[] = [];
      for (const uid of blockedUids) {
        try {
          const p = await getUserProfile(uid);
          results.push({
            uid,
            displayName: p?.displayName ?? '알 수 없음',
            photoURL: p?.photoURL ?? null,
          });
        } catch {
          results.push({ uid, displayName: '알 수 없음', photoURL: null });
        }
      }
      setBlockedList(results);
      setLoading(false);
    })();
  }, [blockedUids.length]);

  function handleUnblock(targetUid: string, name: string) {
    Alert.alert('차단 해제', `${name}님의 차단을 해제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          try {
            if (user) await unblockUser(user.uid, targetUid);
          } catch {
            Alert.alert('오류', '차단 해제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단 목록</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : blockedList.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="shield-checkmark-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.inactive }]}>차단한 유저가 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={blockedList}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={getAvatarSource(item.photoURL)}
                style={[styles.avatar, { backgroundColor: colors.card }]}
              />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
              <TouchableOpacity
                style={[styles.unblockBtn, { borderColor: colors.primary }]}
                onPress={() => handleUnblock(item.uid, item.displayName)}
              >
                <Text style={[styles.unblockText, { color: colors.primary }]}>해제</Text>
              </TouchableOpacity>
            </View>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  list: { paddingVertical: 8 },
  separator: { height: 1, marginLeft: 76 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: { fontSize: 13, fontWeight: '700' },
});
