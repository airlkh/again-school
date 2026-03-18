import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCEP5HkX641JwuJHJ2NYjnE4psrUWA6UAY',
  authDomain: 'again-school-bfea8.firebaseapp.com',
  projectId: 'again-school-bfea8',
  storageBucket: 'again-school-bfea8.firebasestorage.app',
  messagingSenderId: '414642537109',
  appId: '1:414642537109:web:16f38acfcbba3c4023d19c',
  measurementId: 'G-5W336ENH4B',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
