import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';

const styles = {
  container: {
    padding: '24px 32px',
    backgroundColor: '#f5f5f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '16px 20px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    backgroundColor: '#fff',
  },
  searchInput: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    width: 240,
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    borderBottom: '2px solid #eee',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  pinnedBadge: {
    padding: '2px 8px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  rankBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    fontSize: 13,
    fontWeight: 700,
  },
  emptyRow: {
    padding: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  engagementBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e8e8f0',
    overflow: 'hidden',
    minWidth: 60,
  },
  engagementFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#e94560',
  },
};

export default function PopularPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [limitCount, setLimitCount] = useState(50);

  const fetchPopularPosts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('likeCount', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
    } catch (err) {
      console.error('인기글 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPopularPosts();
  }, [limitCount]);

  const handlePin = async (postId, currentPinned) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { pinned: !currentPinned });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, pinned: !currentPinned } : p))
      );
    } catch (err) {
      console.error('고정 처리 실패:', err);
      alert('고정 처리 중 오류가 발생했습니다.');
    }
  };

  const maxLikes = Math.max(...posts.map((p) => p.likeCount || 0), 1);

  const filteredPosts = posts.filter((post) => {
    if (search) {
      const s = search.toLowerCase();
      const content = (post.content || '').toLowerCase();
      const author = (post.authorName || '').toLowerCase();
      if (!content.includes(s) && !author.includes(s)) return false;
    }
    if (period !== 'all' && post.createdAt) {
      const d = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
      const now = new Date();
      if (period === 'today') {
        if (d.toDateString() !== now.toDateString()) return false;
      } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (d < weekAgo) return false;
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (d < monthAgo) return false;
      }
    }
    return true;
  });

  const totalLikes = filteredPosts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const totalComments = filteredPosts.reduce((sum, p) => sum + (p.commentCount || 0), 0);
  const pinnedCount = filteredPosts.filter((p) => p.pinned).length;

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR');
  };

  const truncate = (str, len = 40) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  const getRankColor = (index) => {
    if (index === 0) return { backgroundColor: '#ffd700', color: '#333' };
    if (index === 1) return { backgroundColor: '#c0c0c0', color: '#333' };
    if (index === 2) return { backgroundColor: '#cd7f32', color: '#fff' };
    return { backgroundColor: '#e8e8f0', color: '#666' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>인기글 관리</h1>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>인기글 수</div>
          <div style={styles.statValue}>{filteredPosts.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 좋아요</div>
          <div style={styles.statValue}>{totalLikes.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 댓글</div>
          <div style={styles.statValue}>{totalComments.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>고정된 글</div>
          <div style={styles.statValue}>{pinnedCount}</div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="작성자 또는 내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={styles.select} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">전체 기간</option>
          <option value="today">오늘</option>
          <option value="week">최근 7일</option>
          <option value="month">최근 30일</option>
        </select>
        <select
          style={styles.select}
          value={limitCount}
          onChange={(e) => setLimitCount(Number(e.target.value))}
        >
          <option value={20}>상위 20개</option>
          <option value={50}>상위 50개</option>
          <option value={100}>상위 100개</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, textAlign: 'center', width: 50 }}>순위</th>
            <th style={styles.th}>작성자</th>
            <th style={styles.th}>내용</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>좋아요</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>댓글</th>
            <th style={styles.th}>참여도</th>
            <th style={styles.th}>작성일</th>
            <th style={styles.th}>고정</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={9}>로딩 중...</td>
            </tr>
          ) : filteredPosts.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={9}>인기 게시글이 없습니다.</td>
            </tr>
          ) : (
            filteredPosts.map((post, index) => (
              <tr key={post.id}>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{ ...styles.rankBadge, ...getRankColor(index) }}>
                    {index + 1}
                  </span>
                </td>
                <td style={styles.td}>{post.authorName || post.authorEmail || '-'}</td>
                <td style={styles.td}>{truncate(post.content)}</td>
                <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: '#e94560' }}>
                  {(post.likeCount || 0).toLocaleString()}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {(post.commentCount || 0).toLocaleString()}
                </td>
                <td style={styles.td}>
                  <div style={styles.engagementBar}>
                    <div
                      style={{
                        ...styles.engagementFill,
                        width: `${((post.likeCount || 0) / maxLikes) * 100}%`,
                      }}
                    />
                  </div>
                </td>
                <td style={styles.td}>{formatDate(post.createdAt)}</td>
                <td style={styles.td}>
                  {post.pinned && <span style={styles.pinnedBadge}>고정</span>}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <button
                    style={{
                      ...styles.btn,
                      ...styles.btnSmall,
                      backgroundColor: post.pinned ? '#e94560' : '#1a1a2e',
                      color: '#fff',
                    }}
                    onClick={() => handlePin(post.id, post.pinned)}
                  >
                    {post.pinned ? '고정 해제' : '고정'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
