import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';

/** 푸시 토큰 등록 (Firestore에 저장) */
export async function registerPushToken(uid: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Push] 실제 기기에서만 푸시 알림을 받을 수 있습니다.');
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] 푸시 알림 권한이 거부되었습니다.');
    return;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Firestore에 토큰 저장
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { pushToken: token });

    console.log('[Push] 토큰 등록 완료:', token);
  } catch (error) {
    console.log('[Push] 토큰 등록 실패:', error);
  }
}

let responseSub: Notifications.Subscription | undefined = undefined;

/** 알림 핸들러 설정 */
export function setupNotificationHandlers(): () => void {
  // 이전 리스너 정리 (중복 등록 방지)
  responseSub?.remove();

  // 앱이 포그라운드일 때 알림 표시 방식
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // 알림 클릭 시 해당 화면으로 이동
  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'teacherVerified') {
      router.push('/profile/teacher-apply' as any);
    } else if (data?.chatRoomId && data?.otherUid) {
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: data.otherUid as string,
          name: (data.otherName as string) || '',
          avatar: (data.otherAvatar as string) || '1',
        },
      });
    } else if (data?.postId) {
      router.push({
        pathname: '/post/[id]',
        params: { id: data.postId as string },
      });
    } else if (data?.meetupId) {
      router.push({
        pathname: '/meetup/[id]',
        params: { id: data.meetupId as string },
      });
    } else if (data?.profileUid) {
      router.push(`/profile/${data.profileUid}`);
    }
  });

  // Android 알림 채널 설정
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Again School',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3124',
    });
  }

  console.log('[Push] 알림 핸들러 설정 완료');

  return () => {
    responseSub?.remove();
    responseSub = undefined;
  };
}

/** Expo Push API로 알림 발송 */
export async function sendPushNotification(
  toUid: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const userSnap = await getDoc(doc(db, 'users', toUid));
    if (!userSnap.exists()) return;

    const pushToken = userSnap.data()?.pushToken;
    if (!pushToken) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: data ?? {},
      }),
    });
  } catch (e) {
    console.warn('[Push] 알림 발송 실패:', e);
  }
}

/**
 * Cloud Functions 메시지 전송 트리거 (서버 사이드 참고용):
 *
 * exports.onNewMessage = functions.firestore
 *   .document('chatRooms/{roomId}/messages/{messageId}')
 *   .onCreate(async (snap, context) => {
 *     const message = snap.data();
 *     const roomId = context.params.roomId;
 *
 *     const roomDoc = await admin.firestore().doc(`chatRooms/${roomId}`).get();
 *     const room = roomDoc.data();
 *     const recipientUid = room.participants.find(uid => uid !== message.senderUid);
 *
 *     const userDoc = await admin.firestore().doc(`users/${recipientUid}`).get();
 *     const pushToken = userDoc.data()?.pushToken;
 *
 *     if (!pushToken) return;
 *
 *     await fetch('https://exp.host/--/api/v2/push/send', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         to: pushToken,
 *         title: room.participantNames[message.senderUid],
 *         body: message.text || '사진을 보냈습니다',
 *         data: { chatRoomId: roomId, otherUid: message.senderUid },
 *       }),
 *     });
 *   });
 *
 * exports.onNewPost = functions.firestore
 *   .document('posts/{postId}')
 *   .onCreate(async (snap, context) => {
 *     const post = snap.data();
 *     // 관련 동창에게 알림 전송
 *   });
 *
 * exports.onConnectionRequest = functions.firestore
 *   .document('connections/{connectionId}')
 *   .onCreate(async (snap, context) => {
 *     const connection = snap.data();
 *     // 연결 대상에게 알림 전송
 *   });
 */
