import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, UserPlus, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  flex: 1,
  minWidth: 200,
};

const sectionStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid #e5e7eb',
  color: '#6b7280',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
};

const statusBadge = (status) => {
  const colors = {
    pending: { bg: '#fef3c7', color: '#92400e', label: '대기중' },
    resolved: { bg: '#d1fae5', color: '#065f46', label: '처리완료' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '반려' },
  };
  const s = colors[status] || colors.pending;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
};

export default function DashboardHome() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [todaySignups, setTodaySignups] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [signupTrend, setSignupTrend] = useState([]);
  const [communityActivity, setCommunityActivity] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);

  // KPI: 전체 회원수 & 오늘 가입 & 인증 대기
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setTotalUsers(snap.size);

      const todayStart = startOfDay(new Date());
      let todayCount = 0;
      let verifyCount = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        const created = data.createdAt?.toDate?.() || null;
        if (created && created >= todayStart) {
          todayCount++;
        }
        if (data.teacherVerification === 'pending') {
          verifyCount++;
        }
      });

      setTodaySignups(todayCount);
      setPendingVerifications(verifyCount);

      // 최근 7일 가입자 추이 계산
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i));
        const dayEnd = startOfDay(subDays(new Date(), i - 1));
        let count = 0;
        snap.forEach((doc) => {
          const created = doc.data().createdAt?.toDate?.() || null;
          if (created && created >= dayStart && created < dayEnd) {
            count++;
          }
        });
        days.push({
          date: format(dayStart, 'M/d (EEE)', { locale: ko }),
          가입자: count,
        });
      }
      setSignupTrend(days);
    });

    return () => unsub();
  }, []);

  // KPI: 신고 대기 + 최근 신고
  useEffect(() => {
    const reportsRef = collection(db, 'reports');
    const unsub = onSnapshot(reportsRef, (snap) => {
      let pending = 0;
      const reports = [];

      snap.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === 'pending') pending++;
        reports.push(data);
      });

      setPendingReports(pending);

      // 최근 5건 정렬
      reports.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(0);
        const tb = b.createdAt?.toDate?.() || new Date(0);
        return tb - ta;
      });
      setRecentReports(reports.slice(0, 5));
    });

    return () => unsub();
  }, []);

  // 커뮤니티 활동 (posts, comments)
  useEffect(() => {
    async function fetchActivity() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i));
        const dayEnd = startOfDay(subDays(new Date(), i - 1));

        let postCount = 0;
        let commentCount = 0;

        try {
          const postsSnap = await getDocs(
            query(
              collection(db, 'posts'),
              where('createdAt', '>=', Timestamp.fromDate(dayStart)),
              where('createdAt', '<', Timestamp.fromDate(dayEnd))
            )
          );
          postCount = postsSnap.size;
        } catch {
          // posts 컬렉션 없을 수 있음
        }

        try {
          const postsForComment = await getDocs(
            query(
              collection(db, 'posts'),
              where('createdAt', '>=', Timestamp.fromDate(dayStart)),
              where('createdAt', '<', Timestamp.fromDate(dayEnd))
            )
          );
          postsForComment.forEach((d) => {
            commentCount += (d.data().commentCount || 0);
          });
        } catch {}

        days.push({
          date: format(dayStart, 'M/d', { locale: ko }),
          게시글: postCount,
          댓글: commentCount,
        });
      }
      setCommunityActivity(days);
    }

    fetchActivity();
  }, []);

  useEffect(() => {
    async function fetchRecentPosts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(5))
        );
        setRecentPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}
    }
    fetchRecentPosts();
  }, []);

  const kpiCards = [
    {
      label: '전체 회원수',
      value: totalUsers,
      icon: <Users size={22} />,
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      label: '오늘 가입',
      value: todaySignups,
      icon: <UserPlus size={22} />,
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      label: '신고 대기',
      value: pendingReports,
      icon: <AlertTriangle size={22} />,
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      label: '인증 대기',
      value: pendingVerifications,
      icon: <ShieldCheck size={22} />,
      color: '#8b5cf6',
      bg: '#f5f3ff',
    },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#111827' }}>
        대시보드
      </h1>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {kpiCards.map((card) => (
          <div key={card.label} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: card.bg,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </div>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#111827' }}>
            최근 7일 가입자 추이
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={signupTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="가입자"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#111827' }}>
            커뮤니티 활동
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={communityActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="게시글" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="댓글" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reports */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
          최근 신고 내역
        </h2>
        {recentReports.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14, padding: 20, textAlign: 'center' }}>
            신고 내역이 없습니다.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>신고 대상</th>
                <th style={thStyle}>사유</th>
                <th style={thStyle}>신고자</th>
                <th style={thStyle}>일시</th>
                <th style={thStyle}>상태</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td style={tdStyle}>{report.targetId || report.targetName || '-'}</td>
                  <td style={tdStyle}>{report.reason || '-'}</td>
                  <td style={tdStyle}>{report.reporterId || report.reporterName || '-'}</td>
                  <td style={tdStyle}>
                    {report.createdAt?.toDate
                      ? format(report.createdAt.toDate(), 'yyyy.MM.dd HH:mm', { locale: ko })
                      : '-'}
                  </td>
                  <td style={tdStyle}>{statusBadge(report.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Posts */}
      <div style={{ ...sectionStyle, marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
          최근 게시물
        </h2>
        {recentPosts.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14, padding: 20, textAlign: 'center' }}>게시물이 없습니다.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>미디어</th>
                <th style={thStyle}>작성자</th>
                <th style={thStyle}>학교</th>
                <th style={thStyle}>내용</th>
                <th style={thStyle}>좋아요</th>
                <th style={thStyle}>댓글</th>
                <th style={thStyle}>작성일</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((post) => (
                <tr key={post.id}>
                  <td style={tdStyle}>
                    {post.thumbnailUrl || post.imageUrl ? (
                      <img src={post.thumbnailUrl || post.imageUrl} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>{post.authorName || '-'}</td>
                  <td style={tdStyle}>{post.schoolName || '-'}</td>
                  <td style={tdStyle}>{(post.caption || '').substring(0, 40) || '-'}</td>
                  <td style={tdStyle}>{post.likes || 0}</td>
                  <td style={tdStyle}>{post.commentCount || 0}</td>
                  <td style={tdStyle}>
                    {post.createdAt?.toDate
                      ? format(post.createdAt.toDate(), 'yyyy.MM.dd HH:mm', { locale: ko })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
