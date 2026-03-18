import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface AlumniRecommend {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
  commonSchools: string[];
  reason: string;
  reasonDetail: string;
}

const FUNCTION_URL = 'https://us-central1-again-school-bfea8.cloudfunctions.net/generateAlumniRecommendations';

export function useAlumniRecommendations() {
  const [recommendations, setRecommendations] = useState<AlumniRecommend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, 'recommendations', 'alumni'),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRecommendations((data.list || []).slice(0, 5));
          setLoading(false);
        } else {
          // 추천 데이터 없으면 Functions 호출해서 생성
          try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({}),
            });
            const data = await res.json();
            setRecommendations((data.recommendations || []).slice(0, 5));
          } catch (e) {
            console.warn('[useAlumniRecommendations] 추천 생성 실패:', e);
          } finally {
            setLoading(false);
          }
        }
      },
      (error) => {
        console.warn('[useAlumniRecommendations] 구독 오류:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { recommendations, loading };
}
