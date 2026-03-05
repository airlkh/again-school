import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGoBack } from '../../src/hooks/useGoBack';

const INVITE_LINK = 'https://againschool.app/invite';

export default function InvitePage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();

  const displayName = user?.displayName || '친구';

  const inviteMessage = `🏫 ${displayName}님이 Again School에 초대했어요!\n\n학창시절 동창들을 다시 만나보세요 😊\n지금 바로 가입하고 옛 친구들과 연결하세요!\n\n👉 ${INVITE_LINK}`;

  async function handleShare() {
    try {
      await Share.share({
        message: inviteMessage,
        title: 'Again School 초대',
      });
    } catch {}
  }

  function handleSMS() {
    const body = encodeURIComponent(inviteMessage);
    const url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('오류', '문자 앱을 열 수 없습니다.');
    });
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(INVITE_LINK);
    Alert.alert('복사 완료', '초대 링크가 복사되었습니다!');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>동창 초대하기</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 상단 일러스트 */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🏫</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>동창을 초대해보세요!</Text>
          <Text style={[styles.heroSub, { color: colors.inactive }]}>
            친구가 가입하면 함께{'\n'}학창시절 추억을 나눌 수 있어요
          </Text>
        </View>

        {/* 내 초대 링크 */}
        <View style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.linkLabel, { color: colors.inactive }]}>내 초대 링크</Text>
          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
              {INVITE_LINK}
            </Text>
            <TouchableOpacity onPress={handleCopyLink} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>복사</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 초대 방법 선택 */}
        <Text style={[styles.methodTitle, { color: colors.text }]}>초대 방법 선택</Text>

        {/* 카카오톡 공유 */}
        <TouchableOpacity onPress={handleShare} style={styles.kakaoCard} activeOpacity={0.8}>
          <Text style={styles.methodEmoji}>💬</Text>
          <View style={styles.methodBody}>
            <Text style={styles.kakaoTitle}>카카오톡으로 초대</Text>
            <Text style={styles.kakaoSub}>카카오톡 친구에게 초대장 보내기</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </TouchableOpacity>

        {/* 문자 메시지 */}
        <TouchableOpacity
          onPress={handleSMS}
          style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Text style={styles.methodEmoji}>📱</Text>
          <View style={styles.methodBody}>
            <Text style={[styles.methodName, { color: colors.text }]}>문자 메시지로 초대</Text>
            <Text style={[styles.methodDesc, { color: colors.inactive }]}>SMS로 초대 링크 전송</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </TouchableOpacity>

        {/* 링크 복사 */}
        <TouchableOpacity
          onPress={handleCopyLink}
          style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Text style={styles.methodEmoji}>🔗</Text>
          <View style={styles.methodBody}>
            <Text style={[styles.methodName, { color: colors.text }]}>링크 복사</Text>
            <Text style={[styles.methodDesc, { color: colors.inactive }]}>초대 링크를 복사해서 공유</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
        </TouchableOpacity>

        {/* 초대 혜택 안내 */}
        <View style={[styles.benefitCard, { backgroundColor: isDark ? '#2e2010' : '#fff7ed' }]}>
          <Text style={styles.benefitTitle}>🎁 초대 혜택</Text>
          <Text style={[styles.benefitDesc, { color: isDark ? '#ddd' : '#666' }]}>
            친구가 초대 링크로 가입하면{'\n'}나와 친구 모두 프리미엄 7일 무료!
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: 20 },

  hero: { alignItems: 'center', marginVertical: 24 },
  heroEmoji: { fontSize: 64 },
  heroTitle: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  heroSub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  linkCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  linkLabel: { fontSize: 13, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, fontSize: 13, fontWeight: '600' },
  copyBtn: {
    backgroundColor: '#e8313a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  methodTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  kakaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  kakaoTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  kakaoSub: { fontSize: 12, color: '#666', marginTop: 2 },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
  },
  methodEmoji: { fontSize: 32 },
  methodBody: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: '700' },
  methodDesc: { fontSize: 12, marginTop: 2 },

  benefitCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#f97316', marginBottom: 6 },
  benefitDesc: { fontSize: 13, lineHeight: 20 },
});
