import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const s = {
  container: { padding: '24px 32px', backgroundColor: '#f5f5f8', minHeight: '100vh' },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 20 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '14px 20px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTop: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, objectFit: 'cover', backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  info: { fontSize: 13, color: '#555', marginBottom: 4 },
  message: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 4 },
  docsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  docThumb: { width: 64, height: 64, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', border: '1px solid #e0e0e0' },
  pdfLink: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: '#f0f0f5', borderRadius: 6, fontSize: 12, color: '#1a73e8', textDecoration: 'none', cursor: 'pointer' },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  btn: { padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  approveBtn: { backgroundColor: '#7C3AED', color: '#fff' },
  rejectBtn: { backgroundColor: '#fff', color: '#e94560', border: '1px solid #e94560' },
  revokeBtn: { backgroundColor: '#fff', color: '#888', border: '1px solid #d0d0d8' },
  empty: { textAlign: 'center', padding: 40, color: '#999', fontSize: 14 },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' },
  modalImg: { maxWidth: '90%', maxHeight: '85%', borderRadius: 8 },
};

export default function TeacherVerification() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('isTeacher', '==', true));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      items.sort((a, b) => (a.teacherVerified ? 1 : 0) - (b.teacherVerified ? 1 : 0));
      setRequests(items);
    } catch (err) { console.error('선생님 목록 로드 실패:', err); }
    setLoading(false);
  };

  const handleAction = async (uid, approve) => {
    const msg = approve ? '승인하시겠습니까?' : '거절하시겠습니까?';
    if (!window.confirm(msg)) return;
    try {
      const updateData = approve
        ? { teacherVerified: true, teacherRejected: false, teacherRejectedReason: '' }
        : { teacherVerified: false, teacherRejected: true, teacherRejectedReason: prompt('거절 사유를 입력하세요:') || '' };
      await updateDoc(doc(db, 'users', uid), updateData);
      fetchRequests();
    } catch { alert('처리 실패'); }
  };

  const pending = requests.filter((r) => !r.teacherVerified && !r.teacherRejected);
  const verified = requests.filter((r) => r.teacherVerified);
  const rejected = requests.filter((r) => r.teacherRejected);

  return (
    <div style={s.container}>
      <h1 style={s.title}>선생님 인증 관리</h1>

      <div style={s.statsRow}>
        {[
          { label: '대기 중', value: pending.length },
          { label: '승인됨', value: verified.length },
          { label: '거절됨', value: rejected.length },
          { label: '전체', value: requests.length },
        ].map((c) => (
          <div key={c.label} style={s.statCard}>
            <div style={s.statLabel}>{c.label}</div>
            <div style={s.statValue}>{c.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={s.empty}>로딩 중...</div>
      ) : requests.length === 0 ? (
        <div style={s.empty}>선생님 인증 신청이 없습니다.</div>
      ) : (
        requests.map((r) => (
          <div key={r.uid} style={s.card}>
            <div style={s.cardTop}>
              <img src={r.photoURL || 'https://via.placeholder.com/48'} style={s.avatar} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={s.name}>{r.displayName || '이름 없음'}</span>
                  {r.teacherVerified && <span style={{ ...s.badge, backgroundColor: '#7C3AED22', color: '#7C3AED' }}>승인됨</span>}
                  {r.teacherRejected && <span style={{ ...s.badge, backgroundColor: '#FFF0F0', color: '#e94560' }}>거절됨</span>}
                  {!r.teacherVerified && !r.teacherRejected && <span style={{ ...s.badge, backgroundColor: '#FFF8E1', color: '#f59e0b' }}>대기 중</span>}
                </div>
                <div style={s.info}>🏫 {r.teacherSchoolName || '-'}</div>
                <div style={s.info}>📚 {r.teacherSubject || '-'}</div>
                {r.teacherHistory?.map((h, i) => (
                  <div key={i} style={{ ...s.info, fontSize: 12, color: '#888' }}>
                    {h.schoolName} · {h.subject} · {h.startYear}~{h.isCurrent ? '현재' : (h.endYear || '')}
                  </div>
                ))}
                {r.teacherMessage && <div style={s.message}>💬 {r.teacherMessage}</div>}
                {r.teacherRejectedReason && <div style={{ ...s.message, color: '#e94560' }}>거절 사유: {r.teacherRejectedReason}</div>}
              </div>
            </div>

            {/* 첨부파일 */}
            {r.teacherDocUrls?.length > 0 && (
              <div style={s.docsRow}>
                {r.teacherDocUrls.map((url, i) => {
                  const isPdf = url.includes('.pdf') || url.includes('application%2Fpdf');
                  return isPdf ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={s.pdfLink}>
                      📄 PDF {i + 1}
                    </a>
                  ) : (
                    <img key={i} src={url} style={s.docThumb} onClick={() => setPreviewImg(url)} alt={`첨부 ${i + 1}`} />
                  );
                })}
              </div>
            )}

            <div style={s.actions}>
              {!r.teacherVerified && !r.teacherRejected && (
                <>
                  <button style={{ ...s.btn, ...s.approveBtn }} onClick={() => handleAction(r.uid, true)}>승인</button>
                  <button style={{ ...s.btn, ...s.rejectBtn }} onClick={() => handleAction(r.uid, false)}>거절</button>
                </>
              )}
              {r.teacherVerified && (
                <button style={{ ...s.btn, ...s.revokeBtn }} onClick={() => handleAction(r.uid, false)}>인증 취소</button>
              )}
              {r.teacherRejected && (
                <button style={{ ...s.btn, ...s.approveBtn }} onClick={() => handleAction(r.uid, true)}>재승인</button>
              )}
            </div>
          </div>
        ))
      )}

      {previewImg && (
        <div style={s.modal} onClick={() => setPreviewImg(null)}>
          <img src={previewImg} style={s.modalImg} alt="미리보기" />
        </div>
      )}
    </div>
  );
}
