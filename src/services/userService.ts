export async function searchUsers(query: string): Promise<{ uid: string; displayName: string; photoURL?: string }[]> {
  if (!query.trim()) return [];
  const { collection, query: firestoreQuery, where, getDocs, orderBy, startAt, endAt } = await import('firebase/firestore');
  const { db } = await import('../config/firebase');
  const usersCol = collection(db, 'users');
  const q = firestoreQuery(
    usersCol,
    orderBy('displayName'),
    startAt(query.trim()),
    endAt(query.trim() + '\uf8ff'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    uid: d.id,
    displayName: d.data().displayName ?? '',
    photoURL: d.data().photoURL,
  })).filter(u => u.displayName);
}
