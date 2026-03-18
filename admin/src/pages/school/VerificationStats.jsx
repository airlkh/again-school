import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Clock, Users, CheckCircle, XCircle } from 'lucide-react';

const COLORS = ['#28a745', '#dc3545', '#ffc107'];

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1200,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 28,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: '22px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginBottom: 32,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
};

export default function VerificationStats() {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    avgProcessingDays: 0,
    monthlyData: [],
    pieData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        let total = 0;
        let approved = 0;
        let rejected = 0;
        let pending = 0;
        let totalProcessingMs = 0;
        let processedCount = 0;
        const monthMap = {};

        snapshot.docs.forEach((d) => {
          const data = d.data();

          // Only count teacher-related users
          if (!data.isTeacher && !data.teacherVerified && !data.rejectedAt) return;

          total += 1;

          if (data.teacherVerified === true) {
            approved += 1;

            // Monthly trend
            const verifiedDate = data.verifiedAt
              ? data.verifiedAt.toDate
                ? data.verifiedAt.toDate()
                : new Date(data.verifiedAt)
              : null;

            if (verifiedDate) {
              const key = `${verifiedDate.getFullYear()}-${String(
                verifiedDate.getMonth() + 1
              ).padStart(2, '0')}`;
              if (!monthMap[key]) monthMap[key] = { month: key, approved: 0, rejected: 0 };
              monthMap[key].approved += 1;

              // Processing time
              const createdDate = data.createdAt
                ? data.createdAt.toDate
                  ? data.createdAt.toDate()
                  : new Date(data.createdAt)
                : null;
              if (createdDate) {
                totalProcessingMs += verifiedDate - createdDate;
                processedCount += 1;
              }
            }
          } else if (data.rejectedAt) {
            rejected += 1;

            const rejectedDate = data.rejectedAt.toDate
              ? data.rejectedAt.toDate()
              : new Date(data.rejectedAt);
            const key = `${rejectedDate.getFullYear()}-${String(
              rejectedDate.getMonth() + 1
            ).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { month: key, approved: 0, rejected: 0 };
            monthMap[key].rejected += 1;
          } else if (data.isTeacher && data.teacherVerified === false) {
            pending += 1;
          }
        });

        const monthlyData = Object.values(monthMap).sort((a, b) =>
          a.month.localeCompare(b.month)
        );

        const avgProcessingDays =
          processedCount > 0
            ? Math.round(totalProcessingMs / processedCount / (1000 * 60 * 60 * 24) * 10) / 10
            : 0;

        const pieData = [
          { name: '승인', value: approved },
          { name: '거절', value: rejected },
          { name: '대기', value: pending },
        ].filter((d) => d.value > 0);

        setStats({
          total,
          approved,
          rejected,
          pending,
          avgProcessingDays,
          monthlyData,
          pieData,
        });
      } catch (err) {
        console.error('통계 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={styles.empty}>데이터를 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>인증 통계</h1>

      {/* Summary Cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#eef2ff' }}>
            <Users style={{ width: 24, height: 24, color: '#4f46e5' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>전체 신청</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e6f7ee' }}>
            <CheckCircle style={{ width: 24, height: 24, color: '#28a745' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.approved}</div>
            <div style={styles.statLabel}>승인</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fde8ea' }}>
            <XCircle style={{ width: 24, height: 24, color: '#dc3545' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.rejected}</div>
            <div style={styles.statLabel}>거절</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fff8e6' }}>
            <Clock style={{ width: 24, height: 24, color: '#ffc107' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.pending}</div>
            <div style={styles.statLabel}>대기 중</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#f0f0f5' }}>
            <Clock style={{ width: 24, height: 24, color: '#666' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.avgProcessingDays}일</div>
            <div style={styles.statLabel}>평균 처리 시간</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={styles.chartsRow}>
        {/* Pie Chart */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>
            <PieIcon style={{ width: 18, height: 18 }} />
            인증 상태 분포
          </div>
          {stats.pieData.length === 0 ? (
            <div style={styles.empty}>데이터가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}건`}
                >
                  {stats.pieData.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}건`, '']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>
            <BarChart3 style={{ width: 18, height: 18 }} />
            월별 인증 추이
          </div>
          {stats.monthlyData.length === 0 ? (
            <div style={styles.empty}>데이터가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                  formatter={(value, name) => [
                    `${value}건`,
                    name === 'approved' ? '승인' : '거절',
                  ]}
                />
                <Legend
                  formatter={(value) => (value === 'approved' ? '승인' : '거절')}
                />
                <Bar dataKey="approved" fill="#28a745" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#dc3545" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
