import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Dimensions, ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { SelectedMusic, MusicItem } from './MusicSelector';

const { width: SW } = Dimensions.get('window');

// 파형 설정 — 인스타그램 스타일 수평 스크롤
const BAR_W = 3;
const BAR_GAP = 2;
const BAR_COUNT = 120;
const WAVE_CONTENT_W = (BAR_W + BAR_GAP) * BAR_COUNT;
// 중앙 고정 선택 윈도우 너비 (화면의 50%)
const WIN_W = SW * 0.5;
const WIN_LEFT = (SW - WIN_W) / 2;

const MAX_SEC = 60;
const MIN_SEC = 5;

const WAVE_BARS: number[] = Array.from(
  { length: BAR_COUNT },
  () => parseFloat((0.15 + Math.random() * 0.85).toFixed(3)),
);

interface Props {
  visible: boolean;
  selectedMusic: SelectedMusic | null;
  isVideo?: boolean;
  onConfirm: (music: SelectedMusic) => void;
  onCancel: () => void;
  onStopBgMusic?: () => void;
  onPlayPreview?: (url: string, startTime: number, volume: number) => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicTrimmer({ visible, selectedMusic, isVideo = false, onConfirm, onCancel, onStopBgMusic, onPlayPreview }: Props) {
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [filtered, setFiltered] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMusic, setEditingMusic] = useState<SelectedMusic | null>(null);
  const [step, setStep] = useState<'list' | 'wave'>('list');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<AudioPlayer | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVolume, setShowVolume] = useState(false);

  // 구간 state
  const [startSec, setStartSec] = useState(0);
  const [winDurSec, setWinDurSec] = useState(30); // 선택 윈도우 구간 길이
  const [totalSec, setTotalSec] = useState(180);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollOffsetRef = useRef(0);

  // ref (스크롤/드래그 중 최신값 보장)
  const startRef = useRef(0);
  const winDurRef = useRef(30);
  const totalRef = useRef(180);
  const editingRef = useRef<SelectedMusic | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // 윈도우 왼쪽/오른쪽 경계 드래그용 — 별도 ScrollView
  const leftScrollRef = useRef<ScrollView>(null);
  const rightScrollRef = useRef<ScrollView>(null);

  // --- 파생값 ---
  const endSec = startSec + winDurSec;

  function schedulePreview(url: string, sec: number) {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
    previewDebounceRef.current = setTimeout(() => {
      previewDebounceRef.current = null;
      onStopBgMusic?.();
      if (onPlayPreview) {
        onPlayPreview(url, sec, editingRef.current?.volume ?? 0.8);
      }
    }, 150);
  }

  // 메인 파형 스크롤 → startTime 계산
  function onMainScroll(offsetX: number) {
    if (totalRef.current <= 0) return;
    // offsetX 0 = 트랙 시작
    const ratio = offsetX / WAVE_CONTENT_W;
    const maxStart = Math.max(0, totalRef.current - winDurRef.current);
    const newStart = Math.round(ratio * totalRef.current);
    const clamped = Math.max(0, Math.min(newStart, maxStart));
    startRef.current = clamped;
    setStartSec(clamped);
    setScrollOffset(offsetX);
    scrollOffsetRef.current = offsetX;
    if (editingRef.current) {
      editingRef.current.startTime = clamped;
    }
  }

  // 윈도우 너비 슬라이더 → duration 계산
  function onDurChange(val: number) {
    const dur = Math.round(val);
    winDurRef.current = dur;
    setWinDurSec(dur);
    if (editingRef.current) {
      editingRef.current.duration = dur;
    }
  }

  function initWave(music: SelectedMusic) {
    const total = music.totalDuration && music.totalDuration > 0
      ? music.totalDuration
      : music.duration > 0
        ? music.duration
        : 180;
    const s = music.startTime ?? 0;
    const dur = Math.min(MAX_SEC, Math.max(MIN_SEC, music.duration > 0 ? music.duration : Math.min(30, total)));

    editingRef.current = { ...music, startTime: s, duration: dur, totalDuration: total };
    setEditingMusic(editingRef.current);
    setStartSec(s);
    startRef.current = s;
    setWinDurSec(dur);
    winDurRef.current = dur;
    setTotalSec(total);
    totalRef.current = total;

    setTimeout(() => {
      if (scrollRef.current && total > 0) {
        const offsetX = (s / total) * WAVE_CONTENT_W;
        scrollRef.current.scrollTo({ x: offsetX, animated: false });
      }
    }, 100);
  }

  useEffect(() => {
    if (visible) {
      setStep(selectedMusic ? 'wave' : 'list');
      setShowVolume(false);
      loadMusic();
      if (selectedMusic) {
        setEditingMusic(selectedMusic);
        editingRef.current = selectedMusic;
        initWave(selectedMusic);
      } else {
        setEditingMusic(null);
        editingRef.current = null;
        setStartSec(0);
        setWinDurSec(30);
        setTotalSec(180);
      }
    } else {
      onStopBgMusic?.();
    }
  }, [visible]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    setFiltered(q ? musicList.filter((m: MusicItem) => m.title.toLowerCase().includes(q)) : musicList);
  }, [searchQuery, musicList]);

  async function loadMusic() {
    if (musicList.length > 0) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const items: MusicItem[] = snap.docs.map(
        (d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() } as MusicItem),
      );
      setMusicList(items);
      setFiltered(items);
    } catch (e) {
      console.warn('[MusicTrimmer] 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }

  function stopAllSound() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    const s = soundRef.current;
    soundRef.current = null;
    if (s) { try { s.remove(); } catch {} }
    setPlayingId(null);
  }

  async function togglePreview(item: MusicItem) {
    if (playingId === item.id) { stopAllSound(); return; }
    stopAllSound();
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer({ uri: item.url });
      player.volume = 0.8;
      player.play();
      soundRef.current = player;
      setPlayingId(item.id);
    } catch {}
  }

  async function selectMusic(item: MusicItem) {
    stopAllSound();
    let realDuration = item.duration;

    // duration이 0이면 실제 길이 가져오기
    if (!realDuration || realDuration <= 0) {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const player = createAudioPlayer({ uri: item.url });
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (player.isLoaded) { clearInterval(check); resolve(); }
          }, 100);
          setTimeout(() => { clearInterval(check); resolve(); }, 5000);
        });
        if (player.duration > 0) {
          realDuration = Math.round(player.duration);
        }
        player.remove();
      } catch (e) {
        console.warn('[MusicTrimmer] duration 로드 실패:', e);
        realDuration = 180; // fallback
      }
    }

    const total = realDuration;
    const dur = Math.min(MAX_SEC, total);
    const music: SelectedMusic = {
      id: item.id,
      title: item.title,
      url: item.url,
      startTime: 0,
      duration: dur,
      totalDuration: total,
      volume: 0.8,
      videoVolume: isVideo ? 0.5 : undefined,
    };
    initWave(music);
    setStep('wave');
  }

  function handleConfirm() {
    if (editingRef.current) {
      stopAllSound();
      onConfirm({
        ...editingRef.current,
        startTime: startRef.current,
        duration: winDurRef.current,
      });
    }
  }

  if (!visible) return null;

  // 파형 바 색상: 스크롤 위치 기반으로 하이라이트
  const barUnit = BAR_W + BAR_GAP;
  const winStartBar = Math.floor(scrollOffset / barUnit);
  const winEndBar = Math.ceil((scrollOffset + WIN_W) / barUnit);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── 1단계: 음악 목록 ── */}
          {step === 'list' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>음악 선택</Text>
                <View style={{ width: 26 }} />
              </View>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="검색..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
              </View>
              {loading ? (
                <ActivityIndicator size="large" color="#FF3124" style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item: MusicItem) => item.id}
                  renderItem={({ item }: { item: MusicItem }) => (
                    <TouchableOpacity style={styles.musicItem} onPress={() => selectMusic(item)}>
                      <View style={styles.albumArt}>
                        <Ionicons name="musical-note" size={20} color="#FF3124" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.musicTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.musicDuration}>{fmt(item.duration)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => togglePreview(item)}
                        style={styles.previewBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
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

          {/* ── 2단계: 구간 선택 ── */}
          {step === 'wave' && editingMusic && (
            <>
              {/* 트랙 정보 */}
              <View style={styles.waveHeader}>
                <View style={styles.albumThumb}>
                  <Ionicons name="musical-note" size={28} color="#FF3124" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.waveTitle} numberOfLines={1}>{editingMusic.title}</Text>
                  <Text style={styles.waveSub}>{fmt(startSec)} ~ {fmt(endSec)} · {winDurSec}초</Text>
                </View>
                <TouchableOpacity onPress={() => { stopAllSound(); setStep('list'); }} style={{ padding: 8 }}>
                  <Text style={styles.changeBtn}>변경</Text>
                </TouchableOpacity>
              </View>

              {/* 파형 스크롤 */}
              <View style={styles.waveContainer}>
                {/* 중앙 고정 선택 윈도우 */}
                <View pointerEvents="none" style={styles.waveWindow} />

                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: WIN_LEFT }}
                  onScroll={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    onMainScroll(offsetX);
                  }}
                  onScrollEndDrag={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    onMainScroll(offsetX);
                    if (editingRef.current) schedulePreview(editingRef.current.url, startRef.current);
                  }}
                  onMomentumScrollEnd={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    onMainScroll(offsetX);
                    if (editingRef.current) schedulePreview(editingRef.current.url, startRef.current);
                  }}
                  scrollEventThrottle={16}
                >
                  <View style={styles.barsRow}>
                    {WAVE_BARS.map((h, i) => {
                      const inWin = i >= winStartBar && i < winEndBar;
                      return (
                        <View
                          key={i}
                          style={{
                            width: BAR_W,
                            height: Math.max(4, Math.round(60 * h)),
                            borderRadius: 2,
                            backgroundColor: inWin ? '#fff' : '#444',
                            marginRight: BAR_GAP,
                            alignSelf: 'center',
                          }}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* 시간 표시 */}
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>{fmt(startSec)}</Text>
                <Text style={styles.timeDuration}>{winDurSec}초 선택됨</Text>
                <Text style={styles.timeLabel}>{fmt(endSec)}</Text>
              </View>

              {/* 구간 길이 슬라이더 */}
              <View style={styles.durRow}>
                <Text style={styles.durLabel}>구간</Text>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={MIN_SEC}
                  maximumValue={Math.min(MAX_SEC, totalSec)}
                  step={1}
                  value={winDurSec}
                  onValueChange={onDurChange}
                  minimumTrackTintColor="#FFD700"
                  maximumTrackTintColor="#444"
                  thumbTintColor="#FFD700"
                />
                <Text style={styles.durVal}>{winDurSec}초</Text>
              </View>

              {/* 볼륨 패널 */}
              {showVolume && (
                <View style={styles.volumePanel}>
                  <View style={styles.volumeRow}>
                    <Ionicons name="musical-note-outline" size={14} color="#aaa" />
                    <Text style={styles.volumeLabel}>음악</Text>
                    <Slider
                      style={{ flex: 1 }}
                      minimumValue={0} maximumValue={1} step={0.01}
                      value={editingMusic.volume}
                      onValueChange={(v: number) => setEditingMusic((prev: SelectedMusic | null) => prev ? { ...prev, volume: v } : prev)}
                      minimumTrackTintColor="#FF3124" maximumTrackTintColor="#444" thumbTintColor="#FF3124"
                    />
                    <Text style={styles.volumeValue}>{Math.round(editingMusic.volume * 100)}%</Text>
                  </View>
                  {isVideo && (
                    <View style={styles.volumeRow}>
                      <Ionicons name="volume-medium-outline" size={14} color="#aaa" />
                      <Text style={styles.volumeLabel}>동영상</Text>
                      <Slider
                        style={{ flex: 1 }}
                        minimumValue={0} maximumValue={1} step={0.01}
                        value={editingMusic.videoVolume ?? 1}
                        onValueChange={(v: number) => setEditingMusic((prev: SelectedMusic | null) => prev ? { ...prev, videoVolume: v } : prev)}
                        minimumTrackTintColor="#FF3124" maximumTrackTintColor="#444" thumbTintColor="#FF3124"
                      />
                      <Text style={styles.volumeValue}>{Math.round((editingMusic.videoVolume ?? 1) * 100)}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 하단 버튼 */}
              <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
                <TouchableOpacity onPress={() => { onStopBgMusic?.(); onCancel(); }} style={styles.bottomBtn}>
                  <Text style={styles.bottomBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowVolume((v: boolean) => !v)}
                  style={[styles.bottomBtn, showVolume && styles.bottomBtnActive]}
                >
                  <Ionicons name="volume-medium-outline" size={18} color="#fff" />
                  <Text style={styles.bottomBtnText}>오디오</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.bottomBtn}>
                  <Text style={[styles.bottomBtnText, styles.confirmText]}>완료</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '75%', backgroundColor: '#111', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#222' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  musicItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#222' },
  albumArt: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  musicTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  musicDuration: { fontSize: 12, color: '#888' },
  previewBtn: { padding: 4 },
  waveHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  albumThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  waveTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  waveSub: { fontSize: 12, color: '#aaa' },
  changeBtn: { color: '#aaa', fontSize: 13 },
  waveContainer: { height: 80, justifyContent: 'center', marginVertical: 8, position: 'relative' },
  waveWindow: {
    position: 'absolute', left: WIN_LEFT, width: WIN_W, height: 80,
    borderWidth: 2, borderColor: '#FFD700', borderRadius: 4, zIndex: 10,
  },
  barsRow: { flexDirection: 'row', alignItems: 'center', height: 80 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 6 },
  timeLabel: { fontSize: 12, color: '#FF3124', fontWeight: '600' },
  timeDuration: { fontSize: 12, color: '#FFD700', fontWeight: '700' },
  durRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  durLabel: { fontSize: 12, color: '#aaa', width: 36 },
  durVal: { fontSize: 12, color: '#fff', width: 40, textAlign: 'right' },
  volumePanel: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: '#333' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  volumeLabel: { fontSize: 12, color: '#aaa', width: 50 },
  volumeValue: { fontSize: 12, color: '#aaa', width: 36, textAlign: 'right' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: '#333', marginTop: 'auto' },
  bottomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bottomBtnActive: { backgroundColor: '#333' },
  bottomBtnText: { fontSize: 15, color: '#fff' },
  confirmText: { color: '#FF3124', fontWeight: '700' },
});
