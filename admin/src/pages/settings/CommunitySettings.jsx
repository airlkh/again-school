import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_SETTINGS = {
  postCharLimit: 2000,
  commentCharLimit: 500,
  imageUploadLimit: 5,
  imageMaxSizeMB: 10,
  autoModerationKeywords: [],
  cooldownPeriod: 0,
  anonymousPosting: false,
};

export default function CommunitySettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'community'));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
        }
      } catch (err) {
        console.error('커뮤니티 설정 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setChanged(true);
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = [...(settings.autoModerationKeywords || []), newKeyword.trim()];
    handleChange('autoModerationKeywords', keywords);
    setNewKeyword('');
  };

  const removeKeyword = (idx) => {
    const keywords = [...(settings.autoModerationKeywords || [])];
    keywords.splice(idx, 1);
    handleChange('autoModerationKeywords', keywords);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'community'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setChanged(false);
      alert('저장되었습니다.');
    } catch (err) {
      console.error('커뮤니티 설정 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>커뮤니티 설정</h1>
          <p style={styles.subtitle}>게시판, 댓글, 이미지 업로드 등의 규칙을 설정합니다.</p>
        </div>
        <button
          style={{ ...styles.saveBtn, opacity: changed ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 글자수 제한 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>글자수 제한</h3>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>게시글 최대 글자수</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 100 }}
                type="number"
                min={1}
                value={settings.postCharLimit}
                onChange={(e) => handleChange('postCharLimit', parseInt(e.target.value) || 0)}
              />
              <span style={styles.unit}>자</span>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>댓글 최대 글자수</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 100 }}
                type="number"
                min={1}
                value={settings.commentCharLimit}
                onChange={(e) => handleChange('commentCharLimit', parseInt(e.target.value) || 0)}
              />
              <span style={styles.unit}>자</span>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>이미지 업로드</h3>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>최대 이미지 수</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={0}
                value={settings.imageUploadLimit}
                onChange={(e) => handleChange('imageUploadLimit', parseInt(e.target.value) || 0)}
              />
              <span style={styles.unit}>장</span>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>이미지 최대 크기</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={1}
                value={settings.imageMaxSizeMB}
                onChange={(e) => handleChange('imageMaxSizeMB', parseInt(e.target.value) || 1)}
              />
              <span style={styles.unit}>MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 작성 간격 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>작성 제한</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>게시글 작성 간격 (쿨다운)</label>
          <div style={styles.inlineInput}>
            <input
              style={{ ...styles.input, width: 80 }}
              type="number"
              min={0}
              value={settings.cooldownPeriod}
              onChange={(e) => handleChange('cooldownPeriod', parseInt(e.target.value) || 0)}
            />
            <span style={styles.unit}>초 (0 = 제한 없음)</span>
          </div>
        </div>

        <div style={{ ...styles.toggleRow, marginTop: 16 }}>
          <div>
            <div style={styles.toggleLabel}>익명 게시 허용</div>
            <div style={styles.toggleDesc}>사용자가 익명으로 게시글을 작성할 수 있도록 허용합니다.</div>
          </div>
          <button
            style={{
              ...styles.toggle,
              backgroundColor: settings.anonymousPosting ? '#48bb78' : '#cbd5e0',
            }}
            onClick={() => handleChange('anonymousPosting', !settings.anonymousPosting)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: settings.anonymousPosting ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>

      {/* 자동 검열 키워드 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>자동 검열 키워드</h3>
        <p style={styles.sectionDesc}>포함된 게시글/댓글은 자동으로 숨김 처리됩니다.</p>
        <div style={styles.tagInputRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="차단할 키워드 입력"
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          />
          <button style={styles.addTagBtn} onClick={addKeyword}>추가</button>
        </div>
        <div style={styles.tags}>
          {(settings.autoModerationKeywords || []).map((kw, i) => (
            <span key={i} style={styles.tag}>
              {kw}
              <button style={styles.tagRemove} onClick={() => removeKeyword(i)}>x</button>
            </span>
          ))}
          {(settings.autoModerationKeywords || []).length === 0 && (
            <span style={styles.noTags}>등록된 키워드가 없습니다.</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 800,
    margin: '0 auto',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4 },
  saveBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: '0 0 12px 0' },
  sectionDesc: { fontSize: 13, color: '#718096', margin: '-8px 0 12px 0' },
  formRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 },
  input: {
    padding: '9px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  inlineInput: { display: 'flex', alignItems: 'center', gap: 8 },
  unit: { fontSize: 14, color: '#4a5568' },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: '#2d3748' },
  toggleDesc: { fontSize: 13, color: '#718096', marginTop: 2 },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  tagInputRow: { display: 'flex', gap: 8, marginBottom: 10 },
  addTagBtn: {
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 13,
    backgroundColor: '#fde8e8',
    color: '#c53030',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#e53e3e',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    lineHeight: 1,
  },
  noTags: { fontSize: 13, color: '#a0aec0' },
};
