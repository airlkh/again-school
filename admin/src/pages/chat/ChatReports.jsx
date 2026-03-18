import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  limit,
  startAfter,
} from 'firebase/firestore';

const PAGE_SIZE = 20;

const STATUS_MAP = {
  pending: { label: '대기', bg: '#fff3e0', color: '#e65100' },
  reviewing: { label: '검토 중', bg: '#e3f2fd', color: '#1565c0' },
  resolved: { label: '처리 완료', bg: '#e8f5e9', color: '#2e7d32' },
  dismissed: { label: '기각', bg: '#f5f5f5', color: '#757575' },
};

const styles = {
  container: {
    padding: '24px 32px',
    backgroundColor: '#f5f5f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '16px 20px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    width: 260,
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    backgroundColor: '#fff',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    borderBottom: '2px solid #eee',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyRow: {
    padding: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
  },
  chatExcerpt: {
    backgroundColor: '#f8f8fc',
    padding: '6px 10px',
    borderRadius: 4,
    fontSize: 12,
    color: '#555',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderLeft: '3px solid #ddd',
  },
};

export default function ChatReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReports = async (isNextPage = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'chatReports'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'chatReports'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      setReports(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('채팅 신고 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'chatReports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const reporter = (r.reporterName || r.reporterEmail || '').toLowerCase();
      const reported = (r.reportedName || r.reportedEmail || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase();
      if (!reporter.includes(s) && !reported.includes(s) && !reason.includes(s)) return false;
    }
    if (dateFrom || dateTo) {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  });

  const pendingCount = reports.filter((r) => r.status === 'pending' || !r.status).length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusInfo = (status) => STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>채팅 신고 관리</h1>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>전체 신고</div>
          <div style={styles.statValue}>{reports.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>대기 중</div>
          <div style={{ ...styles.statValue, color: '#e65100' }}>{pendingCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>처리 완료</div>
          <div style={{ ...styles.statValue, color: '#2e7d32' }}>{resolvedCount}</div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="신고자, 피신고자, 사유 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="pending">대기</option>
          <option value="reviewing">검토 중</option>
          <option value="resolved">처리 완료</option>
          <option value="dismissed">기각</option>
        </select>
        <input type="date" style={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: '#999', fontSize: 13 }}>~</span>
        <input type="date" style={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>신고자</th>
            <th style={styles.th}>피신고자</th>
            <th style={styles.th}>신고 사유</th>
            <th style={styles.th}>채팅 내용</th>
            <th style={styles.th}>신고일</th>
            <th style={styles.th}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>로딩 중...</td>
            </tr>
          ) : filteredReports.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>신고 내역이 없습니다.</td>
            </tr>
          ) : (
            filteredReports.map((report) => {
              const statusInfo = getStatusInfo(report.status);
              return (
                <tr key={report.id}>
                  <td style={styles.td}>
                    {report.reporterName || report.reporterEmail || report.reporterId || '-'}
                  </td>
                  <td style={styles.td}>
                    {report.reportedName || report.reportedEmail || report.reportedId || '-'}
                  </td>
                  <td style={styles.td}>{report.reason || '-'}</td>
                  <td style={styles.td}>
                    {report.chatExcerpt || report.messageContent ? (
                      <div style={styles.chatExcerpt}>
                        {report.chatExcerpt || report.messageContent}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={styles.td}>{formatDate(report.createdAt)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {report.status !== 'resolved' && (
                        <button
                          style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }}
                          onClick={() => handleUpdateStatus(report.id, 'resolved')}
                        >
                          처리완료
                        </button>
                      )}
                      {report.status !== 'dismissed' && (
                        <button
                          style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSmall }}
                          onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        >
                          기각
                        </button>
                      )}
                      {(!report.status || report.status === 'pending') && (
                        <button
                          style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                          onClick={() => handleUpdateStatus(report.id, 'reviewing')}
                        >
                          검토
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: page === 1 ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p - 1); fetchReports(); }}
          disabled={page === 1}
        >
          이전
        </button>
        <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{page} 페이지</span>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: !hasMore ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p + 1); fetchReports(true); }}
          disabled={!hasMore}
        >
          다음
        </button>
      </div>
    </div>
  );
}
