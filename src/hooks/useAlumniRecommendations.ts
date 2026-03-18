import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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

async function enrichWithLatestPhotos(items: AlumniRecommend[]): Promise<AlumniRecommend[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', item.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            ...item,
            photoURL: userData.photoURL || item.photoURL || '',
            displayName: userData.displayName || item.displayName,
          };
        }
      } catch {}
      return item;
    })
  );
}

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
          const raw = (data.list || []).slice(0, 20) as AlumniRecommend[];
          const enriched = await enrichWithLatestPhotos(raw);
          setRecommendations(enriched);
          setLoading(false);
        } else {
          try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({}),
            });
            const result = await res.json();
            const raw = (result.recommendations || []).slice(0, 20) as AlumniRecommend[];
            const enriched = await enrichWithLatestPhotos(raw);
            setRecommendations(enriched);
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
