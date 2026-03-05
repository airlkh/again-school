import { Alert } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import * as ImageManipulator from 'expo-image-manipulator';

export type MediaType = 'image' | 'video';

interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  type: MediaType;
}

/** 이미지 자동 리사이즈/압축 (최대 1080px, 품질 80%) */
export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/** 이미지 크롭 */
export async function cropImage(
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function uploadImage(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  // 자동 압축
  let compressedUri: string;
  try {
    compressedUri = await compressImage(uri);
  } catch {
    compressedUri = uri;
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', {
      uri: compressedUri,
      name: `image_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('resource_type', 'image');
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.secure_url, type: 'image' });
        } catch {
          reject(new Error('서버 응답을 처리할 수 없습니다.'));
        }
      } else {
        let errorMsg = '이미지 업로드에 실패했습니다.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData?.error?.message) {
            errorMsg = `업로드 실패: ${errData.error.message}`;
          }
        } catch {}
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')));
    xhr.addEventListener('timeout', () => reject(new Error('업로드 시간이 초과되었습니다. 다시 시도해주세요.')));

    xhr.timeout = 60000;
    xhr.open('POST', CLOUDINARY_CONFIG.imageUploadUrl);
    xhr.send(formData);
  });
}

export async function uploadVideo(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  if (!uri || uri.trim() === '') {
    throw new Error('파일 경로가 없습니다.');
  }

  console.log('동영상 업로드 시작:', uri.substring(0, 80));

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `video_${Date.now()}.mp4`,
      type: 'video/mp4',
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('resource_type', 'video');
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const thumbnailUrl = data.secure_url.replace(/\.\w+$/, '.jpg');
          resolve({ url: data.secure_url, thumbnailUrl, type: 'video' });
        } catch {
          reject(new Error('서버 응답을 처리할 수 없습니다.'));
        }
      } else {
        let errorMsg = '동영상 업로드에 실패했습니다.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData?.error?.message) {
            errorMsg = `업로드 실패: ${errData.error.message}`;
          }
        } catch {}
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')));
    xhr.addEventListener('timeout', () => reject(new Error('업로드 시간이 초과되었습니다. 다시 시도해주세요.')));

    xhr.timeout = 600000; // 10분 타임아웃
    xhr.open('POST', CLOUDINARY_CONFIG.videoUploadUrl);
    xhr.send(formData);
  });
}

/** 업로드 실패 시 재시도 Alert */
export function showUploadRetryAlert(
  error: unknown,
  retryFn: () => void,
): void {
  const message = error instanceof Error ? error.message : '업로드에 실패했습니다.';
  Alert.alert('업로드 실패', message, [
    { text: '취소', style: 'cancel' },
    { text: '재시도', onPress: retryFn },
  ]);
}
