import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// ---- 이메일/비밀번호 ----

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  return firebaseSignOut(auth);
}

// ---- Google 로그인 ----

export function signInWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

// ---- Apple 로그인 ----

export function signInWithApple(identityToken: string, nonce: string) {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: nonce,
  });
  return signInWithCredential(auth, credential);
}

// ---- 카카오 로그인 (Cloud Function 경유) ----
// Cloud Function이 authorization code를 받아 Firebase custom token을 반환합니다.
// TODO: Cloud Function 배포 후 실제 URL로 교체하세요.

const CLOUD_FUNCTION_BASE = 'https://us-central1-again-school-bfea8.cloudfunctions.net';

export async function signInWithKakaoCode(authorizationCode: string) {
  const response = await fetch(`${CLOUD_FUNCTION_BASE}/kakaoAuth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: authorizationCode }),
  });
  if (!response.ok) throw new Error('카카오 인증 서버 오류');
  const { customToken } = await response.json();
  return signInWithCustomToken(auth, customToken);
}

// ---- 네이버 로그인 (Cloud Function 경유) ----

export async function signInWithNaverCode(authorizationCode: string, state: string) {
  const response = await fetch(`${CLOUD_FUNCTION_BASE}/naverAuth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: authorizationCode, state }),
  });
  if (!response.ok) throw new Error('네이버 인증 서버 오류');
  const { customToken } = await response.json();
  return signInWithCustomToken(auth, customToken);
}
