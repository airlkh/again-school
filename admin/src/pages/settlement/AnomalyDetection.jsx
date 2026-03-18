import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const SEVERITY_CONFIG = {
  high: { label: '높음', bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  medium: { label: '보통', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  low: { label: '낮음', bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
};

const RULE_LABELS = {
  unusual_amount: '비정상 금액',
  frequency_spike: '빈도 급증',
  duplicate_request: '중복 요청',
  unknown: '기타',
};

export default function AnomalyDetection() {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    fetchAndDetect();
  }, []);

  const fetchAndDetect = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 이상 탐지 규칙 적용
      const flagged = [];

      // 1) 이미 flagged 된 항목
      data.filter((s) => s.flagged).forEach((s) => {
        flagged.push({
          ...s,
          rule: s.anomalyRule || 'unknown',
          severity: s.severity || 'medium',
          reason: s.anomalyReason || '수동 플래그',
        });
      });

      // 2) 비정상 금액 탐지 (평균의 3배 이상)
      const amounts = data.map((s) => s.amount || 0).filter((a) => a > 0);
      const avg = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      const threshold = avg * 3;
      data
        .filter((s) => !s.flagged && (s.amount || 0) > threshold && threshold > 0)
        .forEach((s) => {
          flagged.push({
            ...s,
            rule: 'unusual_amount',
            severity: s.amount > avg * 5 ? 'high' : 'medium',
            reason: `금액 ${formatCurrency(s.amount)}은 평균(${formatCurrency(avg)})의 ${(s.amount / avg).toFixed(1)}배`,
          });
        });

      // 3) 빈도 급증 탐지 (같은 사용자가 하루에 3건 이상)
      const userDateMap = {};
      data.forEach((s) => {
        const uid = s.userId || s.targetId || 'unknown';
        const d = s.createdAt?.toDate?.();
        if (!d) return;
        const dateKey = d.toISOString().slice(0, 10);
        const key = `${uid}_${dateKey}`;
        if (!userDateMap[key]) userDateMap[key] = [];
        userDateMap[key].push(s);
      });
      Object.values(userDateMap)
        .filter((arr) => arr.length >= 3)
        .flat()
        .filter((s) => !s.flagged && !flagged.find((f) => f.id === s.id))
        .forEach((s) => {
          flagged.push({
            ...s,
            rule: 'frequency_spike',
            severity: 'medium',
            reason: '동일 사용자의 같은 날 다수 요청',
          });
        });

      // 4) 중복 요청 (같은 사용자, 같은 금액, 같은 날)
      const dupeMap = {};
      data.forEach((s) => {
        const uid = s.userId || s.targetId || 'unknown';
        const d = s.createdAt?.toDate?.();
        if (!d) return;
        const dateKey = d.toISOString().slice(0, 10);
        const key = `${uid}_${s.amount}_${dateKey}`;
        if (!dupeMap[key]) dupeMap[key] = [];
        dupeMap[key].push(s);
      });
      Object.values(dupeMap)
        .filter((arr) => arr.length >= 2)
        .flat()
        .filter((s) => !s.flagged && !flagged.find((f) => f.id === s.id))
        .forEach((s) => {
          flagged.push({
            ...s,
            rule: 'duplicate_request',
            severity: 'high',
            reason: '동일 사용자, 동일 금액의 중복 요청',
          });
        });

      // 중복 제거
      const uniqueMap = {};
      flagged.forEach((f) => {
        if (!uniqueMap[f.id]) uniqueMap[f.id] = f;
      });
      setAnomalies(Object.values(uniqueMap));
    } catch (err) {
      console.error('이상 탐지 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v);

  const filtered = anomalies.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const counts = {
    high: anomalies.filter((a) => a.severity === 'high').length,
    medium: anomalies.filter((a) => a.severity === 'medium').length,
    low: anomalies.filter((a) => a.severity === 'low').length,
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>이상 정산 탐지</h1>

      {/* 요약 카드 */}
      <div style={styles.summaryRow}>
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ ...styles.summaryCard, borderLeft: `4px solid ${cfg.dot}` }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>심각도: {cfg.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: cfg.dot }}>{counts[key]}건</div>
          </div>
        ))}
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #6B7280' }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>전체 탐지</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{anomalies.length}건</div>
        </div>
      </div>

      {/* 필터 */}
      <div style={styles.filterRow}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>심각도 필터:</span>
        {['all', 'high', 'medium', 'low'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSeverity(s)}
            style={{
              ...styles.filterBtn,
              ...(filterSeverity === s ? styles.filterBtnActive : {}),
            }}
          >
            {s === 'all' ? '전체' : SEVERITY_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>분석 중...</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>심각도</th>
                <th style={styles.th}>대상</th>
                <th style={styles.th}>탐지 규칙</th>
                <th style={styles.th}>금액</th>
                <th style={styles.th}>사유</th>
                <th style={styles.th}>일시</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyTd}>탐지된 이상 거래가 없습니다.</td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
                  return (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: sev.dot, display: 'inline-block' }} />
                          <span style={{ ...styles.badge, backgroundColor: sev.bg, color: sev.text }}>
                            {sev.label}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{a.userName || a.targetName || '알 수 없음'}</div>
                      </td>
                      <td style={styles.td}>{RULE_LABELS[a.rule] || a.rule}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#EF4444' }}>
                        {formatCurrency(a.amount || 0)}
                      </td>
                      <td style={{ ...styles.td, fontSize: 13, maxWidth: 300 }}>{a.reason}</td>
                      <td style={styles.td}>
                        {a.createdAt?.toDate?.()?.toLocaleString('ko-KR') || '-'}
                      </td>
                    </tr>
                  );
                })
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
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  summaryCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  filterBtn: { padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' },
  filterBtnActive: { background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '14px 20px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  tr: { transition: 'background 0.15s' },
  emptyTd: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
