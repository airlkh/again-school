import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

const styles = {
  container: { padding: 0 },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 24 },
  summaryCard: (color) => ({
    flex: 1, padding: '20px 24px', backgroundColor: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`,
  }),
  summaryLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: 700, color: '#222' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' },
  filterLabel: { fontSize: 13, color: '#888' },
  filterBtn: (active) => ({
    padding: '7px 16px', border: active ? 'none' : '1px solid #d0d0d0',
    borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    backgroundColor: active ? '#e94560' : '#fff',
    color: active ? '#fff' : '#555',
  }),
  table: {
    width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  th: {
    padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
    color: '#6b6b80', backgroundColor: '#fafafa', borderBottom: '1px solid #eee',
  },
  td: {
    padding: '13px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0',
  },
  flagBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, backgroundColor: '#ffebee', color: '#c62828',
  },
  normalBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 600, backgroundColor: '#f5f5f5', color: '#757575',
  },
  countBadge: (count) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: '50%',
    fontSize: 14, fontWeight: 700,
    backgroundColor: count >= 5 ? '#c62828' : count >= 3 ? '#e65100' : '#1565c0',
    color: '#fff',
  }),
  typeTags: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  typeTag: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 11, backgroundColor: '#f0f0f5', color: '#555',
  },
  empty: { textAlign: 'center', padding: 60, color: '#999', fontSize: 14 },
};

export default function RepeatReports() {
  const [aggregated, setAggregated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'flagged'

  useEffect(() => {
    fetchAndAggregate();
  }, []);

  const fetchAndAggregate = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 대상자별 집계
      const map = {};
      reports.forEach((r) => {
        const uid = r.targetUid || 'unknown';
        if (!map[uid]) {
          map[uid] = {
            targetUid: uid,
            targetName: r.targetName || uid,
            count: 0,
            types: new Set(),
            lastReportDate: null,
            reports: [],
          };
        }
        map[uid].count += 1;
        if (r.type) map[uid].types.add(r.type);
        const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
        if (!map[uid].lastReportDate || date > map[uid].lastReportDate) {
          map[uid].lastReportDate = date;
        }
        map[uid].reports.push(r);
      });

      const list = Object.values(map)
        .map((item) => ({ ...item, types: Array.from(item.types) }))
        .sort((a, b) => b.count - a.count);

      setAggregated(list);
    } catch (err) {
      console.error('반복 신고 분석 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const flaggedCount = aggregated.filter((a) => a.count >= 3).length;
  const totalReports = aggregated.reduce((sum, a) => sum + a.count, 0);

  const filtered = filter === 'flagged'
    ? aggregated.filter((a) => a.count >= 3)
    : aggregated;

  const formatDate = (d) => {
    if (!d) return '-';
    return d.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      {/* 요약 */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard('#1565c0')}>
          <div style={styles.summaryLabel}>총 신고 건수</div>
          <div style={styles.summaryValue}>{totalReports}</div>
        </div>
        <div style={styles.summaryCard('#e65100')}>
          <div style={styles.summaryLabel}>신고 대상자 수</div>
          <div style={styles.summaryValue}>{aggregated.length}</div>
        </div>
        <div style={styles.summaryCard('#c62828')}>
          <div style={styles.summaryLabel}>위험 사용자 (3건 이상)</div>
          <div style={styles.summaryValue}>{flaggedCount}</div>
        </div>
      </div>

      {/* 필터 */}
      <div style={styles.filterRow}>
        <span style={styles.filterLabel}>필터:</span>
        <button style={styles.filterBtn(filter === 'all')} onClick={() => setFilter('all')}>
          전체 ({aggregated.length})
        </button>
        <button style={styles.filterBtn(filter === 'flagged')} onClick={() => setFilter('flagged')}>
          위험 사용자만 ({flaggedCount})
        </button>
      </div>

      {/* 테이블 */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>사용자</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>신고 횟수</th>
            <th style={styles.th}>신고 유형</th>
            <th style={styles.th}>최근 신고일</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={5} style={styles.empty}>데이터가 없습니다.</td></tr>
          ) : (
            filtered.map((item) => (
              <tr
                key={item.targetUid}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={styles.td}>
                  <div style={{ fontWeight: 500 }}>{item.targetName}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{item.targetUid}</div>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={styles.countBadge(item.count)}>{item.count}</span>
                </td>
                <td style={styles.td}>
                  <div style={styles.typeTags}>
                    {item.types.map((t) => (
                      <span key={t} style={styles.typeTag}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={styles.td}>{formatDate(item.lastReportDate)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {item.count >= 3 ? (
                    <span style={styles.flagBadge}>위험</span>
                  ) : (
                    <span style={styles.normalBadge}>정상</span>
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
