import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const styles = {
  container: { padding: 0 },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  addBtn: {
    padding: '10px 22px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff',
  },
  count: { fontSize: 14, color: '#888' },
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
    verticalAlign: 'middle',
  },
  thumbnail: {
    width: 80, height: 40, objectFit: 'cover', borderRadius: 6,
    backgroundColor: '#f0f0f5',
  },
  activeBadge: (active) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    backgroundColor: active ? '#e8f5e9' : '#f5f5f5',
    color: active ? '#2e7d32' : '#757575',
    cursor: 'pointer',
  }),
  orderBtns: { display: 'flex', gap: 2 },
  orderBtn: {
    padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 4,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
    lineHeight: 1,
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
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    width: 520, maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#222', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
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

const defaultForm = {
  title: '', imageUrl: '', linkUrl: '', position: '상단', order: 0, active: true,
};

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setBanners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('배너 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, order: banners.length });
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditId(banner.id);
    setForm({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      position: banner.position || '상단',
      order: banner.order ?? 0,
      active: banner.active !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
    try {
      const data = { ...form, order: Number(form.order) || 0 };
      if (editId) {
        await updateDoc(doc(db, 'banners', editId), { ...data, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'banners'), { ...data, createdAt: new Date(), updatedAt: new Date() });
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 배너를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      fetchBanners();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const toggleActive = async (banner) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), {
        active: !banner.active, updatedAt: new Date(),
      });
      fetchBanners();
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const reorder = async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= banners.length) return;
    try {
      const a = banners[index];
      const b = banners[swapIndex];
      await Promise.all([
        updateDoc(doc(db, 'banners', a.id), { order: b.order ?? swapIndex }),
        updateDoc(doc(db, 'banners', b.id), { order: a.order ?? index }),
      ]);
      fetchBanners();
    } catch (err) {
      alert('순서 변경 실패: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <span style={styles.count}>전체 {banners.length}개</span>
        <button style={styles.addBtn} onClick={openCreate}>+ 새 배너</button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 50 }}>순서</th>
            <th style={styles.th}>미리보기</th>
            <th style={styles.th}>제목</th>
            <th style={styles.th}>위치</th>
            <th style={styles.th}>상태</th>
            <th style={styles.th}>정렬</th>
            <th style={styles.th}>관리</th>
          </tr>
        </thead>
        <tbody>
          {banners.length === 0 ? (
            <tr><td colSpan={7} style={styles.empty}>배너가 없습니다.</td></tr>
          ) : (
            banners.map((b, idx) => (
              <tr key={b.id}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600, color: '#888' }}>
                  {idx + 1}
                </td>
                <td style={styles.td}>
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt={b.title} style={styles.thumbnail} />
                  ) : (
                    <div style={{ ...styles.thumbnail, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>
                      없음
                    </div>
                  )}
                </td>
                <td style={styles.td}>
                  <div style={{ fontWeight: 500 }}>{b.title}</div>
                  {b.linkUrl && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{b.linkUrl}</div>}
                </td>
                <td style={styles.td}>{b.position || '-'}</td>
                <td style={styles.td}>
                  <span
                    style={styles.activeBadge(b.active !== false)}
                    onClick={() => toggleActive(b)}
                  >
                    {b.active !== false ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.orderBtns}>
                    <button style={styles.orderBtn} onClick={() => reorder(idx, -1)} disabled={idx === 0}>
                      ▲
                    </button>
                    <button style={styles.orderBtn} onClick={() => reorder(idx, 1)} disabled={idx === banners.length - 1}>
                      ▼
                    </button>
                  </div>
                </td>
                <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                  <button style={styles.actionBtn} onClick={() => openEdit(b)}>수정</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(b.id)}>삭제</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{editId ? '배너 수정' : '새 배너'}</div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>제목</label>
              <input style={styles.input} placeholder="배너 제목" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>이미지 URL</label>
              <input style={styles.input} placeholder="https://..." value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>링크 URL</label>
              <input style={styles.input} placeholder="https://..." value={form.linkUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>위치</label>
                <select style={{ ...styles.input, backgroundColor: '#fff' }} value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}>
                  <option value="상단">상단</option>
                  <option value="중간">중간</option>
                  <option value="하단">하단</option>
                  <option value="팝업">팝업</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>순서</label>
                <input style={styles.input} type="number" value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} />
              </div>
            </div>
            <label style={styles.checkLabel}>
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
              활성화
            </label>
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
