import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';

const PAGE_SIZE = 20;

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
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  stats: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    color: '#666',
  },
  statBadge: {
    padding: '4px 12px',
    backgroundColor: '#e8e8f0',
    borderRadius: 6,
    fontWeight: 600,
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    width: 260,
    outline: 'none',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    backgroundColor: '#fff',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnPrimary: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
  },
  btnDanger: {
    backgroundColor: '#e94560',
    color: '#fff',
  },
  btnWarning: {
    backgroundColor: '#f5a623',
    color: '#fff',
  },
  btnSmall: {
    padding: '5px 10px',
    fontSize: 12,
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
  actions: {
    display: 'flex',
    gap: 6,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  hiddenBadge: {
    padding: '2px 8px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  emptyRow: {
    padding: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
};

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPosts = async (isNextPage = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (dateFrom) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(new Date(dateFrom))));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        q = query(q, where('createdAt', '<=', Timestamp.fromDate(endDate)));
      }

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));

      if (!isNextPage) {
        // Get total count
        const countSnap = await getDocs(collection(db, 'posts'));
        setTotalCount(countSnap.size);
      }

      setPosts(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('게시글 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchPosts();
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleHide = async (postId, currentHidden) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { hidden: !currentHidden });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hidden: !currentHidden } : p))
      );
    } catch (err) {
      console.error('숨김 처리 실패:', err);
      alert('숨김 처리 중 오류가 발생했습니다.');
    }
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
    fetchPosts(true);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((p) => p - 1);
      fetchPosts();
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (statusFilter === 'hidden' && !post.hidden) return false;
    if (statusFilter === 'visible' && post.hidden) return false;
    if (search) {
      const s = search.toLowerCase();
      const content = (post.content || '').toLowerCase();
      const author = (post.authorName || post.authorEmail || '').toLowerCase();
      if (!content.includes(s) && !author.includes(s)) return false;
    }
    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 50) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>게시글 관리</h1>
        <div style={styles.stats}>
          <span style={styles.statBadge}>전체 {totalCount}건</span>
        </div>
      </div>

      {/* 필터 바 */}
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="작성자 또는 내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <input
          type="date"
          style={styles.dateInput}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="시작일"
        />
        <span style={{ color: '#999', fontSize: 13 }}>~</span>
        <input
          type="date"
          style={styles.dateInput}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="종료일"
        />
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="visible">공개</option>
          <option value="hidden">숨김</option>
        </select>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleSearch}
        >
          검색
        </button>
      </div>

      {/* 테이블 */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>작성자</th>
            <th style={styles.th}>내용</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>좋아요</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>댓글</th>
            <th style={styles.th}>작성일</th>
            <th style={styles.th}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>
                로딩 중...
              </td>
            </tr>
          ) : filteredPosts.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>
                게시글이 없습니다.
              </td>
            </tr>
          ) : (
            filteredPosts.map((post) => (
              <tr key={post.id}>
                <td style={styles.td}>
                  {post.authorName || post.authorEmail || post.authorId || '-'}
                </td>
                <td style={styles.td}>{truncate(post.content)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {post.likeCount || 0}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {post.commentCount || 0}
                </td>
                <td style={styles.td}>{formatDate(post.createdAt)}</td>
                <td style={styles.td}>
                  {post.hidden ? (
                    <span style={styles.hiddenBadge}>숨김</span>
                  ) : (
                    <span style={{ ...styles.hiddenBadge, backgroundColor: '#e8f5e9', color: '#2e7d32' }}>공개</span>
                  )}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnWarning, ...styles.btnSmall }}
                      onClick={() => handleToggleHide(post.id, post.hidden)}
                    >
                      {post.hidden ? '공개' : '숨김'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(post.id)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div style={styles.pagination}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: page === 1 ? 0.5 : 1 }}
          onClick={handlePrevPage}
          disabled={page === 1}
        >
          이전
        </button>
        <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{page} 페이지</span>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: !hasMore ? 0.5 : 1 }}
          onClick={handleNextPage}
          disabled={!hasMore}
        >
          다음
        </button>
      </div>
    </div>
  );
}
