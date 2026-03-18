import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore';

const styles = {
  container: {
    padding: '24px 32px',
    backgroundColor: '#f5f5f8',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4 },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  searchTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  searchRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    minWidth: 200,
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
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
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
  },
  resultsInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: { fontSize: 13, color: '#888', fontWeight: 600 },
  timeline: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  timelineItem: {
    display: 'flex',
    padding: '14px 20px',
    borderBottom: '1px solid #f0f0f0',
    gap: 16,
    alignItems: 'flex-start',
    transition: 'background-color 0.15s',
  },
  timelineTime: {
    fontSize: 11,
    color: '#999',
    whiteSpace: 'nowrap',
    minWidth: 130,
    paddingTop: 2,
    fontFamily: 'monospace',
  },
  timelineSender: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
    minWidth: 100,
    paddingTop: 1,
  },
  timelineContent: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 1.5,
  },
  timelineRoom: {
    fontSize: 11,
    color: '#aaa',
    whiteSpace: 'nowrap',
    paddingTop: 2,
  },
  emptyState: {
    padding: 60,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  initialState: {
    padding: 60,
    textAlign: 'center',
    color: '#bbb',
    fontSize: 14,
  },
  systemMsg: {
    backgroundColor: '#f8f8fc',
    fontStyle: 'italic',
    color: '#888',
  },
  loadMore: {
    padding: 16,
    textAlign: 'center',
    borderTop: '1px solid #f0f0f0',
  },
};

export default function ChatLogs() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchRoom, setSearchRoom] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [msgLimit, setMsgLimit] = useState(100);

  const handleSearch = async () => {
    if (!searchUser && !searchRoom) {
      alert('사용자 또는 채팅방 ID를 입력해주세요.');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      let results = [];

      if (searchRoom) {
        // Search within specific room
        let q = query(
          collection(db, 'chatRooms', searchRoom, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(msgLimit)
        );
        const snapshot = await getDocs(q);
        results = snapshot.docs.map((d) => ({
          id: d.id,
          roomId: searchRoom,
          ...d.data(),
        }));
      } else {
        // Search across all messages by user
        let q = query(
          collectionGroup(db, 'messages'),
          where('senderId', '==', searchUser),
          orderBy('createdAt', 'desc'),
          limit(msgLimit)
        );
        try {
          const snapshot = await getDocs(q);
          results = snapshot.docs.map((d) => {
            const pathSegments = d.ref.path.split('/');
            const roomId = pathSegments.length >= 2 ? pathSegments[1] : '';
            return { id: d.id, roomId, ...d.data() };
          });
        } catch {
          // Try with senderEmail
          let q2 = query(
            collectionGroup(db, 'messages'),
            where('senderEmail', '==', searchUser),
            orderBy('createdAt', 'desc'),
            limit(msgLimit)
          );
          const snapshot2 = await getDocs(q2);
          results = snapshot2.docs.map((d) => {
            const pathSegments = d.ref.path.split('/');
            const roomId = pathSegments.length >= 2 ? pathSegments[1] : '';
            return { id: d.id, roomId, ...d.data() };
          });
        }
      }

      // Apply date filters client-side
      if (dateFrom || dateTo) {
        results = results.filter((msg) => {
          const d = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        });
      }

      // Sort by date ascending for timeline view
      results.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return da - db_;
      });

      setMessages(results);
    } catch (err) {
      console.error('채팅 로그 검색 실패:', err);
      alert('검색 중 오류가 발생했습니다. 인덱스 설정을 확인해주세요.');
    }
    setLoading(false);
  };

  const handleReset = () => {
    setSearchUser('');
    setSearchRoom('');
    setDateFrom('');
    setDateTo('');
    setMessages([]);
    setSearched(false);
  };

  const formatDateTime = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return (
      d.toLocaleDateString('ko-KR') +
      ' ' +
      d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>채팅 로그 확인</h1>
        <p style={styles.subtitle}>사용자 ID 또는 채팅방 ID로 메시지 기록을 조회합니다.</p>
      </div>

      <div style={styles.searchCard}>
        <div style={styles.searchTitle}>검색 조건</div>
        <div style={styles.searchRow}>
          <div style={styles.formGroup}>
            <span style={styles.label}>사용자 ID / 이메일</span>
            <input
              style={styles.input}
              placeholder="사용자 ID 또는 이메일"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <span style={styles.label}>채팅방 ID</span>
            <input
              style={styles.input}
              placeholder="채팅방 ID"
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <span style={styles.label}>시작일</span>
            <input
              type="date"
              style={styles.dateInput}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <span style={styles.label}>종료일</span>
            <input
              type="date"
              style={styles.dateInput}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, marginTop: 18 }}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? '검색 중...' : '검색'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnOutline, marginTop: 18 }}
            onClick={handleReset}
          >
            초기화
          </button>
        </div>
      </div>

      {searched && (
        <div style={styles.resultsInfo}>
          <span style={styles.resultCount}>
            검색 결과: {messages.length}건
          </span>
        </div>
      )}

      {!searched ? (
        <div style={{ ...styles.timeline, ...styles.initialState }}>
          검색 조건을 입력한 후 검색 버튼을 클릭하세요.
        </div>
      ) : loading ? (
        <div style={{ ...styles.timeline, ...styles.emptyState }}>
          로딩 중...
        </div>
      ) : messages.length === 0 ? (
        <div style={{ ...styles.timeline, ...styles.emptyState }}>
          검색 결과가 없습니다.
        </div>
      ) : (
        <div style={styles.timeline}>
          {messages.map((msg, index) => {
            const isSystem = msg.type === 'system';
            return (
              <div
                key={msg.id || index}
                style={{
                  ...styles.timelineItem,
                  ...(isSystem ? styles.systemMsg : {}),
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                }}
              >
                <span style={styles.timelineTime}>
                  {formatDateTime(msg.createdAt)}
                </span>
                <span style={styles.timelineSender}>
                  {msg.senderName || msg.senderEmail || msg.senderId || '시스템'}
                </span>
                <span style={styles.timelineContent}>
                  {msg.content || msg.text || msg.message || '-'}
                </span>
                <span style={styles.timelineRoom}>
                  {msg.roomId ? msg.roomId.substring(0, 8) + '...' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
