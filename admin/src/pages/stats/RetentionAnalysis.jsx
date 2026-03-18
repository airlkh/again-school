import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function RetentionAnalysis() {
  const [loading, setLoading] = useState(true);
  const [retentionRates, setRetentionRates] = useState({ day1: 0, day7: 0, day30: 0 });
  const [retentionCurve, setRetentionCurve] = useState([]);
  const [cohortTable, setCohortTable] = useState([]);
  const [churnMetrics, setChurnMetrics] = useState({ totalChurned: 0, churnRate: 0, avgLifespan: 0 });

  useEffect(() => {
    fetchRetention();
  }, []);

  const fetchRetention = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const now = new Date();
      const DAY_MS = 24 * 60 * 60 * 1000;

      // 리텐션 계산
      const usersWithDates = users.filter(
        (u) => u.createdAt?.toDate?.() && u.lastActive?.toDate?.()
      );

      // Day 1/7/30 리텐션
      const calcRetention = (days) => {
        const eligible = usersWithDates.filter((u) => {
          const created = u.createdAt.toDate();
          return (now - created) / DAY_MS >= days;
        });
        if (eligible.length === 0) return 0;
        const retained = eligible.filter((u) => {
          const created = u.createdAt.toDate();
          const lastActive = u.lastActive.toDate();
          return (lastActive - created) / DAY_MS >= days;
        });
        return ((retained.length / eligible.length) * 100).toFixed(1);
      };

      const day1 = calcRetention(1);
      const day7 = calcRetention(7);
      const day30 = calcRetention(30);
      setRetentionRates({ day1, day7, day30 });

      // 리텐션 곡선 (Day 0 ~ Day 60)
      const curve = [];
      for (let d = 0; d <= 60; d++) {
        const rate = calcRetention(d);
        curve.push({ day: `D${d}`, rate: parseFloat(rate) || 0 });
      }
      setRetentionCurve(curve);

      // 코호트 테이블 (최근 6개월)
      const cohorts = [];
      for (let m = 5; m >= 0; m--) {
        const cohortDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
        const label = `${cohortDate.getFullYear()}-${String(cohortDate.getMonth() + 1).padStart(2, '0')}`;

        const cohortUsers = usersWithDates.filter((u) => {
          const created = u.createdAt.toDate();
          return created >= cohortDate && created <= cohortEnd;
        });

        const total = cohortUsers.length;
        const weeks = {};
        for (let w = 0; w <= 8; w++) {
          const weekDays = w * 7;
          if ((now - cohortDate) / DAY_MS < weekDays) {
            weeks[`W${w}`] = '-';
            continue;
          }
          const retained = cohortUsers.filter((u) => {
            const lastActive = u.lastActive.toDate();
            const created = u.createdAt.toDate();
            return (lastActive - created) / DAY_MS >= weekDays;
          });
          weeks[`W${w}`] = total > 0 ? ((retained.length / total) * 100).toFixed(1) : '0';
        }

        cohorts.push({ label, total, ...weeks });
      }
      setCohortTable(cohorts);

      // 이탈 분석
      const thirtyDaysAgo = new Date(now - 30 * DAY_MS);
      const churned = users.filter((u) => {
        const lastActive = u.lastActive?.toDate?.();
        return lastActive && lastActive < thirtyDaysAgo;
      });
      const lifespans = usersWithDates.map((u) => {
        return (u.lastActive.toDate() - u.createdAt.toDate()) / DAY_MS;
      });
      const avgLifespan = lifespans.length > 0
        ? (lifespans.reduce((a, b) => a + b, 0) / lifespans.length).toFixed(1)
        : 0;

      setChurnMetrics({
        totalChurned: churned.length,
        churnRate: users.length > 0 ? ((churned.length / users.length) * 100).toFixed(1) : 0,
        avgLifespan,
      });
    } catch (err) {
      console.error('리텐션 분석 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={{ color: '#6B7280' }}>리텐션 데이터를 분석 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>리텐션 분석</h1>

      {/* 리텐션 지표 */}
      <div style={styles.metricsRow}>
        {[
          { label: 'Day 1 리텐션', value: `${retentionRates.day1}%`, color: '#10B981' },
          { label: 'Day 7 리텐션', value: `${retentionRates.day7}%`, color: '#4F46E5' },
          { label: 'Day 30 리텐션', value: `${retentionRates.day30}%`, color: '#8B5CF6' },
          { label: '이탈률 (30일)', value: `${churnMetrics.churnRate}%`, color: '#EF4444' },
          { label: '이탈 사용자', value: `${churnMetrics.totalChurned}명`, color: '#F59E0B' },
          { label: '평균 활동 기간', value: `${churnMetrics.avgLifespan}일`, color: '#06B6D4' },
        ].map((m, i) => (
          <div key={i} style={{ ...styles.metricCard, borderTop: `4px solid ${m.color}` }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 리텐션 곡선 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>사용자 리텐션 곡선</h2>
        {retentionCurve.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={retentionCurve}>
              <defs>
                <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B7280' }} interval={4} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Area
                type="monotone"
                dataKey="rate"
                name="리텐션율"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#retGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>리텐션 데이터가 없습니다.</p>
        )}
      </div>

      {/* 코호트 테이블 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>코호트 리텐션 테이블</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>코호트</th>
                <th style={styles.th}>가입자</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} style={styles.th}>W{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortTable.length === 0 ? (
                <tr>
                  <td colSpan={11} style={styles.emptyTd}>코호트 데이터가 없습니다.</td>
                </tr>
              ) : (
                cohortTable.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.label}</td>
                    <td style={styles.td}>{row.total}명</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const val = row[`W${i}`];
                      const num = parseFloat(val);
                      let bg = '#fff';
                      if (!isNaN(num)) {
                        if (num >= 70) bg = '#D1FAE5';
                        else if (num >= 40) bg = '#FEF3C7';
                        else if (num > 0) bg = '#FEE2E2';
                      }
                      return (
                        <td key={i} style={{ ...styles.td, background: bg, textAlign: 'center', fontWeight: 500 }}>
                          {val === '-' ? '-' : `${val}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  metricCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 },
  chartTitle: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 20 },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  emptyTd: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
};
