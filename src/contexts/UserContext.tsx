import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { subscribeUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types/auth';

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  displayName: string;
  avatarImg: number;
  photoURL: string | null;
  uid: string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  displayName: '익명',
  avatarImg: 1,
  photoURL: null,
  uid: '',
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (p) => setProfile(p));
    return unsub;
  }, [user?.uid]);

  const displayName = profile?.displayName || user?.displayName || '익명';
  const avatarImg = profile?.avatarImg ?? 1;
  const photoURL = profile?.photoURL || user?.photoURL || null;
  const uid = user?.uid || '';

  return (
    <UserContext.Provider value={{ user, profile, displayName, avatarImg, photoURL, uid }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
