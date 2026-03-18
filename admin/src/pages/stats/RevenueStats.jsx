import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function RevenueStats() {
  const [loading, setLoading] = useState(true);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [categoryRevenue, setCategoryRevenue] = useState([]);
  const [comparison, setComparison] = useState({ current: 0, previous: 0, change: 0 });

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 월별 매출 추이
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
      setRevenueTrend(trend);

      // 카테고리별 매출
      const catMap = {};
      data.forEach((s) => {
        const cat = s.category || s.type || s.source || '기타';
        catMap[cat] = (catMap[cat] || 0) + (s.amount || 0);
      });
      const cats = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, amount]) => ({ name, amount }));
      setCategoryRevenue(cats);

      // 전월 대비
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthMap[currentMonth] || 0;
      const previous = monthMap[prevMonth] || 0;
      const change = previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : 0;
      setComparison({ current, previous, change });
    } catch (err) {
      console.error('매출 통계 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={{ color: '#6B7280' }}>매출 데이터를 분석 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>매출 통계</h1>

      {/* 전월 대비 */}
      <div style={styles.compRow}>
        <div style={{ ...styles.compCard, borderTop: '4px solid #4F46E5' }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>이번 달 매출</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#4F46E5' }}>
            {formatCurrency(comparison.current)}
          </div>
        </div>
        <div style={{ ...styles.compCard, borderTop: '4px solid #6B7280' }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>지난 달 매출</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#374151' }}>
            {formatCurrency(comparison.previous)}
          </div>
        </div>
        <div
          style={{
            ...styles.compCard,
            borderTop: `4px solid ${Number(comparison.change) >= 0 ? '#10B981' : '#EF4444'}`,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280' }}>전월 대비</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: Number(comparison.change) >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {Number(comparison.change) >= 0 ? '+' : ''}
            {comparison.change}%
          </div>
        </div>
      </div>

      {/* 매출 추이 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>월별 매출 추이</h2>
        {revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                name="매출"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ r: 5, fill: '#4F46E5' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>매출 데이터가 없습니다.</p>
        )}
      </div>

      {/* 카테고리별 매출 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>카테고리별 매출</h2>
        {categoryRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={categoryRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="amount" name="매출" radius={[6, 6, 0, 0]}>
                {categoryRevenue.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>카테고리 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  compRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  compCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 },
  chartTitle: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 20 },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
};
