const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const serviceAccount = {
  type: 'service_account',
  project_id: 'again-school-bfea8',
  private_key_id: '77c6cef68849da5531a9deadc9e1ad1acb0e958e',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCWqTi3Vy/eT1+w\nileEdTR4YzE32ZTWJQo4jhI+bELu6fCVdGA3AkNfG1xaq1OlNmgu5mWx8+yw/Vnq\n2nOq/OF82PSJ38j3K/DGgWek8ohGjk/vAxeNKyjB67rrQ/7mkkb+Ih96A8vAoc40\nSu9jHr3txKXh5k0P49wW1tjzNx6cvK+QlsOah0hMF+uBUZC1ZVxphBYJ+meDKuvm\nhGgIfilnWBwhVY9eDM7gQmHgXpdB+3gd2e7r/CCEpMxEvDS4wAcBuGfuMn3Amdua\nV8Fa3gqEpc1DKb2wlRFEArLHgRQJzuxUgU7lmLbfpJyCGelM0K4+QWXAV9oY+J5y\n0tfeTwsxAgMBAAECggEACe4e6HSqbskar0CQX/u3/jcEKOB3idLN/5LGUI94V5Yb\nREUz90Q4ARDaWjk1zZX5BshVoRrzpD8apLBf1IAPnlflbEtP9rynxXRaNWTCnICS\nSQMSPmd/Fk2tglwMX7xPShOhMVIGkAyKJ70IVhHnZlXNB4c+Ao4Gn7Rq/xgzCr+0\nyzv4sKQoEYFAZsxVY/QAd1aOdIem44rOG54X8G5jo+67430SUqaYJoZ0FPA3QPB2\nTJaWo/csL5fa7P0Rcju+jw0UtcKIsbG4NmBW4QY6jveXX95qmxG5UdIdr+PcvvQg\nwHhWaPp5QDqZY7YKQHUKf82hW0oe6QpWgDBJoxULXQKBgQDGAqnKMnYh+Uag7Syv\nQ5nXZLqb5oR/FTN0t9l+VBs6VCeU/GMFOjrJU4t0tf77cH9jN2Ydf2pe9JPJW0Iv\nuGhfHB3fCCynRrkfcBBctcHAMzP4LvOp2xbIQpVAXl1zONH4X1nnS+SuoaxdRMRi\nwnA3fHd/RNbtoQ1roH61WxRjHQKBgQDCyKgHZCyqdcPRq5WRFsKwYCXHnMtZIA5p\ndkwTYZp8UaM54lnLmYfN1+fgvbkfOWhpSmE8HNgnZ1vd6k1A71eBU9fRq6gzrS6H\n4Lzj/SCfImyAwI+tgQLkZ9OPXHz1BynsQx8f5AxVUuyAJ+YvBWnOPwretWqteFf1\nCo3UaLoYJQKBgDqQ3xdnBXnW+QTwIZ9VJ1OF/4vNCrNr2eRT3Ih45/TAn1R5sfAB\n4RFbHIxQqDJGe+cko5dl8FhVjsCntVPX/0biUhN9n3d6e5bI1o4VVFE808o8WOWM\nX5ir2OlI/+rsi24jBbxbvi/IseqERHHRgM9oiQ+jlM6ELCwBNHj/j3AhAoGBAI/J\nA5CBOB+U0zphiQUTYiBEuV7CtbFS4pCjTME52YpP0UgXeOW8re0bpgXWx2LvQ84F\npAV13XIo8D2+icyXYWcMd1JFfuK2wpR3J7i80GnoRWQ9wVH43COzKQ643V0bLq1D\nVyR5eUk6724jBd5MBrDDBMkl7lujbHpskgnsTQMpAoGBAJi4FJQ6MIqxeD9Xx8m2\nFV6KBj1qjpu+Cg7KcI25njd/D0tk5NIT9pGuOJ52JfbSZ/isnmBYaqX+9L6DMbm8\nyycyVTXrSoKkkOljVd9G2OX+zhcB5HZWR8jZgIH+kiBTgpaG2Ifmk7DSXSjqASyR\nbETKC3bVuMbzPB+djZAFt/80\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@again-school-bfea8.iam.gserviceaccount.com',
  client_id: '113478046507748863668',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40again-school-bfea8.iam.gserviceaccount.com',
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ── 카카오 로그인 ──────────────────────────────────────────────
exports.kakaoAuth = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const { code } = req.body;
  if (!code) { res.status(400).json({ error: 'code is required' }); return; }

  try {
    // 1. 카카오 access token 받기
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'f8d17cb22bfe25d76c2347fa4fa7ecd8',
        client_secret: 'jeEqzYbofHWzBwkbuIM4PCG5C7Tqqr8L',
        redirect_uri: 'https://again-school-bfea8.firebaseapp.com/auth/kakao/callback',
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('카카오 토큰 발급 실패: ' + JSON.stringify(tokenData));

    // 2. 카카오 사용자 정보 받기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    const kakaoId = String(userData.id);
    const nickname = userData.kakao_account?.profile?.nickname ?? '카카오사용자';
    const email = userData.kakao_account?.email ?? `kakao_${kakaoId}@again-school.app`;
    const photoURL = userData.kakao_account?.profile?.profile_image_url ?? null;

    // 3. Firebase Custom Token 생성
    const uid = `kakao:${kakaoId}`;
    try {
      await admin.auth().getUser(uid);
      await admin.auth().updateUser(uid, { displayName: nickname, ...(photoURL ? { photoURL } : {}) });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        await admin.auth().createUser({ uid, displayName: nickname, email, ...(photoURL ? { photoURL } : {}) });
      }
    }
    const customToken = await admin.auth().createCustomToken(uid, { displayName: nickname });
    res.json({ customToken });
  } catch (e) {
    console.error('kakaoAuth error:', e);
    res.status(500).json({ error: String(e) });
  }
});

// ── 네이버 로그인 ──────────────────────────────────────────────
exports.naverAuth = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const { code, state } = req.body;
  if (!code) { res.status(400).json({ error: 'code is required' }); return; }

  const NAVER_CLIENT_ID = '2evSaXfLA187LuaUcJKA';
  const NAVER_CLIENT_SECRET = 'VQ5iPF7yhK';

  try {
    // 1. 네이버 access token 받기
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        redirect_uri: 'https://again-school-bfea8.firebaseapp.com/auth/naver/callback',
        code,
        state,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('네이버 토큰 발급 실패: ' + JSON.stringify(tokenData));

    // 2. 네이버 사용자 정보 받기
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    const naverId = userData.response?.id;
    const nickname = userData.response?.nickname ?? userData.response?.name ?? '네이버사용자';
    const email = userData.response?.email ?? `naver_${naverId}@again-school.app`;
    const rawPhoto = userData.response?.profile_image ?? '';
    const photoURL = rawPhoto && rawPhoto.startsWith('http') ? rawPhoto : null;

    // 3. Firebase Custom Token 생성
    const uid = `naver:${naverId}`;
    try {
      await admin.auth().getUser(uid);
      await admin.auth().updateUser(uid, { displayName: nickname, ...(photoURL ? { photoURL } : {}) });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        try {
          await admin.auth().createUser({ uid, displayName: nickname, email, ...(photoURL ? { photoURL } : {}) });
        } catch (createErr) {
          if (createErr.code === 'auth/email-already-exists') {
            await admin.auth().createUser({ uid, displayName: nickname, ...(photoURL ? { photoURL } : {}) });
          } else {
            throw createErr;
          }
        }
      }
    }
    const customToken = await admin.auth().createCustomToken(uid, { displayName: nickname });
    res.json({ customToken });
  } catch (e) {
    console.error('naverAuth error:', e);
    res.status(500).json({ error: String(e) });
  }
});
