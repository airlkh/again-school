import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { Audio } from 'expo-av';

export interface MusicItem {
  id: string;
  title: string;
  url: string;
  duration: number;
  genre?: string;
}

export interface SelectedMusic {
  id: string;
  title: string;
  url: string;
  startTime: number;
  duration: number;
  totalDuration?: number;
  volume: number;
  videoVolume?: number;
}

interface Props {
  selectedMusic: SelectedMusic | null;
  onChange: (music: SelectedMusic | null) => void;
  isVideo?: boolean;
}

export function MusicSelector({ selectedMusic, onChange, isVideo = false }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [filtered, setFiltered] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'추천' | '인기' | '저장됨'>('추천');
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      loadMusic();
    } else {
      stopSound();
    }
    return () => {
      stopSound();
      stopPreview();
    };
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFiltered(musicList.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFiltered(musicList);
    }
  }, [searchQuery, musicList]);

  async function loadMusic() {
    setLoading(true);
    try {
      const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const items: MusicItem[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as MusicItem));
      setMusicList(items);
      setFiltered(items);
    } catch (e) {
      console.warn('음악 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }

  function stopSound() {
    const s = soundRef.current;
    soundRef.current = null;
    setPlayingId(null);
    if (s) {
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    }
  }

  async function stopPreview() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewSoundRef.current) {
      await previewSoundRef.current.stopAsync().catch(() => {});
      await previewSoundRef.current.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
    }
  }

  async function previewFromPosition(url: string, startTime: number) {
    await stopPreview();
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, positionMillis: startTime * 1000, volume: 0.8 }
      );
      previewSoundRef.current = sound;
      // 2초 미리듣기 후 자동 정지
      previewTimerRef.current = setTimeout(() => {
        stopPreview();
      }, 2000);
    } catch {}
  }

  async function togglePlay(item: MusicItem) {
    if (playingId === item.id) { stopSound(); return; }
    stopSound();
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: item.url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(item.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.warn('재생 실패:', e);
    }
  }

  function selectMusic(item: MusicItem) {
    stopSound();
    onChange({
      id: item.id,
      title: item.title,
      url: item.url,
      startTime: 0,
      duration: Math.min(30, item.duration),
      volume: 0.8,
      videoVolume: isVideo ? 0.5 : undefined,
    });
    setVisible(false);
  }

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <View>
      {/* 선택된 음악 표시 + 볼륨 조절 */}
      {selectedMusic ? (
        <View style={[styles.selectedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.selectedHeader}>
            <Ionicons name="musical-notes" size={18} color={colors.primary} />
            <Text style={[styles.selectedTitle, { color: colors.text }]} numberOfLines={1}>{selectedMusic.title}</Text>
            <TouchableOpacity onPress={() => onChange(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color={colors.inactive} />
            </TouchableOpacity>
          </View>
          <View style={styles.volumeRow}>
            <Ionicons name="time-outline" size={14} color={colors.inactive} />
            <Text style={[styles.volumeLabel, { color: colors.inactive }]}>시작 지점</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(0, (selectedMusic.duration ?? 30) - 1)}
              step={1}
              value={selectedMusic.startTime ?? 0}
              onValueChange={(v) => {
                onChange({ ...selectedMusic, startTime: v });
              }}
              onSlidingComplete={(v) => {
                previewFromPosition(selectedMusic.url, v);
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={[styles.volumeValue, { color: colors.inactive }]}>
              {formatDuration(selectedMusic.startTime ?? 0)}
            </Text>
          </View>
          <View style={styles.volumeRow}>
            <Ionicons name="musical-note-outline" size={14} color={colors.inactive} />
            <Text style={[styles.volumeLabel, { color: colors.inactive }]}>음악 볼륨</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={selectedMusic.volume}
              onValueChange={(v) => onChange({ ...selectedMusic, volume: v })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={[styles.volumeValue, { color: colors.inactive }]}>{Math.round(selectedMusic.volume * 100)}%</Text>
          </View>
          {isVideo && (
            <View style={styles.volumeRow}>
              <Ionicons name="volume-medium-outline" size={14} color={colors.inactive} />
              <Text style={[styles.volumeLabel, { color: colors.inactive }]}>동영상 볼륨</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={selectedMusic.videoVolume ?? 1}
                onValueChange={(v) => onChange({ ...selectedMusic, videoVolume: v })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <Text style={[styles.volumeValue, { color: colors.inactive }]}>{Math.round((selectedMusic.videoVolume ?? 1) * 100)}%</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setVisible(true)} style={styles.changeBtn}>
            <Text style={[styles.changeBtnText, { color: colors.primary }]}>음악 변경</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setVisible(true)}
        >
          <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>배경음악 추가</Text>
        </TouchableOpacity>
      )}

      {/* 음악 선택 모달 */}
      <Modal visible={visible} animationType="slide" onRequestClose={() => { stopSound(); setVisible(false); }}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { stopSound(); setVisible(false); }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>음악 선택</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={16} color={colors.inactive} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="검색..."
              placeholderTextColor={colors.inactive}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {(['추천', '인기', '저장됨'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.inactive }]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.musicItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectMusic(item)}
                >
                  <View style={[styles.albumArt, { backgroundColor: colors.surface }]}>
                    <Ionicons name="musical-note" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.musicTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.musicDuration, { color: colors.inactive }]}>{formatDuration(item.duration)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => togglePlay(item)} style={{ padding: 8 }}>
                    <Ionicons
                      name={playingId === item.id ? 'pause-circle' : 'play-circle'}
                      size={32}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  selectedBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volumeLabel: { fontSize: 12, width: 70 },
  slider: { flex: 1 },
  volumeValue: { fontSize: 12, width: 36, textAlign: 'right' },
  changeBtn: { alignItems: 'center', paddingTop: 4 },
  changeBtnText: { fontSize: 13, fontWeight: '600' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, borderBottomWidth: 0.5 },
  tab: { marginRight: 20, paddingVertical: 8 },
  tabText: { fontSize: 14, fontWeight: '600' },
  musicItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  albumArt: {
    width: 48, height: 48, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  musicTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  musicDuration: { fontSize: 12 },
});
