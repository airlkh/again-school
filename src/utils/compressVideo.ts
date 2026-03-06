import { Video } from 'react-native-compressor';
import * as FileSystem from 'expo-file-system/legacy';

export const compressVideoIfNeeded = async (
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const sizeMB = ((info as any).size ?? 0) / (1024 * 1024);

    // 50MB 이하면 압축 불필요
    if (sizeMB <= 50) return uri;

    console.log(`동영상 압축 시작: ${sizeMB.toFixed(1)}MB`);

    const compressed = await Video.compress(
      uri,
      {
        compressionMethod: 'auto',
        minimumFileSizeForCompress: 50,
        progressDivider: 10,
      },
      (progress) => {
        onProgress?.(Math.round(progress * 100));
        console.log(`압축 진행률: ${Math.round(progress * 100)}%`);
      },
    );

    const newInfo = await FileSystem.getInfoAsync(compressed);
    const newSizeMB = ((newInfo as any).size ?? 0) / (1024 * 1024);
    console.log(`압축 완료: ${newSizeMB.toFixed(1)}MB`);

    return compressed;
  } catch (e) {
    console.warn('압축 실패, 원본 사용:', e);
    return uri;
  }
};
