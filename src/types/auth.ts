import { User } from 'firebase/auth';

export interface SchoolEntry {
  schoolType: '초등학교' | '중학교' | '고등학교' | '대학교';
  schoolName: string;
  graduationYear: number;
  isPublic?: boolean;
}

export interface UserPrivacySettings {
  showWorkplace: boolean;
  showSchools: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  avatarImg?: number;
  schools: SchoolEntry[];
  schoolNames?: string[];
  region: {
    sido: string;
    sigungu: string;
  };
  job?: string;
  workplace?: string;
  privacySettings?: UserPrivacySettings;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectionRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface ChatRoom {
  id: string;
  participants: string[]; // sorted UIDs
  participantNames: { [uid: string]: string };
  participantAvatars: { [uid: string]: number };
  participantPhotos?: { [uid: string]: string | null };
  lastMessage: string;
  lastMessageAt: number;
  lastSenderUid: string;
  unreadCount: { [uid: string]: number };
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  read: boolean;
  readBy?: string[];
}

export type MeetupStatus = 'recruiting' | 'confirmed' | 'past';

export interface MeetupAttendee {
  uid: string;
  displayName: string;
  avatarImg: number;
  photoURL?: string | null;
  joinedAt: number;
}

export interface Meetup {
  id: string;
  title: string;
  description: string;
  schoolName: string;
  graduationYear: number;
  date: string;        // "2025-06-15"
  time: string;        // "18:00"
  location: string;
  address: string;
  maxAttendees: number;
  fee: number;         // 참가비 (원), 0이면 무료
  status: MeetupStatus;
  hostUid: string;
  hostName: string;
  hostAvatarImg: number;
  hostPhotoURL?: string | null;
  attendees: MeetupAttendee[];
  participants: string[];  // UID 문자열 배열
  imageUrl: string;
  createdAt: number;
}

export type JobType = '구인' | '구직';

export interface JobPost {
  id: string;
  type: JobType;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  contact: string;
  authorUid: string;
  authorName: string;
  authorAvatarImg: number;
  authorPhotoURL?: string | null;
  schoolName?: string;
  status: 'active' | 'closed';
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  onboardingCompleted: boolean | null;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  setOnboardingCompleted: (value: boolean) => void;
}
