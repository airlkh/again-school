import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Dimensions, ScrollView, ActivityIndicator, Modal,
  TextInput, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { SelectedMusic, MusicItem } from './MusicSelector';

const { width: SW } = Dimensions.get('window');
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_COUNT = 80;
const WAVE_WIDTH = (BAR_WIDTH + BAR_GAP) * BAR_COUNT;
const WINDOW_SEC = 15; // 선택 창 표시 구간(초)

// 파형 막대 높이값 — 컴포넌트 외부에서 한 번만 생성 (렌더마다 재계산 방지)
const WAVE_BARS: number[] = Array.from(
  { length: 80 },
  () => 0.2 + Math.random() * 0.8
);

interface Props {
  visible: boolean;
  selectedMusic: SelectedMusic | null;
  isVideo?: boolean;
  onConfirm: (music: SelectedMusic) => void;
  onCancel: () => void;
}

export function MusicWaveSelector({ visible, selectedMusic, isVideo = false, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();

  // 음악 목록
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [filtered, setFiltered] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 현재 선택/편집 중인 음악
  const [editing, setEditing] = useState<SelectedMusic | null>(selectedMusic);
  const [step, setStep] = useState<'list' | 'wave'>('list');

  // 미리듣기
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<AudioPlayer | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 볼륨 패널
  const [showVolume, setShowVolume] = useState(false);

  // 파형 막대 (랜덤 고정값)
  const bars = WAVE_BARS;

  // 파형 스크롤 ref
  const scrollRef = useRef<ScrollView>(null);

  // 선택 창 X 위치 (픽셀)
  const windowPx = editing ? (editing.startTime / (editing.duration || 30)) * WAVE_WIDTH : 0;

  useEffect(() => {
    if (visible) {
      setEditing(selectedMusic);
      setStep(selectedMusic ? 'wave' : 'list');
      loadMusic();
    } else {
      stopAll();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFiltered(musicList.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFiltered(musicList);
    }
  }, [searchQuery, musicList]);

  async function loadMusic() {
    if (musicList.length > 0) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const items: MusicItem[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as MusicItem));
      setMusicList(items);
      setFiltered(items);
    } catch (e) {
      console.warn('[MusicWaveSelector] 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }

  function stopAll() {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null; }
    if (soundRef.current) {
      try { soundRef.current.remove(); } catch {}
      soundRef.current = null;
    }
    setPlayingId(null);
  }

  async function togglePreview(item: MusicItem) {
    if (playingId === item.id) { stopAll(); return; }
    stopAll();
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer({ uri: item.url });
      player.volume = 0.8;
      player.play();
      soundRef.current = player;
      setPlayingId(item.id);
    } catch {}
  }

  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function previewFrom(url: string, startTime: number) {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(async () => {
      stopAll();
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const player = createAudioPlayer({ uri: url });
        player.volume = 0.8;
        await player.seekTo(startTime);
        player.play();
        soundRef.current = player;
        previewTimerRef.current = setTimeout(() => stopAll(), 2000);
      } catch {}
    }, 300);
  }

  function selectMusic(item: MusicItem) {
    stopAll();
    const music: SelectedMusic = {
      id: item.id,
      title: item.title,
      url: item.url,
      startTime: 0,
      duration: Math.min(30, item.duration),
      totalDuration: item.duration,
      volume: 0.8,
      videoVolume: isVideo ? 0.5 : undefined,
    };
    setEditing(music);
    setStep('wave');
  }

  // 파형 스크롤 → startTime 계산, 새 startTime을 반환해서 미리듣기에 바로 사용
  function onWaveScroll(offsetX: number): number {
    if (!editing) return 0;
    const totalDuration = (editing as any).totalDuration || editing.duration || 180;
    const maxOffset = WAVE_WIDTH - (BAR_WIDTH + BAR_GAP);
    const ratio = Math.min(1, Math.max(0, offsetX / maxOffset));
    const startTime = Math.max(0, Math.floor(ratio * Math.max(0, totalDuration - WINDOW_SEC)));
    setEditing(prev => prev ? { ...prev, startTime } : prev);
    return startTime;
  }

  function handleConfirm() {
    if (editing) {
      stopAll();
      onConfirm(editing);
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: '#111' }]}>

          {/* ── 리스트 단계 ── */}
          {step === 'list' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={onCancel}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>음악 선택</Text>
                <View style={{ width: 26 }} />
              </View>

              <View style={[styles.searchRow, { backgroundColor: '#222' }]}>
                <Ionicons name="search" size={16} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: '#fff', fontSize: 14 }}
                  placeholder="검색..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#FF3124" style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.musicItem}
                      onPress={() => selectMusic(item)}
                    >
                      <View style={styles.albumArt}>
                        <Ionicons name="musical-note" size={20} color="#FF3124" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.musicTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.musicDuration}>{formatTime(item.duration)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => togglePreview(item)} style={{ padding: 8 }}>
                        <Ionicons
                          name={playingId === item.id ? 'pause-circle' : 'play-circle'}
                          size={32}
                          color="#FF3124"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

          {/* ── 파형 구간 선택 단계 ── */}
          {step === 'wave' && editing && (
            <>
              {/* 앨범 정보 */}
              <View style={styles.waveHeader}>
                <View style={styles.albumThumb}>
                  <Ionicons name="musical-note" size={28} color="#FF3124" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.waveTitle} numberOfLines={1}>{editing.title}</Text>
                  <Text style={styles.waveSub}>시작: {formatTime(editing.startTime ?? 0)}</Text>
                </View>
                <TouchableOpacity onPress={() => setStep('list')} style={{ padding: 8 }}>
                  <Text style={{ color: '#aaa', fontSize: 13 }}>변경</Text>
                </TouchableOpacity>
              </View>

              {/* 재생 시간 표시 */}
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(editing.startTime ?? 0)}</Text>
                <Text style={styles.timeText}>{formatTime(editing.duration ?? 30)}</Text>
              </View>

              {/* 파형 스크롤 영역 */}
              <View style={styles.waveContainer}>
                {/* 중앙 선택 창 (고정) */}
                <View pointerEvents="none" style={styles.waveWindow} />

                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: SW / 2 - SW * 0.15 }}
                  onScrollEndDrag={(e) => {
                    const newStart = onWaveScroll(e.nativeEvent.contentOffset.x);
                    previewFrom(editing.url, newStart);
                  }}
                  onMomentumScrollEnd={(e) => {
                    const newStart = onWaveScroll(e.nativeEvent.contentOffset.x);
                    previewFrom(editing.url, newStart);
                  }}
                  scrollEventThrottle={16}
                >
                  <View style={styles.barsRow}>
                    {bars.map((h, i) => {
                      // 선택 창 안의 막대는 흰색, 밖은 회색
                      const barX = i * (BAR_WIDTH + BAR_GAP);
                      const inWindow = barX >= windowPx && barX < windowPx + SW * 0.3;
                      return (
                        <View
                          key={i}
                          style={{
                            width: BAR_WIDTH,
                            height: 48 * h,
                            borderRadius: 2,
                            backgroundColor: inWindow ? '#fff' : '#555',
                            marginRight: BAR_GAP,
                            alignSelf: 'center',
                          }}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* 볼륨 패널 (토글) */}
              {showVolume && (
                <View style={styles.volumePanel}>
                  <View style={styles.volumeRow}>
                    <Ionicons name="musical-note-outline" size={14} color="#aaa" />
                    <Text style={styles.volumeLabel}>음악</Text>
                    <Slider
                      style={{ flex: 1 }}
                      minimumValue={0} maximumValue={1}
                      value={editing.volume}
                      onValueChange={(v) => setEditing(prev => prev ? { ...prev, volume: v } : prev)}
                      minimumTrackTintColor="#FF3124"
                      maximumTrackTintColor="#444"
                      thumbTintColor="#FF3124"
                    />
                    <Text style={styles.volumeValue}>{Math.round(editing.volume * 100)}%</Text>
                  </View>
                  {isVideo && (
                    <View style={styles.volumeRow}>
                      <Ionicons name="volume-medium-outline" size={14} color="#aaa" />
                      <Text style={styles.volumeLabel}>동영상</Text>
                      <Slider
                        style={{ flex: 1 }}
                        minimumValue={0} maximumValue={1}
                        value={editing.videoVolume ?? 1}
                        onValueChange={(v) => setEditing(prev => prev ? { ...prev, videoVolume: v } : prev)}
                        minimumTrackTintColor="#FF3124"
                        maximumTrackTintColor="#444"
                        thumbTintColor="#FF3124"
                      />
                      <Text style={styles.volumeValue}>{Math.round((editing.videoVolume ?? 1) * 100)}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 하단 버튼: 취소 / 오디오 / 완료 */}
              <View style={styles.bottomBar}>
                <TouchableOpacity onPress={onCancel} style={styles.bottomBtn}>
                  <Text style={styles.bottomBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowVolume(v => !v)}
                  style={[styles.bottomBtn, showVolume && { backgroundColor: '#333' }]}
                >
                  <Ionicons name="volume-medium-outline" size={18} color="#fff" />
                  <Text style={styles.bottomBtnText}>오디오</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.bottomBtn}>
                  <Text style={[styles.bottomBtnText, { color: '#FF3124', fontWeight: '700' }]}>완료</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '75%', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#333',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  musicItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#222',
  },
  albumArt: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: '#222', justifyContent: 'center', alignItems: 'center',
  },
  musicTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  musicDuration: { fontSize: 12, color: '#888' },
  waveHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  albumThumb: {
    width: 52, height: 52, borderRadius: 8,
    backgroundColor: '#222', justifyContent: 'center', alignItems: 'center',
  },
  waveTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  waveSub: { fontSize: 12, color: '#888' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 },
  timeText: { fontSize: 11, color: '#666' },
  waveContainer: { height: 80, justifyContent: 'center', marginVertical: 8 },
  waveWindow: {
    position: 'absolute',
    left: SW / 2 - SW * 0.15,
    width: SW * 0.3,
    height: 80,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 4,
    zIndex: 10,
  },
  barsRow: { flexDirection: 'row', alignItems: 'center', height: 80 },
  volumePanel: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: '#333' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  volumeLabel: { fontSize: 12, color: '#aaa', width: 50 },
  volumeValue: { fontSize: 12, color: '#aaa', width: 36, textAlign: 'right' },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 0.5, borderTopColor: '#333',
  },
  bottomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  bottomBtnText: { fontSize: 15, color: '#fff' },
});
