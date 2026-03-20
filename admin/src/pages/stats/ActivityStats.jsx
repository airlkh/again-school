import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function ActivityStats() {
  const [loading, setLoading] = useState(true);
  const [dailyPosts, setDailyPosts] = useState([]);
  const [activeUsersTrend, setActiveUsersTrend] = useState([]);
  const [metrics, setMetrics] = useState({ totalPosts: 0, totalComments: 0, avgPostsPerDay: 0, avgCommentsPerDay: 0 });

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);

      // 게시글 데이터
      const postSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
      const posts = postSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 일별 게시글/댓글 집계
      const parseDate = (raw) => raw?.toDate?.() || (typeof raw === 'number' ? new Date(raw) : null);

      const dayMap = {};
      posts.forEach((p) => {
        const d = parseDate(p.createdAt);
        if (!d) return;
        const key = d.toISOString().slice(0, 10);
        if (!dayMap[key]) dayMap[key] = { date: key, posts: 0, comments: 0 };
        dayMap[key].posts += 1;
        dayMap[key].comments += p.commentCount || p.comments?.length || 0;
      });
      const daily = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
      setDailyPosts(daily);

      // 활동 사용자 추이 (일별 고유 작성자)
      const activeMap = {};
      posts.forEach((p) => {
        const d = parseDate(p.createdAt);
        if (!d) return;
        const key = d.toISOString().slice(0, 10);
        if (!activeMap[key]) activeMap[key] = new Set();
        if (p.authorUid || p.authorId || p.userId) activeMap[key].add(p.authorUid || p.authorId || p.userId);
      });
      const activeTrend = Object.entries(activeMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, set]) => ({ date, activeUsers: set.size }));
      setActiveUsersTrend(activeTrend);

      // 지표 계산
      const totalPosts = posts.length;
      const totalComments = posts.reduce((s, p) => s + (p.commentCount || p.comments?.length || 0), 0);
      const days = Object.keys(dayMap).length || 1;
      setMetrics({
        totalPosts,
        totalComments,
        avgPostsPerDay: (totalPosts / days).toFixed(1),
        avgCommentsPerDay: (totalComments / days).toFixed(1),
      });
    } catch (err) {
      console.error('활동 통계 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <p style={{ color: '#6B7280' }}>활동 데이터를 분석 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>활동 통계</h1>

      {/* 지표 카드 */}
      <div style={styles.metricsRow}>
        {[
          { label: '총 게시글', value: metrics.totalPosts.toLocaleString(), color: '#4F46E5' },
          { label: '총 댓글', value: metrics.totalComments.toLocaleString(), color: '#10B981' },
          { label: '일평균 게시글', value: metrics.avgPostsPerDay, color: '#F59E0B' },
          { label: '일평균 댓글', value: metrics.avgCommentsPerDay, color: '#8B5CF6' },
        ].map((m, i) => (
          <div key={i} style={{ ...styles.metricCard, borderTop: `4px solid ${m.color}` }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 일별 게시글/댓글 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>일별 게시글 / 댓글</h2>
        {dailyPosts.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyPosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="posts" name="게시글" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="댓글" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>게시글 데이터가 없습니다.</p>
        )}
      </div>

      {/* 활성 사용자 추이 */}
      <div style={styles.chartCard}>
        <h2 style={styles.chartTitle}>일별 활성 사용자 추이</h2>
        {activeUsersTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activeUsersTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="activeUsers"
                name="활성 사용자"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.noData}>활성 사용자 데이터가 없습니다.</p>
        )}
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
  noData: { textAlign: 'center', color: '#9CA3AF', padding: 40 },
};
