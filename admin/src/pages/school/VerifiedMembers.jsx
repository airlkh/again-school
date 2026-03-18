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
import { Search, ShieldOff, CheckCircle } from 'lucide-react';

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1200,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
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
    width: 220,
  },
  select: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    backgroundColor: '#fff',
    outline: 'none',
    color: '#333',
  },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 18px',
    fontSize: 14,
    color: '#333',
    borderBottom: '1px solid #f5f5f5',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    backgroundColor: '#e6f7ee',
    color: '#28a745',
    fontSize: 12,
    fontWeight: 600,
  },
  revokeBtn: {
    padding: '7px 14px',
    borderRadius: 6,
    border: '1px solid #dc3545',
    backgroundColor: '#fff',
    color: '#dc3545',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    transition: 'background-color 0.2s, color 0.2s',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
  count: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
};

export default function VerifiedMembers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const fetchVerified = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('teacherVerified', '==', true));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('인증 완료 회원 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerified();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.subject) set.add(u.subject);
    });
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    let result = users;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(term) ||
          (u.school || '').toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
      );
    }

    if (subjectFilter) {
      result = result.filter((u) => u.subject === subjectFilter);
    }

    return result;
  }, [users, searchTerm, subjectFilter]);

  const handleRevoke = async (userId, userName) => {
    if (!window.confirm(`${userName}님의 인증을 취소하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        teacherVerified: false,
        revokedAt: Timestamp.now(),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('인증 취소 실패:', err);
      alert('인증 취소 처리 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return <div style={styles.empty}>데이터를 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>인증 완료 회원</h1>
        <div style={styles.filterRow}>
          <select
            style={styles.select}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">전체 과목</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div style={styles.searchBox}>
            <Search style={{ width: 16, height: 16, color: '#999' }} />
            <input
              type="text"
              placeholder="이름, 학교, 이메일 검색..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={styles.count}>
        총 <strong>{filtered.length}</strong>명
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>인증 완료된 회원이 없습니다.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>학교</th>
                <th style={styles.th}>과목</th>
                <th style={styles.th}>인증일</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 500 }}>{user.name || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {user.email || ''}
                    </div>
                  </td>
                  <td style={styles.td}>{user.school || '-'}</td>
                  <td style={styles.td}>{user.subject || '-'}</td>
                  <td style={styles.td}>{formatDate(user.verifiedAt)}</td>
                  <td style={styles.td}>
                    <span style={styles.verifiedBadge}>
                      <CheckCircle style={{ width: 14, height: 14 }} />
                      인증 완료
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.revokeBtn}
                      onClick={() => handleRevoke(user.id, user.name)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                        e.currentTarget.style.color = '#dc3545';
                      }}
                    >
                      <ShieldOff style={{ width: 14, height: 14 }} />
                      인증 취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
