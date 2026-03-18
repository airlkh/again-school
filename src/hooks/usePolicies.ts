import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export type PolicyType = 'terms' | 'privacy' | 'community';

export interface Policy {
  title: string;
  content: string;
  status: 'draft' | 'published';
  version: string;
  publishedAt: any;
  updatedAt: any;
}

export function usePolicy(type: PolicyType) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'policies', type),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Policy;
          if (data.status === 'published') {
            setPolicy(data);
          } else {
            setPolicy(null);
          }
        } else {
          setPolicy(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[usePolicy] ${type} 로드 실패:`, err);
        setError('약관을 불러오지 못했습니다.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [type]);

  return { policy, loading, error };
}
