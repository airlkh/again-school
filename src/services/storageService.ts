import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, auth, db } from '../config/firebase';

export async function uploadProfileImage(
  uri: string,
  uid: string,
): Promise<string> {
  console.log('[uploadProfileImage] 시작, uri:', uri?.substring(0, 50));

  const response = await fetch(uri);
  const blob = await response.blob();
  console.log('[uploadProfileImage] blob 생성 완료, size:', blob.size);

  const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);
  await uploadBytes(storageRef, blob);
  console.log('[uploadProfileImage] Storage 업로드 완료');

  const downloadURL = await getDownloadURL(storageRef);
  console.log('[uploadProfileImage] downloadURL:', downloadURL?.substring(0, 80));

  await setDoc(doc(db, 'users', uid), {
    photoURL: downloadURL,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL: downloadURL });
  }

  return downloadURL;
}
