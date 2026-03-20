const functions = require('firebase-functions/v1');
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
exports.kakaoAuth = functions.region("asia-northeast3").https.onRequest(async (req, res) => {
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
exports.naverAuth = functions.region("asia-northeast3").https.onRequest(async (req, res) => {
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

// ── 동창 추천 알고리즘 ──────────────────────────────────────────
const db = admin.firestore();

function calcAlumniScore(me, target, friendUids, friendOfFriendUids) {
  let score = 0;
  const commonSchools = [];
  const reasons = [];
  const mySchools = me.schools || [];
  const targetSchools = target.schools || [];

  for (const mine of mySchools) {
    for (const theirs of targetSchools) {
      if (mine.schoolName === theirs.schoolName) {
        if (!commonSchools.includes(mine.schoolName)) commonSchools.push(mine.schoolName);
        score += 50;
        if (mine.graduationYear && theirs.graduationYear) {
          const diff = Math.abs(mine.graduationYear - theirs.graduationYear);
          if (diff === 0) score += 30;
          else if (diff === 1) score += 25;
          else if (diff === 2) score += 20;
          else if (diff === 3) score += 10;
          else if (diff <= 5) score += 5;
        }
        const label = mine.schoolType || '학교';
        if (!reasons.includes(`같은 ${label} 동창`)) reasons.push(`같은 ${label} 동창`);
      }
    }
  }
  if (commonSchools.length >= 2) { score += 20; reasons.unshift(`${commonSchools.length}개 학교 공통`); }

  const myTeacherSchools = [...(me.teacherHistory || []).map(t => t.schoolName), me.teacherSchoolName].filter(Boolean);
  const targetSchoolNames = target.schoolNames || [];
  for (const ts of myTeacherSchools) {
    if (targetSchoolNames.includes(ts)) { score += 40; reasons.push('가르친 학교 출신'); break; }
  }

  if (friendOfFriendUids.has(target.uid) && !friendUids.has(target.uid)) { score += 30; reasons.push('친구의 동창'); }
  if (me.region && target.region && me.region === target.region) { score += 15; reasons.push(`${me.region} 지역`); }

  return { score, commonSchools, reason: reasons[0] || '같은 학교 출신', reasonDetail: reasons.slice(0, 2).join(' · ') };
}

exports.generateAlumniRecommendations = functions.region("asia-northeast3").https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const authHeader = req.headers.authorization || '';
  let uid;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: '로그인이 필요합니다.' }); return;
  }

  const myDoc = await db.collection('users').doc(uid).get();
  if (!myDoc.exists) throw new functions.https.HttpsError('not-found', '유저 없음');
  const me = { uid, ...myDoc.data() };
  if (!me.schoolNames || me.schoolNames.length === 0) return { recommendations: [] };

  const connSnap = await db.collection('connections').where('fromUid', '==', uid).get();
  const friendUids = new Set(connSnap.docs.map(d => d.data().toUid));
  friendUids.add(uid);

  const friendOfFriendUids = new Set();
  for (const fid of Array.from(friendUids).slice(0, 20)) {
    const fofSnap = await db.collection('connections').where('fromUid', '==', fid).limit(30).get();
    fofSnap.docs.forEach(d => { const toId = d.data().toUid; if (!friendUids.has(toId)) friendOfFriendUids.add(toId); });
  }

  const candidatesSnap = await db.collection('users')
    .where('schoolNames', 'array-contains-any', me.schoolNames.slice(0, 10))
    .limit(200).get();

  const results = [];
  for (const cdoc of candidatesSnap.docs) {
    const target = { uid: cdoc.id, ...cdoc.data() };
    if (friendUids.has(target.uid)) continue;
    const { score, commonSchools, reason, reasonDetail } = calcAlumniScore(me, target, friendUids, friendOfFriendUids);
    if (score > 0) {
      results.push({ uid: target.uid, displayName: target.displayName || '알 수 없음', photoURL: target.photoURL || '', score, commonSchools, reason, reasonDetail, updatedAt: admin.firestore.Timestamp.now() });
    }
  }

  results.sort((a, b) => b.score - a.score);
  const top20 = results.slice(0, 20);
  await db.collection('users').doc(uid).collection('recommendations').doc('alumni').set({ list: top20, updatedAt: admin.firestore.Timestamp.now() });
  res.json({ recommendations: top20.slice(0, 5) });
});

exports.scheduledAlumniRecommendations = functions.region("asia-northeast3").pubsub.schedule('0 3 * * *').timeZone('Asia/Seoul').onRun(async () => {
  const usersSnap = await db.collection('users').limit(500).get();
  let count = 0;
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    try {
      const me = { uid, ...userDoc.data() };
      if (!me.schoolNames || me.schoolNames.length === 0) continue;

      const connSnap = await db.collection('connections').where('fromUid', '==', uid).get();
      const friendUids = new Set(connSnap.docs.map(d => d.data().toUid));
      friendUids.add(uid);

      const friendOfFriendUids = new Set();
      for (const fid of Array.from(friendUids).slice(0, 10)) {
        const fofSnap = await db.collection('connections').where('fromUid', '==', fid).limit(20).get();
        fofSnap.docs.forEach(d => { const toId = d.data().toUid; if (!friendUids.has(toId)) friendOfFriendUids.add(toId); });
      }

      const candidatesSnap = await db.collection('users')
        .where('schoolNames', 'array-contains-any', me.schoolNames.slice(0, 10))
        .limit(100).get();

      const results = [];
      for (const cdoc of candidatesSnap.docs) {
        const target = { uid: cdoc.id, ...cdoc.data() };
        if (friendUids.has(target.uid)) continue;
        const { score, commonSchools, reason, reasonDetail } = calcAlumniScore(me, target, friendUids, friendOfFriendUids);
        if (score > 0) {
          results.push({ uid: target.uid, displayName: target.displayName || '알 수 없음', photoURL: target.photoURL || '', score, commonSchools, reason, reasonDetail, updatedAt: admin.firestore.Timestamp.now() });
        }
      }
      results.sort((a, b) => b.score - a.score);
      await db.collection('users').doc(uid).collection('recommendations').doc('alumni').set({ list: results.slice(0, 20), updatedAt: admin.firestore.Timestamp.now() });
      count++;
    } catch (e) { console.error(`추천 생성 실패 uid=${uid}`, e); }
  }
  console.log(`추천 갱신 완료: ${count}명`);
  return null;
});

// ── 선생님 인증 결과 푸시 알림 ──────────────────────────────
exports.sendTeacherVerificationPush = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  const { toUid, approved, reason } = data;
  try {
    const userSnap = await db.doc(`users/${toUid}`).get();
    if (!userSnap.exists) return { success: false };
    const pushToken = userSnap.data()?.pushToken;
    if (!pushToken) return { success: false, message: 'pushToken 없음' };
    const title = approved ? '선생님 인증 승인 ✅' : '선생님 인증 거절 ❌';
    const body = approved
      ? '선생님 인증이 승인되었습니다. 이제 선생님 배지가 표시돼요!'
      : `선생님 인증이 거절되었습니다. 사유: ${reason || '사유 없음'}`;
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: { type: 'teacherVerified', status: approved ? 'approved' : 'rejected' },
      }),
    });
    const expoJson = await expoRes.json();
    console.log('[sendTeacherVerificationPush] Expo 응답:', JSON.stringify(expoJson));
    console.log('[sendTeacherVerificationPush] pushToken:', pushToken);
    // adminAlerts에 기록
    await db.collection('adminAlerts').add({
      type: approved ? 'info' : 'warning',
      title: approved ? '선생님 인증 승인 완료' : '선생님 인증 거절',
      message: `${userSnap.data()?.displayName || toUid}님의 선생님 인증이 ${approved ? '승인' : '거절'}되었습니다.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      category: 'verification',
    });
    return { success: true };
  } catch (e) {
    console.error('푸시 알림 발송 실패:', e);
    return { success: false, error: String(e) };
  }
});

// ── 전체 유저 공지사항 푸시 알림 ──────────────────────────────
exports.sendNoticeToAll = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  const { title, content, imageUrl, linkUrl } = data;
  try {
    const usersSnap = await db.collection('users').get();
    const tokens = [];
    usersSnap.forEach((doc) => {
      const pushToken = doc.data()?.pushToken;
      if (pushToken) tokens.push(pushToken);
    });
    if (tokens.length === 0) return { success: false, message: '푸시 토큰 없음' };
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map((token) => ({
          to: token,
          title: `📢 ${title}`,
          body: content,
          ...(imageUrl ? { image: imageUrl } : {}),
          data: { type: 'notice', linkUrl: linkUrl || '' },
        }))),
      });
    }
    console.log(`[sendNoticeToAll] ${tokens.length}명에게 푸시 발송 완료`);
    return { success: true, count: tokens.length };
  } catch (e) {
    console.error('[sendNoticeToAll] 실패:', e);
    return { success: false, error: String(e) };
  }
});

// ── 회원 강제 탈퇴 ──────────────────────────────
exports.deleteUserAccount = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  const { uid, reason } = data;
  if (!uid) return { success: false, message: 'uid 없음' };
  try {
    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();
    await db.collection('deletedUsers').add({
      uid,
      reason: reason || '관리자 강제 탈퇴',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('adminAlerts').add({
      type: 'warning',
      title: '회원 강제 탈퇴 처리',
      message: `uid: ${uid} 회원이 강제 탈퇴 처리되었습니다. 사유: ${reason || '없음'}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      category: 'sanction',
    });
    console.log(`[deleteUserAccount] ${uid} 강제 탈퇴 완료`);
    return { success: true };
  } catch (e) {
    console.error('[deleteUserAccount] 실패:', e);
    return { success: false, error: String(e) };
  }
});

// ── 휴면 회원 자동 감지 (매일 새벽 2시) ──────────────────────────────
exports.checkDormantUsers = functions.region('asia-northeast3').pubsub.schedule('0 2 * * *').timeZone('Asia/Seoul').onRun(async () => {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  try {
    const usersSnap = await db.collection('users').get();
    let dormantCount = 0;
    let activatedCount = 0;
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      if (data.disabled || data.withdrawn) continue;
      const lastSeen = data.lastSeen?.toDate?.() || data.lastActiveAt?.toDate?.() || null;
      const createdAt = data.createdAt?.toDate?.() || (typeof data.createdAt === 'number' ? new Date(data.createdAt) : null);
      const lastActive = lastSeen || createdAt;
      if (!lastActive) continue;
      if (lastActive < oneMonthAgo && !data.dormant) {
        await userDoc.ref.update({ dormant: true, dormantAt: admin.firestore.FieldValue.serverTimestamp(), status: '휴면' });
        dormantCount++;
      } else if (lastActive >= oneMonthAgo && data.dormant) {
        await userDoc.ref.update({ dormant: false, dormantAt: null, status: '정상' });
        activatedCount++;
      }
    }
    if (dormantCount > 0 || activatedCount > 0) {
      await db.collection('adminAlerts').add({
        type: 'info',
        title: '휴면 회원 자동 처리',
        message: `휴면 전환: ${dormantCount}명, 휴면 해제: ${activatedCount}명`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        category: 'dormant',
      });
    }
    console.log(`[checkDormantUsers] 휴면: ${dormantCount}명, 해제: ${activatedCount}명`);
    return null;
  } catch (e) {
    console.error('[checkDormantUsers] 실패:', e);
    return null;
  }
});
