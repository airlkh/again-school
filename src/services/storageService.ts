import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as ImageManipulator from 'expo-image-manipulator';

async function compressProfileImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

export async function uploadProfileImage(
  uri: string,
  uid: string,
): Promise<string> {
  console.log('[uploadProfileImage] 시작');
  const compressedUri = await compressProfileImage(uri);
  const filename = `${Date.now()}_profile.jpg`;
  const storageRef = ref(storage, `profiles/${uid}/${filename}`);
  const response = await fetch(compressedUri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const downloadURL = await getDownloadURL(storageRef);
  console.log('[uploadProfileImage] 완료:', downloadURL?.substring(0, 80));
  return downloadURL;
}
