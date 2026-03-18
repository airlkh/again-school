import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';

export default function SettlementProcess() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { id, action }

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'settlements'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
      );
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('대기 정산 로드 실패:', err);
      // fallback: 전체 조회 후 필터
      try {
        const snap = await getDocs(query(collection(db, 'settlements'), orderBy('createdAt', 'desc')));
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.status === 'pending'));
      } catch (e2) {
        console.error('전체 조회도 실패:', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const processItem = async (id, action) => {
    try {
      await updateDoc(doc(db, 'settlements', id), {
        status: action === 'approve' ? 'completed' : 'rejected',
        processedAt: Timestamp.now(),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('처리 실패:', err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const batchProcess = async (action) => {
    if (selected.size === 0) return;
    setProcessing(true);
    try {
      const promises = [...selected].map((id) => processItem(id, action));
      await Promise.all(promises);
      alert(`${selected.size}건이 ${action === 'approve' ? '승인' : '반려'}되었습니다.`);
      setSelected(new Set());
    } catch (err) {
      console.error('일괄 처리 실패:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = (id, action) => {
    setConfirmModal({ id, action });
  };

  const executeConfirm = async () => {
    if (!confirmModal) return;
    await processItem(confirmModal.id, confirmModal.action);
    setConfirmModal(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>정산 처리</h1>

      {/* 일괄 처리 바 */}
      <div style={styles.actionBar}>
        <div style={styles.actionLeft}>
          <span style={{ fontSize: 14, color: '#6B7280' }}>
            대기 중: <strong>{items.length}</strong>건 | 선택: <strong>{selected.size}</strong>건
          </span>
          <span style={{ fontSize: 14, color: '#6B7280', marginLeft: 16 }}>
            선택 합계: <strong>{formatCurrency(items.filter((i) => selected.has(i.id)).reduce((s, i) => s + (i.amount || 0), 0))}</strong>
          </span>
        </div>
        <div style={styles.actionRight}>
          <button
            onClick={() => batchProcess('approve')}
            disabled={selected.size === 0 || processing}
            style={{ ...styles.btn, ...styles.btnApprove, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            일괄 승인
          </button>
          <button
            onClick={() => batchProcess('reject')}
            disabled={selected.size === 0 || processing}
            style={{ ...styles.btn, ...styles.btnReject, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            일괄 반려
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>로딩 중...</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                  />
                </th>
                <th style={styles.th}>대상</th>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>금액</th>
                <th style={styles.th}>요청일</th>
                <th style={styles.th}>비고</th>
                <th style={styles.th}>처리</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyTd}>처리 대기 중인 정산이 없습니다.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ ...styles.tr, background: selected.has(item.id) ? '#EEF2FF' : '#fff' }}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{item.userName || item.targetName || '알 수 없음'}</div>
                    </td>
                    <td style={styles.td}>{item.type || item.source || '-'}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#4F46E5' }}>
                      {formatCurrency(item.amount || 0)}
                    </td>
                    <td style={styles.td}>
                      {item.createdAt?.toDate?.()
                        ? item.createdAt.toDate().toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td style={styles.td}>{item.note || item.memo || '-'}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleAction(item.id, 'approve')}
                          style={{ ...styles.btnSmall, ...styles.btnSmallApprove }}
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'reject')}
                          style={{ ...styles.btnSmall, ...styles.btnSmallReject }}
                        >
                          반려
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 12px', color: '#111827' }}>
              {confirmModal.action === 'approve' ? '정산 승인' : '정산 반려'}
            </h3>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
              해당 정산 건을 {confirmModal.action === 'approve' ? '승인' : '반려'}하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ ...styles.btn, background: '#F3F4F6', color: '#374151' }}>
                취소
              </button>
              <button
                onClick={executeConfirm}
                style={{
                  ...styles.btn,
                  ...(confirmModal.action === 'approve' ? styles.btnApprove : styles.btnReject),
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 },
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 },
  actionLeft: { display: 'flex', alignItems: 'center' },
  actionRight: { display: 'flex', gap: 8 },
  btn: { padding: '10px 20px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnApprove: { background: '#4F46E5', color: '#fff' },
  btnReject: { background: '#EF4444', color: '#fff' },
  btnSmall: { padding: '6px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSmallApprove: { background: '#D1FAE5', color: '#065F46' },
  btnSmallReject: { background: '#FEE2E2', color: '#991B1B' },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '14px 20px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  tr: { transition: 'background 0.15s' },
  emptyTd: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
};
