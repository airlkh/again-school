import { Alert } from 'react-native';
import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getThumbnailAsync } from 'expo-video-thumbnails';

export type MediaType = 'image' | 'video';

interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  type: MediaType;
}

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

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
  let compressedUri: string;
  try {
    compressedUri = await compressImage(uri);
  } catch {
    compressedUri = uri;
  }
  const filename = `${Date.now()}_image.jpg`;
  const storageRef = ref(storage, `posts/images/${filename}`);
  const base64 = await FileSystem.readAsStringAsync(compressedUri, {
    encoding: 'base64' as any,
  });
  onProgress?.(30);
  await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
  onProgress?.(90);
  const url = await getDownloadURL(storageRef);
  onProgress?.(100);
  return { url, type: 'image' };
}

function xhrUploadVideo(uri: string, onProgress?: (progress: number) => void): Promise<string> {
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
          resolve(data.secure_url);
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

    xhr.timeout = 600000;
    xhr.open('POST', CLOUDINARY_CONFIG.videoUploadUrl);
    xhr.send(formData);
  });
}

async function extractAndUploadThumbnail(localVideoUri: string): Promise<string | undefined> {
  try {
    const { uri: thumbUri } = await getThumbnailAsync(localVideoUri, {
      time: 1000,
      quality: 0.7,
    });
    const thumbResult = await uploadImage(thumbUri);
    return thumbResult.url;
  } catch (e) {
    console.warn('썸네일 추출/업로드 실패:', e);
    return undefined;
  }
}

export function getVideoThumbnailFromUrl(videoUrl: string): string | undefined {
  // Cloudinary transformation URL은 400 에러 나므로 사용하지 않음
  return undefined;
}

export async function uploadVideo(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  if (!uri || uri.trim() === '') {
    throw new Error('파일 경로가 없습니다.');
  }

  // Step 1: 동영상 업로드 전에 로컬 URI로 썸네일 먼저 추출
  const thumbnailUrl = await extractAndUploadThumbnail(uri);

  // Step 2: 동영상 업로드 (순수 Promise, async 콜백 없음)
  const videoUrl = await xhrUploadVideo(uri, onProgress);

  // Step 3: 썸네일 없으면 Cloudinary URL 변환으로 fallback
  const finalThumbnailUrl = thumbnailUrl ?? getVideoThumbnailFromUrl(videoUrl);

  return {
    url: videoUrl,
    thumbnailUrl: finalThumbnailUrl,
    type: 'video',
  };
}

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
