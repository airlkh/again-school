import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

const SANCTION_TYPES = {
  warning: { label: '경고', bg: '#fff3e0', color: '#e65100' },
  chatBan: { label: '채팅금지', bg: '#ffebee', color: '#c62828' },
  permanentBan: { label: '영구차단', bg: '#fce4ec', color: '#880e4f' },
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
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
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
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  formRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  textarea: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    minHeight: 60,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  formActions: { display: 'flex', gap: 8, marginTop: 8 },
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
  emptyRow: {
    padding: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  sanctionBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
  },
  activeBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
};

const emptyForm = {
  userId: '',
  userName: '',
  type: 'warning',
  reason: '',
  duration: '',
};

export default function ChatSanctions() {
  const [sanctions, setSanctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const fetchSanctions = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'chatSanctions'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSanctions(data);
    } catch (err) {
      console.error('제재 목록 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSanctions();
  }, []);

  const handleSubmit = async () => {
    if (!form.userId.trim()) {
      alert('사용자 ID를 입력해주세요.');
      return;
    }
    if (!form.reason.trim()) {
      alert('제재 사유를 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const sanctionData = {
        userId: form.userId,
        userName: form.userName,
        type: form.type,
        reason: form.reason,
        duration: form.duration || null,
        active: true,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'chatSanctions'), sanctionData);
      setSanctions((prev) => [{ id: docRef.id, ...sanctionData }, ...prev]);
      setForm({ ...emptyForm });
      setShowForm(false);
    } catch (err) {
      console.error('제재 등록 실패:', err);
      alert('제재 등록 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  const handleRemoveSanction = async (sanctionId) => {
    if (!window.confirm('이 제재를 해제하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'chatSanctions', sanctionId), {
        active: false,
        removedAt: Timestamp.now(),
      });
      setSanctions((prev) =>
        prev.map((s) => (s.id === sanctionId ? { ...s, active: false } : s))
      );
    } catch (err) {
      console.error('제재 해제 실패:', err);
      alert('제재 해제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSanction = async (sanctionId) => {
    if (!window.confirm('이 제재 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'chatSanctions', sanctionId));
      setSanctions((prev) => prev.filter((s) => s.id !== sanctionId));
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  const filteredSanctions = sanctions.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (statusFilter === 'active' && !s.active) return false;
    if (statusFilter === 'inactive' && s.active) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (s.userName || '').toLowerCase();
      const uid = (s.userId || '').toLowerCase();
      const reason = (s.reason || '').toLowerCase();
      if (!name.includes(q) && !uid.includes(q) && !reason.includes(q)) return false;
    }
    return true;
  });

  const activeCount = sanctions.filter((s) => s.active).length;
  const warningCount = sanctions.filter((s) => s.type === 'warning' && s.active).length;
  const banCount = sanctions.filter((s) => (s.type === 'chatBan' || s.type === 'permanentBan') && s.active).length;

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSanctionInfo = (type) => SANCTION_TYPES[type] || SANCTION_TYPES.warning;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>채팅 제재 조치</h1>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => { setShowForm(true); setForm({ ...emptyForm }); }}
        >
          + 새 제재 등록
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>전체 제재</div>
          <div style={styles.statValue}>{sanctions.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>활성 제재</div>
          <div style={{ ...styles.statValue, color: '#c62828' }}>{activeCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>경고</div>
          <div style={{ ...styles.statValue, color: '#e65100' }}>{warningCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>차단</div>
          <div style={{ ...styles.statValue, color: '#880e4f' }}>{banCount}</div>
        </div>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formTitle}>새 제재 등록</div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <span style={styles.label}>사용자 ID</span>
              <input
                style={styles.input}
                placeholder="사용자 ID"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <span style={styles.label}>사용자 이름</span>
              <input
                style={styles.input}
                placeholder="사용자 이름 (선택)"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <span style={styles.label}>제재 유형</span>
              <select
                style={styles.select}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="warning">경고</option>
                <option value="chatBan">채팅금지</option>
                <option value="permanentBan">영구차단</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <span style={styles.label}>기간 (일, 영구차단 시 비워두기)</span>
              <input
                style={styles.input}
                placeholder="예: 7"
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>
          </div>
          <div style={styles.formGroup}>
            <span style={styles.label}>제재 사유</span>
            <textarea
              style={styles.textarea}
              placeholder="제재 사유를 상세히 기재해주세요"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div style={styles.formActions}>
            <button
              style={{ ...styles.btn, ...styles.btnDanger }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '등록 중...' : '제재 등록'}
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnOutline }}
              onClick={() => setShowForm(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="사용자 ID, 이름, 사유 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">전체 유형</option>
          <option value="warning">경고</option>
          <option value="chatBan">채팅금지</option>
          <option value="permanentBan">영구차단</option>
        </select>
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">해제됨</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>사용자</th>
            <th style={styles.th}>제재 유형</th>
            <th style={styles.th}>사유</th>
            <th style={styles.th}>기간</th>
            <th style={styles.th}>등록일</th>
            <th style={styles.th}>상태</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>로딩 중...</td>
            </tr>
          ) : filteredSanctions.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={7}>제재 기록이 없습니다.</td>
            </tr>
          ) : (
            filteredSanctions.map((sanction) => {
              const typeInfo = getSanctionInfo(sanction.type);
              return (
                <tr key={sanction.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{sanction.userName || '-'}</div>
                    <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
                      {sanction.userId}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.sanctionBadge,
                        backgroundColor: typeInfo.bg,
                        color: typeInfo.color,
                      }}
                    >
                      {typeInfo.label}
                    </span>
                  </td>
                  <td style={styles.td}>{sanction.reason || '-'}</td>
                  <td style={styles.td}>
                    {sanction.type === 'permanentBan'
                      ? '영구'
                      : sanction.duration
                        ? sanction.duration + '일'
                        : '-'}
                  </td>
                  <td style={styles.td}>{formatDate(sanction.createdAt)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.activeBadge,
                        backgroundColor: sanction.active ? '#ffebee' : '#e8f5e9',
                        color: sanction.active ? '#c62828' : '#2e7d32',
                      }}
                    >
                      {sanction.active ? '활성' : '해제됨'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {sanction.active && (
                        <button
                          style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }}
                          onClick={() => handleRemoveSanction(sanction.id)}
                        >
                          해제
                        </button>
                      )}
                      <button
                        style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSmall }}
                        onClick={() => handleDeleteSanction(sanction.id)}
                      >
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
    </div>
  );
}
