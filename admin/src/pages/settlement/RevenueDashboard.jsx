import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);
  const [kpi, setKpi] = useState({ total: 0, thisMonth: 0, pending: 0, anomaly: 0 });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [breakdown, setBreakdown] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSettlements(data);

      // KPI 계산
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const total = data.reduce((sum, s) => sum + (s.amount || 0), 0);
      const thisMonth = data
        .filter((s) => s.createdAt?.toDate?.() >= startOfMonth)
        .reduce((sum, s) => sum + (s.amount || 0), 0);
      const pending = data
        .filter((s) => s.status === 'pending')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
      const anomaly = data.filter((s) => s.flagged === true).length;
      setKpi({ total, thisMonth, pending, anomaly });

      // 월별 추이
      const monthMap = {};
      data.forEach((s) => {
        const d = s.createdAt?.toDate?.();
        if (!d) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + (s.amount || 0);
      });
      const trend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount }));
      setMonthlyTrend(trend);

      // 수익원별 분류
      const sourceMap = {};
      data.forEach((s) => {
        const src = s.source || s.type || '기타';
        sourceMap[src] = (sourceMap[src] || 0) + (s.amount || 0);
      });
      const bd = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
      setBreakdown(bd);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: '#6B7280', marginTop: 12 }}>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>수익 대시보드</h1>

      {/* KPI Cards */}
      <div style={styles.kpiRow}>
        {[
          { label: '총 수익', value: formatCurrency(kpi.total), color: '#4F46E5', icon: '💰' },
          { label: '이번 달 수익', value: formatCurrency(kpi.thisMonth), color: '#10B981', icon: '📈' },
          { label: '정산 대기', value: formatCurrency(kpi.pending), color: '#F59E0B', icon: '⏳' },
          { label: '이상 탐지', value: `${kpi.anomaly}건`, color: '#EF4444', icon: '🚨' },
        ].map((card, i) => (
          <div key={i} style={{ ...styles.kpiCard, borderTop: `4px solid ${card.color}` }}>
            <div style={styles.kpiIcon}>{card.icon}</div>
            <div style={styles.kpiLabel}>{card.label}</div>
            <div style={{ ...styles.kpiValue, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 월별 수익 추이 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>월별 수익 추이</h2>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                name="수익"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ r: 5, fill: '#4F46E5' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>수익 데이터가 없습니다.</p>
        )}
      </div>

      {/* 수익원별 분류 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>수익원별 분류</h2>
        {breakdown.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <ResponsiveContainer width="50%" height={300}>
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {breakdown.map((item, i) => (
                <div key={i} style={styles.legendItem}>
                  <span
                    style={{ ...styles.legendDot, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span style={styles.legendLabel}>{item.name}</span>
                  <span style={styles.legendValue}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={styles.noData}>분류 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner: { width: 40, height: 40, border: '4px solid #E5E7EB', borderTop: '4px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 },
  kpiCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  kpiIcon: { fontSize: 28, marginBottom: 8 },
  kpiLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: 700 },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 },
  chartTitle: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 20 },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  legendDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 14, color: '#374151' },
  legendValue: { fontSize: 14, fontWeight: 600, color: '#111827' },
};
