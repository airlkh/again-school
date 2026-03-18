import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const STATUS_OPTIONS = ['진행중', '예정', '종료'];
const statusColors = {
  '진행중': { bg: '#e8f5e9', color: '#2e7d32' },
  '예정': { bg: '#e3f2fd', color: '#1565c0' },
  '종료': { bg: '#f5f5f5', color: '#757575' },
};

const styles = {
  container: { padding: 0 },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, flexWrap: 'wrap', gap: 12,
  },
  filterRow: { display: 'flex', gap: 8 },
  filterBtn: (active) => ({
    padding: '8px 16px', border: active ? 'none' : '1px solid #d0d0d0',
    borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    backgroundColor: active ? '#e94560' : '#fff',
    color: active ? '#fff' : '#555',
  }),
  addBtn: {
    padding: '10px 22px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320, 1fr))',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'transform 0.15s',
  },
  cardImage: {
    width: '100%', height: 160, objectFit: 'cover', backgroundColor: '#f0f0f5',
    display: 'block',
  },
  cardImagePlaceholder: {
    width: '100%', height: 160, backgroundColor: '#f0f0f5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#bbb', fontSize: 14,
  },
  cardBody: { padding: '16px 20px' },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 1.5 },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: '#999' },
  badge: (status) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    backgroundColor: (statusColors[status] || statusColors['예정']).bg,
    color: (statusColors[status] || statusColors['예정']).color,
  }),
  cardActions: {
    display: 'flex', gap: 6, padding: '0 20px 16px',
  },
  actionBtn: {
    padding: '6px 14px', border: '1px solid #d0d0d0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
  },
  deleteBtn: {
    padding: '6px 14px', border: '1px solid #ffcdd2', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#c62828',
  },
  // 모달
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    width: 560, maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#222', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', minHeight: 100,
    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: {
    padding: '10px 22px', border: '1px solid #d0d0d0', borderRadius: 8,
    fontSize: 14, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
  },
  saveBtn: {
    padding: '10px 22px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff',
  },
  empty: { textAlign: 'center', padding: 60, color: '#999', fontSize: 14 },
};

const defaultForm = {
  title: '', description: '', startDate: '', endDate: '', imageUrl: '', status: '예정',
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('이벤트 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (event) => {
    setEditId(event.id);
    setForm({
      title: event.title || '',
      description: event.description || '',
      startDate: event.startDate || '',
      endDate: event.endDate || '',
      imageUrl: event.imageUrl || '',
      status: event.status || '예정',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
    try {
      if (editId) {
        await updateDoc(doc(db, 'events', editId), { ...form, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'events'), { ...form, createdAt: new Date(), updatedAt: new Date() });
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 이벤트를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      fetchEvents();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const filtered = events.filter((e) => {
    if (statusFilter === '전체') return true;
    return e.status === statusFilter;
  });

  const formatDate = (val) => {
    if (!val) return '-';
    if (typeof val === 'string') return val;
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.filterRow}>
          {['전체', ...STATUS_OPTIONS].map((s) => (
            <button key={s} style={styles.filterBtn(statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <button style={styles.addBtn} onClick={openCreate}>+ 새 이벤트</button>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>이벤트가 없습니다.</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((ev) => (
            <div key={ev.id} style={styles.card}>
              {ev.imageUrl ? (
                <img src={ev.imageUrl} alt={ev.title} style={styles.cardImage} />
              ) : (
                <div style={styles.cardImagePlaceholder}>이미지 없음</div>
              )}
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{ev.title}</div>
                <div style={styles.cardDesc}>
                  {(ev.description || '').length > 80
                    ? ev.description.slice(0, 80) + '...'
                    : ev.description || '-'}
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.cardDate}>
                    {formatDate(ev.startDate)} ~ {formatDate(ev.endDate)}
                  </span>
                  <span style={styles.badge(ev.status)}>{ev.status || '예정'}</span>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button style={styles.actionBtn} onClick={() => openEdit(ev)}>수정</button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(ev.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{editId ? '이벤트 수정' : '새 이벤트'}</div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>제목</label>
              <input style={styles.input} placeholder="이벤트 제목" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>설명</label>
              <textarea style={styles.textarea} placeholder="이벤트 설명" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>시작일</label>
                <input style={styles.input} type="date" value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>종료일</label>
                <input style={styles.input} type="date" value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>이미지 URL</label>
              <input style={styles.input} placeholder="https://..." value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>상태</label>
              <select style={styles.select} value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
              <button style={styles.saveBtn} onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
