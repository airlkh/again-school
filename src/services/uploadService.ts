import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import { uploadFileToStorage } from './firebaseStorageUpload';

export const uploadToCloudinary = async (
  uri: string,
  type: 'image' | 'video',
  onProgress?: (pct: number) => void,
): Promise<string> => {
  if (!uri || uri.trim() === '') throw new Error('파일 경로가 없습니다');

  if (type === 'video') {
    console.log('동영상 업로드 시작 (Cloudinary):', uri.substring(0, 80));
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'video/mp4',
      name: `video_${Date.now()}.mp4`,
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('resource_type', 'video');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url);
          } catch {
            reject(new Error('서버 응답을 처리할 수 없습니다.'));
          }
        } else {
          reject(new Error('동영상 업로드에 실패했습니다.'));
        }
      };
      xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다.'));
      xhr.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다.'));
      xhr.open('POST', CLOUDINARY_CONFIG.videoUploadUrl);
      xhr.timeout = 600000;
      xhr.send(formData);
    });
  }

  const path = `chat/images/${Date.now()}_chat.jpg`;
  return await uploadFileToStorage(uri, path, 'image/jpeg', onProgress);
};

export const uploadMedia = uploadToCloudinary;
