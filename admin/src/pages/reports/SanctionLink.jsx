import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useSearchParams } from 'react-router-dom';

const SANCTION_TYPES = ['경고', '일시정지', '영구정지', '기능제한'];

const styles = {
  container: { padding: 0 },
  topCards: { display: 'flex', gap: 16, marginBottom: 24 },
  topCard: (color) => ({
    flex: 1, padding: '20px 24px', backgroundColor: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`,
  }),
  topLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  topValue: { fontSize: 24, fontWeight: 700, color: '#222' },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#222', marginBottom: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  formLabel: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
  },
  select: {
    padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', backgroundColor: '#fff',
  },
  textarea: {
    padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none', minHeight: 80, resize: 'vertical',
    fontFamily: 'inherit', gridColumn: '1 / -1',
  },
  submitBtn: {
    padding: '12px 28px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff', marginTop: 12,
  },
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
  },
  sanctionBadge: (type) => {
    const colors = {
      '경고': { bg: '#fff3e0', color: '#e65100' },
      '일시정지': { bg: '#e3f2fd', color: '#1565c0' },
      '영구정지': { bg: '#ffebee', color: '#c62828' },
      '기능제한': { bg: '#f3e5f5', color: '#6a1b9a' },
    };
    const c = colors[type] || colors['경고'];
    return {
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, backgroundColor: c.bg, color: c.color,
    };
  },
  linkedBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 600, backgroundColor: '#e8f5e9', color: '#2e7d32',
  },
  empty: { textAlign: 'center', padding: 40, color: '#999', fontSize: 14 },
};

export default function SanctionLink() {
  const [searchParams] = useSearchParams();
  const prefillReportId = searchParams.get('reportId') || '';
  const prefillTargetUid = searchParams.get('targetUid') || '';

  const [sanctions, setSanctions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 제재 생성 폼
  const [form, setForm] = useState({
    reportId: prefillReportId,
    targetUid: prefillTargetUid,
    sanctionType: '경고',
    reason: '',
    duration: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sanctionSnap, reportSnap] = await Promise.all([
        getDocs(query(collection(db, 'sanctions'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'))),
      ]);
      setSanctions(sanctionSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setReports(reportSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.targetUid.trim()) {
      alert('대상 사용자 UID를 입력해주세요.');
      return;
    }
    if (!form.reason.trim()) {
      alert('제재 사유를 입력해주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'sanctions'), {
        reportId: form.reportId || null,
        targetUid: form.targetUid,
        sanctionType: form.sanctionType,
        reason: form.reason,
        duration: form.duration || null,
        createdAt: new Date(),
        status: '활성',
      });

      // 연결된 신고가 있으면 상태 업데이트
      if (form.reportId) {
        await updateDoc(doc(db, 'reports', form.reportId), {
          status: '완료',
          sanctionLinked: true,
          updatedAt: new Date(),
        });
      }

      alert('제재가 등록되었습니다.');
      setForm({ reportId: '', targetUid: '', sanctionType: '경고', reason: '', duration: '' });
      fetchData();
    } catch (err) {
      alert('제재 등록 실패: ' + err.message);
    }
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('ko-KR');
  };

  // 신고와 연결된 제재 이력
  const linkedSanctions = sanctions.filter((s) => s.reportId);
  const totalSanctions = sanctions.length;
  const activeSanctions = sanctions.filter((s) => s.status === '활성').length;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      {/* 요약 카드 */}
      <div style={styles.topCards}>
        <div style={styles.topCard('#e94560')}>
          <div style={styles.topLabel}>전체 제재</div>
          <div style={styles.topValue}>{totalSanctions}</div>
        </div>
        <div style={styles.topCard('#1565c0')}>
          <div style={styles.topLabel}>활성 제재</div>
          <div style={styles.topValue}>{activeSanctions}</div>
        </div>
        <div style={styles.topCard('#2e7d32')}>
          <div style={styles.topLabel}>신고 연동 제재</div>
          <div style={styles.topValue}>{linkedSanctions.length}</div>
        </div>
      </div>

      {/* 제재 생성 폼 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>신고에서 제재 생성</div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>연결 신고 ID (선택)</label>
            <select
              style={styles.select}
              value={form.reportId}
              onChange={(e) => {
                const rid = e.target.value;
                setForm((prev) => ({ ...prev, reportId: rid }));
                if (rid) {
                  const r = reports.find((rp) => rp.id === rid);
                  if (r) setForm((prev) => ({ ...prev, targetUid: r.targetUid || '' }));
                }
              }}
            >
              <option value="">신고 선택 (선택사항)</option>
              {reports.filter((r) => r.status !== '완료').map((r) => (
                <option key={r.id} value={r.id}>
                  {r.type || '기타'} - {r.targetName || r.targetUid || '?'} ({r.id.slice(0, 8)})
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>대상 사용자 UID</label>
            <input
              style={styles.input}
              placeholder="제재 대상 UID"
              value={form.targetUid}
              onChange={(e) => setForm((prev) => ({ ...prev, targetUid: e.target.value }))}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>제재 유형</label>
            <select
              style={styles.select}
              value={form.sanctionType}
              onChange={(e) => setForm((prev) => ({ ...prev, sanctionType: e.target.value }))}
            >
              {SANCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>기간 (선택)</label>
            <input
              style={styles.input}
              placeholder="예: 7일, 30일, 영구"
              value={form.duration}
              onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
            />
          </div>
          <textarea
            style={styles.textarea}
            placeholder="제재 사유를 입력하세요..."
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
          />
        </div>
        <button style={styles.submitBtn} onClick={handleSubmit}>
          제재 등록
        </button>
      </div>

      {/* 제재 이력 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>신고 연동 제재 이력</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>대상자</th>
              <th style={styles.th}>제재 유형</th>
              <th style={styles.th}>사유</th>
              <th style={styles.th}>연결 신고</th>
              <th style={styles.th}>등록일</th>
              <th style={styles.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {sanctions.length === 0 ? (
              <tr><td colSpan={6} style={styles.empty}>제재 이력이 없습니다.</td></tr>
            ) : (
              sanctions.map((s) => (
                <tr
                  key={s.id}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={styles.td}>{s.targetUid || '-'}</td>
                  <td style={styles.td}>
                    <span style={styles.sanctionBadge(s.sanctionType)}>{s.sanctionType}</span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.reason || '-'}
                  </td>
                  <td style={styles.td}>
                    {s.reportId ? (
                      <span style={styles.linkedBadge}>연동됨</span>
                    ) : (
                      <span style={{ color: '#999', fontSize: 12 }}>없음</span>
                    )}
                  </td>
                  <td style={styles.td}>{formatDate(s.createdAt)}</td>
                  <td style={styles.td}>{s.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
