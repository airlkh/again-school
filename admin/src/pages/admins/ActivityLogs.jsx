import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';

const ACTION_OPTIONS = [
  { value: '', label: '전체 작업' },
  { value: 'create', label: '생성' },
  { value: 'update', label: '수정' },
  { value: 'delete', label: '삭제' },
  { value: 'login', label: '로그인' },
  { value: 'logout', label: '로그아웃' },
  { value: 'export', label: '내보내기' },
  { value: 'settings', label: '설정 변경' },
];

const ACTION_COLORS = {
  create: { bg: '#e6f9ed', color: '#1a8a4a' },
  update: { bg: '#ebf8ff', color: '#2b6cb0' },
  delete: { bg: '#fde8e8', color: '#c53030' },
  login: { bg: '#faf5ff', color: '#6b46c1' },
  logout: { bg: '#edf2f7', color: '#4a5568' },
  export: { bg: '#fef3cd', color: '#856404' },
  settings: { bg: '#fed7e2', color: '#97266d' },
};

const PAGE_SIZE = 20;

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const constraints = [orderBy('timestamp', 'desc'), limit(PAGE_SIZE)];

      if (actionFilter) {
        constraints.unshift(where('action', '==', actionFilter));
      }

      if (page > 1 && lastDocs[page - 2]) {
        constraints.push(startAfter(lastDocs[page - 2]));
      }

      const q = query(collection(db, 'adminLogs'), ...constraints);
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLogs(list);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      if (snapshot.docs.length > 0) {
        setLastDocs((prev) => {
          const copy = [...prev];
          copy[page - 1] = snapshot.docs[snapshot.docs.length - 1];
          return copy;
        });
      }

      if (page === 1) {
        const countConstraints = actionFilter
          ? [where('action', '==', actionFilter)]
          : [];
        const countQuery = query(collection(db, 'adminLogs'), ...countConstraints);
        const countSnap = await getDocs(countQuery);
        setTotalCount(countSnap.size);
      }
    } catch (err) {
      console.error('작업 로그 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, lastDocs]);

  useEffect(() => {
    setCurrentPage(1);
    setLastDocs([]);
    fetchLogs(1);
  }, [actionFilter]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchLogs(currentPage);
    }
  }, [currentPage]);

  const filteredLogs = logs.filter((log) => {
    if (adminFilter) {
      const name = (log.adminName || log.adminEmail || '').toLowerCase();
      if (!name.includes(adminFilter.toLowerCase())) return false;
    }
    if (dateFrom && log.timestamp) {
      const d = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      if (d < new Date(dateFrom)) return false;
    }
    if (dateTo && log.timestamp) {
      const d = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      if (d > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('ko-KR');
  };

  const getActionLabel = (action) => {
    const found = ACTION_OPTIONS.find((a) => a.value === action);
    return found ? found.label : action || '-';
  };

  const getActionColor = (action) => {
    return ACTION_COLORS[action] || { bg: '#edf2f7', color: '#4a5568' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>작업 로그</h1>
          <p style={styles.subtitle}>관리자 활동 내역을 확인합니다. 총 {totalCount}건</p>
        </div>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="관리자 이름/이메일 검색..."
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={styles.select}
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div style={styles.dateRange}>
          <label style={styles.dateLabel}>기간</label>
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
        ) : filteredLogs.length === 0 ? (
          <div style={styles.empty}>로그가 없습니다.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>시간</th>
                <th style={styles.th}>관리자</th>
                <th style={styles.th}>작업</th>
                <th style={styles.th}>대상</th>
                <th style={styles.th}>상세</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const actionColor = getActionColor(log.action);
                return (
                  <tr key={log.id} style={styles.tr}>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: 13, color: '#718096' }}>
                      {formatDate(log.timestamp)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 500 }}>{log.adminName || log.adminEmail || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.actionPill,
                          backgroundColor: actionColor.bg,
                          color: actionColor.color,
                        }}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td style={styles.td}>{log.target || '-'}</td>
                    <td style={{ ...styles.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details || '-'}
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
          style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          이전
        </button>
        <span style={styles.pageInfo}>
          {currentPage} 페이지 (총 {Math.ceil(totalCount / PAGE_SIZE) || 1} 페이지)
        </span>
        <button
          style={{ ...styles.pageBtn, opacity: !hasMore ? 0.4 : 1 }}
          disabled={!hasMore}
          onClick={() => setCurrentPage((p) => p + 1)}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4 },
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
  dateRange: { display: 'flex', alignItems: 'center', gap: 6 },
  dateLabel: { fontSize: 13, color: '#4a5568', whiteSpace: 'nowrap' },
  dateInput: {
    padding: '7px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  dateSep: { color: '#a0aec0' },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
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
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 16px', fontSize: 14, color: '#2d3748', verticalAlign: 'middle' },
  actionPill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  empty: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
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
  pageInfo: { fontSize: 13, color: '#718096' },
};
