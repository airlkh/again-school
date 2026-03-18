import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { Bell, LogOut } from 'lucide-react';

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 260,
    right: 0,
    height: 64,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e8e8ef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    zIndex: 90,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  notificationBtn: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b6b80',
    transition: 'background 0.15s',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#e94560',
    border: '2px solid #ffffff',
  },
  adminEmail: {
    fontSize: 13,
    color: '#6b6b80',
    fontWeight: 500,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e8e8ef',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid #e0e0e8',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#6b6b80',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
};

export default function Header({ title = '대시보드' }) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  return (
    <header style={styles.header}>
      <h1 style={styles.title}>{title}</h1>

      <div style={styles.rightSection}>
        {/* 알림 */}
        <button
          style={styles.notificationBtn}
          title="알림"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f4f4f8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Bell size={20} />
          <span style={styles.notificationBadge} />
        </button>

        <span style={styles.divider} />

        {/* 관리자 이메일 */}
        <span style={styles.adminEmail}>
          {user?.email || '관리자'}
        </span>

        {/* 로그아웃 */}
        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f4f4f8';
            e.currentTarget.style.borderColor = '#d0d0d8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#e0e0e8';
          }}
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </div>
    </header>
  );
}
