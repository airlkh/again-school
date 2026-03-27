import * as ImageManipulator from 'expo-image-manipulator';
import { uploadFileToStorage } from './firebaseStorageUpload';

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
  const path = `profiles/${uid}/${Date.now()}_profile.jpg`;
  const url = await uploadFileToStorage(compressedUri, path);
  console.log('[uploadProfileImage] 완료:', url?.substring(0, 80));
  return url;
}
