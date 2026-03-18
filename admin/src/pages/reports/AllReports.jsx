import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['전체', '대기', '처리중', '완료', '무시'];
const TYPE_OPTIONS = ['전체', '욕설/비방', '스팸', '부적절한 콘텐츠', '사기', '기타'];

const statusColors = {
  '대기': { bg: '#fff3e0', color: '#e65100' },
  '처리중': { bg: '#e3f2fd', color: '#1565c0' },
  '완료': { bg: '#e8f5e9', color: '#2e7d32' },
  '무시': { bg: '#f5f5f5', color: '#757575' },
};

const styles = {
  container: { padding: 0 },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff',
  },
  select: {
    padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, backgroundColor: '#fff', cursor: 'pointer', outline: 'none',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  th: {
    padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
    color: '#6b6b80', backgroundColor: '#fafafa', borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '13px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0',
  },
  badge: (status) => ({
    display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 12,
    fontWeight: 600,
    backgroundColor: (statusColors[status] || statusColors['대기']).bg,
    color: (statusColors[status] || statusColors['대기']).color,
  }),
  actionBtn: {
    padding: '6px 12px', border: '1px solid #d0d0d0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#333',
    marginRight: 4, transition: 'all 0.15s',
  },
  detailBtn: {
    padding: '6px 12px', border: 'none', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#e94560', color: '#fff',
    fontWeight: 600,
  },
  row: {
    transition: 'background 0.15s',
  },
  empty: {
    textAlign: 'center', padding: 60, color: '#999', fontSize: 14,
  },
  statRow: {
    display: 'flex', gap: 12, marginBottom: 20,
  },
  statCard: (color) => ({
    flex: 1, padding: '16px 20px', backgroundColor: '#fff', borderRadius: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`,
  }),
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#222' },
};

export default function AllReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [typeFilter, setTypeFilter] = useState('전체');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
    } catch (err) {
      console.error('신고 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== '전체' && r.status !== statusFilter) return false;
    if (typeFilter !== '전체' && r.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (r.reporterName || '').toLowerCase().includes(s) ||
        (r.targetName || '').toLowerCase().includes(s) ||
        (r.reason || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const statusCounts = {
    '대기': reports.filter((r) => r.status === '대기').length,
    '처리중': reports.filter((r) => r.status === '처리중').length,
    '완료': reports.filter((r) => r.status === '완료').length,
    '무시': reports.filter((r) => r.status === '무시').length,
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.statRow}>
        {[
          { label: '대기', color: '#e65100' },
          { label: '처리중', color: '#1565c0' },
          { label: '완료', color: '#2e7d32' },
          { label: '무시', color: '#757575' },
        ].map((s) => (
          <div key={s.label} style={styles.statCard(s.color)}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={styles.statValue}>{statusCounts[s.label] || 0}</div>
          </div>
        ))}
      </div>

      <div style={styles.topBar}>
        <input
          style={styles.searchInput}
          placeholder="신고자, 대상자, 사유 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === '전체' ? '상태: 전체' : s}</option>)}
        </select>
        <select style={styles.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t === '전체' ? '유형: 전체' : t}</option>)}
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>유형</th>
            <th style={styles.th}>신고자</th>
            <th style={styles.th}>대상자</th>
            <th style={styles.th}>사유</th>
            <th style={styles.th}>날짜</th>
            <th style={styles.th}>상태</th>
            <th style={styles.th}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={7} style={styles.empty}>신고 내역이 없습니다.</td></tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.id} style={styles.row}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={styles.td}>{r.type || '-'}</td>
                <td style={styles.td}>{r.reporterName || r.reporterUid || '-'}</td>
                <td style={styles.td}>{r.targetName || r.targetUid || '-'}</td>
                <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason || '-'}
                </td>
                <td style={styles.td}>{formatDate(r.createdAt)}</td>
                <td style={styles.td}>
                  <span style={styles.badge(r.status)}>{r.status || '대기'}</span>
                </td>
                <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                  <button style={styles.detailBtn} onClick={() => navigate(`/reports/${r.id}`)}>
                    상세
                  </button>
                  {r.status === '대기' && (
                    <button style={{ ...styles.actionBtn, marginLeft: 4 }} onClick={() => handleStatusChange(r.id, '처리중')}>
                      처리시작
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
