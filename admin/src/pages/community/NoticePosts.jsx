import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

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
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    minHeight: 120,
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 3,
    transition: 'left 0.2s',
  },
  formActions: { display: 'flex', gap: 8, marginTop: 16 },
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
  pinnedBadge: {
    padding: '2px 8px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
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
  searchInput: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    width: 260,
    outline: 'none',
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
};

const emptyForm = { title: '', content: '', pinned: false };

export default function NoticePosts() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('type', '==', 'notice'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotices(data);
    } catch (err) {
      console.error('공지 로드 실패:', err);
      // fallback: try notices collection
      try {
        const q2 = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
        const snapshot2 = await getDocs(q2);
        const data2 = snapshot2.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotices(data2);
      } catch (err2) {
        console.error('notices 컬렉션 로드 실패:', err2);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'posts', editingId), {
          title: form.title,
          content: form.content,
          pinned: form.pinned,
          updatedAt: Timestamp.now(),
        });
        setNotices((prev) =>
          prev.map((n) =>
            n.id === editingId
              ? { ...n, title: form.title, content: form.content, pinned: form.pinned }
              : n
          )
        );
      } else {
        const docRef = await addDoc(collection(db, 'posts'), {
          title: form.title,
          content: form.content,
          pinned: form.pinned,
          type: 'notice',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          likeCount: 0,
          commentCount: 0,
        });
        setNotices((prev) => [
          { id: docRef.id, title: form.title, content: form.content, pinned: form.pinned, type: 'notice', createdAt: Timestamp.now() },
          ...prev,
        ]);
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error('저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  const handleEdit = (notice) => {
    setForm({ title: notice.title || '', content: notice.content || '', pinned: !!notice.pinned });
    setEditingId(notice.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 이 공지를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredNotices = notices.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(s) || (n.content || '').toLowerCase().includes(s);
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 60) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>공지글 관리</h1>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => { setShowForm(true); setForm({ ...emptyForm }); setEditingId(null); }}
        >
          + 새 공지 작성
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formTitle}>
            {editingId ? '공지 수정' : '새 공지 작성'}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>제목</label>
            <input
              style={styles.input}
              placeholder="공지 제목을 입력하세요"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>내용</label>
            <textarea
              style={styles.textarea}
              placeholder="공지 내용을 입력하세요"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>상단 고정</label>
            <div style={styles.toggleRow}>
              <button
                style={{
                  ...styles.toggle,
                  backgroundColor: form.pinned ? '#e94560' : '#ccc',
                }}
                onClick={() => setForm({ ...form, pinned: !form.pinned })}
              >
                <div
                  style={{
                    ...styles.toggleDot,
                    left: form.pinned ? 23 : 3,
                  }}
                />
              </button>
              <span style={{ fontSize: 13, color: '#555' }}>
                {form.pinned ? '고정됨' : '고정 안 함'}
              </span>
            </div>
          </div>
          <div style={styles.formActions}>
            <button
              style={{ ...styles.btn, ...styles.btnSuccess }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '저장 중...' : editingId ? '수정 완료' : '공지 등록'}
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnOutline }}
              onClick={handleCancel}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          placeholder="공지 제목 또는 내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 13, color: '#888' }}>
          총 {filteredNotices.length}건
        </span>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>고정</th>
            <th style={styles.th}>제목</th>
            <th style={styles.th}>내용 미리보기</th>
            <th style={styles.th}>작성일</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td style={styles.emptyRow} colSpan={5}>로딩 중...</td>
            </tr>
          ) : filteredNotices.length === 0 ? (
            <tr>
              <td style={styles.emptyRow} colSpan={5}>공지글이 없습니다.</td>
            </tr>
          ) : (
            filteredNotices.map((notice) => (
              <tr key={notice.id}>
                <td style={styles.td}>
                  {notice.pinned && <span style={styles.pinnedBadge}>고정</span>}
                </td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{notice.title || '-'}</td>
                <td style={styles.td}>{truncate(notice.content)}</td>
                <td style={styles.td}>{formatDate(notice.createdAt)}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                      onClick={() => handleEdit(notice)}
                    >
                      수정
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(notice.id)}
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
    </div>
  );
}
