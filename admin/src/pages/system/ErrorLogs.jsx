import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'crash', label: '크래시' },
  { value: 'network', label: '네트워크' },
  { value: 'auth', label: '인증' },
  { value: 'firestore', label: 'Firestore' },
  { value: 'unknown', label: '알 수 없음' },
];

const PLATFORM_OPTIONS = [
  { value: '', label: '전체 플랫폼' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'web', label: 'Web' },
];

const RESOLVED_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'false', label: '미처리' },
  { value: 'true', label: '처리완료' },
];

const TYPE_COLORS = {
  crash: { bg: '#fde8e8', color: '#c53030' },
  network: { bg: '#fefcbf', color: '#975a16' },
  auth: { bg: '#ebf8ff', color: '#2b6cb0' },
  firestore: { bg: '#faf5ff', color: '#6b46c1' },
  unknown: { bg: '#edf2f7', color: '#4a5568' },
};

const TYPE_LABELS = {
  crash: '크래시',
  network: '네트워크',
  auth: '인증',
  firestore: 'Firestore',
  unknown: '알 수 없음',
};

const PAGE_SIZE = 20;

export default function ErrorLogs() {
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [memo, setMemo] = useState('');
  const [resolving, setResolving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    todayCount: 0,
    unresolvedCount: 0,
    resolvedCount: 0,
    criticalCount: 0,
  });

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc'), limit(500));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllLogs(list);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let todayCount = 0;
      let unresolvedCount = 0;
      let resolvedCount = 0;
      let criticalCount = 0;

      list.forEach((log) => {
        if (log.createdAt) {
          const d = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
          if (d >= todayStart) todayCount++;
        }
        if (log.isResolved) resolvedCount++;
        else unresolvedCount++;
        if (log.type === 'crash') criticalCount++;
      });

      setStats({ todayCount, unresolvedCount, resolvedCount, criticalCount });
      setLoading(false);
    }, (err) => {
      console.error('에러 로그 로드 실패:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter & search
  const filteredLogs = allLogs.filter((log) => {
    if (typeFilter && log.type !== typeFilter) return false;
    if (platformFilter && log.platform !== platformFilter) return false;
    if (resolvedFilter !== '') {
      const isResolved = resolvedFilter === 'true';
      if (log.isResolved !== isResolved) return false;
    }
    if (dateFrom && log.createdAt) {
      const d = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      if (d < new Date(dateFrom)) return false;
    }
    if (dateTo && log.createdAt) {
      const d = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      if (d > new Date(dateTo + 'T23:59:59')) return false;
    }
    if (searchText) {
      const s = searchText.toLowerCase();
      const msg = (log.message || '').toLowerCase();
      const email = (log.userEmail || '').toLowerCase();
      if (!msg.includes(s) && !email.includes(s)) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, platformFilter, resolvedFilter, dateFrom, dateTo, searchText]);

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('ko-KR');
  };

  const truncate = (str, len) => {
    if (!str) return '-';
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  const handleResolve = async () => {
    if (!selectedLog) return;
    setResolving(true);
    try {
      await updateDoc(doc(db, 'errorLogs', selectedLog.id), {
        isResolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: 'admin',
        memo: memo || '',
      });
      setSelectedLog(null);
      setMemo('');
    } catch (err) {
      console.error('처리 완료 실패:', err);
      alert('처리 완료에 실패했습니다.');
    } finally {
      setResolving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('처리 완료된 30일 이상 된 항목을 모두 삭제하시겠습니까?')) return;
    setBulkDeleting(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ts = Timestamp.fromDate(thirtyDaysAgo);

      const q = query(
        collection(db, 'errorLogs'),
        where('isResolved', '==', true),
        where('createdAt', '<', ts)
      );
      const snapshot = await getDocs(q);

      let count = 0;
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'errorLogs', d.id));
        count++;
      }
      alert(`${count}건이 삭제되었습니다.`);
    } catch (err) {
      console.error('일괄 삭제 실패:', err);
      alert('일괄 삭제에 실패했습니다.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openDetail = (log) => {
    setSelectedLog(log);
    setMemo(log.memo || '');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>에러 로그</h1>
          <p style={styles.subtitle}>앱 에러 로그를 실시간으로 모니터링합니다.</p>
        </div>
        <button
          style={{
            ...styles.bulkDeleteBtn,
            opacity: bulkDeleting ? 0.6 : 1,
          }}
          disabled={bulkDeleting}
          onClick={handleBulkDelete}
        >
          {bulkDeleting ? '삭제 중...' : '30일 이전 처리완료 항목 삭제'}
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #e53e3e' }}>
          <div style={styles.statLabel}>오늘 발생</div>
          <div style={styles.statValue}>{stats.todayCount}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #ed8936' }}>
          <div style={styles.statLabel}>미처리</div>
          <div style={styles.statValue}>{stats.unresolvedCount}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #38a169' }}>
          <div style={styles.statLabel}>처리완료</div>
          <div style={styles.statValue}>{stats.resolvedCount}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #c53030' }}>
          <div style={styles.statLabel}>크리티컬</div>
          <div style={styles.statValue}>{stats.criticalCount}</div>
        </div>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="메시지 또는 이메일 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          style={styles.select}
        >
          {PLATFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={resolvedFilter}
          onChange={(e) => setResolvedFilter(e.target.value)}
          style={styles.select}
        >
          {RESOLVED_OPTIONS.map((opt) => (
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
        ) : paginatedLogs.length === 0 ? (
          <div style={styles.empty}>에러 로그가 없습니다.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>발생일시</th>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>메시지</th>
                <th style={styles.th}>유저</th>
                <th style={styles.th}>플랫폼</th>
                <th style={styles.th}>버전</th>
                <th style={styles.th}>처리상태</th>
                <th style={styles.th}>액션</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => {
                const typeColor = TYPE_COLORS[log.type] || TYPE_COLORS.unknown;
                return (
                  <tr key={log.id} style={styles.tr}>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: 13, color: '#718096' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.typePill,
                          backgroundColor: typeColor.bg,
                          color: typeColor.color,
                        }}
                      >
                        {TYPE_LABELS[log.type] || log.type || '-'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: 250 }}>
                      <span title={log.message}>{truncate(log.message, 50)}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: 13 }}>
                      {log.userEmail || log.userId || '-'}
                    </td>
                    <td style={{ ...styles.td, fontSize: 13 }}>
                      {log.platform || '-'}
                    </td>
                    <td style={{ ...styles.td, fontSize: 13 }}>
                      {log.appVersion || '-'}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor: log.isResolved ? '#e6f9ed' : '#fde8e8',
                          color: log.isResolved ? '#1a8a4a' : '#c53030',
                        }}
                      >
                        {log.isResolved ? '처리완료' : '미처리'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.detailBtn} onClick={() => openDetail(log)}>
                        상세
                      </button>
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
          {currentPage} / {totalPages} 페이지 (총 {filteredLogs.length}건)
        </span>
        <button
          style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          다음
        </button>
      </div>

      {/* 상세 모달 */}
      {selectedLog && (
        <div style={styles.modalOverlay} onClick={() => { setSelectedLog(null); setMemo(''); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>에러 상세</h2>
              <button
                style={styles.modalClose}
                onClick={() => { setSelectedLog(null); setMemo(''); }}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>유형</span>
                <span
                  style={{
                    ...styles.typePill,
                    backgroundColor: (TYPE_COLORS[selectedLog.type] || TYPE_COLORS.unknown).bg,
                    color: (TYPE_COLORS[selectedLog.type] || TYPE_COLORS.unknown).color,
                  }}
                >
                  {TYPE_LABELS[selectedLog.type] || selectedLog.type || '-'}
                </span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>발생일시</span>
                <span>{formatDate(selectedLog.createdAt)}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>유저</span>
                <span>{selectedLog.userEmail || selectedLog.userId || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>플랫폼</span>
                <span>{selectedLog.platform || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>앱 버전</span>
                <span>{selectedLog.appVersion || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>디바이스 정보</span>
                <span>{selectedLog.deviceInfo || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>처리상태</span>
                <span
                  style={{
                    ...styles.statusPill,
                    backgroundColor: selectedLog.isResolved ? '#e6f9ed' : '#fde8e8',
                    color: selectedLog.isResolved ? '#1a8a4a' : '#c53030',
                  }}
                >
                  {selectedLog.isResolved ? '처리완료' : '미처리'}
                </span>
              </div>
              {selectedLog.isResolved && (
                <>
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>처리일시</span>
                    <span>{formatDate(selectedLog.resolvedAt)}</span>
                  </div>
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>처리자</span>
                    <span>{selectedLog.resolvedBy || '-'}</span>
                  </div>
                </>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={styles.modalLabel}>에러 메시지</div>
                <div style={styles.messageBlock}>{selectedLog.message || '-'}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={styles.modalLabel}>스택 트레이스</div>
                <pre style={styles.stackBlock}>
                  {selectedLog.stack || '스택 정보 없음'}
                </pre>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={styles.modalLabel}>메모</div>
                <textarea
                  style={styles.memoTextarea}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="처리 메모를 입력하세요..."
                  rows={3}
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              {!selectedLog.isResolved && (
                <button
                  style={{
                    ...styles.resolveBtn,
                    opacity: resolving ? 0.6 : 1,
                  }}
                  disabled={resolving}
                  onClick={handleResolve}
                >
                  {resolving ? '처리 중...' : '처리완료'}
                </button>
              )}
              <button
                style={styles.cancelBtn}
                onClick={() => { setSelectedLog(null); setMemo(''); }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 1400,
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
  bulkDeleteBtn: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Stats
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: '20px 24px',
    border: '1px solid #e2e8f0',
  },
  statLabel: { fontSize: 13, color: '#718096', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#1a202c' },

  // Filters
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

  // Table
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'auto',
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
  typePill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  statusPill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  detailBtn: {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
    border: '1px solid #bee3f8',
    borderRadius: 6,
    cursor: 'pointer',
  },
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  empty: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },

  // Pagination
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

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 700,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1a202c', margin: 0 },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#a0aec0',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  modalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    fontSize: 14,
    color: '#2d3748',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    minWidth: 100,
  },
  messageBlock: {
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d3748',
    border: '1px solid #e2e8f0',
    lineHeight: 1.6,
    marginTop: 8,
  },
  stackBlock: {
    padding: '16px 20px',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
    lineHeight: 1.6,
    overflow: 'auto',
    maxHeight: 250,
    marginTop: 8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  memoTextarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    resize: 'vertical',
    outline: 'none',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    marginTop: 8,
    boxSizing: 'border-box',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
  },
  resolveBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: '#38a169',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
