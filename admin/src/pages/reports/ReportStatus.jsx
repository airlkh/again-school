import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const STATUS_LIST = ['대기', '처리중', '완료', '무시'];
const statusColors = {
  '대기': { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  '처리중': { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  '완료': { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  '무시': { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0' },
};

const styles = {
  container: { padding: 0 },
  statRow: { display: 'flex', gap: 16, marginBottom: 28 },
  statCard: (status) => ({
    flex: 1, padding: '20px 24px', backgroundColor: statusColors[status].bg,
    borderRadius: 12, border: `2px solid ${statusColors[status].border}`,
    cursor: 'pointer', transition: 'transform 0.15s',
  }),
  statLabel: (status) => ({
    fontSize: 14, fontWeight: 600, color: statusColors[status].color, marginBottom: 6,
  }),
  statValue: (status) => ({
    fontSize: 28, fontWeight: 800, color: statusColors[status].color,
  }),
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterBtn: (active) => ({
    padding: '8px 18px', border: active ? 'none' : '1px solid #d0d0d0',
    borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    backgroundColor: active ? '#e94560' : '#fff',
    color: active ? '#fff' : '#555',
    transition: 'all 0.15s',
  }),
  sortRow: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' },
  sortLabel: { fontSize: 13, color: '#888' },
  sortBtn: (active) => ({
    padding: '6px 14px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer',
    backgroundColor: active ? '#333' : '#fff',
    color: active ? '#fff' : '#555',
  }),
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'background 0.15s',
  },
  cardLeft: { flex: 1 },
  cardType: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardReason: { fontSize: 14, fontWeight: 500, color: '#333' },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
  badge: (status) => ({
    display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12,
    fontWeight: 600, backgroundColor: statusColors[status]?.bg || '#f5f5f5',
    color: statusColors[status]?.color || '#757575', marginRight: 8,
  }),
  actionBtns: { display: 'flex', gap: 4 },
  moveBtn: {
    padding: '6px 10px', border: '1px solid #d0d0d0', borderRadius: 6,
    fontSize: 11, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
  },
  empty: { textAlign: 'center', padding: 40, color: '#999', fontSize: 14 },
};

export default function ReportStatus() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('전체');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const statusCounts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = reports.filter((r) => r.status === s).length;
    return acc;
  }, {});

  const filtered = reports
    .filter((r) => activeStatus === '전체' || r.status === activeStatus)
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

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
      {/* 상태별 카드 */}
      <div style={styles.statRow}>
        {STATUS_LIST.map((status) => (
          <div
            key={status}
            style={styles.statCard(status)}
            onClick={() => setActiveStatus(activeStatus === status ? '전체' : status)}
          >
            <div style={styles.statLabel(status)}>{status}</div>
            <div style={styles.statValue(status)}>{statusCounts[status] || 0}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={styles.filterRow}>
        {['전체', ...STATUS_LIST].map((s) => (
          <button
            key={s}
            style={styles.filterBtn(activeStatus === s)}
            onClick={() => setActiveStatus(s)}
          >
            {s} {s !== '전체' ? `(${statusCounts[s] || 0})` : `(${reports.length})`}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div style={styles.sortRow}>
        <span style={styles.sortLabel}>정렬:</span>
        <button style={styles.sortBtn(sortBy === 'newest')} onClick={() => setSortBy('newest')}>
          최신순
        </button>
        <button style={styles.sortBtn(sortBy === 'oldest')} onClick={() => setSortBy('oldest')}>
          오래된순
        </button>
      </div>

      {/* 신고 목록 */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>해당 상태의 신고가 없습니다.</div>
      ) : (
        filtered.map((r) => (
          <div
            key={r.id}
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            <div style={styles.cardLeft}>
              <div style={styles.cardType}>{r.type || '기타'} | {r.reporterName || r.reporterUid || '익명'}</div>
              <div style={styles.cardReason}>{r.reason || '사유 없음'}</div>
              <div style={styles.cardDate}>{formatDate(r.createdAt)}</div>
            </div>
            <span style={styles.badge(r.status)}>{r.status || '대기'}</span>
            <div style={styles.actionBtns}>
              {STATUS_LIST.filter((s) => s !== r.status).map((s) => (
                <button
                  key={s}
                  style={styles.moveBtn}
                  onClick={() => handleStatusChange(r.id, s)}
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
