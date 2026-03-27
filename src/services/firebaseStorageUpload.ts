import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from 'firebase/auth';

const BUCKET = 'again-school-bfea8.firebasestorage.app';

export async function uploadFileToStorage(
  localUri: string,
  storagePath: string,
  contentType: string = 'image/jpeg',
  onProgress?: (pct: number) => void,
): Promise<string> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('로그인이 필요합니다');

  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodedPath}`;

  onProgress?.(10);

  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
  });

  onProgress?.(90);

  if (result.status !== 200) {
    throw new Error(`업로드 실패: ${result.status} ${result.body}`);
  }

  const data = JSON.parse(result.body);
  const dlToken = data.downloadTokens;
  const encodedName = encodeURIComponent(data.name);

  onProgress?.(100);

  return dlToken
    ? `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media&token=${dlToken}`
    : `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media`;
}
