import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function DormantMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('dormant'); // dormant, withdrawn
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchMembers();
  }, [filter]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const now = Date.now();

      const list = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((m) => {
          if (filter === 'withdrawn') {
            return m.withdrawn === true || m.status === '탈퇴';
          }
          // 휴면: 30일 이상 미활동
          const lastActive = m.lastActiveAt || m.lastLoginAt;
          if (lastActive) {
            const ts = lastActive.toDate ? lastActive.toDate().getTime() : new Date(lastActive).getTime();
            return now - ts >= THIRTY_DAYS_MS;
          }
          // lastActive가 없으면 createdAt 기준
          if (m.createdAt) {
            const ts = m.createdAt.toDate ? m.createdAt.toDate().getTime() : new Date(m.createdAt).getTime();
            return now - ts >= THIRTY_DAYS_MS;
          }
          return false;
        });

      setMembers(list);
      setSelectedIds([]);
    } catch (err) {
      console.error('휴면/탈퇴 회원 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR');
  };

  const getDaysSince = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
    return `${days}일 전`;
  };

  const toggleSelect = (uid) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.uid));
    }
  };

  const handleSendNotification = async () => {
    if (selectedIds.length === 0) {
      alert('알림을 보낼 회원을 선택해주세요.');
      return;
    }
    if (!window.confirm(`선택한 ${selectedIds.length}명에게 알림을 발송하시겠습니까?`)) return;

    try {
      for (const uid of selectedIds) {
        // notifications 컬렉션에 알림 추가
        const { addDoc: addNotifDoc } = await import('firebase/firestore');
        await addNotifDoc(collection(db, 'notifications'), {
          targetUid: uid,
          type: 'dormant_reminder',
          title: '다시학교를 기다리고 있어요!',
          body: '오랜만에 접속해보세요. 새로운 소식이 기다리고 있습니다.',
          createdAt: Timestamp.now(),
          read: false,
        });
      }
      alert(`${selectedIds.length}명에게 알림이 발송되었습니다.`);
      setSelectedIds([]);
    } catch (err) {
      console.error('알림 발송 실패:', err);
      alert('알림 발송에 실패했습니다.');
    }
  };

  const handleDeleteAccounts = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 회원을 선택해주세요.');
      return;
    }
    if (
      !window.confirm(
        `선택한 ${selectedIds.length}명의 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;

    try {
      for (const uid of selectedIds) {
        await deleteDoc(doc(db, 'users', uid));
      }
      alert(`${selectedIds.length}개의 계정이 삭제되었습니다.`);
      fetchMembers();
    } catch (err) {
      console.error('계정 삭제 실패:', err);
      alert('계정 삭제에 실패했습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>휴면/탈퇴 회원</h1>
        <span style={styles.count}>총 {members.length}명</span>
      </div>

      {/* 필터 + 액션 */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <button
            style={{
              ...styles.filterBtn,
              ...(filter === 'dormant' ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter('dormant')}
          >
            휴면 회원
          </button>
          <button
            style={{
              ...styles.filterBtn,
              ...(filter === 'withdrawn' ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter('withdrawn')}
          >
            탈퇴 회원
          </button>
        </div>
        <div style={styles.actionGroup}>
          {selectedIds.length > 0 && (
            <span style={styles.selectedCount}>{selectedIds.length}명 선택</span>
          )}
          <button style={styles.notifyBtn} onClick={handleSendNotification}>
            알림 발송
          </button>
          <button style={styles.deleteBtn} onClick={handleDeleteAccounts}>
            계정 삭제
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : members.length === 0 ? (
          <div style={styles.empty}>
            {filter === 'dormant' ? '휴면 회원이 없습니다.' : '탈퇴 회원이 없습니다.'}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thCheck}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === members.length && members.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>회원</th>
                <th style={styles.th}>이메일</th>
                <th style={styles.th}>학교</th>
                <th style={styles.th}>가입일</th>
                <th style={styles.th}>마지막 활동</th>
                <th style={styles.th}>비활동 기간</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const lastActive = m.lastActiveAt || m.lastLoginAt;
                return (
                  <tr
                    key={m.uid}
                    style={{
                      ...styles.tr,
                      backgroundColor: selectedIds.includes(m.uid) ? '#f0f7ff' : 'transparent',
                    }}
                  >
                    <td style={styles.tdCheck}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.uid)}
                        onChange={() => toggleSelect(m.uid)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.memberCell}>
                        <div style={styles.avatar}>
                          {(m.name || m.displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={styles.memberName}>
                          {m.name || m.displayName || '(이름 없음)'}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>{m.email || '-'}</td>
                    <td style={styles.td}>{m.school || m.schoolName || '-'}</td>
                    <td style={styles.td}>{formatDate(m.createdAt)}</td>
                    <td style={styles.td}>{formatDate(lastActive)}</td>
                    <td style={styles.td}>
                      <span style={styles.daysAgo}>{getDaysSince(lastActive)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 1200,
    margin: '0 auto',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
  },
  count: {
    fontSize: 14,
    color: '#718096',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  filterGroup: {
    display: 'flex',
    gap: 8,
  },
  filterBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  filterBtnActive: {
    backgroundColor: '#1a202c',
    color: '#fff',
    borderColor: '#1a202c',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  selectedCount: {
    fontSize: 13,
    color: '#4299e1',
    fontWeight: 500,
  },
  notifyBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#fed7d7',
    color: '#c53030',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thCheck: {
    width: 40,
    textAlign: 'center',
    padding: '12px 8px',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #edf2f7',
    transition: 'background-color 0.15s',
  },
  tdCheck: {
    width: 40,
    textAlign: 'center',
    padding: '12px 8px',
    verticalAlign: 'middle',
  },
  td: {
    padding: '12px 14px',
    fontSize: 13,
    color: '#2d3748',
    verticalAlign: 'middle',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: '#4299e1',
  },
  memberCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#a0aec0',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  memberName: {
    fontWeight: 500,
  },
  daysAgo: {
    fontSize: 12,
    color: '#e53e3e',
    fontWeight: 500,
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
};
