import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  MessageSquare,
  MessageCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  BarChart3,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const menuData = [
  {
    label: '대시보드',
    icon: LayoutDashboard,
    subMenus: [
      { label: '대시보드 홈', path: '/' },
      { label: '실시간 현황', path: '/dashboard/realtime' },
      { label: '알림 관리', path: '/dashboard/alerts' },
    ],
  },
  {
    label: '회원 관리',
    icon: Users,
    subMenus: [
      { label: '회원 목록', path: '/members' },
      { label: '제재 관리', path: '/members/sanctions' },
      { label: '휴면 회원', path: '/members/dormant' },
      { label: '메모 관리', path: '/members/memos' },
    ],
  },
  {
    label: '학교 인증 관리',
    icon: GraduationCap,
    subMenus: [
      { label: '대기 목록', path: '/school/pending' },
      { label: '심사 관리', path: '/school/review' },
      { label: '인증 완료', path: '/school/verified' },
      { label: '학교 데이터', path: '/school/data' },
      { label: '인증 통계', path: '/school/stats' },
      { label: '선생님 인증', path: '/school/teacher' },
    ],
  },
  {
    label: '커뮤니티 관리',
    icon: MessageSquare,
    subMenus: [
      { label: '게시글 관리', path: '/community/posts' },
      { label: '댓글 관리', path: '/community/comments' },
      { label: '인기 게시글', path: '/community/popular' },
      { label: '공지사항', path: '/community/notices' },
      { label: '커뮤니티 설정', path: '/community/settings' },
    ],
  },
  {
    label: '채팅 관리',
    icon: MessageCircle,
    subMenus: [
      { label: '채팅방 목록', path: '/chat/rooms' },
      { label: '신고 내역', path: '/chat/reports' },
      { label: '채팅 로그', path: '/chat/logs' },
      { label: '제재 관리', path: '/chat/sanctions' },
      { label: '스팸 필터', path: '/chat/spam' },
    ],
  },
  {
    label: '신고센터',
    icon: AlertTriangle,
    subMenus: [
      { label: '신고 목록', path: '/reports' },
      { label: '처리 현황', path: '/reports/status' },
      { label: '반복 신고', path: '/reports/repeat' },
      { label: '제재 이력', path: '/reports/sanctions' },
    ],
  },
  {
    label: '콘텐츠/운영 관리',
    icon: FileText,
    subMenus: [
      { label: '공지사항', path: '/content/notices' },
      { label: '이벤트', path: '/content/events' },
      { label: '배너 관리', path: '/content/banners' },
      { label: 'FAQ', path: '/content/faq' },
      { label: '약관/정책', path: '/content/policies' },
      { label: '스토리 관리', path: '/content/stories' },
      { label: '모임 관리', path: '/content/meetups' },
      { label: '구인/구직 관리', path: '/content/jobs' },
      { label: '음악 관리', path: '/content/music' },
    ],
  },
  {
    label: '정산/수익 관리',
    icon: DollarSign,
    subMenus: [
      { label: '수익 현황', path: '/settlement/revenue' },
      { label: '정산 대상', path: '/settlement/targets' },
      { label: '정산 처리', path: '/settlement/process' },
      { label: '정산 이력', path: '/settlement/history' },
      { label: '이상 거래', path: '/settlement/anomaly' },
    ],
  },
  {
    label: '통계/분석',
    icon: BarChart3,
    subMenus: [
      { label: '회원 통계', path: '/stats/members' },
      { label: '활동 통계', path: '/stats/activity' },
      { label: '신고 통계', path: '/stats/reports' },
      { label: '수익 통계', path: '/stats/revenue' },
      { label: '리텐션 분석', path: '/stats/retention' },
    ],
  },
  {
    label: '관리자 계정/권한',
    icon: Shield,
    subMenus: [
      { label: '관리자 목록', path: '/admins' },
      { label: '권한 설정', path: '/admins/permissions' },
      { label: '메뉴 권한', path: '/admins/menu-permissions' },
      { label: '활동 로그', path: '/admins/logs' },
    ],
  },
  {
    label: '시스템 설정',
    icon: Settings,
    subMenus: [
      { label: '기본 설정', path: '/settings/basic' },
      { label: '가입 설정', path: '/settings/signup' },
      { label: '커뮤니티 설정', path: '/settings/community' },
      { label: '알림 설정', path: '/settings/notifications' },
      { label: '보안 설정', path: '/settings/security' },
      { label: '오류 로그', path: '/system/error-logs' },
    ],
  },
];

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 260,
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#c4c4d4',
    overflowY: 'auto',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  },
  logoArea: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: '#e94560',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 4,
  },
  menuList: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  menuItem: {
    userSelect: 'none',
  },
  menuButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 20px',
    border: 'none',
    background: 'none',
    color: '#c4c4d4',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  },
  menuButtonActive: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuIcon: {
    flexShrink: 0,
    width: 18,
    height: 18,
    opacity: 0.8,
  },
  menuLabel: {
    flex: 1,
  },
  chevron: {
    flexShrink: 0,
    width: 14,
    height: 14,
    opacity: 0.5,
  },
  subMenuList: {
    overflow: 'hidden',
    transition: 'max-height 0.25s ease',
  },
  subMenuLink: {
    display: 'block',
    padding: '9px 20px 9px 48px',
    fontSize: 13,
    color: '#9a9ab0',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  subMenuLinkActive: {
    color: '#e94560',
    backgroundColor: 'rgba(233,69,96,0.08)',
    fontWeight: 600,
  },
};

export default function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState(() => {
    // Auto-open the menu that matches the current path
    const idx = menuData.findIndex((m) =>
      m.subMenus.some((s) => s.path === location.pathname)
    );
    return idx >= 0 ? { [idx]: true } : { 0: true };
  });

  const toggleMenu = (index) => {
    setOpenMenus((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isMenuActive = (menu) =>
    menu.subMenus.some((s) => s.path === location.pathname);

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <span style={styles.logoText}>Again School</span>
        <span style={styles.badge}>관리자</span>
      </div>

      {/* Menus */}
      <nav style={styles.menuList}>
        {menuData.map((menu, index) => {
          const Icon = menu.icon;
          const isOpen = !!openMenus[index];
          const active = isMenuActive(menu);

          return (
            <div key={index} style={styles.menuItem}>
              <button
                onClick={() => toggleMenu(index)}
                style={{
                  ...styles.menuButton,
                  ...(active ? styles.menuButtonActive : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = active
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent';
                  e.currentTarget.style.color = active ? '#ffffff' : '#c4c4d4';
                }}
              >
                <Icon style={styles.menuIcon} />
                <span style={styles.menuLabel}>{menu.label}</span>
                {isOpen ? (
                  <ChevronDown style={styles.chevron} />
                ) : (
                  <ChevronRight style={styles.chevron} />
                )}
              </button>

              <div
                style={{
                  ...styles.subMenuList,
                  maxHeight: isOpen ? menu.subMenus.length * 40 : 0,
                }}
              >
                {menu.subMenus.map((sub) => (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    end={sub.path === '/'}
                    style={({ isActive }) => ({
                      ...styles.subMenuLink,
                      ...(isActive ? styles.subMenuLinkActive : {}),
                    })}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.classList.contains('active')) {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.color = '#e0e0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const isActive = location.pathname === sub.path ||
                        (sub.path === '/' && location.pathname === '/');
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#9a9ab0';
                      }
                    }}
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
