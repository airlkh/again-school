import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const POLICY_DOCS = [
  { id: 'terms', label: '이용약관' },
  { id: 'privacy', label: '개인정보처리방침' },
  { id: 'community-guidelines', label: '커뮤니티 가이드라인' },
];

const styles = {
  container: { padding: 0 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24 },
  tab: (active) => ({
    padding: '12px 24px', border: 'none', borderRadius: '10px 10px 0 0',
    fontSize: 14, fontWeight: active ? 700 : 400, cursor: 'pointer',
    backgroundColor: active ? '#fff' : '#f0f0f5',
    color: active ? '#e94560' : '#666',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
    borderBottom: active ? '2px solid #e94560' : '2px solid transparent',
    transition: 'all 0.15s',
  }),
  editor: {
    backgroundColor: '#fff', borderRadius: 12, padding: 28,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24,
  },
  editorHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  editorTitle: { fontSize: 18, fontWeight: 700, color: '#222' },
  versionInfo: { fontSize: 12, color: '#999' },
  textarea: {
    width: '100%', minHeight: 400, padding: 16, border: '1px solid #e0e0e0',
    borderRadius: 10, fontSize: 14, lineHeight: 1.8, outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
    backgroundColor: '#fafafa',
  },
  toolbar: {
    display: 'flex', gap: 8, marginBottom: 12,
  },
  toolbarBtn: {
    padding: '6px 14px', border: '1px solid #e0e0e0', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555',
    fontWeight: 600,
  },
  actionRow: {
    display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end',
    alignItems: 'center',
  },
  saveBtn: {
    padding: '12px 28px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    backgroundColor: '#333', color: '#fff',
  },
  publishBtn: {
    padding: '12px 28px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    backgroundColor: '#e94560', color: '#fff',
  },
  publishedBadge: {
    display: 'inline-block', padding: '4px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, backgroundColor: '#e8f5e9', color: '#2e7d32',
  },
  draftBadge: {
    display: 'inline-block', padding: '4px 12px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, backgroundColor: '#fff3e0', color: '#e65100',
  },
  // 버전 이력
  historySection: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  historyTitle: { fontSize: 16, fontWeight: 700, color: '#222', marginBottom: 16 },
  historyList: { borderLeft: '2px solid #e0e0e0', paddingLeft: 20 },
  historyItem: { marginBottom: 16, position: 'relative' },
  historyDot: (published) => ({
    width: 10, height: 10, borderRadius: '50%',
    backgroundColor: published ? '#2e7d32' : '#e65100',
    position: 'absolute', left: -26, top: 4,
  }),
  historyDate: { fontSize: 11, color: '#999', marginBottom: 2 },
  historyText: { fontSize: 13, color: '#444' },
  historyPreview: {
    padding: '8px 12px', backgroundColor: '#f9f9fb', borderRadius: 6,
    fontSize: 12, color: '#666', marginTop: 4, maxHeight: 60,
    overflow: 'hidden', lineHeight: 1.5,
  },
  empty: { textAlign: 'center', padding: 40, color: '#999', fontSize: 14 },
};

export default function Policies() {
  const [activeTab, setActiveTab] = useState(POLICY_DOCS[0].id);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('1.0');
  const [published, setPublished] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicy(activeTab);
    loadVersions(activeTab);
  }, [activeTab]);

  const loadPolicy = async (policyId) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'policies', policyId));
      if (snap.exists()) {
        const data = snap.data();
        setContent(data.content || '');
        setTitle(data.title || '');
        setVersion(data.version || '1.0');
        setPublished(data.status === 'published' || !!data.published);
        setLastUpdated(data.updatedAt);
      } else {
        setContent('');
        setPublished(false);
        setLastUpdated(null);
      }
    } catch (err) {
      console.error('정책 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (policyId) => {
    try {
      const q = query(
        collection(db, 'policies', policyId, 'versions'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('버전 이력 로드 실패:', err);
    }
  };

  const handleSave = async (shouldPublish = false) => {
    setSaving(true);
    try {
      const now = new Date();
      const saveData = {
        title: title || activeLabel,
        content,
        status: shouldPublish ? 'published' : 'draft',
        version,
        updatedAt: serverTimestamp(),
        ...(shouldPublish ? { publishedAt: serverTimestamp() } : {}),
      };
      await setDoc(doc(db, 'policies', activeTab), saveData, { merge: true });

      // 버전 기록 추가
      await addDoc(collection(db, 'policies', activeTab, 'versions'), {
        content,
        published: shouldPublish,
        createdAt: now,
        action: shouldPublish ? '게시' : '임시저장',
      });

      if (shouldPublish) setPublished(true);
      setLastUpdated(now);
      loadVersions(activeTab);
      alert(shouldPublish ? '게시되었습니다.' : '저장되었습니다.');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = (versionContent) => {
    if (window.confirm('이 버전으로 복원하시겠습니까? 현재 작성 중인 내용은 대체됩니다.')) {
      setContent(versionContent);
    }
  };

  const formatDate = (val) => {
    if (!val) return '-';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString('ko-KR');
  };

  const activeLabel = POLICY_DOCS.find((p) => p.id === activeTab)?.label || '';

  return (
    <div style={styles.container}>
      {/* 탭 */}
      <div style={styles.tabs}>
        {POLICY_DOCS.map((p) => (
          <button key={p.id} style={styles.tab(activeTab === p.id)} onClick={() => setActiveTab(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* 에디터 */}
      <div style={styles.editor}>
        <div style={styles.editorHeader}>
          <div>
            <div style={styles.editorTitle}>{activeLabel}</div>
            <div style={styles.versionInfo}>
              마지막 수정: {formatDate(lastUpdated)}
            </div>
          </div>
          <div>
            {published ? (
              <span style={styles.publishedBadge}>게시됨</span>
            ) : (
              <span style={styles.draftBadge}>미게시</span>
            )}
          </div>
        </div>

        {/* 간단 서식 툴바 */}
        <div style={styles.toolbar}>
          <button style={styles.toolbarBtn} onClick={() => setContent((c) => c + '\n\n## 제목\n')}>
            제목 추가
          </button>
          <button style={styles.toolbarBtn} onClick={() => setContent((c) => c + '\n\n---\n')}>
            구분선
          </button>
          <button style={styles.toolbarBtn} onClick={() => setContent((c) => c + '\n- 항목\n')}>
            목록 추가
          </button>
          <button style={styles.toolbarBtn} onClick={() => setContent((c) => c + '\n**굵은 텍스트**')}>
            굵게
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>로딩 중...</div>
        ) : (
          <textarea
            style={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${activeLabel} 내용을 입력하세요...`}
          />
        )}

        <div style={styles.actionRow}>
          <button style={styles.saveBtn} onClick={() => handleSave(false)} disabled={saving}>
            {saving ? '저장 중...' : '임시저장'}
          </button>
          <button style={styles.publishBtn} onClick={() => handleSave(true)} disabled={saving}>
            {saving ? '게시 중...' : '게시'}
          </button>
        </div>
      </div>

      {/* 버전 이력 */}
      <div style={styles.historySection}>
        <div style={styles.historyTitle}>버전 이력</div>
        {versions.length === 0 ? (
          <div style={styles.empty}>버전 이력이 없습니다.</div>
        ) : (
          <div style={styles.historyList}>
            {versions.map((v) => (
              <div key={v.id} style={styles.historyItem}>
                <div style={styles.historyDot(v.published)} />
                <div style={styles.historyDate}>
                  {formatDate(v.createdAt)} - {v.action || '저장'}
                </div>
                <div style={styles.historyPreview}>
                  {(v.content || '').slice(0, 150)}
                  {(v.content || '').length > 150 ? '...' : ''}
                </div>
                <button
                  style={{ ...styles.toolbarBtn, marginTop: 6 }}
                  onClick={() => restoreVersion(v.content)}
                >
                  이 버전으로 복원
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
