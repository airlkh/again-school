import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { Meetup, MeetupAttendee, MeetupStatus } from '../types/auth';
import { DUMMY_MEETUPS } from '../data/dummyClassmates';

/** 모임 생성 */
export async function createMeetup(
  data: Omit<Meetup, 'id' | 'createdAt' | 'attendees' | 'participants' | 'status'>,
): Promise<string> {
  const colRef = collection(db, 'meetups');
  const hostAttendee: MeetupAttendee = {
    uid: data.hostUid,
    displayName: data.hostName,
    avatarImg: data.hostAvatarImg,
    joinedAt: Date.now(),
  };

  const docRef = await addDoc(colRef, {
    ...data,
    status: 'recruiting',
    attendees: [hostAttendee],
    participants: [data.hostUid],
    createdAt: Date.now(),
  });
  return docRef.id;
}

/** 모임 참석 (UID 기반) */
export async function joinMeetup(
  meetupId: string,
  uid: string,
  attendee: MeetupAttendee,
): Promise<void> {
  const docRef = doc(db, 'meetups', meetupId);
  await updateDoc(docRef, {
    participants: arrayUnion(uid),
    attendees: arrayUnion(attendee),
  });
}

/** 모임 참석 취소 (UID 기반) */
export async function leaveMeetup(
  meetupId: string,
  uid: string,
  attendee: MeetupAttendee,
): Promise<void> {
  const docRef = doc(db, 'meetups', meetupId);
  await updateDoc(docRef, {
    participants: arrayRemove(uid),
    attendees: arrayRemove(attendee),
  });
}

/** 모임 삭제 (주최자만) */
export async function deleteMeetup(meetupId: string): Promise<void> {
  const docRef = doc(db, 'meetups', meetupId);
  await deleteDoc(docRef);
}

/** 모임 상태 변경 */
export async function updateMeetupStatus(
  meetupId: string,
  status: MeetupStatus,
): Promise<void> {
  const docRef = doc(db, 'meetups', meetupId);
  await updateDoc(docRef, { status });
}

/** 모임 목록 실시간 구독 */
export function subscribeMeetups(
  callback: (meetups: Meetup[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'meetups');

  return onSnapshot(colRef, (snapshot) => {
    const results: Meetup[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        ...data,
        participants: data.participants ?? [],
        attendees: data.attendees ?? [],
      } as Meetup);
    });
    results.sort((a, b) => b.createdAt - a.createdAt);
    callback(results);
  });
}

/** 학교별 모임 조회 */
export async function getMeetupsBySchool(
  schoolName: string,
): Promise<Meetup[]> {
  const colRef = collection(db, 'meetups');
  const q = query(colRef, where('schoolName', '==', schoolName));
  const snapshot = await getDocs(q);

  const results: Meetup[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    results.push({
      id: docSnap.id,
      ...data,
      participants: data.participants ?? [],
      attendees: data.attendees ?? [],
    } as Meetup);
  });
  return results;
}

/** 더미 모임 데이터를 Firestore에 마이그레이션 (1회만 실행) */
export async function migrateDummyMeetups(): Promise<void> {
  const KEY = 'meetups_migrated_v1';
  const done = await AsyncStorage.getItem(KEY);
  if (done) return;

  for (const meetup of DUMMY_MEETUPS) {
    const { id, ...data } = meetup;
    const docRef = doc(db, 'meetups', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, data);
    }
  }

  await AsyncStorage.setItem(KEY, '1');
}
