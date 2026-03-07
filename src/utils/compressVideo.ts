import * as FileSystem from 'expo-file-system/legacy';

export const compressVideoIfNeeded = async (
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    // content:// → file:// 변환만 수행 (압축 X)
    if (uri.startsWith('content://')) {
      const filename = `video_${Date.now()}.mp4`;
      const destUri = FileSystem.cacheDirectory + filename;
      await FileSystem.copyAsync({ from: uri, to: destUri });
      return destUri;
    }
    return uri;
  } catch (e) {
    console.warn('URI 변환 실패, 원본 사용:', e);
    return uri;
  }
};
