import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, doc, deleteDoc, updateDoc, where, Timestamp, getCountFromServer,
} from 'firebase/firestore';

const PAGE_SIZE = 20;

const styles = {
  container: { padding: '24px 32px', backgroundColor: '#f5f5f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  stats: { display: 'flex', gap: 12, fontSize: 13, color: '#666' },
  statBadge: { padding: '4px 12px', backgroundColor: '#e8e8f0', borderRadius: 6, fontWeight: 600 },
  filterBar: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { padding: '8px 14px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, width: 260, outline: 'none' },
  dateInput: { padding: '8px 12px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, outline: 'none' },
  select: { padding: '8px 12px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff' },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnWarning: { backgroundColor: '#f5a623', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee', backgroundColor: '#fafafa', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  actions: { display: 'flex', gap: 6 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 },
  badge: (type) => {
    const map = {
      hidden: { bg: '#ffebee', color: '#c62828', label: '숨김' },
      visible: { bg: '#e8f5e9', color: '#2e7d32', label: '공개' },
      video: { bg: '#e3f2fd', color: '#1565c0', label: '동영상' },
      image: { bg: '#f3e5f5', color: '#6a1b9a', label: '이미지' },
    };
    const s = map[type] || map.visible;
    return <span style={{ padding: '2px 8px', backgroundColor: s.bg, color: s.color, borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.label}</span>;
  },
  thumbnail: { width: 56, height: 56, objectFit: 'cover', borderRadius: 6, backgroundColor: '#eee' },
  emptyRow: { padding: 40, textAlign: 'center', color: '#999', fontSize: 14 },
};

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPosts = async (isNextPage = false) => {
    setLoading(true);
    try {
      const constraints = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];
      if (dateFrom) constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(dateFrom))));
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(end)));
      }
      if (isNextPage && lastDoc) constraints.push(startAfter(lastDoc));

      const q = query(collection(db, 'posts'), ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));

      if (!isNextPage) {
        const countSnap = await getCountFromServer(collection(db, 'posts'));
        setTotalCount(countSnap.data().count);
      }

      setPosts(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('게시글 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleHide = async (postId, currentHidden) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { hidden: !currentHidden });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, hidden: !currentHidden } : p)));
    } catch (err) {
      alert('숨김 처리 중 오류가 발생했습니다.');
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (statusFilter === 'hidden' && !post.hidden) return false;
    if (statusFilter === 'visible' && post.hidden) return false;
    if (mediaFilter === 'video' && post.mediaType !== 'video') return false;
    if (mediaFilter === 'image' && post.mediaType !== 'image') return false;
    if (search) {
      const s = search.toLowerCase();
      const caption = (post.caption || '').toLowerCase();
      const author = (post.authorName || '').toLowerCase();
      const school = (post.schoolName || '').toLowerCase();
      if (!caption.includes(s) && !author.includes(s) && !school.includes(s)) return false;
    }
    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 40) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>게시글 관리</h1>
        <div style={styles.stats}>
          <span style={styles.statBadge}>전체 {totalCount.toLocaleString()}건</span>
          <span style={styles.statBadge}>현재 {filteredPosts.length}건</span>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="작성자 / 내용 / 학교 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
        />
        <input type="date" style={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: '#999', fontSize: 13 }}>~</span>
        <input type="date" style={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">전체 상태</option>
          <option value="visible">공개</option>
          <option value="hidden">숨김</option>
        </select>
        <select style={styles.select} value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value)}>
          <option value="all">전체 미디어</option>
          <option value="image">이미지</option>
          <option value="video">동영상</option>
        </select>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => { setPage(1); fetchPosts(); }}>검색</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>미디어</th>
            <th style={styles.th}>작성자</th>
            <th style={styles.th}>학교</th>
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
            <tr><td style={styles.emptyRow} colSpan={9}>로딩 중...</td></tr>
          ) : filteredPosts.length === 0 ? (
            <tr><td style={styles.emptyRow} colSpan={9}>게시글이 없습니다.</td></tr>
          ) : (
            filteredPosts.map((post) => (
              <tr key={post.id}>
                <td style={styles.td}>
                  {post.imageUrl || post.videoUrl ? (
                    <img
                      src={post.thumbnailUrl || post.imageUrl}
                      style={styles.thumbnail}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : <div style={styles.thumbnail} />}
                </td>
                <td style={styles.td}>{post.authorName || '-'}</td>
                <td style={styles.td}>{post.schoolName || '-'}</td>
                <td style={styles.td}>{truncate(post.caption)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{post.likes || 0}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{post.commentCount || 0}</td>
                <td style={styles.td}>{formatDate(post.createdAt)}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {styles.badge(post.hidden ? 'hidden' : 'visible')}
                    {styles.badge(post.mediaType || 'image')}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button style={{ ...styles.btn, ...styles.btnWarning, ...styles.btnSmall }} onClick={() => handleToggleHide(post.id, post.hidden)}>
                      {post.hidden ? '공개' : '숨김'}
                    </button>
                    <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }} onClick={() => handleDelete(post.id)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <button style={{ ...styles.btn, ...styles.btnPrimary, opacity: page === 1 ? 0.5 : 1 }} onClick={() => { setPage((p) => p - 1); fetchPosts(); }} disabled={page === 1}>이전</button>
        <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{page} 페이지</span>
        <button style={{ ...styles.btn, ...styles.btnPrimary, opacity: !hasMore ? 0.5 : 1 }} onClick={() => { setPage((p) => p + 1); fetchPosts(true); }} disabled={!hasMore}>다음</button>
      </div>
    </div>
  );
}
