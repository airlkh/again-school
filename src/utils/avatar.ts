import { ImageSourcePropType } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultAvatar = require('../../assets/default-avatar.png') as number;

/**
 * photoURL이 있으면 { uri } 반환, 없으면 기본 아바타 반환.
 * Image source prop에 바로 사용 가능:
 *   <Image source={getAvatarSource(photoURL)} />
 */
export function getAvatarSource(
  photoURL?: string | null,
): ImageSourcePropType {
  if (photoURL) return { uri: photoURL, cache: 'reload' } as any;
  return defaultAvatar;
}
