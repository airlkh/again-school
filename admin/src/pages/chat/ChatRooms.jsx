import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, doc, deleteDoc, updateDoc,
} from 'firebase/firestore';

const PAGE_SIZE = 20;

const s = {
  container: { padding: '24px 32px', backgroundColor: '#f5f5f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '14px 20px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  filterBar: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { padding: '8px 14px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, width: 260, outline: 'none' },
  select: { padding: '8px 12px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff' },
  btn: { padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnWarning: { backgroundColor: '#f5a623', color: '#fff' },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee', backgroundColor: '#fafafa', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' },
  td: { padding: '11px 14px', fontSize: 13, color: '#333', verticalAlign: 'middle' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 },
  emptyRow: { padding: 40, textAlign: 'center', color: '#999', fontSize: 14 },
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
      let q = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      if (isNextPage && lastDoc) {
        q = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
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

  useEffect(() => { fetchRooms(); }, []);

  const handleDelete = async (roomId) => {
    if (!window.confirm('채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.')) return;
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId));
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setTotalCount((c) => c - 1);
    } catch { alert('삭제 실패'); }
  };

  const handleToggleActive = async (roomId, current) => {
    try {
      await updateDoc(doc(db, 'chatRooms', roomId), { active: !current });
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, active: !current } : r));
    } catch { alert('상태 변경 실패'); }
  };

  const getRoomName = (room) => {
    if (room.participantNames && typeof room.participantNames === 'object') {
      const names = Object.values(room.participantNames).filter(Boolean);
      if (names.length >= 2) return `${names[0]} ↔ ${names[1]}`;
      if (names.length === 1) return names[0];
    }
    if (room.name || room.title) return room.name || room.title;
    return room.id.substring(0, 10) + '...';
  };

  const getParticipants = (room) => {
    if (room.participantNames && typeof room.participantNames === 'object') {
      return Object.values(room.participantNames).filter(Boolean);
    }
    if (Array.isArray(room.participants)) return room.participants.slice(0, 2);
    return [];
  };

  const filteredRooms = rooms.filter((room) => {
    if (statusFilter === 'active' && room.active === false) return false;
    if (statusFilter === 'inactive' && room.active !== false) return false;
    if (search) {
      const s2 = search.toLowerCase();
      const name = getRoomName(room).toLowerCase();
      const parts = getParticipants(room).join(' ').toLowerCase();
      const lastMsg = (room.lastMessage || '').toLowerCase();
      if (!name.includes(s2) && !parts.includes(s2) && !lastMsg.includes(s2)) return false;
    }
    return true;
  });

  const activeCount = rooms.filter((r) => r.active !== false).length;

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 35) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>채팅방 관리</h1>
      </div>

      <div style={s.statsRow}>
        {[
          { label: '전체 채팅방', value: totalCount },
          { label: '활성', value: activeCount },
          { label: '비활성', value: totalCount - activeCount },
        ].map((c) => (
          <div key={c.label} style={s.statCard}>
            <div style={s.statLabel}>{c.label}</div>
            <div style={s.statValue}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={s.filterBar}>
        <input style={s.searchInput} placeholder="이름, 메시지 검색..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>채팅방 (참여자 ↔ 참여자)</th>
            <th style={s.th}>마지막 메시지</th>
            <th style={{ ...s.th, textAlign: 'center' }}>메시지</th>
            <th style={s.th}>최근 활동</th>
            <th style={s.th}>상태</th>
            <th style={{ ...s.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td style={s.emptyRow} colSpan={6}>로딩 중...</td></tr>
          ) : filteredRooms.length === 0 ? (
            <tr><td style={s.emptyRow} colSpan={6}>채팅방이 없습니다.</td></tr>
          ) : (
            filteredRooms.map((room) => {
              const participants = getParticipants(room);
              const isActive = room.active !== false;
              return (
                <tr key={room.id} style={s.tr}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9fb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>
                      {getRoomName(room)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {participants.map((name, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '1px 7px', borderRadius: 10,
                          backgroundColor: i === 0 ? '#e8f0fe' : '#fce8f3',
                          color: i === 0 ? '#1a73e8' : '#c2185b',
                          fontWeight: 500,
                        }}>{name}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...s.td, color: '#666', maxWidth: 200 }}>
                    {truncate(room.lastMessage || room.lastMessageText)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>
                    {(room.messageCount || 0).toLocaleString()}
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: '#888' }}>
                    {formatDate(room.lastMessageAt || room.updatedAt || room.createdAt)}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      backgroundColor: isActive ? '#e8f5e9' : '#ffebee',
                      color: isActive ? '#2e7d32' : '#c62828',
                    }}>{isActive ? '활성' : '비활성'}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={{ ...s.btn, ...s.btnWarning }}
                        onClick={() => handleToggleActive(room.id, isActive)}>
                        {isActive ? '비활성' : '활성'}
                      </button>
                      <button style={{ ...s.btn, ...s.btnDanger }}
                        onClick={() => handleDelete(room.id)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={s.pagination}>
        <button style={{ ...s.btn, ...s.btnPrimary, opacity: page === 1 ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p - 1); fetchRooms(); }} disabled={page === 1}>이전</button>
        <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{page} 페이지</span>
        <button style={{ ...s.btn, ...s.btnPrimary, opacity: !hasMore ? 0.5 : 1 }}
          onClick={() => { setPage((p) => p + 1); fetchRooms(true); }} disabled={!hasMore}>다음</button>
      </div>
    </div>
  );
}
