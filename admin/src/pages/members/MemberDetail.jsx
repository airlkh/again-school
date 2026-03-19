import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const STATUS_COLORS = {
  정상: { bg: '#e6f9ed', color: '#1a8a4a' },
  제재: { bg: '#fde8e8', color: '#c53030' },
  휴면: { bg: '#fef3cd', color: '#856404' },
  탈퇴: { bg: '#e2e8f0', color: '#4a5568' },
};

export default function MemberDetail() {
  const { id: uid } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityHistory, setActivityHistory] = useState([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [schoolList, setSchoolList] = useState([]);
  const [activityStats, setActivityStats] = useState({ posts: 0, comments: 0, likes: 0 });
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoContent, setMemoContent] = useState('');
  const [memoPriority, setMemoPriority] = useState('보통');
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [sanctionType, setSanctionType] = useState('경고');
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionDuration, setSanctionDuration] = useState('7');

  useEffect(() => {
    fetchMember();
  }, [uid]);

  const fetchMember = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        const data = { uid: docSnap.id, ...docSnap.data() };
        setMember(data);

        // 학교 목록
        const schools = [];
        if (data.school) schools.push(data.school);
        if (data.schoolName) schools.push(data.schoolName);
        if (data.schools && Array.isArray(data.schools)) {
          schools.push(...data.schools);
        }
        setSchoolList([...new Set(schools)]);
      }

      // 활동 통계
      try {
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), where('authorUid', '==', uid))
        );
        // 댓글은 posts/{postId}/comments 서브컬렉션이므로 개별 조회 필요
        let totalComments = 0;
        for (const postDoc of postsSnap.docs) {
          const commentsSnap = await getDocs(
            collection(db, 'posts', postDoc.id, 'comments')
          );
          totalComments += commentsSnap.docs.filter(c => c.data().uid === uid).length;
        }
        setActivityStats({
          posts: postsSnap.size,
          comments: totalComments,
          likes: 0,
        });
      } catch {
        // 컬렉션이 없을 수 있음
      }

      // 연결 수
      try {
        const connectSnap = await getDocs(
          query(collection(db, 'connections'), where('fromUid', '==', uid))
        );
        setConnectionCount(connectSnap.size);
      } catch {
        setConnectionCount(0);
      }

      // 활동 히스토리
      try {
        const historySnap = await getDocs(
          query(
            collection(db, 'activityLogs'),
            where('uid', '==', uid),
            orderBy('createdAt', 'desc')
          )
        );
        setActivityHistory(
          historySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch {
        setActivityHistory([]);
      }
    } catch (err) {
      console.error('회원 정보 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (m) => {
    if (!m) return '정상';
    if (m.disabled) return '제재';
    if (m.withdrawn) return '탈퇴';
    if (m.dormant) return '휴면';
    return m.status || '정상';
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddMemo = async () => {
    if (!memoContent.trim()) return;
    try {
      await addDoc(collection(db, 'adminMemos'), {
        targetUid: uid,
        content: memoContent.trim(),
        priority: memoPriority,
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        resolved: false,
      });
      alert('메모가 추가되었습니다.');
      setMemoContent('');
      setShowMemoModal(false);
    } catch (err) {
      console.error('메모 추가 실패:', err);
      alert('메모 추가에 실패했습니다.');
    }
  };

  const handleSanction = async () => {
    if (!sanctionReason.trim()) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        disabled: true,
        status: '제재',
      });
      await addDoc(collection(db, 'sanctions'), {
        targetUid: uid,
        type: sanctionType,
        reason: sanctionReason.trim(),
        duration: sanctionDuration === '영구' ? '영구' : `${sanctionDuration}일`,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
        active: true,
      });
      alert('제재가 적용되었습니다.');
      setSanctionReason('');
      setShowSanctionModal(false);
      fetchMember();
    } catch (err) {
      console.error('제재 적용 실패:', err);
      alert('제재 적용에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>회원 정보를 찾을 수 없습니다.</div>
        <button style={styles.backBtn} onClick={() => navigate('/members')}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const status = getStatus(member);
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS['정상'];

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/members')}>
          ← 회원 목록
        </button>
      </div>

      {/* 프로필 카드 */}
      <div style={styles.profileCard}>
        <div style={styles.profileTop}>
          <div style={styles.avatarLarge}>
            {(member.name || member.displayName || '?').charAt(0).toUpperCase()}
          </div>
          <div style={styles.profileInfo}>
            <h1 style={styles.profileName}>
              {member.name || member.displayName || '(이름 없음)'}
            </h1>
            <p style={styles.profileEmail}>{member.email || '-'}</p>
            <span
              style={{
                ...styles.statusPill,
                backgroundColor: statusColor.bg,
                color: statusColor.color,
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <div style={styles.profileDetails}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>UID</span>
            <span style={styles.detailValue}>{uid}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>가입일</span>
            <span style={styles.detailValue}>{formatDate(member.createdAt)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>최근 활동</span>
            <span style={styles.detailValue}>{formatDate(member.lastActiveAt || member.lastLoginAt)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>전화번호</span>
            <span style={styles.detailValue}>{member.phone || member.phoneNumber || '-'}</span>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{schoolList.length}</div>
          <div style={styles.statLabel}>학교</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{activityStats.posts}</div>
          <div style={styles.statLabel}>게시글</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{activityStats.comments}</div>
          <div style={styles.statLabel}>댓글</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{connectionCount}</div>
          <div style={styles.statLabel}>연결</div>
        </div>
      </div>

      {/* 학교 이력 */}
      {member.schools && member.schools.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>학교 이력</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>학교명</th>
                <th style={styles.th}>유형</th>
                <th style={styles.th}>졸업연도</th>
                <th style={styles.th}>공개</th>
              </tr>
            </thead>
            <tbody>
              {member.schools.map((s, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{s.schoolName || '-'}</td>
                  <td style={styles.td}><span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#2563eb' }}>{s.schoolType || '-'}</span></td>
                  <td style={styles.td}>{s.graduationYear || '-'}</td>
                  <td style={styles.td}>{s.isPublic === false ? '🔒 비공개' : '✅ 공개'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 선생님 재직 이력 */}
      {member.teacherHistory && member.teacherHistory.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            선생님 재직 이력
            {member.teacherVerified && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#f3e8ff', color: '#7c3aed' }}>👩‍🏫 인증됨</span>}
          </h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>학교명</th>
                <th style={styles.th}>과목</th>
                <th style={styles.th}>기간</th>
                <th style={styles.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {member.teacherHistory.map((h, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{h.schoolName}</td>
                  <td style={styles.td}>{h.subject}</td>
                  <td style={styles.td}>{h.startYear}~{h.isCurrent ? '현재' : (h.endYear || '')}</td>
                  <td style={styles.td}>{h.isCurrent ? <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a' }}>재직 중</span> : <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#f5f5f5', color: '#888' }}>퇴직</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 제재 이력 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>제재 이력</h2>
        {member.disabled ? (
          <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 8, color: '#FF3124', fontSize: 13 }}>현재 제재 상태입니다.</div>
        ) : (
          <p style={styles.emptyText}>제재 이력이 없습니다.</p>
        )}
      </div>

      {/* 관리 버튼 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>회원 관리</h2>
        <div style={styles.actionRow}>
          <button
            style={styles.actionBtnDanger}
            onClick={() => setShowSanctionModal(true)}
          >
            제재
          </button>
          <button
            style={styles.actionBtnPrimary}
            onClick={() => setShowMemoModal(true)}
          >
            메모 추가
          </button>
          <button
            style={styles.actionBtnOutline}
            onClick={() => navigate(`/school/verification`)}
          >
            인증 관리
          </button>
        </div>
      </div>

      {/* 활동 히스토리 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>활동 히스토리</h2>
        {activityHistory.length === 0 ? (
          <p style={styles.emptyText}>활동 기록이 없습니다.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>일시</th>
                <th style={styles.th}>활동 유형</th>
                <th style={styles.th}>내용</th>
              </tr>
            </thead>
            <tbody>
              {activityHistory.map((item) => (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>{formatDate(item.createdAt)}</td>
                  <td style={styles.td}>{item.type || '-'}</td>
                  <td style={styles.td}>{item.description || item.content || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 메모 추가 모달 */}
      {showMemoModal && (
        <div style={styles.overlay} onClick={() => setShowMemoModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>관리자 메모 추가</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>우선순위</label>
              <select
                value={memoPriority}
                onChange={(e) => setMemoPriority(e.target.value)}
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
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                style={styles.formTextarea}
                rows={4}
                placeholder="메모 내용을 입력하세요..."
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowMemoModal(false)}>
                취소
              </button>
              <button style={styles.confirmBtn} onClick={handleAddMemo}>
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 제재 모달 */}
      {showSanctionModal && (
        <div style={styles.overlay} onClick={() => setShowSanctionModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>회원 제재</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>제재 유형</label>
              <select
                value={sanctionType}
                onChange={(e) => setSanctionType(e.target.value)}
                style={styles.formSelect}
              >
                <option value="경고">경고</option>
                <option value="일시정지">일시정지</option>
                <option value="영구정지">영구정지</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>기간</label>
              <select
                value={sanctionDuration}
                onChange={(e) => setSanctionDuration(e.target.value)}
                style={styles.formSelect}
              >
                <option value="1">1일</option>
                <option value="3">3일</option>
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
                <option value="영구">영구</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>사유</label>
              <textarea
                value={sanctionReason}
                onChange={(e) => setSanctionReason(e.target.value)}
                style={styles.formTextarea}
                rows={3}
                placeholder="제재 사유를 입력하세요..."
              />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowSanctionModal(false)}>
                취소
              </button>
              <button style={styles.dangerConfirmBtn} onClick={handleSanction}>
                제재 적용
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
  loading: {
    padding: 60,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  empty: {
    padding: 60,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  emptyText: {
    color: '#a0aec0',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  headerRow: {
    marginBottom: 20,
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: 13,
    color: '#4a5568',
    backgroundColor: '#edf2f7',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #e2e8f0',
    marginBottom: 20,
  },
  profileTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: '#4299e1',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
    margin: 0,
  },
  statusPill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 4,
    width: 'fit-content',
  },
  profileDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    borderTop: '1px solid #edf2f7',
    paddingTop: 20,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#a0aec0',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#2d3748',
    wordBreak: 'break-all',
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: '20px 16px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a202c',
  },
  statLabel: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #e2e8f0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a202c',
    margin: '0 0 16px 0',
  },
  schoolList: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  schoolTag: {
    padding: '6px 14px',
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtnDanger: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#fed7d7',
    color: '#c53030',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  actionBtnOutline: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #edf2f7',
  },
  td: {
    padding: '10px 14px',
    fontSize: 13,
    color: '#2d3748',
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
    width: 440,
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
  dangerConfirmBtn: {
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
