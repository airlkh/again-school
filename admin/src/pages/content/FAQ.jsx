import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const CATEGORIES = ['전체', '일반', '계정', '결제', '서비스', '기타'];

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
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  faqCard: {
    backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.15s',
  },
  faqHeader: {
    display: 'flex', alignItems: 'center', padding: '16px 20px',
    cursor: 'pointer', gap: 12,
  },
  faqCategory: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
    fontSize: 11, fontWeight: 600, backgroundColor: '#f0f0f5', color: '#555',
    flexShrink: 0,
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: 600, color: '#333' },
  faqArrow: { fontSize: 12, color: '#999', flexShrink: 0 },
  faqAnswer: {
    padding: '0 20px 16px 20px', fontSize: 14, color: '#666', lineHeight: 1.6,
    borderTop: '1px solid #f0f0f0', paddingTop: 12,
  },
  faqActions: {
    display: 'flex', gap: 6, padding: '0 20px 12px', justifyContent: 'flex-end',
  },
  orderBtns: { display: 'flex', gap: 2, marginRight: 'auto' },
  orderBtn: {
    padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 4,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
  },
  actionBtn: {
    padding: '6px 12px', border: '1px solid #d0d0d0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
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
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', minHeight: 120,
    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
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

const defaultForm = { category: '일반', question: '', answer: '', order: 0 };

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    try {
      const q = query(collection(db, 'faq'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setFaqs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('FAQ 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, order: faqs.length });
    setShowModal(true);
  };

  const openEdit = (faq) => {
    setEditId(faq.id);
    setForm({
      category: faq.category || '일반',
      question: faq.question || '',
      answer: faq.answer || '',
      order: faq.order ?? 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.question.trim()) { alert('질문을 입력해주세요.'); return; }
    if (!form.answer.trim()) { alert('답변을 입력해주세요.'); return; }
    try {
      const data = { ...form, order: Number(form.order) || 0 };
      if (editId) {
        await updateDoc(doc(db, 'faq', editId), { ...data, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'faq'), { ...data, createdAt: new Date(), updatedAt: new Date() });
      }
      setShowModal(false);
      fetchFaqs();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 FAQ를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'faq', id));
      fetchFaqs();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const reorder = async (index, direction) => {
    const filtered = getFiltered();
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= filtered.length) return;
    try {
      const a = filtered[index];
      const b = filtered[swapIndex];
      await Promise.all([
        updateDoc(doc(db, 'faq', a.id), { order: b.order ?? swapIndex }),
        updateDoc(doc(db, 'faq', b.id), { order: a.order ?? index }),
      ]);
      fetchFaqs();
    } catch (err) {
      alert('순서 변경 실패: ' + err.message);
    }
  };

  const getFiltered = () => {
    if (categoryFilter === '전체') return faqs;
    return faqs.filter((f) => f.category === categoryFilter);
  };

  const filtered = getFiltered();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.filterRow}>
          {CATEGORIES.map((c) => (
            <button key={c} style={styles.filterBtn(categoryFilter === c)} onClick={() => setCategoryFilter(c)}>
              {c}
            </button>
          ))}
        </div>
        <button style={styles.addBtn} onClick={openCreate}>+ 새 FAQ</button>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.empty}>FAQ가 없습니다.</div>
      ) : (
        <div style={styles.list}>
          {filtered.map((faq, idx) => (
            <div key={faq.id} style={styles.faqCard}>
              <div
                style={styles.faqHeader}
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              >
                <span style={styles.faqCategory}>{faq.category || '일반'}</span>
                <span style={styles.faqQuestion}>{faq.question}</span>
                <span style={styles.faqArrow}>{expandedId === faq.id ? '▲' : '▼'}</span>
              </div>
              {expandedId === faq.id && (
                <>
                  <div style={styles.faqAnswer}>{faq.answer}</div>
                  <div style={styles.faqActions}>
                    <div style={styles.orderBtns}>
                      <button style={styles.orderBtn} onClick={() => reorder(idx, -1)} disabled={idx === 0}>▲</button>
                      <button style={styles.orderBtn} onClick={() => reorder(idx, 1)} disabled={idx === filtered.length - 1}>▼</button>
                    </div>
                    <button style={styles.actionBtn} onClick={() => openEdit(faq)}>수정</button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(faq.id)}>삭제</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{editId ? 'FAQ 수정' : '새 FAQ'}</div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>카테고리</label>
              <select style={styles.select} value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.filter((c) => c !== '전체').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>질문</label>
              <input style={styles.input} placeholder="질문을 입력하세요" value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>답변</label>
              <textarea style={styles.textarea} placeholder="답변을 입력하세요" value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>순서</label>
              <input style={styles.input} type="number" value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} />
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
