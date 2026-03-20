import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '../../firebase';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '정상', label: '정상' },
  { value: '제재', label: '제재' },
  { value: '휴면', label: '휴면' },
  { value: '탈퇴', label: '탈퇴' },
];

const STATUS_COLORS = {
  정상: { bg: '#e6f9ed', color: '#1a8a4a' },
  제재: { bg: '#fde8e8', color: '#c53030' },
  휴면: { bg: '#fef3cd', color: '#856404' },
  탈퇴: { bg: '#e2e8f0', color: '#4a5568' },
};

const PROVIDER_BADGES = {
  email: { label: '이메일', color: '#3B82F6', bg: '#EFF6FF' },
  google: { label: '구글', color: '#EF4444', bg: '#FEF2F2' },
  kakao: { label: '카카오', color: '#92400E', bg: '#FEF3C7' },
  naver: { label: '네이버', color: '#166534', bg: '#F0FDF4' },
  apple: { label: '애플', color: '#1F2937', bg: '#F9FAFB' },
};

const PROVIDER_OPTIONS = [
  { value: '', label: '전체 경로' },
  { value: 'email', label: '이메일' },
  { value: 'google', label: '구글' },
  { value: 'kakao', label: '카카오' },
  { value: 'naver', label: '네이버' },
  { value: 'apple', label: '애플' },
];

const PAGE_SIZE = 20;

export default function MemberList() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const handleDisable = async (e, member) => {
    e.stopPropagation();
    const isDisabled = !!member.disabled;
    const action = isDisabled ? '정지 해제' : '정지';
    if (!window.confirm(`${member.displayName || member.name}님을 ${action}하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        disabled: !isDisabled,
        status: !isDisabled ? '제재' : '정상',
      });
      setMembers((prev) => prev.map((m) =>
        m.uid === member.uid ? { ...m, disabled: !isDisabled, status: !isDisabled ? '제재' : '정상' } : m
      ));
      alert(`${action} 처리 완료`);
    } catch (err) {
      alert('처리 실패');
    }
  };

  const handleDeleteUser = async (e, member) => {
    e.stopPropagation();
    const reason = window.prompt(`${member.displayName || member.name}님을 강제 탈퇴 처리합니다.\n사유를 입력해주세요:`);
    if (reason === null) return;
    if (!window.confirm('정말 강제 탈퇴 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const fn = httpsCallable(functions, 'deleteUserAccount');
      const result = await fn({ uid: member.uid, reason });
      if (result.data?.success) {
        setMembers((prev) => prev.filter((m) => m.uid !== member.uid));
        setTotalCount((c) => c - 1);
        alert('강제 탈퇴 처리 완료');
      } else {
        alert('강제 탈퇴 실패: ' + (result.data?.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('강제 탈퇴 실패');
    }
  };

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const constraints = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];

      if (statusFilter) {
        constraints.unshift(where('status', '==', statusFilter));
      }

      if (page > 1 && lastDocs[page - 2]) {
        constraints.push(startAfter(lastDocs[page - 2]));
      }

      const q = query(collection(db, 'users'), ...constraints);
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      setMembers(list);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      if (snapshot.docs.length > 0) {
        setLastDocs((prev) => {
          const copy = [...prev];
          copy[page - 1] = snapshot.docs[snapshot.docs.length - 1];
          return copy;
        });
      }

      // 전체 수 조회 (최초 로드 시)
      if (page === 1) {
        const countQuery = statusFilter
          ? query(collection(db, 'users'), where('status', '==', statusFilter))
          : query(collection(db, 'users'));
        const countSnap = await getDocs(countQuery);
        setTotalCount(countSnap.size);
      }
    } catch (err) {
      console.error('회원 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, lastDocs]);

  useEffect(() => {
    setCurrentPage(1);
    setLastDocs([]);
    fetchMembers(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchMembers(currentPage);
    }
  }, [currentPage]);

  const filteredMembers = members.filter((m) => {
    const text = searchText.toLowerCase();
    if (text) {
      const name = (m.name || m.displayName || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const school = (m.school || m.schoolName || '').toLowerCase();
      if (!name.includes(text) && !email.includes(text) && !school.includes(text)) {
        return false;
      }
    }

    if (providerFilter && (m.provider || '') !== providerFilter) return false;

    if (dateFrom && m.createdAt) {
      const joined = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      if (joined < new Date(dateFrom)) return false;
    }
    if (dateTo && m.createdAt) {
      const joined = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      if (joined > new Date(dateTo + 'T23:59:59')) return false;
    }

    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR');
  };

  const getInitial = (name) => {
    return (name || '?').charAt(0).toUpperCase();
  };

  const getStatus = (member) => {
    if (member.disabled) return '제재';
    if (member.withdrawn) return '탈퇴';
    if (member.dormant) return '휴면';
    return member.status || '정상';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>회원 목록</h1>
        <span style={styles.count}>전체 {totalCount}명</span>
      </div>

      {/* 검색 / 필터 영역 */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="이름, 이메일, 학교 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.select}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          style={styles.select}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div style={styles.dateRange}>
          <label style={styles.dateLabel}>가입일</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.dateInput}
          />
          <span style={styles.dateSep}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      {/* 테이블 */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : filteredMembers.length === 0 ? (
          <div style={styles.empty}>조건에 맞는 회원이 없습니다.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>회원</th>
                <th style={styles.th}>이메일</th>
                <th style={styles.th}>학교</th>
                <th style={styles.th}>가입경로</th>
                <th style={styles.th}>가입일</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const status = getStatus(m);
                const statusColor = STATUS_COLORS[status] || STATUS_COLORS['정상'];
                return (
                  <tr
                    key={m.uid}
                    style={styles.tr}
                    onClick={() => navigate(`/members/${m.uid}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#f7fafc')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td style={styles.td}>
                      <div style={styles.memberCell}>
                        <div style={styles.avatar}>
                          {getInitial(m.name || m.displayName)}
                        </div>
                        <span style={styles.memberName}>
                          {m.name || m.displayName || '(이름 없음)'}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>{m.email || '-'}</td>
                    <td style={styles.td}>{m.school || m.schoolName || '-'}</td>
                    <td style={styles.td}>
                      {(() => {
                        const badge = PROVIDER_BADGES[m.provider];
                        return badge ? (
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>미확인</span>
                        );
                      })()}
                    </td>
                    <td style={styles.td}>{formatDate(m.createdAt)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor: statusColor.bg,
                          color: statusColor.color,
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={styles.actionBtn}
                          onClick={(e) => { e.stopPropagation(); navigate(`/members/${m.uid}`); }}
                        >
                          상세
                        </button>
                        <button
                          style={{
                            ...styles.actionBtn,
                            backgroundColor: m.disabled ? '#f0fff4' : '#fff5f5',
                            color: m.disabled ? '#276749' : '#c53030',
                          }}
                          onClick={(e) => handleDisable(e, m)}
                        >
                          {m.disabled ? '정지해제' : '정지'}
                        </button>
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#1a202c', color: '#fff' }}
                          onClick={(e) => handleDeleteUser(e, m)}
                        >
                          탈퇴
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <div style={styles.pagination}>
        <button
          style={{
            ...styles.pageBtn,
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          disabled={currentPage === 1}
          onClick={() => {
            setCurrentPage((p) => p - 1);
          }}
        >
          이전
        </button>
        <span style={styles.pageInfo}>
          {currentPage} 페이지 (총 {Math.ceil(totalCount / PAGE_SIZE) || 1} 페이지)
        </span>
        <button
          style={{
            ...styles.pageBtn,
            opacity: !hasMore ? 0.4 : 1,
          }}
          disabled={!hasMore}
          onClick={() => {
            setCurrentPage((p) => p + 1);
          }}
        >
          다음
        </button>
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
  filterBar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
    padding: '16px 20px',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '8px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  select: {
    padding: '8px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    outline: 'none',
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: '#4a5568',
    whiteSpace: 'nowrap',
  },
  dateInput: {
    padding: '7px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  dateSep: {
    color: '#a0aec0',
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
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    borderBottom: '1px solid #edf2f7',
  },
  td: {
    padding: '12px 16px',
    fontSize: 14,
    color: '#2d3748',
    verticalAlign: 'middle',
  },
  memberCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: '#4299e1',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  memberName: {
    fontWeight: 500,
  },
  statusPill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  actionBtn: {
    padding: '5px 12px',
    fontSize: 12,
    color: '#4299e1',
    backgroundColor: '#ebf8ff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  pageBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#2d3748',
  },
  pageInfo: {
    fontSize: 13,
    color: '#718096',
  },
};
