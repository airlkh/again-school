import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MusicContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextType>({
  isMuted: false,
  toggleMute: () => {},
});

const MUTE_KEY = '@music_muted';

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then((val) => {
      if (val === 'true') setIsMuted(true);
    });
  }, []);

  function toggleMute() {
    setIsMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(MUTE_KEY, String(next));
      return next;
    });
  }

  return (
    <MusicContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
