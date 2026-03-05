import { Platform } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';

/**
 * 동영상 전용 Cloudinary 업로드
 * FileSystem 완전 미사용 — XHR + onreadystatechange 방식
 */
export const uploadVideoToCloudinary = async (
  uri: string,
  onProgress?: (pct: number) => void,
): Promise<string> => {
  if (!uri || uri.trim() === '') {
    throw new Error('동영상 파일 경로가 없습니다');
  }

  // Android content:// URI 그대로 사용
  let finalUri = uri;
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    finalUri = uri;
  }

  console.log('동영상 업로드 시작:', finalUri.substring(0, 80));

  const formData = new FormData();
  formData.append('file', {
    uri: finalUri,
    type: 'video/mp4',
    name: `video_${Date.now()}.mp4`,
  } as any);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('resource_type', 'video');

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 99));
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          onProgress?.(100);
          console.log('동영상 업로드 성공:', res.secure_url?.substring(0, 60));
          resolve(res.secure_url);
        } catch {
          reject(new Error('서버 응답 파싱 실패'));
        }
      } else if (xhr.status > 0) {
        let msg = `동영상 업로드 실패 (${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData?.error?.message) msg = errData.error.message;
        } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('네트워크 오류'));
    xhr.ontimeout = () => reject(new Error('업로드 시간 초과 (10분)'));

    xhr.open('POST', CLOUDINARY_CONFIG.videoUploadUrl);
    xhr.timeout = 600000; // 10분
    xhr.send(formData);
  });
};
