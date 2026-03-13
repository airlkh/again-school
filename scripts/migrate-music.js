const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Cloudinary 설정
const CLOUD_NAME = 'dpmnx06ni';
const API_KEY = '267366992282362';
const API_SECRET = 'jFm6U3q0Wkfe1qRPpFWZlaK6KA4';

// Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/airlk/Downloads/again-school-bfea8-firebase-adminsdk-fbsvc-ef813644d0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'again-school-bfea8.firebasestorage.app',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const req = https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const chunks = [];
    client.get(url, (res) => {
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function migrateMusic() {
  console.log('Cloudinary music 폴더 목록 가져오는 중...');

  let nextCursor = null;
  let allResources = [];

  do {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?type=upload&max_results=100${nextCursor ? `&next_cursor=${nextCursor}` : ''}`;
    const result = await fetchJson(url);
    allResources = [...allResources, ...(result.resources || [])];
    nextCursor = result.next_cursor;
    console.log(`${allResources.length}개 파일 발견...`);
  } while (nextCursor);

  console.log(`총 ${allResources.length}개 파일 이전 시작`);

  for (let i = 0; i < allResources.length; i++) {
    const resource = allResources[i];
    const publicId = resource.public_id;
    const fileName = path.basename(publicId) + '.mp3';
    const downloadUrl = `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${publicId}`;

    console.log(`[${i+1}/${allResources.length}] ${fileName} 처리 중...`);

    try {
      // Firebase Storage 업로드
      const buffer = await downloadFile(downloadUrl);
      const firebasePath = `music/${fileName}`;
      const file = bucket.file(firebasePath);
      await file.save(buffer, { metadata: { contentType: 'audio/mpeg' } });
      await file.makePublic();
      const firebaseUrl = `https://storage.googleapis.com/again-school-bfea8.appspot.com/${firebasePath}`;

      // Firestore music 컬렉션에 등록
      const title = fileName.replace('.mp3', '').replace(/_/g, ' ');
      await db.collection('music').add({
        title,
        url: firebaseUrl,
        duration: resource.duration ?? 0,
        genre: '추천',
        createdAt: Date.now(),
      });

      console.log(`✅ ${fileName} 완료`);
    } catch (e) {
      console.error(`❌ ${fileName} 실패:`, e.message);
    }
  }

  console.log('🎉 이전 완료!');
  process.exit(0);
}

migrateMusic().catch(console.error);
