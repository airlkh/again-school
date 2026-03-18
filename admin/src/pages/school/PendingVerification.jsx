import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { Clock, Search, CheckCircle, XCircle, User, Mail, School, BookOpen } from 'lucide-react';

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1400,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e94560',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    padding: '0 10px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    backgroundColor: '#fff',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#333',
    width: 200,
  },
  dateInput: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380, 1fr))',
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#f0f0f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: 0,
  },
  cardEmail: {
    fontSize: 13,
    color: '#888',
    margin: 0,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#555',
  },
  infoIcon: {
    width: 16,
    height: 16,
    color: '#999',
    flexShrink: 0,
  },
  label: {
    fontWeight: 600,
    color: '#444',
    minWidth: 65,
  },
  messageBox: {
    backgroundColor: '#f8f8fc',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 13,
    color: '#555',
    lineHeight: 1.6,
    marginTop: 12,
    marginBottom: 16,
    borderLeft: '3px solid #e94560',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 16,
  },
  btnApprove: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#28a745',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnReject: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#dc3545',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
};

export default function PendingVerification() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('isTeacher', '==', true),
        where('teacherVerified', '==', false)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error('대기 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (userId) => {
    if (!window.confirm('이 선생님의 인증을 승인하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        teacherVerified: true,
        verifiedAt: Timestamp.now(),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('승인 실패:', err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (userId) => {
    const reason = window.prompt('거절 사유를 입력해주세요:');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isTeacher: false,
        teacherVerified: false,
        rejectedAt: Timestamp.now(),
        rejectionReason: reason,
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('거절 실패:', err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const filtered = useMemo(() => {
    let result = users;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(term) ||
          (u.school || '').toLowerCase().includes(term)
      );
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      result = result.filter((u) => {
        if (!u.createdAt) return false;
        const created = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return (
          created.getFullYear() === filterDate.getFullYear() &&
          created.getMonth() === filterDate.getMonth() &&
          created.getDate() === filterDate.getDate()
        );
      });
    }

    return result;
  }, [users, searchTerm, dateFilter]);

  if (loading) {
    return <div style={styles.loading}>데이터를 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>인증 대기 목록</h1>
          <span style={styles.badge}>{filtered.length}</span>
        </div>
        <div style={styles.filterRow}>
          <input
            type="date"
            style={styles.dateInput}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <div style={styles.searchBox}>
            <Search style={{ width: 16, height: 16, color: '#999' }} />
            <input
              type="text"
              placeholder="이름 또는 학교 검색..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>대기 중인 인증 요청이 없습니다.</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((user) => (
            <div
              key={user.id}
              style={styles.card}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={styles.cardHeader}>
                <div style={styles.avatar}>
                  <User style={{ width: 24, height: 24, color: '#aaa' }} />
                </div>
                <div>
                  <p style={styles.cardName}>{user.name || '이름 없음'}</p>
                  <p style={styles.cardEmail}>{user.email || '-'}</p>
                </div>
              </div>

              <div style={styles.infoRow}>
                <School style={styles.infoIcon} />
                <span style={styles.label}>학교</span>
                <span>{user.school || '-'}</span>
              </div>
              <div style={styles.infoRow}>
                <BookOpen style={styles.infoIcon} />
                <span style={styles.label}>과목</span>
                <span>{user.subject || '-'}</span>
              </div>
              <div style={styles.infoRow}>
                <Clock style={styles.infoIcon} />
                <span style={styles.label}>경력</span>
                <span>
                  {Array.isArray(user.teacherHistory)
                    ? user.teacherHistory.join(', ')
                    : user.teacherHistory || '-'}
                </span>
              </div>

              {user.teacherMessage && (
                <div style={styles.messageBox}>
                  <strong>신청 메시지:</strong>
                  <br />
                  {user.teacherMessage}
                </div>
              )}

              <div style={styles.actions}>
                <button
                  style={styles.btnApprove}
                  onClick={() => handleApprove(user.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <CheckCircle style={{ width: 16, height: 16 }} />
                  승인
                </button>
                <button
                  style={styles.btnReject}
                  onClick={() => handleReject(user.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <XCircle style={{ width: 16, height: 16 }} />
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
