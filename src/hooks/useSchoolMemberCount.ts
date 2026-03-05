import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useSchoolMemberCounts(schoolNames: string[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (schoolNames.length === 0) return;

    let cancelled = false;

    (async () => {
      const result: Record<string, number> = {};
      for (const name of schoolNames) {
        try {
          const q = query(
            collection(db, 'users'),
            where('schoolNames', 'array-contains', name),
          );
          const snap = await getDocs(q);
          if (!cancelled) result[name] = snap.size;
        } catch {
          if (!cancelled) result[name] = 0;
        }
      }
      if (!cancelled) setCounts(result);
    })();

    return () => { cancelled = true; };
  }, [schoolNames.join(',')]);

  return counts;
}
