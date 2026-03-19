import { CLOUDINARY_CONFIG } from '../config/cloudinary';
import { compressImage } from './mediaService';

export async function uploadProfileImage(
  uri: string,
  uid: string,
): Promise<string> {
  console.log('[uploadProfileImage] 시작, uri:', uri?.substring(0, 50));

  let compressedUri: string;
  try {
    compressedUri = await compressImage(uri);
  } catch {
    compressedUri = uri;
  }

  const downloadURL = await new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', {
      uri: compressedUri,
      name: `profile_${uid}_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', `profiles/${uid}`);

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch {
          reject(new Error('Cloudinary 응답 파싱 실패'));
        }
      } else {
        reject(new Error(`Cloudinary 업로드 실패: ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('네트워크 오류')));
    xhr.addEventListener('timeout', () => reject(new Error('업로드 시간 초과')));
    xhr.timeout = 60000;
    xhr.open('POST', CLOUDINARY_CONFIG.imageUploadUrl);
    xhr.send(formData);
  });

  console.log('[uploadProfileImage] Cloudinary URL:', downloadURL?.substring(0, 80));
  return downloadURL;
}
