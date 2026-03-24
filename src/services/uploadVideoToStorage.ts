import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from 'firebase/auth';

const BUCKET = 'again-school-bfea8.firebasestorage.app';

/**
 * Firebase Storage 동영상 업로드 (REST API + FileSystem.uploadAsync)
 * @param uri 로컬 파일 URI
 * @param storagePath Storage 경로 (예: 'videos/chat/roomId/timestamp.mp4')
 * @param onProgress 진행률 콜백 (미지원 — 시작/완료만 호출)
 * @returns 다운로드 URL
 */
export async function uploadVideoToStorage(
  uri: string,
  storagePath: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (!uri || uri.trim() === '') {
    throw new Error('동영상 파일 경로가 없습니다');
  }

  console.log('[Storage] 동영상 업로드 시작:', { uri: uri.substring(0, 80), path: storagePath });

  // 1. Firebase Auth 토큰 가져오기
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('인증 토큰을 가져올 수 없습니다. 로그인 상태를 확인해주세요.');

  onProgress?.(10);

  // 2. Firebase Storage REST API URL 생성
  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodedPath}`;

  // 3. FileSystem.uploadAsync로 네이티브 스트리밍 업로드
  const result = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'video/mp4',
    },
  });

  if (result.status !== 200) {
    console.error('[Storage] 업로드 실패:', result.status, result.body?.substring(0, 200));
    throw new Error(`동영상 업로드 실패 (${result.status})`);
  }

  // 4. 응답에서 downloadTokens 추출하여 다운로드 URL 생성
  let downloadUrl: string;
  try {
    const data = JSON.parse(result.body);
    const dlToken = data.downloadTokens;
    if (dlToken) {
      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(data.name)}?alt=media&token=${dlToken}`;
    } else {
      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`;
    }
  } catch {
    downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`;
  }

  onProgress?.(100);
  console.log('[Storage] 동영상 업로드 성공:', downloadUrl.substring(0, 80));
  return downloadUrl;
}
