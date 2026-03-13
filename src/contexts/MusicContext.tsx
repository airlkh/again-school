import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVideoPlayer } from 'expo-video';
import { AppState } from 'react-native';

interface PostMusic {
  url: string;
  name?: string;
  title?: string;
  volume?: number;
  startTime?: number;
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
  const [musicUrl, setMusicUrl] = useState('');
  const isMutedRef = useRef(false);
  const currentPostIdRef = useRef<string | null>(null);
  const currentMusicRef = useRef<PostMusic | null>(null);

  const musicPlayer = useVideoPlayer(musicUrl, (player) => {
    player.loop = true;
    player.muted = isMutedRef.current;
    player.volume = currentMusicRef.current?.volume ?? 0.8;
    if (musicUrl) player.play();
  });

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then((val) => {
      const muted = val === 'true';
      setIsMuted(muted);
      isMutedRef.current = muted;
      if (musicPlayer) musicPlayer.muted = muted;
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && musicPlayer) {
        try { musicPlayer.pause(); } catch {}
      } else if (state === 'active' && musicPlayer && musicUrl && !isMutedRef.current) {
        try { musicPlayer.play(); } catch {}
      }
    });
    return () => sub.remove();
  }, [musicUrl]);

  function playMusic(postId: string, music: PostMusic) {
    if (currentPostIdRef.current === postId) return;
    currentPostIdRef.current = postId;
    currentMusicRef.current = music;
    setCurrentPostId(postId);
    setMusicUrl(music.url);
    if (musicPlayer) {
      musicPlayer.volume = music.volume ?? 0.8;
      musicPlayer.muted = isMutedRef.current;
      if (!isMutedRef.current) {
        try { musicPlayer.play(); } catch {}
      }
    }
  }

  function stopMusic() {
    currentPostIdRef.current = null;
    currentMusicRef.current = null;
    setCurrentPostId(null);
    setMusicUrl('');
    if (musicPlayer) {
      try { musicPlayer.pause(); } catch {}
    }
  }

  function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
    AsyncStorage.setItem(MUTE_KEY, String(next));
    if (musicPlayer) {
      musicPlayer.muted = next;
      if (!next && musicUrl) {
        try { musicPlayer.play(); } catch {}
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
