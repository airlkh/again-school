import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function MemberStats() {
  const [loading, setLoading] = useState(true);
  const [signupTrend, setSignupTrend] = useState([]);
  const [schoolDist, setSchoolDist] = useState([]);
  const [regionDist, setRegionDist] = useState([]);
  const [period, setPeriod] = useState('daily'); // daily | weekly | monthly
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTotalUsers(users.length);

      // 가입 추이
      const trendMap = {};
      users.forEach((u) => {
        const d = u.createdAt?.toDate?.() || (typeof u.createdAt === 'number' ? new Date(u.createdAt) : null);
        if (!d) return;
        let key;
        if (period === 'daily') {
          key = d.toISOString().slice(0, 10);
        } else if (period === 'weekly') {
          const weekStart = new Date(d);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().slice(0, 10);
        } else {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        trendMap[key] = (trendMap[key] || 0) + 1;
      });
      const trend = Object.entries(trendMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
      setSignupTrend(trend);

      // 학교 유형 분포
      const schoolMap = {};
      users.forEach((u) => {
        const type = u.schools?.[0]?.schoolType || u.schoolType || '미지정';
        schoolMap[type] = (schoolMap[type] || 0) + 1;
      });
      setSchoolDist(Object.entries(schoolMap).map(([name, value]) => ({ name, value })));

      // 지역 분포
      const regionMap = {};
      users.forEach((u) => {
        const region = (typeof u.region === 'object' ? u.region?.sido : u.region) || u.sido || '미지정';
        regionMap[region] = (regionMap[region] || 0) + 1;
      });
      const sorted = Object.entries(regionMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, value]) => ({ name, value }));
      setRegionDist(sorted);
    } catch (err) {
      console.error('회원 통계 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={{ color: '#6B7280' }}>통계 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>회원 통계</h1>

      {/* 총 회원수 */}
      <div style={styles.kpiCard}>
        <div style={{ fontSize: 14, color: '#6B7280' }}>총 회원수</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#4F46E5' }}>
          {totalUsers.toLocaleString()}명
        </div>
      </div>

      {/* 가입 추이 */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h2 style={styles.chartTitle}>가입 추이</h2>
          <div style={styles.tabGroup}>
            {[
              { key: 'daily', label: '일별' },
              { key: 'weekly', label: '주별' },
              { key: 'monthly', label: '월별' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                style={{ ...styles.tab, ...(period === t.key ? styles.tabActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {signupTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signupTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="가입자 수"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>데이터가 없습니다.</p>
        )}
      </div>

      <div style={styles.row}>
        {/* 학교 유형 분포 */}
        <div style={{ ...styles.chartCard, flex: 1 }}>
          <h2 style={styles.chartTitle}>학교 유형 분포</h2>
          {schoolDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={schoolDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {schoolDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.noData}>데이터가 없습니다.</p>
          )}
        </div>

        {/* 지역 분포 */}
        <div style={{ ...styles.chartCard, flex: 1 }}>
          <h2 style={styles.chartTitle}>지역 분포</h2>
          {regionDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="회원수" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.noData}>데이터가 없습니다.</p>
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
  kpiCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24, borderTop: '4px solid #4F46E5' },
  chartCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 20 },
  tabGroup: { display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 4 },
  tab: { padding: '6px 14px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B7280' },
  tabActive: { background: '#fff', color: '#4F46E5', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontWeight: 600 },
  row: { display: 'flex', gap: 24 },
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
};
