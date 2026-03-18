import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const PRIORITY_CONFIG = {
  낮음: { bg: '#e2e8f0', color: '#4a5568' },
  보통: { bg: '#ebf8ff', color: '#2b6cb0' },
  높음: { bg: '#fef3cd', color: '#856404' },
  긴급: { bg: '#fed7d7', color: '#c53030' },
};

export default function AdminMemo() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unresolved, resolved
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemo, setNewMemo] = useState({
    targetUid: '',
    content: '',
    priority: '보통',
  });

  useEffect(() => {
    fetchMemos();
  }, [filter, priorityFilter]);

  const fetchMemos = async () => {
    setLoading(true);
    try {
      const constraints = [orderBy('createdAt', 'desc')];

      if (filter === 'unresolved') {
        constraints.unshift(where('resolved', '==', false));
      } else if (filter === 'resolved') {
        constraints.unshift(where('resolved', '==', true));
      }

      if (priorityFilter) {
        constraints.unshift(where('priority', '==', priorityFilter));
      }

      const q = query(collection(db, 'adminMemos'), ...constraints);
      const snapshot = await getDocs(q);
      setMemos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('메모 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return (
      d.toLocaleDateString('ko-KR') +
      ' ' +
      d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const handleAdd = async () => {
    if (!newMemo.content.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'adminMemos'), {
        targetUid: newMemo.targetUid.trim() || null,
        content: newMemo.content.trim(),
        priority: newMemo.priority,
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        resolved: false,
      });
      alert('메모가 추가되었습니다.');
      setNewMemo({ targetUid: '', content: '', priority: '보통' });
      setShowAddModal(false);
      fetchMemos();
    } catch (err) {
      console.error('메모 추가 실패:', err);
      alert('메모 추가에 실패했습니다.');
    }
  };

  const handleResolve = async (memoId) => {
    try {
      await updateDoc(doc(db, 'adminMemos', memoId), {
        resolved: true,
        resolvedAt: Timestamp.now(),
      });
      fetchMemos();
    } catch (err) {
      console.error('메모 처리 실패:', err);
    }
  };

  const handleUnresolve = async (memoId) => {
    try {
      await updateDoc(doc(db, 'adminMemos', memoId), {
        resolved: false,
        resolvedAt: null,
      });
      fetchMemos();
    } catch (err) {
      console.error('메모 복원 실패:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>관리자 메모</h1>
          <span style={styles.count}>총 {memos.length}건</span>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          + 새 메모
        </button>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          {['all', 'unresolved', 'resolved'].map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '전체' : f === 'unresolved' ? '미처리' : '처리완료'}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">우선순위 전체</option>
          <option value="긴급">긴급</option>
          <option value="높음">높음</option>
          <option value="보통">보통</option>
          <option value="낮음">낮음</option>
        </select>
      </div>

      {/* 메모 목록 */}
      <div style={styles.memoList}>
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : memos.length === 0 ? (
          <div style={styles.empty}>메모가 없습니다.</div>
        ) : (
          memos.map((memo) => {
            const priorityColor =
              PRIORITY_CONFIG[memo.priority] || PRIORITY_CONFIG['보통'];
            return (
              <div
                key={memo.id}
                style={{
                  ...styles.memoCard,
                  borderLeftColor: priorityColor.color,
                  opacity: memo.resolved ? 0.6 : 1,
                }}
              >
                <div style={styles.memoHeader}>
                  <div style={styles.memoMeta}>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        backgroundColor: priorityColor.bg,
                        color: priorityColor.color,
                      }}
                    >
                      {memo.priority || '보통'}
                    </span>
                    {memo.targetUid && (
                      <span style={styles.targetTag}>
                        대상: {memo.targetUid}
                      </span>
                    )}
                    {memo.resolved && (
                      <span style={styles.resolvedBadge}>처리완료</span>
                    )}
                  </div>
                  <span style={styles.memoDate}>{formatDate(memo.createdAt)}</span>
                </div>
                <p style={styles.memoContent}>{memo.content}</p>
                <div style={styles.memoFooter}>
                  <span style={styles.memoAuthor}>작성자: {memo.createdBy || '-'}</span>
                  {!memo.resolved ? (
                    <button
                      style={styles.resolveBtn}
                      onClick={() => handleResolve(memo.id)}
                    >
                      처리완료
                    </button>
                  ) : (
                    <button
                      style={styles.unresolveBtn}
                      onClick={() => handleUnresolve(memo.id)}
                    >
                      미처리로 변경
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 새 메모 모달 */}
      {showAddModal && (
        <div style={styles.overlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>새 메모 추가</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>대상 회원 UID (선택)</label>
              <input
                type="text"
                value={newMemo.targetUid}
                onChange={(e) =>
                  setNewMemo((prev) => ({ ...prev, targetUid: e.target.value }))
                }
                style={styles.formInput}
                placeholder="대상 회원의 UID를 입력하세요"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>우선순위</label>
              <select
                value={newMemo.priority}
                onChange={(e) =>
                  setNewMemo((prev) => ({ ...prev, priority: e.target.value }))
                }
                style={styles.formSelect}
              >
                <option value="낮음">낮음</option>
                <option value="보통">보통</option>
                <option value="높음">높음</option>
                <option value="긴급">긴급</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>내용</label>
              <textarea
                value={newMemo.content}
                onChange={(e) =>
                  setNewMemo((prev) => ({ ...prev, content: e.target.value }))
                }
                style={styles.formTextarea}
                rows={5}
                placeholder="메모 내용을 입력하세요..."
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                취소
              </button>
              <button style={styles.confirmBtn} onClick={handleAdd}>
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 1000,
    margin: '0 auto',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
  },
  count: {
    fontSize: 14,
    color: '#718096',
  },
  addBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  filterGroup: {
    display: 'flex',
    gap: 8,
  },
  filterBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  filterBtnActive: {
    backgroundColor: '#1a202c',
    color: '#fff',
    borderColor: '#1a202c',
  },
  select: {
    padding: '8px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    backgroundColor: '#fff',
    outline: 'none',
  },
  memoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  memoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: '18px 22px',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #4299e1',
    transition: 'opacity 0.2s',
  },
  memoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  memoMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  targetTag: {
    fontSize: 12,
    color: '#718096',
    backgroundColor: '#f7fafc',
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  resolvedBadge: {
    fontSize: 11,
    color: '#1a8a4a',
    backgroundColor: '#e6f9ed',
    padding: '2px 8px',
    borderRadius: 12,
    fontWeight: 600,
  },
  memoDate: {
    fontSize: 12,
    color: '#a0aec0',
  },
  memoContent: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
    whiteSpace: 'pre-wrap',
  },
  memoFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoAuthor: {
    fontSize: 12,
    color: '#a0aec0',
  },
  resolveBtn: {
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: '#e6f9ed',
    color: '#1a8a4a',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  unresolveBtn: {
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    width: 480,
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
    marginTop: 0,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: 6,
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#fff',
  },
  formTextarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
