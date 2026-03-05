import { CLOUDINARY_CONFIG } from '../config/cloudinary';

/**
 * Cloudinary에 미디어를 업로드합니다.
 * FileSystem 완전 제거 — XHR만 사용.
 */
export const uploadToCloudinary = async (
  uri: string,
  type: 'image' | 'video',
  onProgress?: (pct: number) => void,
): Promise<string> => {
  if (!uri || uri.trim() === '') throw new Error('파일 경로가 없습니다');

  console.log('업로드 시작:', { uri: uri.substring(0, 80), type });

  const isVideo = type === 'video';
  const endpoint = isVideo
    ? CLOUDINARY_CONFIG.videoUploadUrl
    : CLOUDINARY_CONFIG.imageUploadUrl;

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: isVideo ? 'video/mp4' : 'image/jpeg',
    name: isVideo ? `video_${Date.now()}.mp4` : `image_${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('resource_type', type);

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
        let errorMsg = '업로드에 실패했습니다.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData?.error?.message) {
            errorMsg = `업로드 실패: ${errData.error.message}`;
          }
        } catch {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'));
    xhr.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다. 다시 시도해주세요.'));

    xhr.open('POST', endpoint);
    xhr.timeout = isVideo ? 600000 : 120000; // 동영상 10분, 이미지 2분
    xhr.send(formData);
  });
};

/** 하위호환 - 기존 uploadMedia 별칭 */
export const uploadMedia = uploadToCloudinary;
