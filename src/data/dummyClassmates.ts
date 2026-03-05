import { SchoolEntry } from '../types/auth';

// ─── 공통 더미 동창 타입 ────────────────────────────────────────
export interface DummyClassmate {
  id: string;
  name: string;
  avatarImg: number;
  photoURL?: string | null;
  schools: SchoolEntry[];
  graduationYear: number;
  classNumber: number;
  region: string;
  verified: boolean;
  job?: string;
}

// ─── 더미 동창 10명 ─────────────────────────────────────────────
export const DUMMY_CLASSMATES: DummyClassmate[] = [
  {
    id: 'd1', name: '김민준', avatarImg: 3,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    graduationYear: 2012, classNumber: 3, region: '서울 강남구', verified: true,
    job: '삼성전자 개발팀',
  },
  {
    id: 'd2', name: '이서연', avatarImg: 5,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    graduationYear: 2012, classNumber: 7, region: '서울 서초구', verified: true,
    job: '카카오 디자인팀',
  },
  {
    id: 'd3', name: '박지호', avatarImg: 11,
    schools: [
      { schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2013 },
      { schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2016 },
    ],
    graduationYear: 2013, classNumber: 2, region: '경기 성남시', verified: false,
    job: '네이버 기획팀',
  },
  {
    id: 'd4', name: '최수아', avatarImg: 9,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    graduationYear: 2015, classNumber: 5, region: '서울 송파구', verified: true,
    job: 'LG전자 마케팅',
  },
  {
    id: 'd5', name: '정하은', avatarImg: 16,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    graduationYear: 2015, classNumber: 1, region: '인천 남동구', verified: true,
    job: '현대차 연구소',
  },
  {
    id: 'd6', name: '강도윤', avatarImg: 12,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2014 }],
    graduationYear: 2014, classNumber: 8, region: '서울 마포구', verified: false,
    job: '스타트업 CTO',
  },
  {
    id: 'd7', name: '윤예진', avatarImg: 20,
    schools: [{ schoolType: '대학교', schoolName: '서울대학교', graduationYear: 2019 }],
    graduationYear: 2019, classNumber: 0, region: '서울 관악구', verified: true,
    job: '구글코리아 엔지니어',
  },
  {
    id: 'd8', name: '임준서', avatarImg: 33,
    schools: [{ schoolType: '대학교', schoolName: '서울대학교', graduationYear: 2019 }],
    graduationYear: 2019, classNumber: 0, region: '경기 수원시', verified: true,
    job: '삼성SDS 컨설턴트',
  },
  {
    id: 'd9', name: '한소율', avatarImg: 25,
    schools: [{ schoolType: '중학교', schoolName: '한빛중학교', graduationYear: 2012 }],
    graduationYear: 2012, classNumber: 5, region: '서울 강동구', verified: false,
    job: 'SK텔레콤 기획',
  },
  {
    id: 'd10', name: '오시우', avatarImg: 51,
    schools: [{ schoolType: '고등학교', schoolName: '푸른고등학교', graduationYear: 2015 }],
    graduationYear: 2015, classNumber: 4, region: '부산 해운대구', verified: true,
    job: '토스 프론트엔드',
  },
];

// ─── 신규 가입 알림 ─────────────────────────────────────────────
export const NEW_JOINS = [
  { id: 'n1', name: '한소율', avatarImg: 25, uid: 'd9' },
  { id: 'n2', name: '오시우', avatarImg: 51, uid: 'd10' },
];

// ─── 추억 앨범 사진 (고정 연도) ──────────────────────────────────
export const MEMORY_PHOTOS = [
  { id: 'photo-0', uri: 'https://picsum.photos/300?random=1', year: 2010, desc: '소풍 사진' },
  { id: 'photo-1', uri: 'https://picsum.photos/300?random=2', year: 2011, desc: '체육대회' },
  { id: 'photo-2', uri: 'https://picsum.photos/300?random=3', year: 2012, desc: '졸업식' },
  { id: 'photo-3', uri: 'https://picsum.photos/300?random=4', year: 2013, desc: '수학여행' },
  { id: 'photo-4', uri: 'https://picsum.photos/300?random=5', year: 2014, desc: '축제' },
  { id: 'photo-5', uri: 'https://picsum.photos/300?random=6', year: 2015, desc: '동아리' },
  { id: 'photo-6', uri: 'https://picsum.photos/300?random=7', year: 2016, desc: '수련회' },
  { id: 'photo-7', uri: 'https://picsum.photos/300?random=8', year: 2017, desc: '반 단체사진' },
  { id: 'photo-8', uri: 'https://picsum.photos/300?random=9', year: 2018, desc: '졸업여행' },
  { id: 'photo-9', uri: 'https://picsum.photos/300?random=10', year: 2019, desc: '동문 모임' },
  { id: 'photo-10', uri: 'https://picsum.photos/300?random=11', year: 2020, desc: '온라인 모임' },
  { id: 'photo-11', uri: 'https://picsum.photos/300?random=12', year: 2021, desc: '캠핑' },
];

// ─── 알림 데이터 ────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  type: 'join' | 'connect_accepted' | 'connect_request' | 'meetup';
  title: string;
  body: string;
  avatarImg: number;
  targetUid: string;
  time: string;
  read: boolean;
}

export const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'noti-1', type: 'join',
    title: '새 동창 가입', body: '한소율님이 한빛중학교 동창으로 가입했어요!',
    avatarImg: 25, targetUid: 'd9', time: '방금 전', read: false,
  },
  {
    id: 'noti-2', type: 'join',
    title: '새 동창 가입', body: '오시우님이 푸른고등학교 동창으로 가입했어요!',
    avatarImg: 51, targetUid: 'd10', time: '5분 전', read: false,
  },
  {
    id: 'noti-3', type: 'connect_accepted',
    title: '연결 수락', body: '김민준님이 연결 요청을 수락했어요!',
    avatarImg: 3, targetUid: 'd1', time: '30분 전', read: false,
  },
  {
    id: 'noti-4', type: 'connect_request',
    title: '연결 요청', body: '이서연님이 연결 요청을 보냈어요.',
    avatarImg: 5, targetUid: 'd2', time: '1시간 전', read: true,
  },
  {
    id: 'noti-5', type: 'join',
    title: '새 동창 가입', body: '윤예진님이 서울대학교 동창으로 가입했어요!',
    avatarImg: 20, targetUid: 'd7', time: '2시간 전', read: true,
  },
  {
    id: 'noti-6', type: 'meetup',
    title: '모임 초대', body: '한빛중학교 2012년 졸업 동기 모임이 등록되었어요.',
    avatarImg: 11, targetUid: 'd3', time: '3시간 전', read: true,
  },
  {
    id: 'noti-7', type: 'connect_accepted',
    title: '연결 수락', body: '최수아님이 연결 요청을 수락했어요!',
    avatarImg: 9, targetUid: 'd4', time: '어제', read: true,
  },
  {
    id: 'noti-8', type: 'join',
    title: '새 동창 가입', body: '임준서님이 서울대학교 동창으로 가입했어요!',
    avatarImg: 33, targetUid: 'd8', time: '어제', read: true,
  },
];

// ─── 더미 채팅방 데이터 ──────────────────────────────────────────
export interface DummyChatRoom {
  id: string;
  otherUid: string;
  otherName: string;
  otherAvatarImg: number;
  otherPhotoURL?: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
}

export const DUMMY_CHAT_ROOMS: DummyChatRoom[] = [
  {
    id: 'chat-d1', otherUid: 'd1', otherName: '김민준', otherAvatarImg: 3,
    lastMessage: '이번 주말에 시간 되면 같이 밥 먹을까?', lastTime: '방금 전', unread: 2, online: true,
  },
  {
    id: 'chat-d2', otherUid: 'd2', otherName: '이서연', otherAvatarImg: 5,
    lastMessage: '졸업 앨범 사진 찾았어! 나중에 보여줄게 ㅋㅋ', lastTime: '10분 전', unread: 1, online: true,
  },
  {
    id: 'chat-d4', otherUid: 'd4', otherName: '최수아', otherAvatarImg: 9,
    lastMessage: '네, 좋아요! 장소는 어디로 할까요?', lastTime: '1시간 전', unread: 0, online: false,
  },
  {
    id: 'chat-d7', otherUid: 'd7', otherName: '윤예진', otherAvatarImg: 20,
    lastMessage: '동문 모임 날짜 정했어?', lastTime: '어제', unread: 0, online: false,
  },
  {
    id: 'chat-d5', otherUid: 'd5', otherName: '정하은', otherAvatarImg: 16,
    lastMessage: '오랜만이야! 잘 지내고 있어?', lastTime: '2일 전', unread: 0, online: true,
  },
];

export interface DummyChatMessage {
  id: string;
  senderUid: string;
  text: string;
  imageUrl?: string;
  time: string;
  date: string;
}

export function getDummyMessages(otherUid: string): DummyChatMessage[] {
  const me = 'me';
  return [
    { id: 'm1', senderUid: otherUid, text: '오! 진짜 오랜만이다!', time: '오전 10:23', date: '2025년 5월 15일' },
    { id: 'm2', senderUid: me, text: '그러게~ 졸업하고 처음이지 않아?', time: '오전 10:24', date: '2025년 5월 15일' },
    { id: 'm3', senderUid: otherUid, text: '응 맞아 ㅋㅋ 어떻게 지내?', time: '오전 10:24', date: '2025년 5월 15일' },
    { id: 'm4', senderUid: me, text: '나 지금 강남에서 개발자로 일하고 있어', time: '오전 10:25', date: '2025년 5월 15일' },
    { id: 'm5', senderUid: otherUid, text: '오 대박! 나도 IT 쪽이야', time: '오전 10:26', date: '2025년 5월 15일' },
    { id: 'm6', senderUid: me, text: '우리 다음에 같이 밥 먹자!', time: '오전 10:27', date: '2025년 5월 15일' },
    { id: 'm7', senderUid: otherUid, text: '좋아좋아~ 언제가 좋을까?', time: '오전 10:28', date: '2025년 5월 15일' },
    { id: 'm8', senderUid: me, text: '이번 주말 어때?', time: '오후 2:15', date: '2025년 5월 16일' },
    { id: 'm9', senderUid: otherUid, text: '주말 좋지! 토요일 낮에 보자', time: '오후 2:20', date: '2025년 5월 16일' },
    { id: 'm10', senderUid: me, text: '강남역 근처 어때?', time: '오후 2:21', date: '2025년 5월 16일' },
    { id: 'm11', senderUid: otherUid, text: '이번 주말에 시간 되면 같이 밥 먹을까?', time: '오후 3:05', date: '오늘' },
  ];
}

// ─── 더미 모임 데이터 ────────────────────────────────────────────
import { Meetup, MeetupStatus } from '../types/auth';

export const DUMMY_MEETUPS: Meetup[] = [
  {
    id: 'meet-1',
    title: '한빛중 2012 동기 모임',
    description: '졸업 후 첫 동기 모임입니다! 그동안 못 본 친구들과 함께 맛있는 저녁 먹으면서 근황 나눠요. 2차는 근처 카페에서 자유롭게 진행할 예정입니다.',
    schoolName: '한빛중학교',
    graduationYear: 2012,
    date: '2025-07-20',
    time: '18:00',
    location: '강남 레스토랑',
    address: '서울 강남구 테헤란로 123',
    maxAttendees: 20,
    fee: 30000,
    status: 'recruiting',
    hostUid: 'd1',
    hostName: '김민준',
    hostAvatarImg: 3,
    participants: ['d1', 'd2', 'd9'],
    attendees: [
      { uid: 'd1', displayName: '김민준', avatarImg: 3, joinedAt: Date.now() - 86400000 * 5 },
      { uid: 'd2', displayName: '이서연', avatarImg: 5, joinedAt: Date.now() - 86400000 * 3 },
      { uid: 'd9', displayName: '한소율', avatarImg: 25, joinedAt: Date.now() - 86400000 * 2 },
    ],
    imageUrl: 'https://picsum.photos/400/200?random=30',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'meet-2',
    title: '푸른고 2015 졸업 10주년',
    description: '벌써 졸업 10주년이에요! 선생님도 초대할 예정입니다. 학교 앞 식당에서 추억 사진도 같이 봐요.',
    schoolName: '푸른고등학교',
    graduationYear: 2015,
    date: '2025-08-15',
    time: '17:30',
    location: '홍대 파티룸',
    address: '서울 마포구 와우산로 456',
    maxAttendees: 30,
    fee: 40000,
    status: 'recruiting',
    hostUid: 'd4',
    hostName: '최수아',
    hostAvatarImg: 9,
    participants: ['d4', 'd5', 'd10', 'd6'],
    attendees: [
      { uid: 'd4', displayName: '최수아', avatarImg: 9, joinedAt: Date.now() - 86400000 * 4 },
      { uid: 'd5', displayName: '정하은', avatarImg: 16, joinedAt: Date.now() - 86400000 * 3 },
      { uid: 'd10', displayName: '오시우', avatarImg: 51, joinedAt: Date.now() - 86400000 * 2 },
      { uid: 'd6', displayName: '강도윤', avatarImg: 12, joinedAt: Date.now() - 86400000 },
    ],
    imageUrl: 'https://picsum.photos/400/200?random=31',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'meet-3',
    title: '서울대 컴공 19학번 동문회',
    description: '컴퓨터공학과 19학번 동기 모임입니다. IT업계 근황도 공유하고 네트워킹도 해요!',
    schoolName: '서울대학교',
    graduationYear: 2019,
    date: '2025-06-28',
    time: '19:00',
    location: '관악 맛집',
    address: '서울 관악구 관악로 789',
    maxAttendees: 15,
    fee: 25000,
    status: 'confirmed',
    hostUid: 'd7',
    hostName: '윤예진',
    hostAvatarImg: 20,
    participants: ['d7', 'd8'],
    attendees: [
      { uid: 'd7', displayName: '윤예진', avatarImg: 20, joinedAt: Date.now() - 86400000 * 10 },
      { uid: 'd8', displayName: '임준서', avatarImg: 33, joinedAt: Date.now() - 86400000 * 8 },
    ],
    imageUrl: 'https://picsum.photos/400/200?random=32',
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'meet-4',
    title: '한빛중 2012 송년 모임',
    description: '작년 연말에 진행한 송년 모임! 참석자 모두 즐거운 시간 보냈습니다.',
    schoolName: '한빛중학교',
    graduationYear: 2012,
    date: '2024-12-21',
    time: '18:30',
    location: '이태원 레스토랑',
    address: '서울 용산구 이태원로 321',
    maxAttendees: 25,
    fee: 35000,
    status: 'past',
    hostUid: 'd2',
    hostName: '이서연',
    hostAvatarImg: 5,
    participants: ['d2', 'd1', 'd9', 'd3'],
    attendees: [
      { uid: 'd2', displayName: '이서연', avatarImg: 5, joinedAt: Date.now() - 86400000 * 100 },
      { uid: 'd1', displayName: '김민준', avatarImg: 3, joinedAt: Date.now() - 86400000 * 98 },
      { uid: 'd9', displayName: '한소율', avatarImg: 25, joinedAt: Date.now() - 86400000 * 95 },
      { uid: 'd3', displayName: '박지호', avatarImg: 11, joinedAt: Date.now() - 86400000 * 93 },
    ],
    imageUrl: 'https://picsum.photos/400/200?random=33',
    createdAt: Date.now() - 86400000 * 120,
  },
  {
    id: 'meet-5',
    title: '푸른고 체육대회 관람',
    description: '모교 체육대회에 선배로 참관합니다. 후배들 응원하러 가요!',
    schoolName: '푸른고등학교',
    graduationYear: 2014,
    date: '2025-05-10',
    time: '10:00',
    location: '푸른고등학교 운동장',
    address: '서울 서초구 반포대로 555',
    maxAttendees: 50,
    fee: 0,
    status: 'past',
    hostUid: 'd6',
    hostName: '강도윤',
    hostAvatarImg: 12,
    participants: ['d6', 'd4'],
    attendees: [
      { uid: 'd6', displayName: '강도윤', avatarImg: 12, joinedAt: Date.now() - 86400000 * 60 },
      { uid: 'd4', displayName: '최수아', avatarImg: 9, joinedAt: Date.now() - 86400000 * 58 },
    ],
    imageUrl: 'https://picsum.photos/400/200?random=34',
    createdAt: Date.now() - 86400000 * 70,
  },
];

// ─── 스토리 데이터 ────────────────────────────────────────────────
export interface DummyStory {
  id: string;
  uid: string;
  name: string;
  avatarImg: number;
  photoURL?: string | null;
  seen: boolean;
  images: string[];
  captions: string[];
  postedAt: string;
}

export const DUMMY_STORIES: DummyStory[] = [
  {
    id: 'story-d1', uid: 'd1', name: '김민준', avatarImg: 3, seen: false,
    images: ['https://picsum.photos/400/700?random=50', 'https://picsum.photos/400/700?random=51'],
    captions: ['주말 한강 산책 🌊', '날씨 좋다!'], postedAt: '2시간 전',
  },
  {
    id: 'story-d2', uid: 'd2', name: '이서연', avatarImg: 5, seen: false,
    images: ['https://picsum.photos/400/700?random=52'],
    captions: ['새 카페 발견 ☕'], postedAt: '3시간 전',
  },
  {
    id: 'story-d4', uid: 'd4', name: '최수아', avatarImg: 9, seen: true,
    images: ['https://picsum.photos/400/700?random=53', 'https://picsum.photos/400/700?random=54'],
    captions: ['출근길 벚꽃 🌸', '오늘도 화이팅'], postedAt: '5시간 전',
  },
  {
    id: 'story-d7', uid: 'd7', name: '윤예진', avatarImg: 20, seen: false,
    images: ['https://picsum.photos/400/700?random=55'],
    captions: ['구글 오피스 점심'], postedAt: '6시간 전',
  },
  {
    id: 'story-d3', uid: 'd3', name: '박지호', avatarImg: 11, seen: true,
    images: ['https://picsum.photos/400/700?random=56'],
    captions: ['네이버 사옥에서'], postedAt: '8시간 전',
  },
  {
    id: 'story-d5', uid: 'd5', name: '정하은', avatarImg: 16, seen: false,
    images: ['https://picsum.photos/400/700?random=57', 'https://picsum.photos/400/700?random=58'],
    captions: ['연구소 야경', '퇴근 인증!'], postedAt: '10시간 전',
  },
  {
    id: 'story-d6', uid: 'd6', name: '강도윤', avatarImg: 12, seen: true,
    images: ['https://picsum.photos/400/700?random=59'],
    captions: ['스타트업 회식 🍻'], postedAt: '12시간 전',
  },
  {
    id: 'story-d10', uid: 'd10', name: '오시우', avatarImg: 51, seen: true,
    images: ['https://picsum.photos/400/700?random=60'],
    captions: ['부산 바다 🌊'], postedAt: '어제',
  },
];

// ─── 게시물 데이터 ────────────────────────────────────────────────
export type FeedItemType = 'photo_post' | 'classmate_recommend' | 'meetup_event';

export interface DummyComment {
  id: string;
  uid: string;
  name: string;
  avatarImg: number;
  photoURL?: string | null;
  text: string;
  time: string;
}

export interface DummyPost {
  id: string;
  type: FeedItemType;
  authorUid: string;
  authorName: string;
  authorAvatarImg: number;
  authorPhotoURL?: string | null;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  thumbnailUrl?: string;
  caption: string;
  yearTag?: number;
  memoryTag?: string;
  likes: number;
  liked: boolean;
  commentCount: number;
  comments: DummyComment[];
  postedAt: string;
  schoolName?: string;
}

export const DUMMY_POSTS: DummyPost[] = [
  {
    id: 'post-1', type: 'photo_post',
    authorUid: 'd1', authorName: '김민준', authorAvatarImg: 3,
    imageUrl: 'https://picsum.photos/600/400?random=70',
    caption: '한빛중 3학년 수학여행 때 찍은 사진 발견! 다들 기억나? 😆',
    yearTag: 2012, memoryTag: '수학여행',
    likes: 24, liked: false, commentCount: 5,
    comments: [
      { id: 'c1', uid: 'd2', name: '이서연', avatarImg: 5, text: '헐 이거 경주 갔을 때! 나도 기억나 ㅋㅋ', time: '2시간 전' },
      { id: 'c2', uid: 'd9', name: '한소율', avatarImg: 25, text: '와 진짜 옛날 사진이다 ㅠㅠ 추억돋네', time: '1시간 전' },
      { id: 'c3', uid: 'd3', name: '박지호', avatarImg: 11, text: '민준이 저때 머리 뭐야 ㅋㅋㅋ', time: '45분 전' },
      { id: 'c4', uid: 'd1', name: '김민준', avatarImg: 3, text: '야 그때 유행이었잖아! 😂', time: '30분 전' },
      { id: 'c5', uid: 'd2', name: '이서연', avatarImg: 5, text: '다음 모임 때 이 사진 크게 뽑아오자 ㅋㅋ', time: '15분 전' },
    ],
    postedAt: '3시간 전', schoolName: '한빛중학교',
  },
  {
    id: 'post-2', type: 'photo_post',
    authorUid: 'd4', authorName: '최수아', authorAvatarImg: 9,
    imageUrl: 'https://picsum.photos/600/400?random=71',
    caption: '푸른고 축제 때 우리 반 부스! 떡볶이 팔았었는데 다 기억하지? 🍢',
    yearTag: 2014, memoryTag: '축제',
    likes: 31, liked: true, commentCount: 3,
    comments: [
      { id: 'c6', uid: 'd5', name: '정하은', avatarImg: 16, text: '우리 반 떡볶이가 제일 맛있었어!', time: '4시간 전' },
      { id: 'c7', uid: 'd10', name: '오시우', avatarImg: 51, text: '나 그때 떡볶이 5인분 먹었잖아 ㅋㅋ', time: '3시간 전' },
      { id: 'c8', uid: 'd6', name: '강도윤', avatarImg: 12, text: '수아가 총괄했었지 ㅋㅋ 역시 리더', time: '2시간 전' },
    ],
    postedAt: '5시간 전', schoolName: '푸른고등학교',
  },
  {
    id: 'post-3', type: 'photo_post',
    authorUid: 'd7', authorName: '윤예진', authorAvatarImg: 20,
    imageUrl: 'https://picsum.photos/600/400?random=72',
    caption: '서울대 졸업식 날! 같이 졸업한 친구들 다 어디서 뭐하고 있을까 🎓',
    yearTag: 2019, memoryTag: '졸업식',
    likes: 45, liked: false, commentCount: 2,
    comments: [
      { id: 'c9', uid: 'd8', name: '임준서', avatarImg: 33, text: '나 삼성SDS에서 일하고 있어! 오랜만이다 예진아', time: '6시간 전' },
      { id: 'c10', uid: 'd7', name: '윤예진', avatarImg: 20, text: '준서야! 우리 다음에 꼭 만나자 😊', time: '5시간 전' },
    ],
    postedAt: '8시간 전', schoolName: '서울대학교',
  },
  {
    id: 'post-4', type: 'photo_post',
    authorUid: 'd2', authorName: '이서연', authorAvatarImg: 5,
    imageUrl: 'https://picsum.photos/600/400?random=73',
    caption: '체육대회 응원전 사진 ㅋㅋ 우리 반이 1등 했었지! 🏆',
    yearTag: 2011, memoryTag: '체육대회',
    likes: 18, liked: false, commentCount: 4,
    comments: [
      { id: 'c11', uid: 'd1', name: '김민준', avatarImg: 3, text: '이때 우리 반 응원 대상 탔잖아!', time: '10시간 전' },
      { id: 'c12', uid: 'd9', name: '한소율', avatarImg: 25, text: '서연이가 응원단장 했었지 ㅋㅋ', time: '9시간 전' },
      { id: 'c13', uid: 'd2', name: '이서연', avatarImg: 5, text: '그때 목이 나갔었어 ㅋㅋㅋ', time: '8시간 전' },
      { id: 'c14', uid: 'd3', name: '박지호', avatarImg: 11, text: '나도 같이 응원했는데! 추억이다', time: '7시간 전' },
    ],
    postedAt: '12시간 전', schoolName: '한빛중학교',
  },
  {
    id: 'post-5', type: 'photo_post',
    authorUid: 'd6', authorName: '강도윤', authorAvatarImg: 12,
    imageUrl: 'https://picsum.photos/600/400?random=74',
    caption: '고등학교 수련회 사진 발견! 계곡에서 놀았던 거 기억나? 💦',
    yearTag: 2013, memoryTag: '수련회',
    likes: 22, liked: true, commentCount: 2,
    comments: [
      { id: 'c15', uid: 'd4', name: '최수아', avatarImg: 9, text: '이때 도윤이가 물에 빠졌잖아 ㅋㅋㅋ', time: '어제' },
      { id: 'c16', uid: 'd6', name: '강도윤', avatarImg: 12, text: '그건 비밀이야!! 😤', time: '어제' },
    ],
    postedAt: '어제', schoolName: '푸른고등학교',
  },
  {
    id: 'post-6', type: 'photo_post',
    authorUid: 'd8', authorName: '임준서', authorAvatarImg: 33,
    imageUrl: 'https://picsum.photos/600/400?random=75',
    caption: '대학교 MT 때 단체사진! 벌써 몇 년 전이지... 시간 진짜 빠르다',
    yearTag: 2017, memoryTag: 'MT',
    likes: 36, liked: false, commentCount: 1,
    comments: [
      { id: 'c17', uid: 'd7', name: '윤예진', avatarImg: 20, text: '이때가 진짜 재밌었지! 다시 가고 싶다 ㅠ', time: '어제' },
    ],
    postedAt: '어제', schoolName: '서울대학교',
  },
];

// ─── 유틸: id로 동창 찾기 ───────────────────────────────────────
export function findClassmateById(id: string): DummyClassmate | undefined {
  return DUMMY_CLASSMATES.find((c) => c.id === id);
}

export function findMeetupById(id: string): Meetup | undefined {
  return DUMMY_MEETUPS.find((m) => m.id === id);
}

export function findPostById(id: string): DummyPost | undefined {
  return DUMMY_POSTS.find((p) => p.id === id);
}
