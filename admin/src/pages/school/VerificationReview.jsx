import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  ClipboardCheck,
  CheckSquare,
  Square,
  ChevronRight,
  User,
  Send,
  ArrowLeft,
} from 'lucide-react';

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 28,
  },
  listView: {},
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderRadius: 10,
    border: '1px solid #eee',
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  listLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    backgroundColor: '#f0f0f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  listSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  // Detail view
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 20,
    padding: '6px 0',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: 28,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 24px',
    marginBottom: 20,
  },
  infoItem: {
    fontSize: 14,
  },
  infoLabel: {
    fontWeight: 600,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    color: '#333',
  },
  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 24,
    marginBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 4,
    bottom: 4,
    width: 2,
    backgroundColor: '#e0e0e0',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 16,
    paddingLeft: 16,
  },
  timelineDot: {
    position: 'absolute',
    left: -20,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#e94560',
    border: '2px solid #fff',
    boxShadow: '0 0 0 2px #e94560',
  },
  timelineText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 1.6,
  },
  // Checklist
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    fontSize: 14,
    color: '#444',
    userSelect: 'none',
  },
  checkIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  // Actions
  actionArea: {
    marginTop: 24,
  },
  reasonInput: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    resize: 'vertical',
    minHeight: 80,
    outline: 'none',
    marginBottom: 16,
    boxSizing: 'border-box',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
  },
  btnApprove: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#28a745',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnReject: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#dc3545',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
};

const CHECKLIST_ITEMS = [
  { key: 'school', label: '학교 정보 확인 완료' },
  { key: 'subject', label: '담당 과목 확인 완료' },
  { key: 'identity', label: '본인 확인 완료' },
];

export default function VerificationReview() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [reason, setReason] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('isTeacher', '==', true),
        where('teacherVerified', '==', false)
      );
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('심사 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const selectUser = (user) => {
    setSelected(user);
    setChecklist({});
    setReason('');
  };

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key]);

  const handleApprove = async () => {
    if (!allChecked) {
      alert('모든 확인 항목을 체크해주세요.');
      return;
    }
    if (!window.confirm('인증을 승인하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'users', selected.id), {
        teacherVerified: true,
        verifiedAt: Timestamp.now(),
        verificationNote: reason || '',
      });
      alert('승인 처리되었습니다.');
      setSelected(null);
      fetchPending();
    } catch (err) {
      console.error('승인 실패:', err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }
    if (!window.confirm('인증을 거절하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'users', selected.id), {
        isTeacher: false,
        teacherVerified: false,
        rejectedAt: Timestamp.now(),
        rejectionReason: reason,
      });
      alert('거절 처리되었습니다.');
      setSelected(null);
      fetchPending();
    } catch (err) {
      console.error('거절 실패:', err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div style={styles.empty}>데이터를 불러오는 중...</div>;
  }

  // Detail view
  if (selected) {
    const histories = Array.isArray(selected.teacherHistory)
      ? selected.teacherHistory
      : selected.teacherHistory
      ? [selected.teacherHistory]
      : [];

    return (
      <div style={styles.container}>
        <button style={styles.backBtn} onClick={() => setSelected(null)}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          목록으로 돌아가기
        </button>

        <h1 style={styles.title}>인증 심사</h1>

        {/* 기본 정보 */}
        <div style={styles.detailCard}>
          <div style={styles.sectionTitle}>
            <User style={{ width: 18, height: 18 }} />
            기본 정보
          </div>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>이름</div>
              <div style={styles.infoValue}>{selected.name || '-'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>이메일</div>
              <div style={styles.infoValue}>{selected.email || '-'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>학교</div>
              <div style={styles.infoValue}>{selected.school || '-'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>과목</div>
              <div style={styles.infoValue}>{selected.subject || '-'}</div>
            </div>
          </div>

          {selected.teacherMessage && (
            <div>
              <div style={styles.infoLabel}>신청 메시지</div>
              <div
                style={{
                  backgroundColor: '#f8f8fc',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: '#555',
                  lineHeight: 1.6,
                  marginTop: 6,
                  borderLeft: '3px solid #e94560',
                }}
              >
                {selected.teacherMessage}
              </div>
            </div>
          )}
        </div>

        {/* 경력 타임라인 */}
        <div style={styles.detailCard}>
          <div style={styles.sectionTitle}>
            <ClipboardCheck style={{ width: 18, height: 18 }} />
            교직 경력
          </div>
          {histories.length === 0 ? (
            <div style={{ color: '#999', fontSize: 14 }}>등록된 경력이 없습니다.</div>
          ) : (
            <div style={styles.timeline}>
              <div style={styles.timelineLine} />
              {histories.map((entry, idx) => (
                <div key={idx} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  <div style={styles.timelineText}>{entry}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 확인 체크리스트 */}
        <div style={styles.detailCard}>
          <div style={styles.sectionTitle}>
            <ClipboardCheck style={{ width: 18, height: 18 }} />
            인증 확인 체크리스트
          </div>
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} style={styles.checkItem} onClick={() => toggleCheck(item.key)}>
              {checklist[item.key] ? (
                <CheckSquare style={{ ...styles.checkIcon, color: '#28a745' }} />
              ) : (
                <Square style={{ ...styles.checkIcon, color: '#ccc' }} />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* 처리 */}
        <div style={styles.detailCard}>
          <div style={styles.sectionTitle}>
            <Send style={{ width: 18, height: 18 }} />
            심사 처리
          </div>
          <textarea
            style={styles.reasonInput}
            placeholder="승인/거절 사유를 입력해주세요..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div style={styles.btnRow}>
            <button style={styles.btnApprove} onClick={handleApprove}>
              승인
            </button>
            <button style={styles.btnReject} onClick={handleReject}>
              거절
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>인증 심사</h1>
      {users.length === 0 ? (
        <div style={styles.empty}>심사 대기 중인 요청이 없습니다.</div>
      ) : (
        <div style={styles.listView}>
          {users.map((user) => (
            <div
              key={user.id}
              style={styles.listItem}
              onClick={() => selectUser(user)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#e94560';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(233,69,96,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#eee';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={styles.listLeft}>
                <div style={styles.listAvatar}>
                  <User style={{ width: 20, height: 20, color: '#aaa' }} />
                </div>
                <div>
                  <div style={styles.listName}>{user.name || '이름 없음'}</div>
                  <div style={styles.listSub}>
                    {user.school || '-'} / {user.subject || '-'}
                  </div>
                </div>
              </div>
              <ChevronRight style={{ width: 18, height: 18, color: '#ccc' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
