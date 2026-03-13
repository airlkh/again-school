const admin = require('firebase-admin');
const sa = require('C:/Users/airlk/Downloads/again-school-bfea8-firebase-adminsdk-fbsvc-ef813644d0.json');
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'again-school-bfea8.firebasestorage.app' });
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function rebuild() {
  // 기존 music 컬렉션 전부 삭제
  const snap = await db.collection('music').get();
  for (const doc of snap.docs) await doc.ref.delete();
  console.log('기존 문서 ' + snap.size + '개 삭제 완료');

  // Storage 파일 목록 가져오기
  const [files] = await bucket.getFiles({ prefix: 'music/' });
  console.log('Storage 파일 수:', files.length);

  let count = 0;
  for (const file of files) {
    const fileName = file.name.replace('music/', '');
    if (!fileName || fileName.endsWith('/')) continue;
    const encodedName = encodeURIComponent(fileName);
    const url = 'https://firebasestorage.googleapis.com/v0/b/again-school-bfea8.firebasestorage.app/o/music%2F' + encodedName + '?alt=media';
    const title = fileName.replace(/\.(mp3|wav|m4a)$/i, '').trim();
    await db.collection('music').add({
      title,
      url,
      duration: 0,
      genre: '추천',
      createdAt: Date.now(),
    });
    count++;
  }
  console.log(count + '개 등록 완료!');
  process.exit(0);
}
rebuild().catch(e => { console.error(e); process.exit(1); });
