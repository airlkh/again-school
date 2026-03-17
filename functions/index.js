const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

admin.initializeApp();

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
      await admin.auth().updateUser(uid, { displayName: nickname, email, photoURL });
    } catch {
      await admin.auth().createUser({ uid, displayName: nickname, email, photoURL });
    }
    const customToken = await admin.auth().createCustomToken(uid);
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
    const photoURL = userData.response?.profile_image ?? null;

    // 3. Firebase Custom Token 생성
    const uid = `naver:${naverId}`;
    try {
      await admin.auth().updateUser(uid, { displayName: nickname, email, photoURL });
    } catch {
      await admin.auth().createUser({ uid, displayName: nickname, email, photoURL });
    }
    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ customToken });
  } catch (e) {
    console.error('naverAuth error:', e);
    res.status(500).json({ error: String(e) });
  }
});
