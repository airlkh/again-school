// TODO: Firebase Storage를 사용한 프로필 사진 업로드
// Storage 활성화 후 아래 주석을 해제하세요.
//
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { storage } from '../config/firebase';
//
// export async function uploadProfilePhoto(
//   uid: string,
//   uri: string,
// ): Promise<string> {
//   const response = await fetch(uri);
//   const blob = await response.blob();
//
//   const storageRef = ref(storage, `profile-photos/${uid}`);
//   await uploadBytes(storageRef, blob);
//
//   return getDownloadURL(storageRef);
// }
