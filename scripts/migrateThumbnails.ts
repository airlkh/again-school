/**
 * 기존 동영상 게시물 thumbnailUrl 마이그레이션
 *
 * Firestore posts 컬렉션에서 thumbnailUrl이 없고
 * videoUrl 또는 imageUrl이 .mp4/.mov인 게시물을 찾아서
 * getThumbnailAsync로 로컬 썸네일 추출 → uploadImage로 Cloudinary 업로드
 * → Firestore thumbnailUrl 필드 업데이트
 *
 * 사용법: 앱 내에서 migrateThumbnails() 호출
 */
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { uploadImage } from '../src/services/mediaService';
import { getThumbnailAsync } from 'expo-video-thumbnails';

const isVideoUrl = (url: string): boolean =>
  /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(url);

export async function migrateThumbnails(): Promise<void> {
  console.log('[Migration] 썸네일 마이그레이션 시작...');

  const postsRef = collection(db, 'posts');
  const snapshot = await getDocs(postsRef);

  let total = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    total++;

    // thumbnailUrl이 이미 있으면 스킵
    if (data.thumbnailUrl) {
      skipped++;
      continue;
    }

    // 동영상 URL 찾기
    const videoSrc = data.videoUrl || data.imageUrl;
    if (!videoSrc || !isVideoUrl(videoSrc)) {
      skipped++;
      continue;
    }

    try {
      // 1. 로컬 썸네일 추출
      const { uri: thumbUri } = await getThumbnailAsync(videoSrc, {
        time: 1000,
        quality: 0.7,
      });

      // 2. Cloudinary에 이미지 업로드
      const thumbResult = await uploadImage(thumbUri);
      const thumbnailUrl = thumbResult.url;

      // 3. Firestore 업데이트
      const postRef = doc(db, 'posts', docSnap.id);
      const updateData: Record<string, string> = { thumbnailUrl };

      // imageUrl이 .mp4/.mov이면 videoUrl로 이동, imageUrl은 썸네일로 교체
      if (data.imageUrl && isVideoUrl(data.imageUrl)) {
        if (!data.videoUrl) {
          updateData.videoUrl = data.imageUrl;
        }
        updateData.imageUrl = thumbnailUrl;
      }

      // mediaType이 없으면 video로 설정
      if (!data.mediaType) {
        updateData.mediaType = 'video';
      }

      await updateDoc(postRef, updateData);
      updated++;
      console.log(`[Migration] 업데이트 완료: ${docSnap.id}`, updateData);
    } catch (e) {
      failed++;
      console.log(`[Migration] 실패: ${docSnap.id}`, e);
    }
  }

  console.log(`[Migration] 마이그레이션 완료!`);
  console.log(`[Migration] 전체: ${total}, 업데이트: ${updated}, 스킵: ${skipped}, 실패: ${failed}`);
}

/**
 * thumbnailUrl이 /video/upload/ 경로인 게시물을 찾아서
 * 실제 썸네일 추출 → /image/upload/로 재업로드
 */
export async function fixBadThumbnailsWithReupload(): Promise<void> {
  console.log('[fixThumb] 잘못된 썸네일 수정 시작...');

  const snapshot = await getDocs(collection(db, 'posts'));

  let total = 0;
  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    total++;

    const thumb = data.thumbnailUrl as string | undefined;

    // thumbnailUrl이 /video/upload/ 경로인 경우만 수정 대상
    if (!thumb || !thumb.includes('/video/upload/')) {
      skipped++;
      continue;
    }

    // 동영상 URL 찾기
    const videoSrc = data.videoUrl || data.imageUrl;
    if (!videoSrc || !isVideoUrl(videoSrc)) {
      console.log(`[fixThumb] 동영상 URL 없음: ${docSnap.id}`);
      skipped++;
      continue;
    }

    try {
      // 1. 동영상에서 썸네일 추출
      const { uri: thumbUri } = await getThumbnailAsync(videoSrc, {
        time: 1000,
        quality: 0.7,
      });

      // 2. Cloudinary image/upload로 업로드
      const thumbResult = await uploadImage(thumbUri);
      const newThumbnailUrl = thumbResult.url;

      // 3. Firestore 업데이트
      const postRef = doc(db, 'posts', docSnap.id);
      const updateData: Record<string, string> = { thumbnailUrl: newThumbnailUrl };

      // imageUrl도 /video/upload/ 경로이면 함께 수정
      if (data.imageUrl && (data.imageUrl as string).includes('/video/upload/')) {
        updateData.imageUrl = newThumbnailUrl;
      }

      await updateDoc(postRef, updateData);
      fixed++;
      console.log(`[fixThumb] 수정 완료: ${docSnap.id}`, newThumbnailUrl);
    } catch (e) {
      failed++;
      console.log(`[fixThumb] 수정 실패: ${docSnap.id}`, e);
    }
  }

  console.log(`[fixThumb] 완료! 전체: ${total}, 수정: ${fixed}, 스킵: ${skipped}, 실패: ${failed}`);
}
