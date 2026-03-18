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
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnWarning: { backgroundColor: '#f5a623', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
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
  actions: { display: 'flex', gap: 6 },
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
  participantBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e8e8f0',
    borderRadius: 4,
    fontSize: 11,
    marginRight: 4,
    marginBottom: 2,
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
};

export default function ChatRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRooms = async (isNextPage = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'chatRooms'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'chatRooms'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (!isNextPage) {
        const countSnap = await getDocs(collection(db, 'chatRooms'));
        setTotalCount(countSnap.size);
      }

      setRooms(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('채팅방 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDelete = async (roomId) => {
    if (!window.confirm('정말 이 채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.')) return;
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId));
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setTotalCount((c) => c - 1);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (roomId, currentActive) => {
    try {
      await updateDoc(doc(db, 'chatRooms', roomId), { active: !currentActive });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, active: !currentActive } : r))
      );
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (statusFilter === 'active' && room.active === false) return false;
    if (statusFilter === 'inactive' && room.active !== false) return false;
    if (search) {
      const s = search.toLowerCase();
      const participants = (room.participants || room.memberNames || []).join(' ').toLowerCase();
      const lastMsg = (room.lastMessage || '').toLowerCase();
      const roomName = (room.name || room.title || '').toLowerCase();
      if (!participants.includes(s) && !lastMsg.includes(s) && !roomName.includes(s)) return false;
    }
    return true;
  });

  const activeCount = rooms.filter((r) => r.active !== false).length;

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
        <h1 style={styles.title}>채팅방 관리</h1>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>전체 채팅방</div>
          <div style={styles.statValue}>{totalCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>활성 채팅방</div>
          <div style={styles.statValue}>{activeCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>비활성 채팅방</div>
          <div style={styles.statValue}>{totalCount - activeCount}</div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="참여자, 메시지, 채팅방명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>채팅방</th>
            <th style={styles.th}>참여자</th>
            <th style={styles.th}>마지막 메시지</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>메시지 수</th>
            <th style={styles.th}>생성일</th>
            <th style={styles.th}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>로딩 중...</td>
            </tr>
          ) : filteredRooms.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>채팅방이 없습니다.</td>
            </tr>
          ) : (
            filteredRooms.map((room) => (
              <tr key={room.id}>
                <td style={{ ...styles.td, fontWeight: 600 }}>
                  {room.name || room.title || room.id.substring(0, 8) + '...'}
                </td>
                <td style={styles.td}>
                  {(room.participants || room.memberNames || room.members || [])
                    .slice(0, 4)
                    .map((p, i) => (
                      <span key={i} style={styles.participantBadge}>
                        {typeof p === 'string' ? p : p.name || p.email || 'User'}
                      </span>
                    ))}
                  {(room.participants || room.members || []).length > 4 && (
                    <span style={{ fontSize: 11, color: '#888' }}>
                      +{(room.participants || room.members || []).length - 4}
                    </span>
                  )}
                </td>
                <td style={styles.td}>{truncate(room.lastMessage || room.lastMessageText)}</td>
                <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                  {(room.messageCount || 0).toLocaleString()}
                </td>
                <td style={styles.td}>{formatDate(room.createdAt)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: room.active !== false ? '#e8f5e9' : '#ffebee',
                      color: room.active !== false ? '#2e7d32' : '#c62828',
                    }}
                  >
                    {room.active !== false ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnWarning, ...styles.btnSmall }}
                      onClick={() => handleToggleActive(room.id, room.active !== false)}
                    >
                      {room.active !== false ? '비활성화' : '활성화'}
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(room.id)}
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

      <div style={styles.pagination}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: page === 1 ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p - 1); fetchRooms(); }}
          disabled={page === 1}
        >
          이전
        </button>
        <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{page} 페이지</span>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: !hasMore ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p + 1); fetchRooms(true); }}
          disabled={!hasMore}
        >
          다음
        </button>
      </div>
    </div>
  );
}
