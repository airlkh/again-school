import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useGoBack } from '../../src/hooks/useGoBack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const goBack = useGoBack();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setProgress(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    if (status.isLoaded && !status.isBuffering) {
      setIsLoading(false);
    }
    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0);
      videoRef.current?.playAsync();
    }
  }

  function togglePlay() {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
  }

  function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: uri || '' }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isMuted={isMuted}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity onPress={goBack} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlay} style={styles.controlBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.timeText}>
            {formatTime(progress)} / {formatTime(duration)}
          </Text>
          <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.controlBtn}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    marginBottom: 12,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#e8313a',
    borderRadius: 1.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlBtn: { padding: 8 },
  timeText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});
