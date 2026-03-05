import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';

const STORAGE_KEY = '@again_school_noti_settings';

interface NotificationSettings {
  pushEnabled: boolean;
  connectionRequest: boolean;
  connectionAccepted: boolean;
  newMessage: boolean;
  meetupReminder: boolean;
  postLike: boolean;
  postComment: boolean;
  newMeetup: boolean;
  appUpdates: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  connectionRequest: true,
  connectionAccepted: true,
  newMessage: true,
  meetupReminder: true,
  postLike: true,
  postComment: true,
  newMeetup: true,
  appUpdates: false,
};

export default function NotificationSettingsScreen() {
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {}
  }

  async function updateSetting(key: keyof NotificationSettings, value: boolean) {
    const updated = { ...settings, [key]: value };

    // 전체 푸시 끄면 모든 설정 비활성화
    if (key === 'pushEnabled' && !value) {
      Object.keys(updated).forEach((k) => {
        (updated as any)[k] = false;
      });
    }

    // 개별 설정 켜면 전체 푸시도 켜기
    if (key !== 'pushEnabled' && value) {
      updated.pushEnabled = true;
    }

    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  function resetSettings() {
    Alert.alert('초기화', '알림 설정을 기본값으로 초기화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        onPress: async () => {
          setSettings(DEFAULT_SETTINGS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
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
        <Text style={styles.headerTitle}>알림 설정</Text>
        <TouchableOpacity onPress={resetSettings} style={styles.backBtn}>
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 전체 푸시 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.mainToggle, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="notifications" size={22} color="#fff" />
              </View>
              <View>
                <Text style={[styles.mainLabel, { color: colors.text }]}>푸시 알림</Text>
                <Text style={[styles.mainSub, { color: colors.textSecondary }]}>
                  {settings.pushEnabled ? '알림이 활성화되어 있습니다' : '모든 알림이 꺼져 있습니다'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={(v) => updateSetting('pushEnabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 소셜 알림 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>소셜</Text>
          <SettingRow
            icon="person-add-outline"
            label="연결 요청"
            description="동창이 연결 요청을 보낼 때"
            value={settings.connectionRequest}
            onChange={(v) => updateSetting('connectionRequest', v)}
            disabled={!settings.pushEnabled}
          />
          <SettingRow
            icon="checkmark-circle-outline"
            label="연결 수락"
            description="보낸 연결 요청이 수락될 때"
            value={settings.connectionAccepted}
            onChange={(v) => updateSetting('connectionAccepted', v)}
            disabled={!settings.pushEnabled}
          />
          <SettingRow
            icon="chatbubble-outline"
            label="새 메시지"
            description="채팅 메시지를 받을 때"
            value={settings.newMessage}
            onChange={(v) => updateSetting('newMessage', v)}
            disabled={!settings.pushEnabled}
          />
        </View>

        {/* 모임 알림 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>모임</Text>
          <SettingRow
            icon="calendar-outline"
            label="모임 리마인더"
            description="참석 예정 모임 1일 전 알림"
            value={settings.meetupReminder}
            onChange={(v) => updateSetting('meetupReminder', v)}
            disabled={!settings.pushEnabled}
          />
          <SettingRow
            icon="megaphone-outline"
            label="새 모임"
            description="내 학교 관련 새 모임이 생성될 때"
            value={settings.newMeetup}
            onChange={(v) => updateSetting('newMeetup', v)}
            disabled={!settings.pushEnabled}
          />
        </View>

        {/* 게시물 알림 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>게시물</Text>
          <SettingRow
            icon="heart-outline"
            label="좋아요"
            description="내 게시물에 좋아요를 받을 때"
            value={settings.postLike}
            onChange={(v) => updateSetting('postLike', v)}
            disabled={!settings.pushEnabled}
          />
          <SettingRow
            icon="chatbubbles-outline"
            label="댓글"
            description="내 게시물에 댓글이 달릴 때"
            value={settings.postComment}
            onChange={(v) => updateSetting('postComment', v)}
            disabled={!settings.pushEnabled}
          />
        </View>

        {/* 기타 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>기타</Text>
          <SettingRow
            icon="sparkles-outline"
            label="앱 업데이트"
            description="새로운 기능 및 업데이트 소식"
            value={settings.appUpdates}
            onChange={(v) => updateSetting('appUpdates', v)}
            disabled={!settings.pushEnabled}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }, disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={20} color={colors.text} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.inactive }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { paddingBottom: 20 },

  section: { marginTop: 12, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },

  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 0,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainLabel: { fontSize: 17, fontWeight: '700' },
  mainSub: { fontSize: 13, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIcon: { marginRight: 14 },
  rowContent: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12, marginTop: 2 },
});
