import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage, auth, db } from '../config/firebase';

export async function uploadProfileImage(
  uri: string,
  uid: string,
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);
  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);

  await updateDoc(doc(db, 'users', uid), {
    photoURL: downloadURL,
    updatedAt: serverTimestamp(),
  });

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL: downloadURL });
  }

  return downloadURL;
}
