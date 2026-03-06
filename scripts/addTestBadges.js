/**
 * Firestore users 컬렉션에 테스트용 뱃지 데이터를 추가하는 스크립트
 *
 * 사용법:
 *   node scripts/addTestBadges.js
 *
 * 동작:
 *   1. users 컬렉션의 모든 문서를 조회
 *   2. 각 유저에게 순서대로 다른 등급의 trustCount를 부여
 *      - 1번째: 새싹 (trustCount: 1)
 *      - 2번째: 인증 (trustCount: 3)
 *      - 3번째: 신뢰 (trustCount: 6)
 *      - 4번째: 레전드 (trustCount: 10)
 *      - 5번째~: 다시 순환
 *   3. 특정 uid만 지정하려면 아래 TARGET_UIDS 배열을 채우세요
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCEZSTbUfz0Ca1W2cOKPwR2e4p4qTXXPIQ',
  authDomain: 'again-school-bfea8.firebaseapp.com',
  projectId: 'again-school-bfea8',
  storageBucket: 'again-school-bfea8.firebasestorage.app',
  messagingSenderId: '414642537109',
  appId: '1:414642537109:android:a423daf6e0c7082c23d19c',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 특정 uid만 대상으로 하려면 여기에 채우세요 (빈 배열이면 전체 유저 대상)
const TARGET_UIDS = [];

const BADGE_LEVELS = [
  { trustCount: 1, verifiedSchools: ['school1'], label: '새싹' },
  { trustCount: 3, verifiedSchools: ['s1', 's2', 's3'], label: '인증' },
  {
    trustCount: 6,
    verifiedSchools: ['s1', 's2', 's3', 's4', 's5', 's6'],
    label: '신뢰',
  },
  {
    trustCount: 10,
    verifiedSchools: Array(10).fill('school'),
    label: '레전드',
  },
];

async function main() {
  let uids = TARGET_UIDS;

  if (uids.length === 0) {
    console.log('users 컬렉션에서 전체 유저 조회 중...');
    const snap = await getDocs(collection(db, 'users'));
    uids = snap.docs.map((d) => d.id);
    console.log(`총 ${uids.length}명의 유저 발견`);
  }

  if (uids.length === 0) {
    console.log('대상 유저가 없습니다.');
    process.exit(0);
  }

  for (let i = 0; i < uids.length; i++) {
    const uid = uids[i];
    const level = BADGE_LEVELS[i % BADGE_LEVELS.length];

    try {
      await updateDoc(doc(db, 'users', uid), {
        trustCount: level.trustCount,
        verifiedSchools: level.verifiedSchools,
      });
      console.log(
        `[${i + 1}/${uids.length}] uid=${uid} => ${level.label} (trustCount=${level.trustCount})`,
      );
    } catch (err) {
      console.error(`uid=${uid} 업데이트 실패:`, err.message);
    }
  }

  console.log('\n완료! 앱에서 뱃지를 확인하세요.');
  console.log('뱃지 기준:');
  console.log('  trustCount >= 1  => 새싹 동창');
  console.log('  trustCount >= 3  => 인증 동창');
  console.log('  trustCount >= 6  => 신뢰 동창');
  console.log('  trustCount >= 10 => 레전드 동창');
  process.exit(0);
}

main().catch((err) => {
  console.error('스크립트 실행 실패:', err);
  process.exit(1);
});
