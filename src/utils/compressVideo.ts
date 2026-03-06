import { Video } from 'react-native-compressor';
import * as FileSystem from 'expo-file-system/legacy';

// content:// URI를 file:// 로 변환 (Android 10+ Scoped Storage 대응)
const convertToFileUri = async (uri: string): Promise<string> => {
  if (uri.startsWith('content://')) {
    const filename = `video_${Date.now()}.mp4`;
    const destUri = FileSystem.cacheDirectory + filename;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  }
  return uri;
};

export const compressVideoIfNeeded = async (
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    // content:// → file:// 변환
    const fileUri = await convertToFileUri(uri);

    // 파일 크기 확인
    const info = await FileSystem.getInfoAsync(fileUri);
    const sizeMB = ((info as any).size ?? 0) / (1024 * 1024);

    // 50MB 이하면 변환된 URI 그대로 반환
    if (sizeMB <= 50) return fileUri;

    console.log(`동영상 압축 시작: ${sizeMB.toFixed(1)}MB`);

    const compressed = await Video.compress(
      fileUri,
      { compressionMethod: 'auto' },
      (progress) => {
        onProgress?.(Math.round(progress * 100));
      },
    );

    return compressed;
  } catch (e) {
    console.warn('동영상 처리 실패, 원본 사용:', e);
    return uri;
  }
};
