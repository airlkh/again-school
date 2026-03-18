import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const STATUS_OPTIONS = {
  all: '전체',
  completed: '완료',
  pending: '대기',
  rejected: '반려',
};

const STATUS_COLORS = {
  completed: { bg: '#D1FAE5', text: '#065F46' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function SettlementHistory() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
      setSettlements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('정산 이력 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v);

  const filtered = settlements.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchUser) {
      const name = s.userName || s.targetName || '';
      if (!name.includes(searchUser)) return false;
    }
    if (dateFrom) {
      const d = s.createdAt?.toDate?.();
      if (d && d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = s.createdAt?.toDate?.();
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      if (d && d >= end) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleExport = () => {
    // CSV export placeholder
    const headers = '이름,유형,금액,상태,일자\n';
    const rows = filtered.map((s) => {
      const name = s.userName || s.targetName || '-';
      const type = s.type || s.source || '-';
      const amount = s.amount || 0;
      const status = STATUS_OPTIONS[s.status] || s.status;
      const date = s.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-';
      return `${name},${type},${amount},${status},${date}`;
    }).join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `정산이력_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>정산 이력</h1>
        <button onClick={handleExport} style={styles.exportBtn}>
          내보내기 (CSV)
        </button>
      </div>

      {/* 필터 */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>상태</label>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={styles.select}
          >
            {Object.entries(STATUS_OPTIONS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>사용자</label>
          <input
            type="text"
            placeholder="이름 검색..."
            value={searchUser}
            onChange={(e) => { setSearchUser(e.target.value); setCurrentPage(1); }}
            style={styles.input}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>시작일</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            style={styles.input}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>종료일</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            style={styles.input}
          />
        </div>
      </div>

      {/* 요약 */}
      <div style={styles.summaryRow}>
        <span>총 <strong>{filtered.length}</strong>건</span>
        <span>합계: <strong>{formatCurrency(totalAmount)}</strong></span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>로딩 중...</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>번호</th>
                <th style={styles.th}>대상</th>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>금액</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>요청일</th>
                <th style={styles.th}>처리일</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyTd}>정산 이력이 없습니다.</td>
                </tr>
              ) : (
                paged.map((s, idx) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>{(currentPage - 1) * perPage + idx + 1}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{s.userName || s.targetName || '-'}</div>
                    </td>
                    <td style={styles.td}>{s.type || s.source || '-'}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{formatCurrency(s.amount || 0)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: (STATUS_COLORS[s.status] || STATUS_COLORS.pending).bg,
                          color: (STATUS_COLORS[s.status] || STATUS_COLORS.pending).text,
                        }}
                      >
                        {STATUS_OPTIONS[s.status] || s.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {s.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                    <td style={styles.td}>
                      {s.processedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={styles.pageBtn}
          >
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{ ...styles.pageBtn, ...(currentPage === page ? styles.pageBtnActive : {}) }}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={styles.pageBtn}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#111827' },
  exportBtn: { padding: '10px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  filterRow: { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 13, fontWeight: 600, color: '#374151' },
  select: { padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', minWidth: 120 },
  input: { padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6B7280', marginBottom: 16 },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '14px 20px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  tr: { transition: 'background 0.15s' },
  emptyTd: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  pagination: { display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 },
  pageBtn: { padding: '8px 14px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' },
  pageBtnActive: { background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' },
};
