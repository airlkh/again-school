import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_SETTINGS = {
  minAge: 13,
  requiredFields: ['name', 'email'],
  emailVerification: true,
  phoneVerification: false,
  allowedEmailDomains: [],
  blockedWords: [],
};

const FIELD_OPTIONS = [
  { value: 'name', label: '이름' },
  { value: 'email', label: '이메일' },
  { value: 'phone', label: '전화번호' },
  { value: 'birthDate', label: '생년월일' },
  { value: 'school', label: '학교' },
  { value: 'grade', label: '학년' },
  { value: 'profileImage', label: '프로필 이미지' },
  { value: 'nickname', label: '닉네임' },
];

export default function SignupSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'signup'));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
        }
      } catch (err) {
        console.error('회원가입 설정 로드 실패:', err);
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

  const toggleField = (field) => {
    const fields = settings.requiredFields || [];
    const newFields = fields.includes(field)
      ? fields.filter((f) => f !== field)
      : [...fields, field];
    handleChange('requiredFields', newFields);
  };

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const domains = [...(settings.allowedEmailDomains || []), newDomain.trim()];
    handleChange('allowedEmailDomains', domains);
    setNewDomain('');
  };

  const removeDomain = (idx) => {
    const domains = [...(settings.allowedEmailDomains || [])];
    domains.splice(idx, 1);
    handleChange('allowedEmailDomains', domains);
  };

  const addWord = () => {
    if (!newWord.trim()) return;
    const words = [...(settings.blockedWords || []), newWord.trim()];
    handleChange('blockedWords', words);
    setNewWord('');
  };

  const removeWord = (idx) => {
    const words = [...(settings.blockedWords || [])];
    words.splice(idx, 1);
    handleChange('blockedWords', words);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'signup'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setChanged(false);
      alert('저장되었습니다.');
    } catch (err) {
      console.error('회원가입 설정 저장 실패:', err);
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
          <h1 style={styles.title}>회원가입 설정</h1>
          <p style={styles.subtitle}>회원가입 시 필수 조건 및 검증 옵션을 설정합니다.</p>
        </div>
        <button
          style={{ ...styles.saveBtn, opacity: changed ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 최소 연령 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>기본 조건</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>최소 가입 연령</label>
          <div style={styles.inlineInput}>
            <input
              style={{ ...styles.input, width: 80 }}
              type="number"
              min={0}
              value={settings.minAge}
              onChange={(e) => handleChange('minAge', parseInt(e.target.value) || 0)}
            />
            <span style={styles.unit}>세 이상</span>
          </div>
        </div>
      </div>

      {/* 필수 입력 필드 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>필수 입력 필드</h3>
        <div style={styles.checkboxGrid}>
          {FIELD_OPTIONS.map((field) => (
            <label key={field.value} style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={(settings.requiredFields || []).includes(field.value)}
                onChange={() => toggleField(field.value)}
                style={styles.checkbox}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 인증 토글 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>인증 설정</h3>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>이메일 인증</div>
            <div style={styles.toggleDesc}>가입 시 이메일 인증을 필수로 요구합니다.</div>
          </div>
          <button
            style={{
              ...styles.toggle,
              backgroundColor: settings.emailVerification ? '#48bb78' : '#cbd5e0',
            }}
            onClick={() => handleChange('emailVerification', !settings.emailVerification)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: settings.emailVerification ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
        <div style={{ ...styles.toggleRow, marginTop: 16 }}>
          <div>
            <div style={styles.toggleLabel}>전화번호 인증</div>
            <div style={styles.toggleDesc}>가입 시 전화번호 인증을 필수로 요구합니다.</div>
          </div>
          <button
            style={{
              ...styles.toggle,
              backgroundColor: settings.phoneVerification ? '#48bb78' : '#cbd5e0',
            }}
            onClick={() => handleChange('phoneVerification', !settings.phoneVerification)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: settings.phoneVerification ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>

      {/* 허용 이메일 도메인 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>허용 이메일 도메인</h3>
        <p style={styles.sectionDesc}>비워두면 모든 도메인을 허용합니다.</p>
        <div style={styles.tagInputRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="예: gmail.com"
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
          />
          <button style={styles.addTagBtn} onClick={addDomain}>추가</button>
        </div>
        <div style={styles.tags}>
          {(settings.allowedEmailDomains || []).map((d, i) => (
            <span key={i} style={styles.tag}>
              {d}
              <button style={styles.tagRemove} onClick={() => removeDomain(i)}>x</button>
            </span>
          ))}
        </div>
      </div>

      {/* 차단 단어 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>차단 단어</h3>
        <p style={styles.sectionDesc}>닉네임, 이름 등에 사용할 수 없는 단어를 설정합니다.</p>
        <div style={styles.tagInputRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="차단할 단어 입력"
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
          />
          <button style={styles.addTagBtn} onClick={addWord}>추가</button>
        </div>
        <div style={styles.tags}>
          {(settings.blockedWords || []).map((w, i) => (
            <span key={i} style={styles.tag}>
              {w}
              <button style={styles.tagRemove} onClick={() => removeWord(i)}>x</button>
            </span>
          ))}
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
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#2d3748',
    cursor: 'pointer',
  },
  checkbox: { cursor: 'pointer' },
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
    backgroundColor: '#edf2f7',
    color: '#2d3748',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    lineHeight: 1,
  },
};
