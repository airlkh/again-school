import { CLOUDINARY_CONFIG } from '../config/cloudinary';
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

  const downloadURL = await new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', {
      uri: compressedUri,
      name: `profile_${uid}_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', `profiles/${uid}`);
    formData.append('transformation', 'w_400,h_400,c_fill,g_face,q_auto');

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
    xhr.timeout = 30000;
    xhr.open('POST', CLOUDINARY_CONFIG.imageUploadUrl);
    xhr.send(formData);
  });

  console.log('[uploadProfileImage] 완료:', downloadURL?.substring(0, 80));
  return downloadURL;
}
