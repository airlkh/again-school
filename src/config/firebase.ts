import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCEZSTbUfz0Ca1W2cOKPwR2e4p4qTXXPIQ',
  authDomain: 'again-school-bfea8.firebaseapp.com',
  projectId: 'again-school-bfea8',
  storageBucket: 'again-school-bfea8.firebasestorage.app',
  messagingSenderId: '414642537109',
  appId: '1:414642537109:android:a423daf6e0c7082c23d19c',
};

const app = initializeApp(firebaseConfig);

const persistence =
  Platform.OS === 'web'
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage);

export const auth = initializeAuth(app, { persistence });

import { getFirestore } from 'firebase/firestore';

export const db = getFirestore(app);

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

export default app;
