import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

interface PostMusic {
  url: string;
  name?: string;
  title?: string;
  volume?: number;
  startTime?: number;
  duration?: number;
}

interface MusicContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playMusic: (postId: string, music: PostMusic) => void;
  stopMusic: () => void;
  currentPostId: string | null;
}

const MusicContext = createContext<MusicContextType>({
  isMuted: false,
  toggleMute: () => {},
  playMusic: () => {},
  stopMusic: () => {},
  currentPostId: null,
});

const MUTE_KEY = '@music_muted';

export async function resetAudioSession() {}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const endTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);
  const currentPostIdRef = useRef<string | null>(null);
  const currentMusicRef = useRef<PostMusic | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then((val) => {
      const muted = val === 'true';
      setIsMuted(muted);
      isMutedRef.current = muted;
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        try { playerRef.current?.pause(); } catch {}
      } else if (state === 'active' && !isMutedRef.current && playerRef.current) {
        try { playerRef.current.play(); } catch {}
      }
    });
    return () => sub.remove();
  }, []);

  function stopTimeCheck() {
    if (timeCheckRef.current) {
      clearInterval(timeCheckRef.current);
      timeCheckRef.current = null;
    }
  }

  function startTimeCheck() {
    stopTimeCheck();
    timeCheckRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const end = endTimeRef.current;
      const start = startTimeRef.current;
      if (end > 0 && player.currentTime >= end) {
        try {
          player.seekTo(start);
          if (!isMutedRef.current) player.play();
        } catch {}
      }
    }, 500);
  }

  function stopPlayer() {
    stopTimeCheck();
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch {}
      try { playerRef.current.remove(); } catch {}
      playerRef.current = null;
    }
  }

  async function playMusic(postId: string, music: PostMusic) {
    stopPlayer();
    currentPostIdRef.current = postId;
    currentMusicRef.current = music;
    setCurrentPostId(postId);
    const startTime = music.startTime ?? 0;
    const duration = music.duration ?? 0;
    const isPreview = postId === 'preview';
    startTimeRef.current = startTime;
    endTimeRef.current = duration > 0 ? startTime + duration : 0;
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer({ uri: music.url });
      player.volume = music.volume ?? 0.8;
      playerRef.current = player;
      setTimeout(async () => {
        try {
          if (startTime > 0) await player.seekTo(startTime);
          if (isPreview || !isMutedRef.current) {
            player.play();
            startTimeCheck();
          }
        } catch {}
      }, 300);
    } catch {}
  }

  function stopMusic() {
    stopPlayer();
    currentPostIdRef.current = null;
    startTimeRef.current = 0;
    endTimeRef.current = 0;
    currentMusicRef.current = null;
    setCurrentPostId(null);
  }

  function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
    AsyncStorage.setItem(MUTE_KEY, String(next));
    if (playerRef.current) {
      if (next) {
        try { playerRef.current.pause(); } catch {}
      } else {
        try { playerRef.current.play(); } catch {}
      }
    }
  }

  return (
    <MusicContext.Provider value={{ isMuted, toggleMute, playMusic, stopMusic, currentPostId }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
