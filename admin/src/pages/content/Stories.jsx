import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
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
  badgeImage: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeVideo: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeActive: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeHidden: {
    display: 'inline-block',
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
  errorBox: {
    padding: 16,
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
};

export default function Stories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStories(data);
      setTotalCount(data.length);
    } catch (err) {
      console.error('스토리 로드 실패:', err);
      setError('스토리 목록을 불러오는 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (storyId) => {
    if (!window.confirm('정말 이 스토리를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleHide = async (storyId, currentHidden) => {
    try {
      await updateDoc(doc(db, 'stories', storyId), { hidden: !currentHidden });
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, hidden: !currentHidden } : s))
      );
    } catch (err) {
      console.error('숨김 처리 실패:', err);
      alert('숨김 처리 중 오류가 발생했습니다.');
    }
  };

  const filteredStories = stories.filter((story) => {
    if (mediaFilter !== 'all') {
      const type = story.mediaType || 'image';
      if (mediaFilter !== type) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const author = (story.authorName || '').toLowerCase();
      const text = (story.text || '').toLowerCase();
      if (!author.includes(s) && !text.includes(s)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / PAGE_SIZE));
  const paginatedStories = filteredStories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 50) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  const handleSearch = () => {
    setPage(1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>스토리 관리</h1>
        <div style={styles.stats}>
          <span style={styles.statBadge}>전체 {totalCount}건</span>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* 필터 바 */}
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="작성자 또는 내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <select
          style={styles.select}
          value={mediaFilter}
          onChange={(e) => { setMediaFilter(e.target.value); setPage(1); }}
        >
          <option value="all">전체 미디어</option>
          <option value="image">이미지</option>
          <option value="video">동영상</option>
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
            <th style={{ ...styles.th, textAlign: 'center' }}>미디어</th>
            <th style={styles.th}>작성일</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={6}>
                로딩 중...
              </td>
            </tr>
          ) : paginatedStories.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={6}>
                스토리가 없습니다.
              </td>
            </tr>
          ) : (
            paginatedStories.map((story) => (
              <tr key={story.id}>
                <td style={styles.td}>{story.authorName || '-'}</td>
                <td style={styles.td}>{truncate(story.text, 50)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {(story.mediaType || 'image') === 'video' ? (
                    <span style={styles.badgeVideo}>동영상</span>
                  ) : (
                    <span style={styles.badgeImage}>이미지</span>
                  )}
                </td>
                <td style={styles.td}>{formatDate(story.createdAt)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {story.hidden ? (
                    <span style={styles.badgeHidden}>숨김</span>
                  ) : (
                    <span style={styles.badgeActive}>공개</span>
                  )}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnWarning, ...styles.btnSmall }}
                      onClick={() => handleToggleHide(story.id, story.hidden)}
                    >
                      {story.hidden ? '공개' : '숨김'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(story.id)}
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
      {!loading && filteredStories.length > 0 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: page === 1 ? 0.5 : 1 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </button>
          <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
            {page} / {totalPages} 페이지
          </span>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: page >= totalPages ? 0.5 : 1 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
