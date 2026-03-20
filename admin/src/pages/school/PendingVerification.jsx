import React, { useState, useEffect, useMemo } from 'react';
import { db, app } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { Clock, Search, CheckCircle, XCircle, User, Mail, School, BookOpen, Phone, FileText, Building } from 'lucide-react';

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1400,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e94560',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    padding: '0 10px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    backgroundColor: '#fff',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#333',
    width: 200,
  },
  dateInput: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    outline: 'none',
  },
  /* Tabs */
  tabRow: {
    display: 'flex',
    gap: 0,
    marginBottom: 24,
    borderBottom: '2px solid #eee',
  },
  tab: {
    padding: '10px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: '#888',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    transition: 'color 0.2s, border-color 0.2s',
  },
  tabActive: {
    padding: '10px 24px',
    fontSize: 15,
    fontWeight: 600,
    color: '#e94560',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    borderBottom: '2px solid #e94560',
    marginBottom: -2,
    transition: 'color 0.2s, border-color 0.2s',
  },
  tabBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    padding: '0 6px',
    marginLeft: 6,
    color: '#fff',
  },
  /* Type pill badges */
  typePillTeacher: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: '#f0e6ff',
    color: '#7c3aed',
  },
  typePillOfficial: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#f0f0f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: 0,
  },
  cardEmail: {
    fontSize: 13,
    color: '#888',
    margin: 0,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#555',
  },
  infoIcon: {
    width: 16,
    height: 16,
    color: '#999',
    flexShrink: 0,
  },
  label: {
    fontWeight: 600,
    color: '#444',
    minWidth: 65,
  },
  messageBox: {
    backgroundColor: '#f8f8fc',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 13,
    color: '#555',
    lineHeight: 1.6,
    marginTop: 12,
    marginBottom: 16,
    borderLeft: '3px solid #e94560',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 16,
  },
  btnApprove: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#28a745',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnReject: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#dc3545',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnDetail: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#555',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
  /* Modal */
  modalOverlay: {
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 520,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 20px 0',
  },
  modalRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    fontSize: 14,
    color: '#555',
  },
  modalLabel: {
    fontWeight: 600,
    color: '#333',
    minWidth: 80,
    flexShrink: 0,
  },
  modalValue: {
    color: '#555',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    marginTop: 24,
  },
  modalClose: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#555',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkBtn: {
    color: '#0284c7',
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 14,
    padding: 0,
  },
};

export default function PendingVerification() {
  const [teacherUsers, setTeacherUsers] = useState([]);
  const [officialRequests, setOfficialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'teacher' | 'official'
  const [detailUser, setDetailUser] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      // Fetch teacher verification requests (existing logic)
      const teacherQ = query(
        collection(db, 'users'),
        where('isTeacher', '==', true),
        where('teacherVerified', '==', false)
      );
      const teacherSnapshot = await getDocs(teacherQ);
      const teacherList = teacherSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _type: 'teacher',
      }));
      setTeacherUsers(teacherList);

      // Fetch official verification requests
      try {
        const officialQ = query(
          collection(db, 'verificationRequests'),
          where('status', '==', 'pending')
        );
        const officialSnapshot = await getDocs(officialQ);
        const officialList = officialSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _type: 'official',
        }));
        setOfficialRequests(officialList);
      } catch (err) {
        // verificationRequests collection may not exist yet
        console.warn('공식 인증 요청 로드 실패 (컬렉션 미존재 가능):', err);
        setOfficialRequests([]);
      }
    } catch (err) {
      console.error('대기 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // Existing approve/reject logic for teacher — UNCHANGED
  const handleApprove = async (userId) => {
    if (!window.confirm('이 선생님의 인증을 승인하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        teacherVerified: true,
        verifiedAt: Timestamp.now(),
      });

      try {
        const functions = getFunctions(app, 'asia-northeast3');
        const sendPush = httpsCallable(functions, 'sendTeacherVerificationPush');
        await sendPush({ toUid: userId, approved: true });
      } catch {}

      setTeacherUsers((prev) => prev.filter((u) => u.id !== userId));
      alert('승인이 완료됐습니다.');
    } catch (err) {
      console.error('승인 실패:', err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (userId) => {
    const reason = window.prompt('거절 사유를 입력해주세요:');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isTeacher: false,
        teacherVerified: false,
        teacherRejected: true,
        teacherRejectedReason: reason,
        rejectedAt: Timestamp.now(),
      });

      try {
        const functions = getFunctions(app, 'asia-northeast3');
        const sendPush = httpsCallable(functions, 'sendTeacherVerificationPush');
        await sendPush({ toUid: userId, approved: false, reason });
      } catch {}

      setTeacherUsers((prev) => prev.filter((u) => u.id !== userId));
      alert('거절 처리가 완료됐습니다.');
    } catch (err) {
      console.error('거절 실패:', err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  // Official approve/reject
  const handleApproveOfficial = async (requestId) => {
    if (!window.confirm('이 공식 인증을 승인하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'verificationRequests', requestId), {
        status: 'approved',
        approvedAt: Timestamp.now(),
      });
      setOfficialRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error('승인 실패:', err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectOfficial = async (requestId) => {
    const reason = window.prompt('거절 사유를 입력해주세요:');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'verificationRequests', requestId), {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectionReason: reason,
      });
      setOfficialRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error('거절 실패:', err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  // Combined list for display
  const allItems = useMemo(() => {
    return [...teacherUsers, ...officialRequests];
  }, [teacherUsers, officialRequests]);

  const tabItems = useMemo(() => {
    if (activeTab === 'teacher') return teacherUsers;
    if (activeTab === 'official') return officialRequests;
    return allItems;
  }, [activeTab, teacherUsers, officialRequests, allItems]);

  const filtered = useMemo(() => {
    let result = tabItems;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((u) => {
        if (u._type === 'teacher') {
          return (
            (u.displayName || u.name || '').toLowerCase().includes(term) ||
            (u.school || u.schools?.[0]?.schoolName || '').toLowerCase().includes(term)
          );
        }
        // official
        return (
          (u.schoolName || '').toLowerCase().includes(term) ||
          (u.contactName || '').toLowerCase().includes(term)
        );
      });
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      result = result.filter((u) => {
        if (!u.createdAt) return false;
        const created = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return (
          created.getFullYear() === filterDate.getFullYear() &&
          created.getMonth() === filterDate.getMonth() &&
          created.getDate() === filterDate.getDate()
        );
      });
    }

    return result;
  }, [tabItems, searchTerm, dateFilter]);

  const teacherCount = teacherUsers.length;
  const officialCount = officialRequests.length;
  const allCount = teacherCount + officialCount;

  if (loading) {
    return <div style={styles.loading}>데이터를 불러오는 중...</div>;
  }

  const renderTypePill = (item) => {
    if (item._type === 'official') {
      return <span style={styles.typePillOfficial}>공식</span>;
    }
    return <span style={styles.typePillTeacher}>선생님</span>;
  };

  const renderTeacherCard = (user) => (
    <div
      key={user.id}
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.avatar}>
          {user.photoURL ? (
            <img src={user.photoURL} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <User style={{ width: 24, height: 24, color: '#aaa' }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.cardName}>{user.displayName || user.name || '이름 없음'}</p>
          <p style={styles.cardEmail}>{user.email || '-'}</p>
        </div>
        {renderTypePill(user)}
      </div>

      <div style={styles.infoRow}>
        <School style={styles.infoIcon} />
        <span style={styles.label}>학교</span>
        <span>{user.school || user.schools?.[0]?.schoolName || '-'}</span>
      </div>
      <div style={styles.infoRow}>
        <BookOpen style={styles.infoIcon} />
        <span style={styles.label}>과목</span>
        <span>{user.subject || '-'}</span>
      </div>
      <div style={styles.infoRow}>
        <Clock style={styles.infoIcon} />
        <span style={styles.label}>경력</span>
        <span>
          {Array.isArray(user.teacherHistory)
            ? user.teacherHistory.map(h => typeof h === 'object' ? `${h.schoolName || h.school || ''} ${h.startYear || h.year || ''}`.trim() : h).join(', ')
            : user.teacherHistory || user.teacherExperience || user.experience || '-'}
        </span>
      </div>

      {user.teacherMessage && (
        <div style={styles.messageBox}>
          <strong>신청 메시지:</strong>
          <br />
          {user.teacherMessage}
        </div>
      )}

      <div style={styles.actions}>
        <button
          style={styles.btnApprove}
          onClick={() => handleApprove(user.id)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <CheckCircle style={{ width: 16, height: 16 }} />
          승인
        </button>
        <button
          style={styles.btnReject}
          onClick={() => handleReject(user.id)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <XCircle style={{ width: 16, height: 16 }} />
          거절
        </button>
        <button
          style={styles.btnDetail}
          onClick={() => setDetailUser(user)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          상세
        </button>
      </div>
    </div>
  );

  const renderOfficialCard = (item) => (
    <div
      key={item.id}
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.avatar}>
          <Building style={{ width: 24, height: 24, color: '#aaa' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.cardName}>{item.schoolName || '학교명 없음'}</p>
          <p style={styles.cardEmail}>{item.contactName || '-'}</p>
        </div>
        {renderTypePill(item)}
      </div>

      <div style={styles.infoRow}>
        <School style={styles.infoIcon} />
        <span style={styles.label}>학교명</span>
        <span>{item.schoolName || '-'}</span>
      </div>
      <div style={styles.infoRow}>
        <User style={styles.infoIcon} />
        <span style={styles.label}>담당자</span>
        <span>{item.contactName || '-'}</span>
      </div>
      <div style={styles.infoRow}>
        <Phone style={styles.infoIcon} />
        <span style={styles.label}>연락처</span>
        <span>{item.phone || '-'}</span>
      </div>
      {item.documentUrl && (
        <div style={styles.infoRow}>
          <FileText style={styles.infoIcon} />
          <span style={styles.label}>서류</span>
          <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>
            서류 보기
          </a>
        </div>
      )}

      <div style={styles.actions}>
        <button
          style={styles.btnApprove}
          onClick={() => handleApproveOfficial(item.id)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <CheckCircle style={{ width: 16, height: 16 }} />
          승인
        </button>
        <button
          style={styles.btnReject}
          onClick={() => handleRejectOfficial(item.id)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <XCircle style={{ width: 16, height: 16 }} />
          거절
        </button>
        <button
          style={styles.btnDetail}
          onClick={() => setDetailUser(item)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          상세
        </button>
      </div>
    </div>
  );

  const renderCard = (item) => {
    if (item._type === 'official') return renderOfficialCard(item);
    return renderTeacherCard(item);
  };

  const renderDetailModal = () => {
    if (!detailUser) return null;
    const isTeacher = detailUser._type === 'teacher';

    return (
      <div style={styles.modalOverlay} onClick={() => setDetailUser(null)}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={styles.modalTitle}>
              {isTeacher ? '선생님 인증 상세' : '공식 인증 상세'}
            </h2>
            {renderTypePill(detailUser)}
          </div>

          {isTeacher ? (
            <>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>이름</span>
                <span style={styles.modalValue}>{detailUser.displayName || detailUser.name || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>이메일</span>
                <span style={styles.modalValue}>{detailUser.email || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>학교</span>
                <span style={styles.modalValue}>{detailUser.school || detailUser.schools?.[0]?.schoolName || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>과목</span>
                <span style={styles.modalValue}>{detailUser.subject || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>경력</span>
                <span style={styles.modalValue}>
                  {Array.isArray(detailUser.teacherHistory)
                    ? detailUser.teacherHistory.map(h => typeof h === 'object' ? `${h.schoolName || h.school || ''} ${h.startYear || h.year || ''}`.trim() : h).join(', ')
                    : detailUser.teacherHistory || detailUser.teacherExperience || '-'}
                </span>
              </div>
              {detailUser.teacherMessage && (
                <div style={styles.messageBox}>
                  <strong>신청 메시지:</strong>
                  <br />
                  {detailUser.teacherMessage}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>학교명</span>
                <span style={styles.modalValue}>{detailUser.schoolName || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>담당자</span>
                <span style={styles.modalValue}>{detailUser.contactName || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>연락처</span>
                <span style={styles.modalValue}>{detailUser.phone || '-'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>서류</span>
                <span style={styles.modalValue}>
                  {detailUser.documentUrl ? (
                    <a href={detailUser.documentUrl} target="_blank" rel="noopener noreferrer" style={styles.linkBtn}>
                      서류 보기
                    </a>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
            </>
          )}

          <div style={styles.modalActions}>
            <button
              style={styles.btnApprove}
              onClick={() => {
                if (isTeacher) {
                  handleApprove(detailUser.id);
                } else {
                  handleApproveOfficial(detailUser.id);
                }
                setDetailUser(null);
              }}
            >
              <CheckCircle style={{ width: 16, height: 16 }} />
              승인
            </button>
            <button
              style={styles.btnReject}
              onClick={() => {
                if (isTeacher) {
                  handleReject(detailUser.id);
                } else {
                  handleRejectOfficial(detailUser.id);
                }
                setDetailUser(null);
              }}
            >
              <XCircle style={{ width: 16, height: 16 }} />
              거절
            </button>
            <button style={styles.modalClose} onClick={() => setDetailUser(null)}>
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>인증 대기 목록</h1>
          <span style={styles.badge}>{filtered.length}</span>
        </div>
        <div style={styles.filterRow}>
          <input
            type="date"
            style={styles.dateInput}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <div style={styles.searchBox}>
            <Search style={{ width: 16, height: 16, color: '#999' }} />
            <input
              type="text"
              placeholder="이름 또는 학교 검색..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button
          style={activeTab === 'all' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('all')}
        >
          전체
          <span
            style={{
              ...styles.tabBadge,
              backgroundColor: activeTab === 'all' ? '#e94560' : '#ccc',
            }}
          >
            {allCount}
          </span>
        </button>
        <button
          style={activeTab === 'teacher' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('teacher')}
        >
          선생님 인증
          <span
            style={{
              ...styles.tabBadge,
              backgroundColor: activeTab === 'teacher' ? '#7c3aed' : '#ccc',
            }}
          >
            {teacherCount}
          </span>
        </button>
        <button
          style={activeTab === 'official' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('official')}
        >
          공식 인증
          <span
            style={{
              ...styles.tabBadge,
              backgroundColor: activeTab === 'official' ? '#0284c7' : '#ccc',
            }}
          >
            {officialCount}
          </span>
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>대기 중인 인증 요청이 없습니다.</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((item) => renderCard(item))}
        </div>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}
