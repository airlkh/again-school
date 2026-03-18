import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const STATUS_MAP = {
  all: '전체',
  active: '활성',
  pending: '대기',
  suspended: '정지',
};

const STATUS_COLORS = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  suspended: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function SettlementTargets() {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // 사용자별 누적 집계
      const userMap = {};
      data.forEach((s) => {
        const uid = s.userId || s.targetId || 'unknown';
        if (!userMap[uid]) {
          userMap[uid] = {
            id: uid,
            name: s.userName || s.targetName || '알 수 없음',
            type: s.userType || s.targetType || '개인',
            accumulated: 0,
            status: s.targetStatus || s.status || 'pending',
            lastSettlement: s.createdAt,
          };
        }
        userMap[uid].accumulated += s.amount || 0;
      });
      setTargets(Object.values(userMap));
    } catch (err) {
      console.error('정산 대상 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = targets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchText && !t.name.includes(searchText) && !t.id.includes(searchText)) return false;
    return true;
  });

  const formatCurrency = (v) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>정산 대상 관리</h1>

      {/* 필터 */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>상태 필터</label>
          <div style={styles.tabGroup}>
            {Object.entries(STATUS_MAP).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                style={{
                  ...styles.tab,
                  ...(filterStatus === key ? styles.tabActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          placeholder="이름 또는 ID로 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* 요약 */}
      <div style={styles.summary}>
        <span>총 <strong>{filtered.length}</strong>명</span>
        <span style={{ marginLeft: 20 }}>
          누적 총액: <strong>{formatCurrency(filtered.reduce((s, t) => s + t.accumulated, 0))}</strong>
        </span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={styles.loadingWrap}>
          <p style={{ color: '#6B7280' }}>로딩 중...</p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>누적 금액</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>최근 정산일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyTd}>정산 대상이 없습니다.</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.id}</div>
                    </td>
                    <td style={styles.td}>{t.type}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{formatCurrency(t.accumulated)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: (STATUS_COLORS[t.status] || STATUS_COLORS.pending).bg,
                          color: (STATUS_COLORS[t.status] || STATUS_COLORS.pending).text,
                        }}
                      >
                        {STATUS_MAP[t.status] || t.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {t.lastSettlement?.toDate?.()
                        ? t.lastSettlement.toDate().toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  filterRow: { display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 20, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 13, fontWeight: 600, color: '#374151' },
  tabGroup: { display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 4 },
  tab: { padding: '8px 16px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#6B7280', fontWeight: 500 },
  tabActive: { background: '#fff', color: '#4F46E5', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontWeight: 600 },
  searchInput: { padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, width: 260, outline: 'none' },
  summary: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  loadingWrap: { textAlign: 'center', padding: 60 },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '14px 20px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  tr: { transition: 'background 0.15s' },
  emptyTd: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
