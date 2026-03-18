import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const SANCTION_TYPE_COLORS = {
  경고: { bg: '#fef3cd', color: '#856404' },
  일시정지: { bg: '#fde8e8', color: '#c53030' },
  영구정지: { bg: '#4a5568', color: '#fff' },
};

export default function MemberSanction() {
  const [sanctions, setSanctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, all
  const [selectedSanction, setSelectedSanction] = useState(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState('7');

  useEffect(() => {
    fetchSanctions();
  }, [filter]);

  const fetchSanctions = async () => {
    setLoading(true);
    try {
      let q;
      if (filter === 'active') {
        q = query(
          collection(db, 'sanctions'),
          where('active', '==', true),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(collection(db, 'sanctions'), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // disabled 사용자도 함께 조회
      if (list.length === 0 && filter === 'active') {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('disabled', '==', true))
        );
        const userSanctions = usersSnap.docs.map((d) => ({
          id: d.id,
          targetUid: d.id,
          type: '제재',
          reason: d.data().sanctionReason || '사유 미기재',
          duration: '-',
          createdAt: d.data().sanctionDate || d.data().updatedAt,
          active: true,
          userName: d.data().name || d.data().displayName || '(이름 없음)',
          email: d.data().email || '-',
        }));
        setSanctions(userSanctions);
      } else {
        setSanctions(list);
      }
    } catch (err) {
      console.error('제재 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRelease = async (sanction) => {
    if (!window.confirm('이 회원의 제재를 해제하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'sanctions', sanction.id), {
        active: false,
        releasedAt: Timestamp.now(),
        releasedBy: 'admin',
      });
      if (sanction.targetUid) {
        await updateDoc(doc(db, 'users', sanction.targetUid), {
          disabled: false,
          status: '정상',
        });
      }
      alert('제재가 해제되었습니다.');
      fetchSanctions();
    } catch (err) {
      console.error('제재 해제 실패:', err);
      alert('제재 해제에 실패했습니다.');
    }
  };

  const handleExtend = async () => {
    if (!selectedSanction) return;
    try {
      await updateDoc(doc(db, 'sanctions', selectedSanction.id), {
        duration: `${parseInt(selectedSanction.duration) + parseInt(extendDays) || extendDays}일`,
        extendedAt: Timestamp.now(),
        extendedBy: 'admin',
      });
      alert('제재 기간이 연장되었습니다.');
      setShowExtendModal(false);
      setSelectedSanction(null);
      fetchSanctions();
    } catch (err) {
      console.error('연장 실패:', err);
      alert('연장에 실패했습니다.');
    }
  };

  const handlePermanentBan = async (sanction) => {
    if (!window.confirm('이 회원을 영구정지 처리하시겠습니까? 이 작업은 되돌리기 어렵습니다.')) return;
    try {
      await updateDoc(doc(db, 'sanctions', sanction.id), {
        type: '영구정지',
        duration: '영구',
        updatedAt: Timestamp.now(),
      });
      if (sanction.targetUid) {
        await updateDoc(doc(db, 'users', sanction.targetUid), {
          disabled: true,
          status: '제재',
          permanentBan: true,
        });
      }
      alert('영구정지가 적용되었습니다.');
      fetchSanctions();
    } catch (err) {
      console.error('영구정지 실패:', err);
      alert('영구정지 처리에 실패했습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>회원 제재 관리</h1>
        <span style={styles.count}>총 {sanctions.length}건</span>
      </div>

      {/* 필터 */}
      <div style={styles.filterBar}>
        <button
          style={{
            ...styles.filterBtn,
            ...(filter === 'active' ? styles.filterBtnActive : {}),
          }}
          onClick={() => setFilter('active')}
        >
          활성 제재
        </button>
        <button
          style={{
            ...styles.filterBtn,
            ...(filter === 'all' ? styles.filterBtnActive : {}),
          }}
          onClick={() => setFilter('all')}
        >
          전체 이력
        </button>
      </div>

      {/* 테이블 */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : sanctions.length === 0 ? (
          <div style={styles.empty}>제재 내역이 없습니다.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>대상 회원</th>
                <th style={styles.th}>제재 유형</th>
                <th style={styles.th}>사유</th>
                <th style={styles.th}>기간</th>
                <th style={styles.th}>적용일</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {sanctions.map((s) => {
                const typeColor = SANCTION_TYPE_COLORS[s.type] || SANCTION_TYPE_COLORS['일시정지'];
                return (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.cellPrimary}>{s.userName || s.targetUid || '-'}</div>
                        <div style={styles.cellSecondary}>{s.email || ''}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.typePill,
                          backgroundColor: typeColor.bg,
                          color: typeColor.color,
                        }}
                      >
                        {s.type || '제재'}
                      </span>
                    </td>
                    <td style={styles.td}>{s.reason || '-'}</td>
                    <td style={styles.td}>{s.duration || '-'}</td>
                    <td style={styles.td}>{formatDate(s.createdAt)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusDot,
                          backgroundColor: s.active ? '#e53e3e' : '#a0aec0',
                        }}
                      />
                      {s.active ? '활성' : '해제됨'}
                    </td>
                    <td style={styles.td}>
                      {s.active && (
                        <div style={styles.actionGroup}>
                          <button
                            style={styles.releaseBtn}
                            onClick={() => handleRelease(s)}
                          >
                            해제
                          </button>
                          <button
                            style={styles.extendBtn}
                            onClick={() => {
                              setSelectedSanction(s);
                              setShowExtendModal(true);
                            }}
                          >
                            연장
                          </button>
                          <button
                            style={styles.permanentBtn}
                            onClick={() => handlePermanentBan(s)}
                          >
                            영구정지
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 연장 모달 */}
      {showExtendModal && (
        <div style={styles.overlay} onClick={() => setShowExtendModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>제재 기간 연장</h3>
            <p style={styles.modalDesc}>
              대상: {selectedSanction?.userName || selectedSanction?.targetUid}
            </p>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>연장 기간</label>
              <select
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                style={styles.formSelect}
              >
                <option value="1">1일</option>
                <option value="3">3일</option>
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
              </select>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowExtendModal(false)}>
                취소
              </button>
              <button style={styles.confirmBtn} onClick={handleExtend}>
                연장 적용
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
    maxWidth: 1200,
    margin: '0 auto',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
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
  filterBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
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
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #edf2f7',
  },
  td: {
    padding: '12px 14px',
    fontSize: 13,
    color: '#2d3748',
    verticalAlign: 'middle',
  },
  cellPrimary: {
    fontWeight: 500,
    fontSize: 13,
  },
  cellSecondary: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  typePill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  statusDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 6,
    verticalAlign: 'middle',
  },
  actionGroup: {
    display: 'flex',
    gap: 6,
  },
  releaseBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#e6f9ed',
    color: '#1a8a4a',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  extendBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#fef3cd',
    color: '#856404',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  permanentBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#fed7d7',
    color: '#c53030',
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
    width: 400,
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
    marginTop: 0,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#718096',
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
  formSelect: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#fff',
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
