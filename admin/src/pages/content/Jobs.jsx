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

const TYPE_OPTIONS = [
  { value: 'all', label: '전체 유형' },
  { value: 'hiring', label: '구인' },
  { value: 'seeking', label: '구직' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '진행중' },
  { value: 'closed', label: '마감' },
];

const typeMap = {
  hiring: { label: '구인', bg: '#e3f2fd', color: '#1565c0' },
  seeking: { label: '구직', bg: '#fff3e0', color: '#e65100' },
};

const statusBadgeMap = {
  active: { label: '진행중', bg: '#e8f5e9', color: '#2e7d32' },
  closed: { label: '마감', bg: '#f5f5f5', color: '#757575' },
};

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

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setJobs(data);
      setTotalCount(data.length);
    } catch (err) {
      console.error('구인/구직 로드 실패:', err);
      setError('구인/구직 목록을 불러오는 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (jobId) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleClose = async (jobId) => {
    if (!window.confirm('이 게시글을 마감 처리하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'jobs', jobId), { status: 'closed' });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'closed' } : j))
      );
    } catch (err) {
      console.error('마감 처리 실패:', err);
      alert('마감 처리 중 오류가 발생했습니다.');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (typeFilter !== 'all' && job.type !== typeFilter) return false;
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const title = (job.title || '').toLowerCase();
      const company = (job.company || '').toLowerCase();
      if (!title.includes(s) && !company.includes(s)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeBadge = (type) => {
    const info = typeMap[type] || typeMap.hiring;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          backgroundColor: info.bg,
          color: info.color,
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {info.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const info = statusBadgeMap[status] || statusBadgeMap.active;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          backgroundColor: info.bg,
          color: info.color,
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {info.label}
      </span>
    );
  };

  const handleSearch = () => {
    setPage(1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>구인/구직 관리</h1>
        <div style={styles.stats}>
          <span style={styles.statBadge}>전체 {totalCount}건</span>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* 필터 바 */}
      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="제목 또는 회사명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <select
          style={styles.select}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
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
            <th style={styles.th}>제목</th>
            <th style={styles.th}>작성자</th>
            <th style={styles.th}>회사</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>유형</th>
            <th style={styles.th}>작성일</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
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
          ) : paginatedJobs.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>
                구인/구직 게시글이 없습니다.
              </td>
            </tr>
          ) : (
            paginatedJobs.map((job) => (
              <tr key={job.id}>
                <td style={styles.td}>{job.title || '-'}</td>
                <td style={styles.td}>{job.authorName || '-'}</td>
                <td style={styles.td}>{job.company || '-'}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {getTypeBadge(job.type)}
                </td>
                <td style={styles.td}>{formatDate(job.createdAt)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {getStatusBadge(job.status)}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    {job.status !== 'closed' && (
                      <button
                        style={{ ...styles.btn, ...styles.btnWarning, ...styles.btnSmall }}
                        onClick={() => handleClose(job.id)}
                      >
                        마감
                      </button>
                    )}
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(job.id)}
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
      {!loading && filteredJobs.length > 0 && (
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
