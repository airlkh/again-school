import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitleMap = {
  '/': '대시보드',
  '/dashboard/realtime': '실시간 현황',
  '/dashboard/alerts': '알림 관리',
  '/members': '회원 목록',
  '/members/sanctions': '회원 제재 관리',
  '/members/dormant': '휴면 회원',
  '/members/memos': '메모 관리',
  '/school/pending': '인증 대기 목록',
  '/school/review': '인증 심사 관리',
  '/school/verified': '인증 완료 목록',
  '/school/data': '학교 데이터',
  '/school/stats': '인증 통계',
  '/community/posts': '게시글 관리',
  '/community/comments': '댓글 관리',
  '/community/popular': '인기 게시글',
  '/community/notices': '커뮤니티 공지',
  '/community/settings': '커뮤니티 설정',
  '/chat/rooms': '채팅방 목록',
  '/chat/reports': '채팅 신고 내역',
  '/chat/logs': '채팅 로그',
  '/chat/sanctions': '채팅 제재 관리',
  '/chat/spam': '스팸 필터',
  '/reports': '신고 목록',
  '/reports/status': '신고 처리 현황',
  '/reports/repeat': '반복 신고',
  '/reports/sanctions': '신고 제재 이력',
  '/content/notices': '공지사항 관리',
  '/content/events': '이벤트 관리',
  '/content/banners': '배너 관리',
  '/content/faq': 'FAQ 관리',
  '/content/policies': '약관/정책 관리',
  '/settlement/revenue': '수익 현황',
  '/settlement/targets': '정산 대상',
  '/settlement/process': '정산 처리',
  '/settlement/history': '정산 이력',
  '/settlement/anomaly': '이상 거래 감지',
  '/stats/members': '회원 통계',
  '/stats/activity': '활동 통계',
  '/stats/reports': '신고 통계',
  '/stats/revenue': '수익 통계',
  '/stats/retention': '리텐션 분석',
  '/admins': '관리자 목록',
  '/admins/permissions': '권한 설정',
  '/admins/menu-permissions': '메뉴 권한 관리',
  '/admins/logs': '관리자 활동 로그',
  '/settings/basic': '기본 설정',
  '/settings/signup': '가입 설정',
  '/settings/community': '커뮤니티 설정',
  '/settings/notifications': '알림 설정',
  '/settings/security': '보안 설정',
  '/system/error-logs': '오류 로그',
  '/content/stories': '스토리 관리',
  '/content/meetups': '모임 관리',
  '/content/jobs': '구인/구직 관리',
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f5f5fa',
  },
  content: {
    marginLeft: 260,
    marginTop: 64,
    padding: 28,
    minHeight: 'calc(100vh - 64px)',
  },
  loadingScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f5f5fa',
    color: '#6b6b80',
    fontSize: 15,
    fontWeight: 500,
  },
};

export default function AdminLayout() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
        navigate('/login', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (authState === 'loading') {
    return <div style={styles.loadingScreen}>로딩 중...</div>;
  }

  if (authState === 'unauthenticated') {
    return null;
  }

  const pageTitle = pageTitleMap[location.pathname] || '관리자';

  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <Header title={pageTitle} />
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
