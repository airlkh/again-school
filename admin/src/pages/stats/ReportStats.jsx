import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function ReportStats() {
  const [loading, setLoading] = useState(true);
  const [typeDist, setTypeDist] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    resolved: 0,
    resolutionRate: 0,
    avgProcessTime: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')));
      const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 신고 유형 분포
      const typeMap = {};
      reports.forEach((r) => {
        const type = r.type || r.reason || r.category || '기타';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });
      setTypeDist(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

      // 월별 신고 건수
      const monthMap = {};
      reports.forEach((r) => {
        const d = r.createdAt?.toDate?.();
        if (!d) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { month: key, total: 0, resolved: 0 };
        monthMap[key].total += 1;
        if (r.status === 'resolved' || r.status === 'completed' || r.status === 'processed') {
          monthMap[key].resolved += 1;
        }
      });
      const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
      setMonthlyReports(monthly);

      // 지표 계산
      const total = reports.length;
      const resolved = reports.filter(
        (r) => r.status === 'resolved' || r.status === 'completed' || r.status === 'processed'
      ).length;

      // 평균 처리 시간 (시간)
      let processTimeSum = 0;
      let processTimeCount = 0;
      reports.forEach((r) => {
        const created = r.createdAt?.toDate?.();
        const processed = r.processedAt?.toDate?.() || r.resolvedAt?.toDate?.();
        if (created && processed) {
          const diff = (processed - created) / (1000 * 60 * 60); // hours
          processTimeSum += diff;
          processTimeCount += 1;
        }
      });

      setMetrics({
        total,
        resolved,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
        avgProcessTime: processTimeCount > 0 ? (processTimeSum / processTimeCount).toFixed(1) : '-',
      });
    } catch (err) {
      console.error('신고 통계 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={{ color: '#6B7280' }}>신고 데이터를 분석 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>신고/제재 통계</h1>

      {/* 지표 카드 */}
      <div style={styles.metricsRow}>
        {[
          { label: '총 신고 건수', value: `${metrics.total}건`, color: '#EF4444' },
          { label: '처리 완료', value: `${metrics.resolved}건`, color: '#10B981' },
          { label: '처리율', value: `${metrics.resolutionRate}%`, color: '#4F46E5' },
          { label: '평균 처리 시간', value: metrics.avgProcessTime !== '-' ? `${metrics.avgProcessTime}시간` : '-', color: '#F59E0B' },
        ].map((m, i) => (
          <div key={i} style={{ ...styles.metricCard, borderTop: `4px solid ${m.color}` }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.row}>
        {/* 신고 유형 분포 */}
        <div style={{ ...styles.chartCard, flex: 1 }}>
          <h2 style={styles.chartTitle}>신고 유형 분포</h2>
          {typeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={typeDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {typeDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.noData}>신고 데이터가 없습니다.</p>
          )}
        </div>

        {/* 월별 신고 추이 */}
        <div style={{ ...styles.chartCard, flex: 1 }}>
          <h2 style={styles.chartTitle}>월별 신고 추이</h2>
          {monthlyReports.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyReports}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="전체 신고" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="처리 완료" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.noData}>월별 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  metricCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 },
  chartTitle: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 20 },
  row: { display: 'flex', gap: 24 },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
};
