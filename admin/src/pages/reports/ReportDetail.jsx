import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

const statusColors = {
  '대기': { bg: '#fff3e0', color: '#e65100' },
  '처리중': { bg: '#e3f2fd', color: '#1565c0' },
  '완료': { bg: '#e8f5e9', color: '#2e7d32' },
  '무시': { bg: '#f5f5f5', color: '#757575' },
};

const styles = {
  container: { maxWidth: 900, margin: '0 auto' },
  backBtn: {
    padding: '8px 16px', border: '1px solid #d0d0d0', borderRadius: 8,
    fontSize: 13, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
    marginBottom: 20, display: 'inline-block',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#222', marginBottom: 16 },
  infoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px',
  },
  label: { fontSize: 12, color: '#888', marginBottom: 2 },
  value: { fontSize: 14, color: '#333', fontWeight: 500 },
  badge: (status) => ({
    display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 13,
    fontWeight: 600,
    backgroundColor: (statusColors[status] || statusColors['대기']).bg,
    color: (statusColors[status] || statusColors['대기']).color,
  }),
  evidenceBox: {
    padding: 16, backgroundColor: '#f9f9fb', borderRadius: 8, fontSize: 14,
    color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap',
  },
  evidenceImg: {
    maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 8,
  },
  actionRow: { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  actionBtn: (bg, color) => ({
    padding: '10px 20px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: bg, color: color, transition: 'opacity 0.15s',
  }),
  textarea: {
    width: '100%', minHeight: 100, padding: 12, border: '1px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none',
    fontFamily: 'inherit', marginTop: 8,
  },
  noteBtn: {
    padding: '10px 20px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: '#333', color: '#fff', marginTop: 8,
  },
  timeline: { borderLeft: '2px solid #e0e0e0', paddingLeft: 20, marginTop: 12 },
  timelineItem: { marginBottom: 16, position: 'relative' },
  timelineDot: {
    width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e94560',
    position: 'absolute', left: -26, top: 4,
  },
  timelineDate: { fontSize: 11, color: '#999', marginBottom: 2 },
  timelineText: { fontSize: 13, color: '#444' },
  empty: { textAlign: 'center', padding: 60, color: '#999', fontSize: 14 },
};

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    loadReport();
    loadNotes();
  }, [id]);

  const loadReport = async () => {
    try {
      const snap = await getDoc(doc(db, 'reports', id));
      if (snap.exists()) {
        setReport({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error('신고 상세 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const q = query(
        collection(db, 'reports', id, 'notes'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('메모 로드 실패:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setReport((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const handleAddNote = async () => {
    if (!adminNote.trim()) return;
    try {
      await addDoc(collection(db, 'reports', id, 'notes'), {
        content: adminNote.trim(),
        createdAt: new Date(),
      });
      setAdminNote('');
      loadNotes();
    } catch (err) {
      alert('메모 추가 실패: ' + err.message);
    }
  };

  const handleSanctionLink = () => {
    navigate(`/reports/sanctions?reportId=${id}&targetUid=${report?.targetUid || ''}`);
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString('ko-KR');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  if (!report) {
    return <div style={styles.empty}>신고를 찾을 수 없습니다.</div>;
  }

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate('/reports')}>
        ← 목록으로
      </button>

      {/* 기본 정보 */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={styles.cardTitle}>신고 상세 정보</div>
          <span style={styles.badge(report.status)}>{report.status || '대기'}</span>
        </div>
        <div style={styles.infoGrid}>
          <div>
            <div style={styles.label}>신고 유형</div>
            <div style={styles.value}>{report.type || '-'}</div>
          </div>
          <div>
            <div style={styles.label}>신고 일시</div>
            <div style={styles.value}>{formatDate(report.createdAt)}</div>
          </div>
          <div>
            <div style={styles.label}>신고자</div>
            <div style={styles.value}>{report.reporterName || report.reporterUid || '-'}</div>
          </div>
          <div>
            <div style={styles.label}>대상자</div>
            <div style={styles.value}>{report.targetName || report.targetUid || '-'}</div>
          </div>
        </div>
      </div>

      {/* 신고 사유 및 증거 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>신고 사유</div>
        <div style={styles.evidenceBox}>{report.reason || '사유 없음'}</div>
        {report.evidenceUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={styles.label}>증거 자료</div>
            <img src={report.evidenceUrl} alt="증거" style={styles.evidenceImg} />
          </div>
        )}
        {report.evidenceText && (
          <div style={{ marginTop: 12 }}>
            <div style={styles.label}>추가 설명</div>
            <div style={styles.evidenceBox}>{report.evidenceText}</div>
          </div>
        )}
      </div>

      {/* 처리 액션 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>처리</div>
        <div style={styles.actionRow}>
          <button
            style={styles.actionBtn('#2e7d32', '#fff')}
            onClick={() => handleStatusChange('완료')}
          >
            처리완료
          </button>
          <button
            style={styles.actionBtn('#1565c0', '#fff')}
            onClick={() => handleStatusChange('처리중')}
          >
            처리중으로 변경
          </button>
          <button
            style={styles.actionBtn('#757575', '#fff')}
            onClick={() => handleStatusChange('무시')}
          >
            무시
          </button>
          <button
            style={styles.actionBtn('#e94560', '#fff')}
            onClick={handleSanctionLink}
          >
            제재 연동
          </button>
        </div>
      </div>

      {/* 관리자 메모 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>관리자 메모</div>
        <textarea
          style={styles.textarea}
          placeholder="메모를 입력하세요..."
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
        <button style={styles.noteBtn} onClick={handleAddNote}>
          메모 추가
        </button>

        {notes.length > 0 && (
          <div style={styles.timeline}>
            {notes.map((note) => (
              <div key={note.id} style={styles.timelineItem}>
                <div style={styles.timelineDot} />
                <div style={styles.timelineDate}>{formatDate(note.createdAt)}</div>
                <div style={styles.timelineText}>{note.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
