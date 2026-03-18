import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const logError = async (
  error: Error,
  type: 'crash' | 'network' | 'auth' | 'firestore' | 'unknown' = 'unknown',
  userId?: string,
  userEmail?: string
) => {
  try {
    await addDoc(collection(db, 'errorLogs'), {
      type,
      message: error.message,
      stack: error.stack || '',
      userId: userId || null,
      userEmail: userEmail || null,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || 'unknown',
      deviceInfo: `${Platform.OS} ${Platform.Version}`,
      createdAt: serverTimestamp(),
      isResolved: false,
    });
  } catch (e) {
    console.error('Error logging failed:', e);
  }
};
