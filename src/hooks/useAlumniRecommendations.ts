import { useState, useEffect, useCallback, useRef } from 'react';
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

const FUNCTION_URL = 'https://asia-northeast3-again-school-bfea8.cloudfunctions.net/generateAlumniRecommendations';

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
  const rawRef = useRef<AlumniRecommend[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, 'recommendations', 'alumni'),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const raw = (data.list || []).slice(0, 20) as AlumniRecommend[];
          rawRef.current = raw;
          const enriched = await enrichWithLatestPhotos(raw);
          setRecommendations(enriched);
          setLoading(false);
        } else {
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
              setLoading(false);
              return;
            }
            const res = await fetch(FUNCTION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({}),
            });
            if (!res.ok) {
              console.warn('[useAlumniRecommendations] 서버 응답 오류:', res.status);
              setRecommendations([]);
              setLoading(false);
              return;
            }
            const text = await res.text();
            if (!text) {
              setRecommendations([]);
              setLoading(false);
              return;
            }
            const result = JSON.parse(text);
            const raw = (result.recommendations || []).slice(0, 20) as AlumniRecommend[];
            rawRef.current = raw;
            const enriched = await enrichWithLatestPhotos(raw);
            setRecommendations(enriched);
          } catch (e) {
            console.warn('[useAlumniRecommendations] 추천 생성 실패:', e);
            setRecommendations([]);
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

  // 화면 포커스 시 호출하여 최신 photoURL 갱신
  const refreshPhotos = useCallback(async () => {
    if (rawRef.current.length === 0) return;
    try {
      const enriched = await enrichWithLatestPhotos(rawRef.current);
      setRecommendations(enriched);
    } catch (e) {
      console.warn('[useAlumniRecommendations] 사진 갱신 실패:', e);
    }
  }, []);

  return { recommendations, loading, refreshPhotos };
}
