import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const styles = {
  container: { padding: 0 },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', backgroundColor: '#fff', minWidth: 280,
  },
  addBtn: {
    padding: '10px 22px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  th: {
    padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600,
    color: '#6b6b80', backgroundColor: '#fafafa', borderBottom: '1px solid #eee',
  },
  td: {
    padding: '13px 16px', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0',
  },
  badge: (active) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    backgroundColor: active ? '#e8f5e9' : '#f5f5f5',
    color: active ? '#2e7d32' : '#757575',
  }),
  pinBadge: {
    display: 'inline-block', padding: '3px 8px', borderRadius: 4,
    fontSize: 11, fontWeight: 600, backgroundColor: '#fff3e0', color: '#e65100',
    marginLeft: 6,
  },
  actionBtn: {
    padding: '6px 12px', border: '1px solid #d0d0d0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
    marginRight: 4,
  },
  deleteBtn: {
    padding: '6px 12px', border: '1px solid #ffcdd2', borderRadius: 6,
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
    borderRadius: 8, fontSize: 14, outline: 'none', minHeight: 150,
    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  checkRow: { display: 'flex', gap: 20, alignItems: 'center' },
  checkLabel: { fontSize: 14, color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
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

const defaultForm = { title: '', content: '', pinned: false, published: true };

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  useEffect(() => { fetchNotices(); }, []);

  const fetchNotices = async () => {
    try {
      const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('공지사항 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (notice) => {
    setEditId(notice.id);
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      pinned: !!notice.pinned,
      published: notice.published !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
    try {
      if (editId) {
        await updateDoc(doc(db, 'notices', editId), {
          ...form, updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, 'notices'), {
          ...form, createdAt: new Date(), updatedAt: new Date(),
        });
      }
      setShowModal(false);
      fetchNotices();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 공지사항을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
      fetchNotices();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const togglePublish = async (notice) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), {
        published: !notice.published, updatedAt: new Date(),
      });
      fetchNotices();
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const filtered = notices.filter((n) => {
    if (!search) return true;
    return (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(search.toLowerCase());
  });

  const formatDate = (val) => {
    if (!val) return '-';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <input
          style={styles.searchInput}
          placeholder="공지사항 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={styles.addBtn} onClick={openCreate}>+ 새 공지사항</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>제목</th>
            <th style={styles.th}>상태</th>
            <th style={styles.th}>등록일</th>
            <th style={styles.th}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={4} style={styles.empty}>공지사항이 없습니다.</td></tr>
          ) : (
            filtered.map((n) => (
              <tr key={n.id}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={styles.td}>
                  {n.title || '-'}
                  {n.pinned && <span style={styles.pinBadge}>고정</span>}
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(n.published !== false)}>
                    {n.published !== false ? '게시중' : '비공개'}
                  </span>
                </td>
                <td style={styles.td}>{formatDate(n.createdAt)}</td>
                <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                  <button style={styles.actionBtn} onClick={() => openEdit(n)}>수정</button>
                  <button style={styles.actionBtn} onClick={() => togglePublish(n)}>
                    {n.published !== false ? '비공개' : '게시'}
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(n.id)}>삭제</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{editId ? '공지사항 수정' : '새 공지사항'}</div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>제목</label>
              <input
                style={styles.input}
                placeholder="공지사항 제목"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>내용</label>
              <textarea
                style={styles.textarea}
                placeholder="공지사항 내용을 입력하세요..."
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            <div style={styles.checkRow}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))}
                />
                상단 고정
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
                />
                게시
              </label>
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
